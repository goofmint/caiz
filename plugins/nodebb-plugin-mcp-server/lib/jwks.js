'use strict';

const crypto = require('crypto');
const winston = require.main.require('winston');
const nconf = require.main.require('nconf');

/**
 * JWKS (JSON Web Key Set) management for MCP server
 * Provides RSA key pair generation and JWKS endpoint functionality
 */
class JWKSManager {
    constructor() {
        this.keyPair = null;
        this.jwks = null;
        this.keyId = null;
    }

    /**
     * Initialize JWKS manager with key pair generation
     */
    async initialize() {
        winston.verbose('[mcp-server] Initializing JWKS manager');
        
        try {
            // Generate or load RSA key pair
            await this.ensureKeyPair();
            
            // Generate JWKS from public key
            this.generateJWKS();
            
            winston.info('[mcp-server] JWKS manager initialized successfully');
        } catch (err) {
            winston.error('[mcp-server] Failed to initialize JWKS manager:', err);
            throw err;
        }
    }

    /**
     * Ensure RSA key pair exists (generate if needed)
     */
    async ensureKeyPair() {
        // For this implementation, generate a new key pair each time
        // In production, you'd want to persist and reuse keys
        winston.verbose('[mcp-server] Generating new RSA key pair');
        
        const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem'
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem'
            }
        });
        
        this.keyPair = { publicKey, privateKey };
        this.keyId = this.generateKeyId();
        
        winston.verbose('[mcp-server] RSA key pair generated with kid:', this.keyId);
    }

    /**
     * Generate a key ID for the RSA key pair
     */
    generateKeyId() {
        // Generate a simple key ID based on current timestamp and random
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).slice(2, 8);
        return `mcp-key-${timestamp}-${random}`;
    }

    /**
     * Generate JWKS from the current public key
     */
    generateJWKS() {
        if (!this.keyPair || !this.keyPair.publicKey) {
            throw new Error('No public key available for JWKS generation');
        }

        winston.verbose('[mcp-server] Generating JWKS from RSA public key');

        // Extract RSA public key components
        const publicKeyObject = crypto.createPublicKey(this.keyPair.publicKey);
        const publicKeyDetails = publicKeyObject.asymmetricKeyDetails;
        
        // Get modulus and exponent from the public key
        const keyData = publicKeyObject.export({ format: 'jwk' });
        
        // Create JWK (JSON Web Key)
        const jwk = {
            kty: 'RSA',
            use: 'sig',
            alg: 'RS256',
            kid: this.keyId,
            n: keyData.n,
            e: keyData.e
        };

        // Create JWKS (JSON Web Key Set)
        this.jwks = {
            keys: [jwk]
        };

        winston.verbose('[mcp-server] JWKS generated successfully');
    }

    /**
     * Get the JWKS for the /.well-known/jwks.json endpoint
     * @returns {Object} JWKS object
     */
    getJWKS() {
        if (!this.jwks) {
            throw new Error('JWKS not initialized');
        }
        return this.jwks;
    }

    /**
     * Sign a JWT token using the current private key
     * @param {Object} payload - JWT payload
     * @param {Object} options - Signing options
     * @returns {string} Signed JWT token
     */
    signJWT(payload, options = {}) {
        if (!this.keyPair || !this.keyPair.privateKey) {
            throw new Error('No private key available for JWT signing');
        }

        winston.verbose('[mcp-server] Signing JWT token');

        // Create JWT header
        const header = {
            alg: 'RS256',
            typ: 'JWT',
            kid: this.keyId
        };

        // Encode header and payload
        const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
        const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));
        
        // Create signing input
        const signingInput = `${encodedHeader}.${encodedPayload}`;
        
        // Sign with RSA-SHA256
        const signature = crypto.sign('RSA-SHA256', Buffer.from(signingInput), {
            key: this.keyPair.privateKey,
            padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
        });
        
        const encodedSignature = this.base64UrlEncode(signature);
        
        const jwt = `${signingInput}.${encodedSignature}`;
        winston.verbose('[mcp-server] JWT token signed successfully');
        
        return jwt;
    }

    /**
     * Create a test JWT token for authentication testing
     * @param {Object} userInfo - User information
     * @returns {string} Test JWT token
     */
    createTestToken(userInfo = {}) {
        const now = Math.floor(Date.now() / 1000);
        
        const payload = {
            iss: 'https://caiz.test',
            aud: 'mcp-api',
            sub: userInfo.userId || 'test-user-123',
            iat: now,
            exp: now + 3600, // 1 hour
            scope: userInfo.scopes ? userInfo.scopes.join(' ') : 'mcp:read mcp:write',
            preferred_username: userInfo.username || 'test-user',
            name: userInfo.name || 'Test User',
            email: userInfo.email || 'test@example.com'
        };

        return this.signJWT(payload);
    }

    /**
     * Base64 URL encode
     * @param {string|Buffer} data - Data to encode
     * @returns {string} Base64 URL encoded string
     */
    base64UrlEncode(data) {
        const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
        return buffer
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }

    /**
     * Get current key ID
     * @returns {string} Current key ID
     */
    getCurrentKeyId() {
        return this.keyId;
    }

    /**
     * Get current public key in PEM format
     * @returns {string} Public key PEM
     */
    getCurrentPublicKey() {
        if (!this.keyPair || !this.keyPair.publicKey) {
            throw new Error('No public key available');
        }
        return this.keyPair.publicKey;
    }
}

// Singleton instance
const jwksManager = new JWKSManager();

module.exports = jwksManager;