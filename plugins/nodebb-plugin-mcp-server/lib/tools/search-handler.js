'use strict';

const winston = require.main.require('winston');
const db = require.main.require('./src/database');
const user = require.main.require('./src/user');
const search = require.main.require('./src/search');
const categories = require.main.require('./src/categories');
const privileges = require.main.require('./src/privileges');
const groups = require.main.require('./src/groups');
const utils = require.main.require('./src/utils');
const nconf = require.main.require('nconf');

// Cache implementation using in-memory storage
class SearchCache {
    constructor() {
        this.cache = new Map();
        this.TTL = 5 * 60 * 1000; // 5 minutes
    }

    getCacheKey(query, category, userId, extraKey = '') {
        return `search:${userId}:${category || 'all'}:${query}:${extraKey}`;
    }

    async get(query, category, userId, extraKey = '') {
        const key = this.getCacheKey(query, category, userId, extraKey);
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

    async set(query, category, userId, results, extraKey = '') {
        const key = this.getCacheKey(query, category, userId, extraKey);
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
 * Normalize limit to safe integer within bounds
 */
function normalizeLimit(limit, maxLimit) {
    if (!Number.isFinite(limit)) {
        const parsed = parseInt(limit, 10);
        limit = Number.isFinite(parsed) ? parsed : 20;
    }
    return Math.max(0, Math.min(limit, maxLimit));
}

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
 * Get user's accessible categories
 */
async function getUserAccessibleCategories(userId) {
    try {
        // Get all categories that the user can read
        const allCategories = await categories.buildForSelect(userId, 'read');
        
        if (!allCategories || allCategories.length === 0) {
            return [];
        }
        
        // Extract category IDs
        const categoryIds = allCategories.map(cat => parseInt(cat.cid)).filter(cid => !isNaN(cid));
        
        winston.verbose(`[mcp-server] User ${userId} can access categories: [${categoryIds.join(', ')}]`);
        return categoryIds;
    } catch (err) {
        winston.error('[mcp-server] Error getting user accessible categories:', err);
        return [];
    }
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
        winston.verbose('[mcp-server] searchTopics called for user:', userId);
        
        // Get user's accessible categories
        const accessibleCategories = await getUserAccessibleCategories(userId);
        
        winston.verbose('[mcp-server] User accessible categories for search:', {
            userId: userId,
            categories: accessibleCategories,
            categoryCount: accessibleCategories.length
        });
        
        const searchData = {
            query: query,
            searchIn: 'titlesposts',  // Search in both titles and posts
            matchWords: 'any',
            categories: accessibleCategories,
            uid: userId,
            sortBy: 'relevance',
            sortDirection: 'desc',
            page: 1,
            itemsPerPage: limit
        };
        
        winston.verbose(`[mcp-server] Executing topic search with data - query: "${query}", categories: ${accessibleCategories.length} categories, uid: ${userId}`);
        
        const result = await search.search(searchData);
        
        winston.verbose(`[mcp-server] Topic search result - found ${result?.posts?.length || 0} posts`);
        
        if (!result || !result.posts) {
            return [];
        }
        
        // Filter by permissions and deduplicate topics
        const filtered = [];
        const topicIds = new Set();
        
        for (const post of result.posts) {
            if (!post.topic || topicIds.has(post.topic.tid)) {
                continue;
            }
            
            const hasAccess = await checkContentAccess(userId, post.topic, 'topic');
            if (hasAccess && !post.topic.deleted && !post.deleted) {
                topicIds.add(post.topic.tid);
                const sanitizedContent = utils.stripHTMLTags(post.content || '');
                filtered.push({
                    type: 'topic',
                    id: String(post.topic.tid),
                    title: utils.stripHTMLTags(post.topic.title || ''),
                    content: sanitizedContent,
                    score: post.score || 0,
                    metadata: {
                        author: post.user?.username || 'Unknown',
                        authorUid: post.user?.uid,
                        authorUsername: post.user?.username,
                        category: post.topic.category?.name || '',
                        categorySlug: post.topic.category?.slug || '',
                        tags: Array.isArray(post.topic?.tags) ? post.topic.tags : [],
                        timestamp: new Date(post.topic.timestamp).toISOString(),
                        url: nconf.get('url') + '/topic/' + post.topic.slug
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
        // Get user's accessible categories
        const accessibleCategories = await getUserAccessibleCategories(userId);
        
        const searchData = {
            query: query,
            searchIn: 'titlesposts',  // Search in both titles and posts
            matchWords: 'any',
            categories: accessibleCategories,
            uid: userId,
            sortBy: 'relevance',
            sortDirection: 'desc',
            page: 1,
            itemsPerPage: limit,
            showAs: 'posts'
        };
        
        winston.verbose(`[mcp-server] Executing post search with data - query: "${query}", categories: ${accessibleCategories.length} categories, uid: ${userId}`);
        
        const result = await search.search(searchData);
        
        winston.verbose(`[mcp-server] Post search result - found ${result?.posts?.length || 0} posts`);
        
        if (!result || !result.posts) {
            return [];
        }
        
        // Filter by permissions and deleted status
        const filtered = [];
        for (const post of result.posts) {
            const hasAccess = await checkContentAccess(userId, post, 'post');
            if (hasAccess && !post.deleted) {
                const sanitizedContent = utils.stripHTMLTags(post.content || '');
                filtered.push({
                    type: 'post',
                    id: String(post.pid),
                    title: utils.stripHTMLTags(post.topic?.title || 'Reply'),
                    content: sanitizedContent,
                    score: post.score || 0,
                    metadata: {
                        author: post.user?.username || 'Unknown',
                        authorUid: post.user?.uid,
                        authorUsername: post.user?.username,
                        category: post.topic?.category?.name || '',
                        categorySlug: post.topic?.category?.slug || '',
                        tags: Array.isArray(post.topic?.tags) ? post.topic.tags : [],
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
            
            const sanitizedAboutMe = utils.stripHTMLTags(userData.aboutme || '');
            filtered.push({
                type: 'user',
                id: String(userData.uid),
                title: utils.stripHTMLTags(userData.displayname || userData.username || ''),
                content: sanitizedAboutMe,
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
    
    // Add results as text (simplified format for compatibility)
    for (const result of results) {
        const resultText = formatResultText(result);
        content.push({
            type: 'text',
            text: resultText + '\n\nURL: ' + result.metadata.url
        });
    }
    
    return {
        content: content
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
        content: [
            {
                type: 'text',
                text: `Error: ${userMessage}\nCode: ${errorCode}\nStatus: ${status}`
            }
        ]
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
        traceId = null,
        // Advanced filters
        categorySlugs,
        includeSubcategories = false,
        tags,
        authorUserIds,
        authorUsernames,
        dateRange,
        page = 1,
        pageSize,
        sort = 'relevance'
    } = options;
    
    try {
        // Determine effective page/pageSize (backward-compat with limit)
        const effectivePage = Number.isFinite(page) && page > 0 ? page : 1;
        const basePageSize = Number.isFinite(pageSize) ? pageSize : limit;
        const normalizedLimit = normalizeLimit(basePageSize, maxLimit);
        const effectivePageSize = Math.min(normalizedLimit, maxLimit);
        // To collect enough docs for pagination, fetch up to page*pageSize (capped)
        const fetchLimit = Math.min(maxLimit, effectivePage * effectivePageSize);

        // Validate advanced inputs (no silent fallbacks)
        if (Array.isArray(categorySlugs) && categorySlugs.some(s => typeof s !== 'string' || s.trim() === '')) {
            throw new Error('Invalid params: categorySlugs must be non-empty strings');
        }
        if (Array.isArray(tags) && tags.some(t => typeof t !== 'string' || t.trim() === '')) {
            throw new Error('Invalid params: tags must be non-empty strings');
        }
        if (Array.isArray(authorUserIds) && authorUserIds.some(id => !Number.isInteger(id) || id <= 0)) {
            throw new Error('Invalid params: authorUserIds must be positive integers');
        }
        if (Array.isArray(authorUsernames) && authorUsernames.some(u => typeof u !== 'string' || u.trim() === '')) {
            throw new Error('Invalid params: authorUsernames must be non-empty strings');
        }
        let fromTs = null;
        let toTs = null;
        if (dateRange) {
            if (typeof dateRange !== 'object') {
                throw new Error('Invalid params: dateRange must be object');
            }
            if (dateRange.from) {
                const f = Date.parse(dateRange.from);
                if (Number.isNaN(f)) throw new Error('Invalid params: dateRange.from must be ISO 8601');
                fromTs = f;
            }
            if (dateRange.to) {
                const t = Date.parse(dateRange.to);
                if (Number.isNaN(t)) throw new Error('Invalid params: dateRange.to must be ISO 8601');
                toTs = t;
            }
            if (fromTs !== null && toTs !== null && fromTs > toTs) {
                throw new Error('Invalid params: dateRange.from must be <= dateRange.to');
            }
        }

        // Sanitize query
        const sanitizedQuery = sanitizeSearchQuery(query);

        // Build cache extra key from filters to avoid cross-contamination
        const extraKey = JSON.stringify({
            categorySlugs: Array.isArray(categorySlugs) ? categorySlugs.slice().sort() : undefined,
            includeSubcategories: !!includeSubcategories,
            tags: Array.isArray(tags) ? tags.slice().sort() : undefined,
            authorUserIds: Array.isArray(authorUserIds) ? authorUserIds.slice().sort((a,b)=>a-b) : undefined,
            authorUsernames: Array.isArray(authorUsernames) ? authorUsernames.slice().sort() : undefined,
            dateRange: dateRange || undefined,
            page: effectivePage,
            pageSize: effectivePageSize,
            sort
        });

        // Check cache
        const cached = await searchCache.get(sanitizedQuery, category, userId, extraKey);
        if (cached) {
            const duration = Date.now() - startTime;
            logSearchActivity(userId, sanitizedQuery, category, cached.length, duration);
            // Apply final pagination slice (cached results already reflect filters)
            const offset = (effectivePage - 1) * effectivePageSize;
            const pageResults = cached.slice(offset, offset + effectivePageSize);
            return formatSearchResults(pageResults, sanitizedQuery, category, duration);
        }
        
        // Perform concurrent searches based on category
        const searchPromises = [];
        
        if (!category || category === 'topics') {
            searchPromises.push(searchTopics(sanitizedQuery, userId, fetchLimit));
        }
        
        if (!category || category === 'posts') {
            searchPromises.push(searchPosts(sanitizedQuery, userId, fetchLimit));
        }
        
        if (!category || category === 'users') {
            searchPromises.push(searchUsers(sanitizedQuery, userId, fetchLimit));
        }
        
        // Wait for all searches to complete
        const searchResults = await Promise.all(searchPromises);
        
        // Combine results
        let results = [];
        for (const searchResult of searchResults) {
            if (Array.isArray(searchResult)) {
                results = results.concat(searchResult);
            }
        }
        
        // Apply advanced filters
        if (Array.isArray(categorySlugs) && categorySlugs.length > 0) {
            const allowed = new Set(categorySlugs);
            // Preserve items without metadata or without categorySlug; filter only when present
            results = results.filter(r => (!r.metadata || !('categorySlug' in r.metadata)) ? true : allowed.has(r.metadata.categorySlug));
        }
        if (Array.isArray(tags) && tags.length > 0) {
            const required = new Set(tags);
            results = results.filter(r => Array.isArray(r.metadata?.tags) && [...required].every(t => r.metadata.tags.includes(t)));
        }
        // Author filter preference: IDs > usernames
        if (Array.isArray(authorUserIds) && authorUserIds.length > 0) {
            const idSet = new Set(authorUserIds.map(n => Number(n)));
            results = results.filter(r => typeof r.metadata?.authorUid === 'number' && idSet.has(r.metadata.authorUid));
        } else if (Array.isArray(authorUsernames) && authorUsernames.length > 0) {
            const nameSet = new Set(authorUsernames.map(s => String(s)));
            results = results.filter(r => typeof r.metadata?.authorUsername === 'string' && nameSet.has(r.metadata.authorUsername));
        }
        if (fromTs !== null || toTs !== null) {
            results = results.filter(r => {
                const ts = Date.parse(r.metadata?.timestamp || '');
                if (Number.isNaN(ts)) return false;
                if (fromTs !== null && ts < fromTs) return false;
                if (toTs !== null && ts > toTs) return false;
                return true;
            });
        }

        // Sort
        if (sort === 'newest') {
            results.sort((a, b) => new Date(b.metadata?.timestamp || 0) - new Date(a.metadata?.timestamp || 0));
        } else if (sort === 'oldest') {
            results.sort((a, b) => new Date(a.metadata?.timestamp || 0) - new Date(b.metadata?.timestamp || 0));
        } else {
            // relevance (default)
            results.sort((a, b) => (b.score || 0) - (a.score || 0));
        }
        
        // Final pagination
        const offset = (effectivePage - 1) * effectivePageSize;
        results = results.slice(offset, offset + effectivePageSize);
        
        // Cache results
        await searchCache.set(sanitizedQuery, category, userId, results, extraKey);
        
        // Log activity
        const duration = Date.now() - startTime;
        logSearchActivity(userId, sanitizedQuery, category, results.length, duration);
        
        // Format and return
        const formattedResult = formatSearchResults(results, sanitizedQuery, category, duration);
        winston.verbose('[mcp-server] Search result format:', JSON.stringify(formattedResult, null, 2));
        return formattedResult;
        
    } catch (err) {
        const duration = Date.now() - startTime;
        logSearchActivity(userId, query, category, -1, duration);
        const errorResult = handleSearchError(err, query, category);
        winston.verbose('[mcp-server] Search error result format:', JSON.stringify(errorResult, null, 2));
        return errorResult;
    }
}

module.exports = {
    executeSearch,
    sanitizeSearchQuery,
    handleSearchError
};
