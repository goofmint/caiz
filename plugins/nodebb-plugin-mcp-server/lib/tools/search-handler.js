'use strict';

const winston = require.main.require('winston');
const db = require.main.require('./src/database');
const user = require.main.require('./src/user');
const topics = require.main.require('./src/topics');
const posts = require.main.require('./src/posts');
const categories = require.main.require('./src/categories');
const privileges = require.main.require('./src/privileges');
const nconf = require.main.require('nconf');

// Cache implementation using in-memory storage
class SearchCache {
    constructor() {
        this.cache = new Map();
        this.TTL = 5 * 60 * 1000; // 5 minutes
    }

    getCacheKey(query, category, userId) {
        return `search:${userId}:${category || 'all'}:${query}`;
    }

    async get(query, category, userId) {
        const key = this.getCacheKey(query, category, userId);
        const cached = this.cache.get(key);
        
        if (!cached) {
            return null;
        }
        
        // Check if expired
        if (Date.now() - cached.timestamp > this.TTL) {
            this.cache.delete(key);
            return null;
        }
        
        return cached.data;
    }

    async set(query, category, userId, results) {
        const key = this.getCacheKey(query, category, userId);
        this.cache.set(key, {
            data: results,
            timestamp: Date.now()
        });
        
        // Clean up old entries periodically
        if (this.cache.size > 1000) {
            const now = Date.now();
            for (const [k, v] of this.cache.entries()) {
                if (now - v.timestamp > this.TTL) {
                    this.cache.delete(k);
                }
            }
        }
    }
}

const searchCache = new SearchCache();

/**
 * Sanitize search query to prevent injection attacks
 */
