'use strict';

const winston = require.main.require('winston');
const crypto = require('crypto');
const https = require('https');

/**
 * Authentication middleware and utilities for MCP server
 * Implements OAuth 2.0 Bearer Token authentication according to RFC 6750
 */
/**
 * In-memory cache for JWKS data
 */
const jwksCache = new Map();

/**
 * In-flight JWKS requests to prevent duplicate fetching
 */
const inflightRequests = new Map();

/**
 * JWT configuration
 */
const JWT_CONFIG = {
    jwks: {
        uri: 'https://caiz.test/.well-known/jwks.json',
        cache: true,
        cacheMaxAge: 3600000, // 1 hour
        timeout: 5000 // 5 seconds
    },
    validation: {
        issuer: 'https://caiz.test',
        audience: 'mcp-api',
        algorithms: ['RS256'],
        clockSkew: 60 // 60 seconds
    },
    scopes: {
        read: 'mcp:read',
        write: 'mcp:write',
        admin: 'mcp:admin'
    }
};

class MCPAuth {
    /**
     * Extract Bearer token from Authorization header
     * @param {Object} req - Express request object
     * @returns {string|null} Bearer token or null if not found
     */
    static extractBearerToken(req) {
        winston.verbose('[mcp-server] Extracting Bearer token from request');
        
        if (!req || !req.headers || typeof req.headers.authorization !== 'string') {
            winston.verbose('[mcp-server] No valid Authorization header found');
            return null;
        }
        
        const authHeader = req.headers.authorization.trim();
        
        // Use regex to match Bearer token format - permissive for JWT/base64url chars
        const bearerMatch = authHeader.match(/^Bearer\s+([A-Za-z0-9\-._~+/=]+)$/i);
        
        if (!bearerMatch) {
            winston.verbose('[mcp-server] Authorization header does not match Bearer token format');
            return null;
        }
        
        const token = bearerMatch[1];
        winston.verbose('[mcp-server] Bearer token extracted successfully');
        return token;
    }
    
    /**
     * Generate WWW-Authenticate header for 401 responses
     * @param {Object} options - Authentication options
     * @param {string} options.realm - Authentication realm
     * @param {string} options.scope - Required OAuth scopes
     * @param {string} options.error - OAuth error code
     * @param {string} options.errorDescription - Human readable error description
     * @returns {string} WWW-Authenticate header value
     */
    static generateWWWAuthenticateHeader(options = {}) {
        winston.verbose('[mcp-server] Generating WWW-Authenticate header');
        
        /**
         * Escape and quote value for HTTP header parameter per RFC 7235
         * @param {string} value - Value to escape and quote
         * @returns {string} Escaped and quoted value
         */
        function escapeAndQuote(value) {
            if (typeof value !== 'string') {
                return '""';
            }
            // Escape backslashes and double quotes per RFC 7235
            const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
            return `"${escaped}"`;
        }
        
        const params = [];
        
        // Always include realm (RFC 6750 requirement)
        const realm = options.realm || this.getDefaultRealm();
        params.push(`realm=${escapeAndQuote(realm)}`);
        
        // Include optional parameters only when provided
        if (options.error) {
            params.push(`error=${escapeAndQuote(options.error)}`);
        }
        
        if (options.errorDescription) {
            params.push(`error_description=${escapeAndQuote(options.errorDescription)}`);
        }
        
        if (options.scope) {
            params.push(`scope=${escapeAndQuote(options.scope)}`);
        }
        
        const header = `Bearer ${params.join(', ')}`;
        winston.verbose('[mcp-server] WWW-Authenticate header generated:', header);
        return header;
    }
    
