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
                title: '[[caiz:oauth.device.title]]',
                user_code: userCode,
                error: errorMessage,
                csrf_token: req.csrfToken ? req.csrfToken() : 'csrf-token-placeholder'
            };

            if (authRequest) {
                templateData.client_name = 'Caiz MCP Server';
                templateData.scopes = [
                    { description: '[[caiz:oauth.scope.mcp-read]]' },
                    { description: '[[caiz:oauth.scope.mcp-search]]' }
                ];
                templateData.expires_at = new Date(authRequest.expires_at).toLocaleString();
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
     */
    router.post('/oauth/token', async (req, res) => {
        try {
            winston.verbose('[mcp-server] Token exchange requested');
            
            const OAuthToken = require('../lib/oauth-token');
            
            // Pass OAuthAuth instance to access authorization codes
            const tokenResponse = await OAuthToken.exchangeCodeForToken(req.body, OAuthAuth);
            
            // Set security headers
            res.set({
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store',
                'Pragma': 'no-cache'
            });
            
            res.json(tokenResponse);
            winston.verbose('[mcp-server] Access token issued successfully');
            
        } catch (err) {
            winston.error('[mcp-server] Token exchange error:', err);
            
            // Determine appropriate error code
            let errorCode = 'invalid_grant';
            if (err.message.includes('Missing required parameter') || 
                err.message.includes('Invalid') && err.message.includes('format')) {
                errorCode = 'invalid_request';
            } else if (err.message.includes('Unsupported grant_type')) {
                errorCode = 'unsupported_grant_type';
            } else if (err.message.includes('Failed to retrieve user information')) {
                errorCode = 'server_error';
            }
            
            // OAuth 2.0 error response format
            res.status(400).json({
                error: errorCode,
                error_description: err.message
            });
        }
    });

    return router;
};