function sanitizeSearchQuery(query) {
    if (!query || typeof query !== 'string') {
        throw new Error('Invalid query');
    }
    
    // Enforce max length
    if (query.length > 500) {
        query = query.substring(0, 500);
    }
    
    // Normalize using NFKC
    query = query.normalize('NFKC');
    
    // Remove or escape dangerous query operators
    const dangerousChars = /[*?~:(){}[\]&|!^"\\]/g;
    query = query.replace(dangerousChars, ' ');
    
    // Limit complexity - max 20 terms
    const terms = query.split(/\s+/).filter(t => t.length > 0);
    if (terms.length > 20) {
        query = terms.slice(0, 20).join(' ');
    }
    
    // Trim whitespace
    query = query.trim();
    
    if (!query) {
        throw new Error('Query is empty after sanitization');
    }
    
    return query;
}

/**
 * Check content access permissions
 */
async function checkContentAccess(userId, content, contentType) {
    try {
        if (contentType === 'topic') {
            const canRead = await privileges.topics.can('topics:read', content.tid, userId);
            return canRead;
        } else if (contentType === 'post') {
            const canRead = await privileges.posts.can('posts:view_deleted', content.pid, userId);
            return canRead;
        } else if (contentType === 'category') {
            const canRead = await privileges.categories.can('categories:read', content.cid, userId);
            return canRead;
        }
        return true;
    } catch (err) {
        winston.error('[mcp-server] Error checking content access:', err);
        return false;
    }
}

/**
 * Search topics in NodeBB
 */
async function searchTopics(query, userId, limit) {
    try {
        const searchData = {
            query: query,
            searchIn: 'titles',
            matchWords: 'any',
            categories: [],
            uid: userId,
            sortBy: 'relevance',
            sortDirection: 'desc',
            page: 1,
            itemsPerPage: limit
        };
        
        const result = await topics.search(searchData);
        
        if (!result || !result.topics) {
            return [];
        }
        
        // Filter by permissions
        const filtered = [];
        for (const topic of result.topics) {
            const hasAccess = await checkContentAccess(userId, topic, 'topic');
            if (hasAccess && !topic.deleted) {
                filtered.push({
                    type: 'topic',
                    id: String(topic.tid),
                    title: topic.title || '',
                    content: topic.teaser?.content || '',
                    score: topic.score || 0,
                    metadata: {
                        author: topic.user?.username || 'Unknown',
                        category: topic.category?.name || '',
                        timestamp: new Date(topic.timestamp).toISOString(),
                        url: nconf.get('url') + '/topic/' + topic.slug
                    }
                });
            }
        }
        
        return filtered;
    } catch (err) {
        winston.error('[mcp-server] Error searching topics:', err);
        throw err;
    }
}

/**
 * Search posts in NodeBB
 */
async function searchPosts(query, userId, limit) {
    try {
        const searchData = {
            query: query,
            searchIn: 'posts', 
            matchWords: 'any',
            categories: [],
            uid: userId,
            sortBy: 'relevance',
            sortDirection: 'desc',
            page: 1,
            itemsPerPage: limit,
            showAs: 'posts'
        };
        
        const result = await posts.search(searchData);
        
        if (!result || !result.posts) {
            return [];
        }
        
        // Filter by permissions and deleted status
        const filtered = [];
        for (const post of result.posts) {
            const hasAccess = await checkContentAccess(userId, post, 'post');
            if (hasAccess && !post.deleted) {
                filtered.push({
                    type: 'post',
                    id: String(post.pid),
                    title: post.topic?.title || 'Reply',
                    content: post.content || '',
                    score: post.score || 0,
                    metadata: {
                        author: post.user?.username || 'Unknown',
                        category: post.category?.name || '',
                        timestamp: new Date(post.timestamp).toISOString(),
                        url: nconf.get('url') + '/post/' + post.pid
                    }
                });
            }
        }
        
        return filtered;
    } catch (err) {
        winston.error('[mcp-server] Error searching posts:', err);
        throw err;
    }
}

/**
 * Search users in NodeBB with PII protection
 */
async function searchUsers(query, userId, limit) {
    try {
        // Use timing-safe comparison to prevent enumeration attacks
        const startTime = Date.now();
        
        const result = await user.search({
            query: query,
            uid: userId,
            paginate: false
        });
        
        // Add artificial delay to prevent timing attacks
        const elapsed = Date.now() - startTime;
        if (elapsed < 50) {
            await new Promise(resolve => setTimeout(resolve, 50 - elapsed));
        }
        
        if (!result || !result.users) {
            return [];
        }
        
        // Filter and sanitize user data
        const filtered = [];
        const maxResults = Math.min(limit, result.users.length);
        
        for (let i = 0; i < maxResults; i++) {
            const userData = result.users[i];
            
            // Skip banned/inactive users
            if (userData.banned || !userData.userslug) {
                continue;
            }
            
            // Round lastOnline to nearest hour for privacy
            let lastOnline = '';
            if (userData.lastonline) {
                const date = new Date(userData.lastonline);
                date.setMinutes(0, 0, 0);
                lastOnline = date.toISOString();
            }
            
            filtered.push({
                type: 'user',
                id: String(userData.uid),
                title: userData.displayname || userData.username || '',
                content: userData.aboutme || '',
                score: userData.score || 0,
                metadata: {
                    author: userData.username || '',
                    category: 'users',
                    timestamp: lastOnline,
                    url: nconf.get('url') + '/user/' + userData.userslug
                }
            });
        }
        
        return filtered;
    } catch (err) {
        winston.error('[mcp-server] Error searching users:', err);
        throw err;
    }
}

/**
 * Format search results for MCP
 */
function formatSearchResults(results, query, category, searchTime) {
    const content = [];
    
    // Add summary
    const summary = generateSearchSummary(results, query, category, searchTime);
    content.push({
        type: 'text',
        text: summary
    });
    
    // Add results as resources
    for (const result of results) {
        content.push({
            type: 'resource',
            resource: {
                uri: result.metadata.url,
                name: result.title,
                description: result.content.substring(0, 200) + (result.content.length > 200 ? '...' : ''),
                mimeType: 'text/html'
            },
            text: formatResultText(result)
        });
    }
    
    return {
        content: content,
        isError: false
    };
}

/**
 * Generate search summary
 */
function generateSearchSummary(results, query, category, searchTime) {
    const lines = [];
    
    lines.push(`Search results for: "${query}"`);
    lines.push(`Category: ${category || 'all'}`);
    lines.push(`Found: ${results.length} result(s)`);
    lines.push(`Search time: ${searchTime}ms`);
    
    // Category breakdown
    const breakdown = {};
    for (const result of results) {
        breakdown[result.type] = (breakdown[result.type] || 0) + 1;
    }
    
    if (Object.keys(breakdown).length > 0) {
        lines.push('');
        lines.push('Results by type:');
        for (const [type, count] of Object.entries(breakdown)) {
            lines.push(`  - ${type}: ${count}`);
        }
    }
    
    return lines.join('\n');
}

/**
 * Format individual result text
 */
function formatResultText(result) {
    const lines = [];
    lines.push(`[${result.type.toUpperCase()}] ${result.title}`);
    
    if (result.metadata.author) {
        lines.push(`By: ${result.metadata.author}`);
    }
    
    if (result.content) {
        const preview = result.content.substring(0, 150);
        lines.push(preview + (result.content.length > 150 ? '...' : ''));
    }
    
    return lines.join('\n');
}

/**
 * Handle search errors with proper classification
 */
function handleSearchError(error, query, category) {
    winston.error('[mcp-server] Search error:', {
        error: error.message,
        stack: error.stack,
        query: query,
        category: category
    });
    
    let errorCode = 'unknown';
    let status = 500;
    let userMessage = 'An error occurred during search. Please try again later.';
    
    // Classify error
    if (error.message && error.message.includes('Invalid query')) {
        errorCode = 'validation';
        status = 400;
        userMessage = 'Invalid search query. Please check your input and try again.';
    } else if (error.message && error.message.includes('unauthorized')) {
        errorCode = 'auth';
        status = 403;
        userMessage = 'You are not authorized to perform this search.';
    } else if (error.message && error.message.includes('rate limit')) {
        errorCode = 'rate-limit';
        status = 429;
        userMessage = 'Too many search requests. Please wait and try again.';
    } else if (error.message && error.message.includes('timeout')) {
        errorCode = 'timeout';
        status = 504;
        userMessage = 'Search request timed out. Please try again with a simpler query.';
    } else if (error.message && error.message.includes('provider')) {
        errorCode = 'provider-error';
        status = 502;
        userMessage = 'Search service is temporarily unavailable. Please try again later.';
    }
    
    return {
        isError: true,
        code: errorCode,
        status: status,
        message: userMessage
    };
}

/**
 * Log search activity
 */
function logSearchActivity(userId, query, category, resultCount, duration) {
    winston.verbose('[mcp-server] Search activity:', {
        userId: userId,
        query: query.substring(0, 100), // Truncate for logs
        category: category,
        resultCount: resultCount,
        duration: duration,
        timestamp: new Date().toISOString()
    });
}

/**
 * Main search execution function
 */
async function executeSearch(query, category, options = {}) {
    const startTime = Date.now();
    const {
        userId = 0,
        roles = [],
        locale = 'en',
        cursor = null,
        limit = 20,
        maxLimit = 50,
        signal = null,
        traceId = null
    } = options;
    
    try {
        // Enforce limit
        const effectiveLimit = Math.min(limit, maxLimit);
        
        // Sanitize query
        const sanitizedQuery = sanitizeSearchQuery(query);
        
        // Check cache
        const cached = await searchCache.get(sanitizedQuery, category, userId);
        if (cached) {
            const duration = Date.now() - startTime;
            logSearchActivity(userId, sanitizedQuery, category, cached.length, duration);
            return formatSearchResults(cached, sanitizedQuery, category, duration);
        }
        
        // Perform search based on category
        let results = [];
        
        if (!category || category === 'topics') {
            const topicResults = await searchTopics(sanitizedQuery, userId, effectiveLimit);
            results = results.concat(topicResults);
        }
        
        if (!category || category === 'posts') {
            const postResults = await searchPosts(sanitizedQuery, userId, effectiveLimit);
            results = results.concat(postResults);
        }
        
        if (!category || category === 'users') {
            const userResults = await searchUsers(sanitizedQuery, userId, effectiveLimit);
            results = results.concat(userResults);
        }
        
        // Sort by score
        results.sort((a, b) => (b.score || 0) - (a.score || 0));
        
        // Apply final limit
        if (results.length > effectiveLimit) {
            results = results.slice(0, effectiveLimit);
        }
        
        // Cache results
        await searchCache.set(sanitizedQuery, category, userId, results);
        
        // Log activity
        const duration = Date.now() - startTime;
        logSearchActivity(userId, sanitizedQuery, category, results.length, duration);
        
        // Format and return
        return formatSearchResults(results, sanitizedQuery, category, duration);
        
    } catch (err) {
        const duration = Date.now() - startTime;
        logSearchActivity(userId, query, category, -1, duration);
        return handleSearchError(err, query, category);
    }
}

module.exports = {
    executeSearch,
    sanitizeSearchQuery,
    handleSearchError
};