    /**
     * Send 401 Unauthorized response with proper headers
     * @param {Object} res - Express response object
     * @param {Object} options - Error options
     * @param {string} options.error - OAuth error code
     * @param {string} options.errorDescription - Human readable error description
     * @param {string} options.realm - Authentication realm
     * @param {string} options.scope - Required OAuth scopes
     */
    static send401Response(res, options = {}) {
        winston.verbose('[mcp-server] Sending 401 Unauthorized response');
        
        // Check if headers have already been sent
        if (res.headersSent) {
            winston.warn('[mcp-server] Headers already sent, cannot send 401 response');
            return;
        }
        
        try {
            const wwwAuthHeader = this.generateWWWAuthenticateHeader({
                realm: options.realm,
                error: options.error,
                errorDescription: options.errorDescription,
                scope: options.scope
            });
            
            // Safely set headers - validate header values to prevent injection
            const safeHeaders = {};
            
            // WWW-Authenticate header is already escaped by generateWWWAuthenticateHeader
            safeHeaders['WWW-Authenticate'] = wwwAuthHeader;
            safeHeaders['Content-Type'] = 'application/json';
            
            res.set(safeHeaders);
            res.status(401);
            
            // Create minimal JSON body with only error info when provided
            const body = {};
            if (options.error) {
                body.error = options.error;
            }
            if (options.errorDescription) {
                body.error_description = options.errorDescription;
            }
            
            res.json(body);
            winston.verbose('[mcp-server] 401 response sent successfully');
            
        } catch (err) {
            winston.error('[mcp-server] Error sending 401 response:', err);
            throw err;
        }
    }
    
    
    /**
     * Get default authentication realm
     * @returns {string} Default realm name
     */
    static getDefaultRealm() {
        return 'MCP Server';
    }
    
    /**
     * Get default required scopes
     * @returns {string} Default scope string
     */
    static getDefaultScope() {
        return 'mcp:read mcp:write';
    }
    
    /**
     * Create authentication middleware
     * @param {Array<string>} requiredScopes - Required OAuth scopes
     * @param {Object} options - Middleware options
     * @returns {Function} Express middleware function
     */
    static requireAuth(requiredScopes = [], options = {}) {
        return (req, res, next) => {
            winston.verbose('[mcp-server] requireAuth middleware executing');
            
            const token = this.extractBearerToken(req);
            
            if (!token) {
                winston.verbose('[mcp-server] No Bearer token provided for required auth');
                return this.send401Response(res, {
                    error: 'invalid_token',
                    errorDescription: 'Bearer token required for MCP session access',
                    realm: this.getDefaultRealm(),
                    scope: requiredScopes.length > 0 ? requiredScopes.join(' ') : this.getDefaultScope()
                });
            }
            
            // JWT validation using implemented functionality
            this.validateJWT(token, {
                expectedIssuer: JWT_CONFIG.validation.issuer,
                expectedAudience: JWT_CONFIG.validation.audience,
                clockSkew: JWT_CONFIG.validation.clockSkew
            })
            .then(payload => {
                // Create authentication context
                const authContext = this.createAuthContext(payload);
                
                // Validate scopes if required
                if (requiredScopes.length > 0) {
                    const hasRequiredScopes = this.validateScopes(authContext.scopes, requiredScopes);
                    if (!hasRequiredScopes) {
                        winston.verbose('[mcp-server] Insufficient scope for required auth');
                        return this.send403Response(res, {
                            error: 'insufficient_scope',
                            errorDescription: 'Token does not have sufficient scope',
                            realm: this.getDefaultRealm(),
                            scope: requiredScopes.join(' ')
                        });
                    }
                }
                
                // Set authentication context in request
                req.auth = authContext;
                winston.verbose('[mcp-server] Authentication successful for user:', authContext.userId);
                return next();
            })
            .catch(err => {
                winston.verbose('[mcp-server] JWT validation failed:', err.message);
                
                // Map specific errors to appropriate responses
                let errorCode = 'invalid_token';
                let errorDescription = 'Token validation failed';
                
                if (err.message === 'expired_token') {
                    errorCode = 'invalid_token';
                    errorDescription = 'Token has expired';
                } else if (err.message === 'invalid_issuer') {
                    errorCode = 'invalid_token';
                    errorDescription = 'Token issuer is invalid';
                } else if (err.message === 'invalid_audience') {
                    errorCode = 'invalid_token';
                    errorDescription = 'Token audience is invalid';
                } else if (err.message === 'token_not_active') {
                    errorCode = 'invalid_token';
                    errorDescription = 'Token is not yet active';
                }
                
                return this.send401Response(res, {
                    error: errorCode,
                    errorDescription: errorDescription,
                    realm: this.getDefaultRealm(),
                    scope: requiredScopes.length > 0 ? requiredScopes.join(' ') : this.getDefaultScope()
                });
            });
        };
    }
    
