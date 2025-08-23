'use strict';

const winston = require.main.require('winston');
const db = require.main.require('./src/database');
const meta = require.main.require('./src/meta');

const HealthChecker = {
    /**
     * Check overall system health
     * @returns {Object} Health check results
     */
    async checkHealth() {
        const checks = {
            database: false,
            redis: false,
            filesystem: false,
            memory: false
        };
        
        try {
            // Check database
            checks.database = await this.checkDatabase();
            
            // Check Redis/cache
            checks.redis = await this.checkRedis();
            
            // Check filesystem
            checks.filesystem = this.checkFilesystem();
            
            // Check memory usage
            checks.memory = this.checkMemory();
            
            // Overall health status
            const healthy = Object.values(checks).every(status => status === true);
            
            return {
                healthy,
                checks,
                timestamp: Date.now()
            };
        } catch (err) {
            winston.error('[mcp-server] Health check failed:', err);
            return {
                healthy: false,
                checks,
                error: err.message,
                timestamp: Date.now()
            };
        }
    },
    
    /**
     * Check NodeBB database connectivity
     * @returns {boolean} Database health status
     */
    async checkDatabase() {
        try {
            // Try to perform a simple database operation
            const testKey = 'mcp:health:check';
            const testValue = Date.now();
            
            await db.set(testKey, testValue);
            const retrievedValue = await db.get(testKey);
            await db.delete(testKey);
            
            return retrievedValue == testValue;
        } catch (err) {
            winston.error('[mcp-server] Database check failed:', err);
            return false;
        }
    },
    
    /**
     * Check Redis/cache connectivity
     * @returns {boolean} Redis health status
     */
    async checkRedis() {
        try {
            // Check if cache is available
            const cache = require.main.require('./src/cache');
            if (cache && cache.enabled) {
                // Try a simple cache operation
                const testKey = 'mcp:health:cache';
                const testValue = { test: Date.now() };
                
                await cache.set(testKey, testValue, 10);
                const retrieved = await cache.get(testKey);
                await cache.del(testKey);
                
                return retrieved && retrieved.test === testValue.test;
            }
            return true; // Cache not required
        } catch (err) {
            winston.warn('[mcp-server] Redis check failed:', err);
            return true; // Redis is optional in NodeBB
        }
    },
    
    /**
     * Check filesystem accessibility
     * @returns {boolean} Filesystem health status
     */
    checkFilesystem() {
        try {
            const fs = require('fs');
            const path = require('path');
            
            // Get NodeBB's upload path
            const nconf = require.main.require('nconf');
            const uploadPath = nconf.get('upload_path') || path.join(nconf.get('base_dir'), 'public', 'uploads');
            
            // Check if upload directory exists and is accessible
            if (!fs.existsSync(uploadPath)) {
                winston.warn('[mcp-server] Upload path does not exist:', uploadPath);
                return false;
            }
            
            const uploadStat = fs.statSync(uploadPath);
            if (!uploadStat.isDirectory()) {
                winston.warn('[mcp-server] Upload path is not a directory:', uploadPath);
                return false;
            }
            
            // Try to access the directory (read permission test)
            fs.readdirSync(uploadPath);
            
            return true;
        } catch (err) {
            winston.warn('[mcp-server] Filesystem check failed:', err);
            return false;
        }
    },
    
    /**
     * Check memory usage
     * @returns {boolean} Memory health status
     */
    checkMemory() {
        try {
            const usage = process.memoryUsage();
            const heapUsedPercent = (usage.heapUsed / usage.heapTotal) * 100;
            
            // Warn if heap usage is over 98% (more lenient for development)
            if (heapUsedPercent > 98) {
                winston.warn('[mcp-server] High memory usage detected:', {
                    heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + 'MB',
                    heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + 'MB',
                    percentage: heapUsedPercent.toFixed(2) + '%'
                });
                return false;
            }
            
            return true;
        } catch (err) {
            winston.error('[mcp-server] Memory check failed:', err);
            return false;
        }
    },
    
    /**
     * Get system version information
     * @returns {Object} Version information
     */
    getVersionInfo() {
        try {
            const packageInfo = require('../package.json');
            const nodebbVersion = require.main.require('./package.json').version;
            
            return {
                plugin: packageInfo.version,
                nodebb: nodebbVersion,
                node: process.version,
                platform: process.platform,
                arch: process.arch
            };
        } catch (err) {
            winston.error('[mcp-server] Failed to get version info:', err);
            return {
                error: 'Failed to retrieve version information'
            };
        }
    }
};

module.exports = HealthChecker;