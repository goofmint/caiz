'use strict';

const winston = require.main.require('winston');
const user = require.main.require('./src/user');
const OAuthAuth = require('../lib/oauth-auth');

module.exports = function(router, middleware) {
    /**
     * OAuth Authorization Endpoint
     * GET /oauth/authorize
     */
    router.get('/oauth/authorize', middleware.authenticate, async (req, res) => {
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
    router.post('/oauth/authorize', middleware.authenticate, async (req, res) => {
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

    return router;
};