    /**
     * Create optional authentication middleware
     * @param {Object} options - Middleware options
     * @returns {Function} Express middleware function
     */
    static optionalAuth(options = {}) {
        return (req, res, next) => {
            winston.verbose('[mcp-server] optionalAuth middleware executing');
            
            const token = this.extractBearerToken(req);
            
            if (!token) {
                // No token: continue without req.auth
                winston.verbose('[mcp-server] No token provided, continuing without auth');
                return next();
            }
            
            // Token present: attempt verification
            this.validateJWT(token, {
                expectedIssuer: JWT_CONFIG.validation.issuer,
                expectedAudience: JWT_CONFIG.validation.audience,
                clockSkew: JWT_CONFIG.validation.clockSkew
            })
            .then(payload => {
                // Create authentication context
                const authContext = this.createAuthContext(payload);
                req.auth = authContext;
                winston.verbose('[mcp-server] Optional authentication successful for user:', authContext.userId);
                return next();
            })
            .catch(err => {
                winston.verbose('[mcp-server] Optional JWT validation failed:', err.message);
                
                // For optional auth, if token is present but invalid, return 401 (not pass-through)
                let errorCode = 'invalid_token';
                let errorDescription = 'Token validation failed';
                
                if (err.message === 'expired_token') {
                    errorCode = 'invalid_token';
                    errorDescription = 'Token has expired';
                } else if (err.message === 'invalid_issuer') {
                    errorCode = 'invalid_token';
                    errorDescription = 'Token issuer is invalid';
                } else if (err.message === 'invalid_audience') {
                    errorCode = 'invalid_token';
                    errorDescription = 'Token audience is invalid';
                } else if (err.message === 'token_not_active') {
                    errorCode = 'invalid_token';
                    errorDescription = 'Token is not yet active';
                }
                
                return this.send401Response(res, {
                    error: errorCode,
                    errorDescription: errorDescription,
                    realm: this.getDefaultRealm(),
                    scope: this.getDefaultScope()
                });
            });
        };
    }
    
