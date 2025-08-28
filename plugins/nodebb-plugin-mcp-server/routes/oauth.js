'use strict';

const winston = require.main.require('winston');
const user = require.main.require('./src/user');
const OAuthAuth = require('../lib/oauth-auth');
const DeviceAuthManager = require('../lib/oauth-device');

module.exports = function(router, middleware) {
    /**
     * Device Authorization Request
     * RFC 8628 Section 3.1
     * POST /oauth/device_authorization
     */
    router.post('/oauth/device_authorization', async (req, res) => {
        try {
            winston.verbose('[mcp-server] Device authorization request received');

            // Extract parameters from request body
            const { client_id: clientId, scope } = req.body;

            winston.verbose(`[mcp-server] Device auth params: client_id=${clientId}, scope=${scope}`);

            // Validate client_id and scope
            const validation = DeviceAuthManager.validateClientAndScope(clientId, scope);
            if (!validation.valid) {
                winston.warn(`[mcp-server] Device auth validation failed: ${validation.error}`);
                return res.status(400).json({
                    error: validation.error,
                    error_description: validation.error_description
                });
            }

            // Generate unique device and user codes
            let deviceCode, userCode;
            try {
                const codes = await DeviceAuthManager.generateUniqueCodes();
                deviceCode = codes.deviceCode;
                userCode = codes.userCode;
            } catch (err) {
                winston.error(`[mcp-server] Failed to generate unique codes: ${err.message}`);
                return res.status(500).json({
                    error: 'server_error',
                    error_description: 'Failed to generate authorization codes'
                });
            }

            // Create authorization request
            const authRequest = DeviceAuthManager.createAuthorizationRequest(
                deviceCode,
                userCode,
                clientId,
                scope
            );

            // Store authorization request
            try {
                await DeviceAuthManager.storeAuthRequest(authRequest);
            } catch (err) {
                winston.error(`[mcp-server] Failed to store auth request: ${err.message}`);
                return res.status(500).json({
                    error: 'server_error',
                    error_description: 'Failed to store authorization request'
                });
            }

            // Return device authorization response
            const response = {
                device_code: authRequest.device_code,
                user_code: authRequest.user_code,
                verification_uri: authRequest.verification_uri,
                verification_uri_complete: authRequest.verification_uri_complete,
                expires_in: authRequest.expires_in,
                interval: authRequest.interval
            };

            // Set appropriate headers
            res.set({
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store',
                'Pragma': 'no-cache'
            });

            winston.info(`[mcp-server] Device authorization successful: user_code=${userCode}`);
            res.status(200).json(response);

        } catch (err) {
            winston.error('[mcp-server] Device authorization error:', err);
            res.status(500).json({
                error: 'server_error',
                error_description: 'Internal server error during device authorization'
            });
        }
    });

    /**
     * Device Authorization User Interface
     * RFC 8628 Section 3.3
     * GET /oauth/device
     */
    router.get('/oauth/device', middleware.ensureLoggedIn, async (req, res) => {
        try {
            winston.verbose('[mcp-server] Device authorization page requested');

            // 1) user must be logged-in (middleware enforces)
            if (!req.session.uid) {
                winston.error('[mcp-server] User not authenticated for device page');
                return res.redirect('/login?next=/oauth/device');
            }

            // 2) optionally accept ?user_code=XXXX-XXXX, normalize: uppercase, strip non [A-HJ-NP-Z2-9]
            let userCode = req.query.user_code;
            let authRequest = null;
            let errorMessage = null;

            if (userCode) {
                // Normalize user code
                userCode = userCode.toUpperCase().replace(/[^A-HJ-NP-Z2-9\-]/g, '');
                
                // Validate format
                if (!/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/.test(userCode)) {
                    errorMessage = 'error-invalid-code';
                } else {
                    // 3) if provided, lookup pending request; if not found/expired -> render form with flash error
                    try {
                        authRequest = await DeviceAuthManager.getAuthRequestByUserCode(userCode);
                        if (!authRequest) {
                            errorMessage = 'error-not-found';
                        } else if (authRequest.status !== 'pending') {
                            errorMessage = 'error-already-processed';
                        } else if (Date.now() > authRequest.expires_at) {
                            errorMessage = 'error-expired-code';
                        }
                    } catch (err) {
                        winston.error('[mcp-server] Failed to lookup device auth request:', err);
                        errorMessage = 'error-server';
                    }
                }
            }

            // 4) render template with { user_code?, client_name?, scopes?, expires_at? }
            const templateData = {
                title: '[[mcp-server:oauth.device.title]]',
                user_code: userCode,
                error: errorMessage,
                success: req.query.success ? true : false,
                csrf_token: req.csrfToken ? req.csrfToken() : 'csrf-token-placeholder'
            };

            if (authRequest) {
                templateData.client_name = 'Caiz MCP Server';
                
                // Build scopes from actual authRequest.scope values
                if (authRequest.scope) {
                    const scopeStrings = authRequest.scope.split(/[\s+]/);
                    templateData.scopes = scopeStrings.map(scope => ({
                        description: `[[mcp-server:oauth.scope.${scope.replace(':', '-')}]]`
                    }));
                }
                
                const expiresAtDate = new Date(authRequest.expires_at);
                templateData.expires_at = expiresAtDate.toLocaleString();
                templateData.expires_ts = authRequest.expires_at; // millisecond timestamp for countdown
                templateData.tx_id = authRequest.device_code; // Using device_code as transaction ID
            }

            // 5) never expose internal ids; escape all values (template engine handles escaping)
            winston.verbose('[mcp-server] Rendering device authorization page');
            res.render('oauth-device', templateData);

        } catch (err) {
            winston.error('[mcp-server] Device authorization page error:', err);
            res.status(500).render('500', { error: 'Internal server error' });
        }
    });

    /**
     * Device Authorization Form Submit
     * Handle user approval/denial
     * POST /oauth/device
     */
    router.post('/oauth/device', middleware.ensureLoggedIn, async (req, res) => {
        try {
            winston.verbose('[mcp-server] Device authorization form submitted');

            // 0) validate CSRF: req.csrfToken verified by middleware (assuming it's configured)
            if (!req.session.uid) {
                winston.error('[mcp-server] User not authenticated for device submit');
                return res.redirect('/login?next=/oauth/device');
            }

            // 1) normalize user_code, validate format
            let userCode = req.body.user_code;
            if (!userCode) {
                winston.warn('[mcp-server] Missing user_code in device auth form');
                return res.redirect('/oauth/device?error=missing-code');
            }

            userCode = userCode.toUpperCase().replace(/[^A-HJ-NP-Z2-9\-]/g, '');
            
            if (!/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/.test(userCode)) {
                winston.warn('[mcp-server] Invalid user_code format:', userCode);
                return res.redirect('/oauth/device?error=invalid-code');
            }

            // 2) fetch pending request by user_code (status === 'pending') FOR UPDATE
            const authRequest = await DeviceAuthManager.getAuthRequestByUserCode(userCode);

            // 3) if not found -> redirect with error
            if (!authRequest) {
                winston.warn('[mcp-server] Device auth request not found for user_code:', userCode);
                return res.redirect('/oauth/device?error=not-found');
            }

            // 4) if expired -> redirect with error
            if (Date.now() > authRequest.expires_at) {
                winston.warn('[mcp-server] Device auth request expired for user_code:', userCode);
                return res.redirect('/oauth/device?error=expired');
            }

            if (authRequest.status !== 'pending') {
                winston.warn('[mcp-server] Device auth request already processed:', authRequest.status);
                return res.redirect('/oauth/device?error=already-processed');
            }

            // 5) rate-limit by req.uid + user_code (simplified implementation)
            // TODO: Implement proper rate limiting

            const action = req.body.action;
            let newStatus;
            let auditResult;

            // 6) if action==='approve' -> set status='approved', subject=req.uid, approved_at=now
            if (action === 'approve') {
                newStatus = 'approved';
                auditResult = 'approved';
                
                await DeviceAuthManager.updateAuthStatus(authRequest.device_code, newStatus, req.session.uid);
                winston.info(`[mcp-server] Device authorization approved by user ${req.session.uid} for code ${userCode}`);
                
                return res.redirect('/oauth/device?success=approved');
                
            } else if (action === 'deny') {
                // else set status='denied', denied_at=now
                newStatus = 'denied';
                auditResult = 'denied';
                
                await DeviceAuthManager.updateAuthStatus(authRequest.device_code, newStatus);
                winston.info(`[mcp-server] Device authorization denied by user ${req.session.uid} for code ${userCode}`);
                
                return res.redirect('/oauth/device?success=denied');
            } else {
                winston.warn('[mcp-server] Invalid action for device auth:', action);
                return res.redirect('/oauth/device?error=invalid-action');
            }

            // 7) persist and emit audit log { user: req.uid, client_id, scopes, result }
            // Already handled in the specific action blocks above

        } catch (err) {
            winston.error('[mcp-server] Device authorization form error:', err);
            return res.redirect('/oauth/device?error=server');
        }
    });

    /**
     * OAuth Authorization Endpoint
     * GET /oauth/authorize
     */
    router.get('/oauth/authorize', middleware.ensureLoggedIn, async (req, res) => {
        try {
            winston.verbose('[mcp-server] OAuth authorization request received');

            // Validate OAuth parameters
            try {
                OAuthAuth.validateAuthParams(req.query);
            } catch (err) {
                winston.error('[mcp-server] OAuth parameter validation failed:', err.message);
                
                // If redirect_uri is valid, redirect with error
                if (req.query.redirect_uri && (req.query.redirect_uri.startsWith('http://127.0.0.1:') || req.query.redirect_uri.startsWith('http://localhost:'))) {
                    const errorUrl = OAuthAuth.generateErrorRedirect(
                        req.query.redirect_uri,
                        'invalid_request',
                        req.query.state,
                        err.message
                    );
                    return res.redirect(errorUrl);
                }
                
                return res.status(400).json({
                    error: 'invalid_request',
                    error_description: err.message
                });
            }

            // Check if user is authenticated
            if (!req.session.uid) {
                winston.verbose('[mcp-server] User not authenticated, redirecting to NodeBB login');
                
                // Store OAuth parameters in session for after login
                req.session.oauthParams = req.query;
                
                // Redirect to NodeBB login
                return res.redirect(`/login?next=${encodeURIComponent('/oauth/authorize?' + new URLSearchParams(req.query).toString())}`);
            }

            // Get user information
            const userData = await user.getUserData(req.session.uid);
            if (!userData) {
                winston.error('[mcp-server] Failed to get user data for uid:', req.session.uid);
                const errorUrl = OAuthAuth.generateErrorRedirect(
                    req.query.redirect_uri,
                    'server_error',
                    req.query.state,
                    'Failed to retrieve user information'
                );
                return res.redirect(errorUrl);
            }

            winston.verbose('[mcp-server] Displaying authorization consent screen for user:', userData.username);

            // Parse scopes for template
            const scopes = OAuthAuth.parseScopes(req.query.scope);
            
            // Render authorization consent screen
            res.render('oauth/authorize', {
                title: 'OAuth Authorization',
                clientName: req.query.client_id,
                response_type: req.query.response_type,
                client_id: req.query.client_id,
                redirect_uri: req.query.redirect_uri,
                scope: req.query.scope,
                code_challenge: req.query.code_challenge,
                code_challenge_method: req.query.code_challenge_method,
                state: req.query.state || '',
                resource: req.query.resource,
                scopes: scopes,
                user: userData
            });

        } catch (err) {
            winston.error('[mcp-server] OAuth authorization error:', err);
            
            if (req.query.redirect_uri && (req.query.redirect_uri.startsWith('http://127.0.0.1:') || req.query.redirect_uri.startsWith('http://localhost:'))) {
                const errorUrl = OAuthAuth.generateErrorRedirect(
                    req.query.redirect_uri,
                    'server_error',
                    req.query.state,
                    'Internal server error'
                );
                return res.redirect(errorUrl);
            }
            
            res.status(500).json({
                error: 'server_error',
                error_description: 'Internal server error'
            });
        }
    });

    /**
     * OAuth Authorization Form Submit
     * POST /oauth/authorize
     */
    router.post('/oauth/authorize', middleware.ensureLoggedIn, async (req, res) => {
        try {
            winston.verbose('[mcp-server] OAuth authorization form submitted');

            // Check if user is authenticated
            if (!req.session.uid) {
                winston.error('[mcp-server] User not authenticated on form submit');
                const errorUrl = OAuthAuth.generateErrorRedirect(
                    req.body.redirect_uri,
                    'access_denied',
                    req.body.state,
                    'User not authenticated'
                );
                return res.redirect(errorUrl);
            }

            // Validate OAuth parameters again
            try {
                OAuthAuth.validateAuthParams(req.body);
            } catch (err) {
                winston.error('[mcp-server] OAuth parameter validation failed on submit:', err.message);
                const errorUrl = OAuthAuth.generateErrorRedirect(
                    req.body.redirect_uri,
                    'invalid_request',
                    req.body.state,
                    err.message
                );
                return res.redirect(errorUrl);
            }

            // Check user action
            if (req.body.action === 'deny') {
                winston.verbose('[mcp-server] User denied authorization');
                const errorUrl = OAuthAuth.generateErrorRedirect(
                    req.body.redirect_uri,
                    'access_denied',
                    req.body.state,
                    'User denied the request'
                );
                return res.redirect(errorUrl);
            }

            if (req.body.action !== 'approve') {
                winston.error('[mcp-server] Invalid action:', req.body.action);
                const errorUrl = OAuthAuth.generateErrorRedirect(
                    req.body.redirect_uri,
                    'invalid_request',
                    req.body.state,
                    'Invalid action'
                );
                return res.redirect(errorUrl);
            }

            // Get user information
            const userData = await user.getUserData(req.session.uid);
            if (!userData) {
                winston.error('[mcp-server] Failed to get user data for uid:', req.session.uid);
                const errorUrl = OAuthAuth.generateErrorRedirect(
                    req.body.redirect_uri,
                    'server_error',
                    req.body.state,
                    'Failed to retrieve user information'
                );
                return res.redirect(errorUrl);
            }

            // Generate authorization code
            const scopes = req.body.scope.split(' ');
            const authCode = OAuthAuth.generateAuthCode(
                req.session.uid,
                req.body.client_id,
                scopes,
                req.body.code_challenge,
                req.body.redirect_uri,
                req.body.resource,
                req.body.state
            );

            winston.verbose('[mcp-server] Authorization code generated, redirecting to client');

            // Redirect back to client with authorization code
            const successUrl = OAuthAuth.generateSuccessRedirect(
                req.body.redirect_uri,
                authCode,
                req.body.state
            );
            res.redirect(successUrl);

        } catch (err) {
            winston.error('[mcp-server] OAuth authorization form error:', err);
            const errorUrl = OAuthAuth.generateErrorRedirect(
                req.body.redirect_uri,
                'server_error',
                req.body.state,
                'Internal server error'
            );
            res.redirect(errorUrl);
        }
    });

    /**
     * OAuth Token Endpoint
     * POST /oauth/token
     * Supports both authorization_code and device_code grant types
     */
    router.post('/oauth/token', async (req, res) => {
        try {
            winston.verbose('[mcp-server] Token exchange requested', { 
                grant_type: req.body.grant_type,
                client_id: req.body.client_id
            });
            
            const OAuthToken = require('../lib/oauth-token');
            let tokenResponse;

            // RFC 8628 Device Authorization Grant support
            if (req.body.grant_type === 'urn:ietf:params:oauth:grant-type:device_code') {
                // Device Authorization Grant flow
                const ctx = {
                    ip: req.ip || req.connection.remoteAddress || 'unknown',
                    userAgent: req.get('User-Agent') || 'unknown',
                    now: Date.now()
                };

                tokenResponse = await OAuthToken.exchangeDeviceCodeForToken(req.body, ctx);
                
            } else if (req.body.grant_type === 'authorization_code') {
                // Standard Authorization Code Grant flow
                tokenResponse = await OAuthToken.exchangeCodeForToken(req.body, OAuthAuth);
                
            } else if (req.body.grant_type === 'refresh_token') {
                // Refresh Token Grant flow (RFC 6749 Section 6)
                if (!req.body.refresh_token) {
                    const error = new Error('Missing required parameter: refresh_token');
                    error.code = 'invalid_request';
                    throw error;
                }
                
                tokenResponse = await OAuthToken.refreshDeviceAccessToken(req.body.refresh_token);
                
            } else {
                winston.warn('[mcp-server] Unsupported grant_type', { grant_type: req.body.grant_type });
                const error = new Error('Unsupported grant_type');
                error.code = 'unsupported_grant_type';
                throw error;
            }
            
            // Set security headers (RFC 8628 Section 3.5)
            res.set({
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store',
                'Pragma': 'no-cache'
            });
            
            res.json(tokenResponse);
            winston.verbose('[mcp-server] Token issued successfully', { 
                grant_type: req.body.grant_type,
                scope: tokenResponse.scope
            });
            
        } catch (err) {
            winston.error('[mcp-server] Token exchange error:', err);
            
            // Determine appropriate error code (RFC 8628 compliant)
            let errorCode = err.code || 'invalid_grant';
            let httpStatus = 400;
            let retryAfter = null;
            
            // Handle RFC 8628 specific errors
            if (err.code === 'slow_down' && err.retryAfter) {
                retryAfter = err.retryAfter;
            }

            // Handle specific HTTP status codes for different error types
            if (err.code === 'server_error') {
                httpStatus = 500;
            } else if (err.code === 'invalid_client') {
                httpStatus = 401;
            }

            // Legacy error handling for authorization_code grant
            if (!err.code) {
                if (err.message.includes('Missing required parameter') || 
                    err.message.includes('Invalid') && err.message.includes('format')) {
                    errorCode = 'invalid_request';
                } else if (err.message.includes('Unsupported grant_type')) {
                    errorCode = 'unsupported_grant_type';
                } else if (err.message.includes('Failed to retrieve user information')) {
                    errorCode = 'server_error';
                    httpStatus = 500;
                }
            }
            
            // Set security headers (RFC 8628 Section 3.5)
            const headers = {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store',
                'Pragma': 'no-cache'
            };

            // Add Retry-After header for slow_down errors (RFC 8628 Section 3.5)
            if (retryAfter) {
                headers['Retry-After'] = retryAfter.toString();
            }

            // Add WWW-Authenticate header for invalid_client errors
            if (err.code === 'invalid_client') {
                headers['WWW-Authenticate'] = 'Basic realm="OAuth2", charset="UTF-8"';
            }

            res.set(headers);
            
            // OAuth 2.0 error response format
            const errorResponse = {
                error: errorCode,
                error_description: err.message
            };

            res.status(httpStatus).json(errorResponse);
        }
    });

    /**
     * OAuth Token Introspection Endpoint
     * POST /oauth/introspect
     * RFC 7662 compliant token introspection
     */
    router.post('/oauth/introspect', async (req, res) => {
        try {
            winston.verbose('[mcp-server] Token introspection request received');
            
            const OAuthClients = require('../lib/oauth-clients');
            
            // RFC 7662 Section 2.1: Client Authentication Required
            const authHeader = req.get('Authorization');
            const credentials = OAuthClients.parseBasicAuth(authHeader);
            
            if (!credentials) {
                winston.warn('[mcp-server] Missing or invalid client authentication for introspection');
                return res.status(401).set({
                    'WWW-Authenticate': 'Basic realm="OAuth2 Token Introspection", charset="UTF-8"',
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-store',
                    'Pragma': 'no-cache'
                }).json({
                    error: 'invalid_client',
                    error_description: 'Client authentication required for token introspection'
                });
            }
            
            // Authenticate client with secure credential verification
            const authenticatedClient = await OAuthClients.authenticateClient(
                credentials.clientId, 
                credentials.clientSecret
            );
            
            if (!authenticatedClient) {
                winston.warn('[mcp-server] Client authentication failed for introspection', { 
                    client_id: credentials.clientId 
                });
                return res.status(401).set({
                    'WWW-Authenticate': 'Basic realm="OAuth2 Token Introspection", charset="UTF-8"',
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-store',
                    'Pragma': 'no-cache'
                }).json({
                    error: 'invalid_client',
                    error_description: 'Invalid client credentials'
                });
            }
            
            // Check if client is authorized for introspection
            if (!OAuthClients.isIntrospectionAllowed(authenticatedClient)) {
                winston.warn('[mcp-server] Client not authorized for token introspection', { 
                    client_id: authenticatedClient.id 
                });
                return res.status(401).set({
                    'WWW-Authenticate': 'Basic realm="OAuth2 Token Introspection", charset="UTF-8"',
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-store',
                    'Pragma': 'no-cache'
                }).json({
                    error: 'invalid_client',
                    error_description: 'Client not authorized for token introspection'
                });
            }
            
            // RFC 7662 Section 2.1: token parameter is required
            const token = req.body.token;
            if (!token) {
                winston.warn('[mcp-server] Missing token parameter for introspection');
                return res.status(400).set({
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-store',
                    'Pragma': 'no-cache'
                }).json({
                    error: 'invalid_request',
                    error_description: 'Missing required parameter: token'
                });
            }
            
            const OAuthToken = require('../lib/oauth-token');
            let introspectionResponse;
            
            try {
                // Try to validate as access token
                const tokenData = await OAuthToken.validateDeviceAccessToken(token);
                
                // Check if authenticated client is authorized for this specific token
                if (!OAuthClients.isClientAuthorizedForToken(authenticatedClient, tokenData)) {
                    winston.warn('[mcp-server] Client not authorized for this token', { 
                        client_id: authenticatedClient.id,
                        token_client_id: tokenData.clientId
                    });
                    return res.status(401).set({
                        'WWW-Authenticate': 'Basic realm="OAuth2 Token Introspection", charset="UTF-8"',
                        'Content-Type': 'application/json',
                        'Cache-Control': 'no-store',
                        'Pragma': 'no-cache'
                    }).json({
                        error: 'invalid_client',
                        error_description: 'Client not authorized to introspect this token'
                    });
                }
                
                // RFC 7662 Section 2.2: Successful response
                introspectionResponse = {
                    active: true,
                    token_type: 'Bearer',
                    scope: Array.isArray(tokenData.scopes) ? tokenData.scopes.join(' ') : (tokenData.scopes || ''),
                    client_id: tokenData.clientId,
                    exp: Math.floor(tokenData.expiresAt / 1000), // Unix timestamp
                    iat: Math.floor(tokenData.createdAt / 1000)  // Unix timestamp
                    // Note: Intentionally omitting 'sub' to avoid exposing user ID (PII protection)
                };
                
                winston.verbose('[mcp-server] Token introspection successful', { 
                    requesting_client_id: authenticatedClient.id,
                    token_client_id: tokenData.clientId,
                    scope: introspectionResponse.scope,
                    expires_at: new Date(tokenData.expiresAt).toISOString()
                });
                
            } catch (err) {
                // Token is invalid, expired, or not found
                winston.verbose('[mcp-server] Token introspection: token inactive', { 
                    error: err.message 
                });
                
                // RFC 7662 Section 2.2: Inactive token response
                introspectionResponse = {
                    active: false
                };
            }
            
            // RFC 7662 Section 2.2: Set appropriate headers
            res.set({
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store',
                'Pragma': 'no-cache'
            });
            
            res.status(200).json(introspectionResponse);
            
        } catch (err) {
            winston.error('[mcp-server] Token introspection error:', err);
            
            res.status(500).set({
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store',
                'Pragma': 'no-cache'
            }).json({
                error: 'server_error',
                error_description: 'Internal server error during token introspection'
            });
        }
    });

    /**
     * OAuth Dynamic Client Registration Endpoint
     * POST /oauth/register
     * RFC 7591 compliant client registration for mcp-remote compatibility
     */
    router.post('/oauth/register', async (req, res) => {
        try {
            winston.verbose('[mcp-server] Dynamic client registration request received');
            
            // Extract client metadata from request
            const clientMetadata = req.body || {};
            
            // For mcp-remote compatibility, we'll create a registration response
            // but use our predefined client_id since we don't support full dynamic registration
            const registrationResponse = {
                client_id: 'mcp-client',
                client_secret: '', // Empty string for device flow (no secret required)
                client_name: clientMetadata.client_name || 'MCP Remote Client',
                client_uri: clientMetadata.client_uri || '',
                redirect_uris: [], // Empty array for device authorization grant
                grant_types: ['urn:ietf:params:oauth:grant-type:device_code', 'refresh_token'],
                response_types: ['device_code'],
                token_endpoint_auth_method: 'none',
                scope: 'mcp:read mcp:write',
                client_id_issued_at: Math.floor(Date.now() / 1000)
            };
            
            // Set appropriate headers (RFC 7591 Section 3.2)
            res.set({
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store',
                'Pragma': 'no-cache'
            });
            
            res.status(201).json(registrationResponse);
            
            winston.verbose('[mcp-server] Dynamic client registration completed', {
                client_id: registrationResponse.client_id,
                client_name: registrationResponse.client_name
            });
            
        } catch (err) {
            winston.error('[mcp-server] Dynamic client registration error:', err);
            
            res.status(500).set({
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store',
                'Pragma': 'no-cache'
            }).json({
                error: 'server_error',
                error_description: 'Failed to register client'
            });
        }
    });

    return router;
};