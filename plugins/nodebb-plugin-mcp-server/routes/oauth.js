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