    /**
     * Validate JWT token with signature and claims verification
     * @param {string} token - JWT token to validate
     * @param {Object} options - Validation options
     * @returns {Promise<Object>} Decoded and verified token payload
     * @throws {Error} Token validation errors
     */
    static async validateJWT(token, options = {}) {
        winston.verbose('[mcp-server] Starting JWT validation');
        
        if (!token || typeof token !== 'string') {
            throw new Error('invalid_token');
        }
        
        // JWT token format check (header.payload.signature)
        const parts = token.split('.');
        if (parts.length !== 3) {
            winston.verbose('[mcp-server] JWT token does not have 3 parts');
            throw new Error('invalid_token');
        }
        
        let header, payload;
        try {
            // Decode header
            header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
            // Decode payload
            payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
        } catch (err) {
            winston.verbose('[mcp-server] Failed to decode JWT parts');
            throw new Error('invalid_token');
        }
        
        // Header validation: alg=RS256, typ=JWT(or absent), kid required, crit unsupported = reject
        if (!header.alg || header.alg !== 'RS256') {
            winston.verbose('[mcp-server] JWT header alg is not RS256:', header.alg);
            throw new Error('invalid_token');
        }
        
        if (header.typ && header.typ !== 'JWT') {
            winston.verbose('[mcp-server] JWT header typ is not JWT:', header.typ);
            throw new Error('invalid_token');
        }
        
        if (!header.kid || typeof header.kid !== 'string') {
            winston.verbose('[mcp-server] JWT header missing required kid');
            throw new Error('invalid_token');
        }
        
        if (header.crit && Array.isArray(header.crit) && header.crit.length > 0) {
            winston.verbose('[mcp-server] JWT header contains unsupported critical extensions');
            throw new Error('invalid_token');
        }
        
        // Fetch JWKS and get public key
        const jwks = await this.fetchJWKS(JWT_CONFIG.jwks.uri);
        const jwk = jwks.keys.find(key => key.kid === header.kid);
        
        if (!jwk) {
            winston.verbose('[mcp-server] No matching JWK found for kid:', header.kid);
            throw new Error('invalid_token');
        }
        
        const publicKeyPEM = this.extractPublicKeyFromJWK(jwk);
        
        // Signature verification (RS256)
        const isValid = this.verifyJWTSignature(token, publicKeyPEM);
        if (!isValid) {
            winston.verbose('[mcp-server] JWT signature verification failed');
            throw new Error('invalid_token');
        }
        
        // Standard claims verification (iss, aud, exp, nbf, iat)
        this.validateJWTClaims(payload, {
            expectedIssuer: options.expectedIssuer || JWT_CONFIG.validation.issuer,
            expectedAudience: options.expectedAudience || JWT_CONFIG.validation.audience,
            clockSkew: options.clockSkew || JWT_CONFIG.validation.clockSkew
        });
        
        winston.verbose('[mcp-server] JWT validation successful for user:', payload.sub);
        return payload;
    }
    
    /**
     * Fetch and cache JWKS from the configured endpoint
     * @param {string} jwksUri - JWKS endpoint URI
     * @param {Object} options - Fetch options
     * @returns {Promise<Object>} JWKS data with key caching
     */
    static async fetchJWKS(jwksUri, options = {}) {
        winston.verbose('[mcp-server] Fetching JWKS from:', jwksUri);
        
        // Security: only allow configured HTTPS endpoints, ignore jku header
        const allowedHosts = ['caiz.test'];
        const url = new URL(jwksUri);
        
        if (url.protocol !== 'https:') {
            throw new Error('jwks_fetch_failed');
        }
        
        if (!allowedHosts.includes(url.hostname)) {
            winston.error('[mcp-server] JWKS hostname not in allowlist:', url.hostname);
            throw new Error('jwks_fetch_failed');
        }
        
        // Check in-flight requests to collapse concurrent fetches
        if (inflightRequests.has(jwksUri)) {
            winston.verbose('[mcp-server] JWKS request already in flight, awaiting result');
            return inflightRequests.get(jwksUri);
        }
        
        // Check cache first
        const cached = jwksCache.get(jwksUri);
        if (cached && Date.now() < cached.expiresAt) {
            winston.verbose('[mcp-server] Returning cached JWKS');
            return cached.data;
        }
        
        // Create promise for in-flight tracking
        const fetchPromise = this._fetchJWKSFromNetwork(jwksUri, cached, options);
        inflightRequests.set(jwksUri, fetchPromise);
        
        try {
            const result = await fetchPromise;
            inflightRequests.delete(jwksUri);
            return result;
        } catch (err) {
            inflightRequests.delete(jwksUri);
            throw err;
        }
    }
    
    /**
     * Internal method to fetch JWKS from network with HTTP caching
     * @private
     */
    static async _fetchJWKSFromNetwork(jwksUri, cached, options) {
        return new Promise((resolve, reject) => {
            const url = new URL(jwksUri);
            const requestOptions = {
                hostname: url.hostname,
                port: url.port || 443,
                path: url.pathname + url.search,
                method: 'GET',
                timeout: JWT_CONFIG.jwks.timeout,
                headers: {
                    'User-Agent': 'NodeBB-MCP-Server/1.0',
                    'Accept': 'application/json'
                }
            };
            
            // Add conditional request headers if we have cached data
            if (cached && cached.etag) {
                requestOptions.headers['If-None-Match'] = cached.etag;
            }
            if (cached && cached.lastModified) {
                requestOptions.headers['If-Modified-Since'] = cached.lastModified;
            }
            
            const req = https.request(requestOptions, (res) => {
                let data = '';
                
                // Handle 304 Not Modified
                if (res.statusCode === 304) {
                    winston.verbose('[mcp-server] JWKS not modified, refreshing cache expiry');
                    cached.expiresAt = this._calculateCacheExpiry(res.headers);
                    jwksCache.set(jwksUri, cached);
                    resolve(cached.data);
                    return;
                }
                
                if (res.statusCode !== 200) {
                    winston.error('[mcp-server] JWKS fetch failed with status:', res.statusCode);
                    reject(new Error('jwks_fetch_failed'));
                    return;
                }
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const jwks = JSON.parse(data);
                        
                        if (!jwks.keys || !Array.isArray(jwks.keys)) {
                            winston.error('[mcp-server] Invalid JWKS format');
                            reject(new Error('invalid_jwks_format'));
                            return;
                        }
                        
                        // Cache the result with HTTP caching metadata
                        const cacheEntry = {
                            data: jwks,
                            etag: res.headers.etag,
                            lastModified: res.headers['last-modified'],
                            expiresAt: this._calculateCacheExpiry(res.headers)
                        };
                        
                        jwksCache.set(jwksUri, cacheEntry);
                        winston.verbose('[mcp-server] JWKS cached successfully');
                        resolve(jwks);
                        
                    } catch (err) {
                        winston.error('[mcp-server] Failed to parse JWKS JSON:', err);
                        reject(new Error('invalid_jwks_format'));
                    }
                });
            });
            
            req.on('timeout', () => {
                winston.error('[mcp-server] JWKS fetch timeout');
                req.destroy();
                reject(new Error('jwks_fetch_failed'));
            });
            
            req.on('error', (err) => {
                winston.error('[mcp-server] JWKS fetch network error:', err);
                reject(new Error('jwks_fetch_failed'));
            });
            
            req.end();
        });
    }
    
    /**
     * Calculate cache expiry from HTTP headers
     * @private
     */
    static _calculateCacheExpiry(headers) {
        const cacheControl = headers['cache-control'];
        if (cacheControl) {
            const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
            if (maxAgeMatch) {
                return Date.now() + (parseInt(maxAgeMatch[1]) * 1000);
            }
        }
        
        // Fallback to default TTL
        return Date.now() + JWT_CONFIG.jwks.cacheMaxAge;
    }
    
    /**
     * Extract RSA public key from JWK
     * @param {Object} jwk - JSON Web Key object
     * @returns {string} PEM formatted public key
     */
    static extractPublicKeyFromJWK(jwk) {
        winston.verbose('[mcp-server] Extracting public key from JWK');
        
        // Key format validation: kty=RSA, use=sig(or unspecified), alg RS256 compatible, key_ops includes verify
        if (jwk.kty !== 'RSA') {
            winston.verbose('[mcp-server] JWK is not RSA key type:', jwk.kty);
            throw new Error('invalid_token');
        }
        
        if (jwk.use && jwk.use !== 'sig') {
            winston.verbose('[mcp-server] JWK use is not sig:', jwk.use);
            throw new Error('invalid_token');
        }
        
        if (jwk.alg && !jwk.alg.startsWith('RS')) {
            winston.verbose('[mcp-server] JWK alg is not RS* compatible:', jwk.alg);
            throw new Error('invalid_token');
        }
        
        if (jwk.key_ops && Array.isArray(jwk.key_ops) && !jwk.key_ops.includes('verify')) {
            winston.verbose('[mcp-server] JWK key_ops does not include verify');
            throw new Error('invalid_token');
        }
        
        if (!jwk.n || !jwk.e) {
            winston.verbose('[mcp-server] JWK missing required RSA parameters n or e');
            throw new Error('invalid_token');
        }
        
        try {
            // Extract RSA public key parameters (n, e) and convert to PEM format
            const nBuffer = Buffer.from(jwk.n, 'base64url');
            const eBuffer = Buffer.from(jwk.e, 'base64url');
            
            // Create RSA public key using crypto module
            const keyObject = crypto.createPublicKey({
                key: {
                    kty: 'RSA',
                    n: jwk.n,
                    e: jwk.e
                },
                format: 'jwk'
            });
            
            const pemKey = keyObject.export({
                type: 'spki',
                format: 'pem'
            });
            
            winston.verbose('[mcp-server] Successfully extracted RSA public key');
            return pemKey;
            
        } catch (err) {
            winston.error('[mcp-server] Failed to extract RSA public key:', err);
            throw new Error('invalid_token');
        }
    }
    
    /**
     * Verify JWT signature using RSA public key
     * @param {string} token - JWT token
     * @param {string} publicKeyPEM - PEM formatted public key
     * @returns {boolean} Signature verification result
     */
    static verifyJWTSignature(token, publicKeyPEM) {
        winston.verbose('[mcp-server] Verifying JWT signature');
        
        try {
            // JWT header/payload and signature separation
            const parts = token.split('.');
            const header = parts[0];
            const payload = parts[1];
            const signature = parts[2];
            
            // Create signing input (header.payload)
            const signingInput = `${header}.${payload}`;
            
            // RS256 signature verification algorithm execution
            const verifier = crypto.createVerify('RSA-SHA256');
            verifier.update(signingInput);
            
            // Decode signature from base64url
            const signatureBuffer = Buffer.from(signature, 'base64url');
            
            // Cryptographic signature validity verification
            const isValid = verifier.verify(publicKeyPEM, signatureBuffer);
            
            winston.verbose('[mcp-server] JWT signature verification result:', isValid);
            return isValid;
            
        } catch (err) {
            winston.error('[mcp-server] JWT signature verification error:', err);
            return false;
        }
    }
    
    /**
     * Validate JWT standard claims
     * @param {Object} payload - Decoded JWT payload
     * @param {Object} options - Validation options
     * @returns {boolean} Claims validation result
     */
    static validateJWTClaims(payload, options = {}) {
        winston.verbose('[mcp-server] Validating JWT claims');
        
        const now = Math.floor(Date.now() / 1000);
        const clockSkew = options.clockSkew || 0;
        
        // issuer validation: options.expectedIssuer vs payload.iss
        if (options.expectedIssuer && payload.iss !== options.expectedIssuer) {
            winston.verbose('[mcp-server] JWT issuer mismatch. Expected:', options.expectedIssuer, 'Got:', payload.iss);
            throw new Error('invalid_issuer');
        }
        
        // audience validation: options.expectedAudience vs payload.aud
        if (options.expectedAudience) {
            let audienceMatch = false;
            if (typeof payload.aud === 'string') {
                audienceMatch = payload.aud === options.expectedAudience;
            } else if (Array.isArray(payload.aud)) {
                audienceMatch = payload.aud.includes(options.expectedAudience);
            }
            
            if (!audienceMatch) {
                winston.verbose('[mcp-server] JWT audience mismatch. Expected:', options.expectedAudience, 'Got:', payload.aud);
                throw new Error('invalid_audience');
            }
        }
        
        // expiration validation: current time vs payload.exp
        if (payload.exp && (now - clockSkew) >= payload.exp) {
            winston.verbose('[mcp-server] JWT token expired. Current:', now, 'Exp:', payload.exp);
            throw new Error('expired_token');
        }
        
        // not before validation: current time vs payload.nbf
        if (payload.nbf && (now + clockSkew) < payload.nbf) {
            winston.verbose('[mcp-server] JWT token not yet active. Current:', now, 'NBF:', payload.nbf);
            throw new Error('token_not_active');
        }
        
        // issued at validation: payload.iat validity (should not be in future)
        if (payload.iat && (payload.iat - clockSkew) > now) {
            winston.verbose('[mcp-server] JWT issued in future. Current:', now, 'IAT:', payload.iat);
            throw new Error('invalid_token');
        }
        
        winston.verbose('[mcp-server] JWT claims validation successful');
        return true;
    }
    
    /**
     * Validate token scopes against required scopes
     * @param {Array<string>} tokenScopes - Scopes from JWT token
     * @param {Array<string>} requiredScopes - Required scopes for operation
     * @returns {boolean} True if token has sufficient scopes
     */
    static validateScopes(tokenScopes, requiredScopes) {
        winston.verbose('[mcp-server] Validating token scopes');
        
        if (!Array.isArray(tokenScopes)) {
            winston.verbose('[mcp-server] Token scopes is not an array');
            return false;
        }
        
        if (!Array.isArray(requiredScopes) || requiredScopes.length === 0) {
            winston.verbose('[mcp-server] No required scopes, validation passes');
            return true;
        }
        
        for (const requiredScope of requiredScopes) {
            if (!tokenScopes.includes(requiredScope)) {
                winston.verbose('[mcp-server] Missing required scope:', requiredScope);
                return false;
            }
        }
        
        winston.verbose('[mcp-server] All required scopes present');
        return true;
    }
    
    /**
     * Create standardized authentication context
     * @param {Object} tokenPayload - Decoded JWT payload
     * @returns {Object} Standardized auth context
     */
    static createAuthContext(tokenPayload) {
        winston.verbose('[mcp-server] Creating authentication context');
        
        if (!tokenPayload || typeof tokenPayload !== 'object') {
            throw new Error('Invalid token payload');
        }
        
        // Normalize scopes from various JWT formats
        let scopes = [];
        if (tokenPayload.scope && typeof tokenPayload.scope === 'string') {
            scopes = tokenPayload.scope.split(' ');
        } else if (Array.isArray(tokenPayload.scp)) {
            scopes = tokenPayload.scp;
        } else if (Array.isArray(tokenPayload.scopes)) {
            scopes = tokenPayload.scopes;
        }
        
        const authContext = {
            userId: tokenPayload.sub || null,
            username: tokenPayload.preferred_username || tokenPayload.username || null,
            scopes: scopes,
            issuer: tokenPayload.iss || null,
            audience: tokenPayload.aud || null,
            tokenId: tokenPayload.jti || null,
            issuedAt: tokenPayload.iat ? new Date(tokenPayload.iat * 1000) : null,
            notBefore: tokenPayload.nbf ? new Date(tokenPayload.nbf * 1000) : null,
            expiresAt: tokenPayload.exp ? new Date(tokenPayload.exp * 1000) : null,
            claims: tokenPayload
        };
        
        winston.verbose('[mcp-server] Authentication context created for user:', authContext.userId);
        return authContext;
    }
    
    /**
     * Send 403 Forbidden response for insufficient scope
     * @param {Object} res - Express response object
     * @param {Object} options - Error options
     */
    static send403Response(res, options = {}) {
        winston.verbose('[mcp-server] Sending 403 Forbidden response');
        
        // Check if headers have already been sent
        if (res.headersSent) {
            winston.warn('[mcp-server] Headers already sent, cannot send 403 response');
            return;
        }
        
        try {
            const wwwAuthHeader = this.generateWWWAuthenticateHeader({
                realm: options.realm,
                error: options.error || 'insufficient_scope',
                errorDescription: options.errorDescription,
                scope: options.scope
            });
            
            // Set security headers
            res.set({
                'WWW-Authenticate': wwwAuthHeader,
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store',
                'Pragma': 'no-cache'
            });
            
            res.status(403);
            
            // Create minimal JSON body
            const body = {};
            if (options.error) {
                body.error = options.error;
            }
            if (options.errorDescription) {
                body.error_description = options.errorDescription;
            }
            
            res.json(body);
            winston.verbose('[mcp-server] 403 response sent successfully');
            
        } catch (err) {
            winston.error('[mcp-server] Error sending 403 response:', err);
            throw err;
        }
    }
}

module.exports = MCPAuth;