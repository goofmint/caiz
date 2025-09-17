'use strict';

/**
 * Search tool definition
 * Searches NodeBB content including topics, posts, and users
 */
const searchTool = {
    name: 'search',
    description: 'Search NodeBB content including topics, posts, and users',
    inputSchema: {
        type: 'object',
        properties: {
            query: {
                type: 'string',
                description: 'Search query string',
                minLength: 1
            },
            category: {
                type: 'string',
                description: 'Optional category to limit search scope',
                enum: ['topics', 'posts', 'users']
            },
            // Backward-compatible limit support (page/pageSize 推奨)
            limit: {
                type: 'integer',
                description: 'Maximum number of results to return (default: 20)',
                minimum: 1,
                maximum: 100,
                default: 20
            },
            // Advanced filters
            categorySlugs: {
                type: 'array',
                description: 'Category slugs under the community to filter by (flat list)',
                items: { type: 'string', minLength: 1 },
                uniqueItems: true,
                minItems: 1
            },
            includeSubcategories: {
                type: 'boolean',
                description: 'Include descendants of specified categories',
                default: false
            },
            tags: {
                type: 'array',
                description: 'Filter by tags (AND logic within array)',
                items: { type: 'string', minLength: 1 },
                uniqueItems: true,
                minItems: 1
            },
            authorUserIds: {
                type: 'array',
                description: 'Filter by author user IDs',
                items: { type: 'integer', minimum: 1 },
                uniqueItems: true,
                minItems: 1
            },
            authorUsernames: {
                type: 'array',
                description: 'Filter by author usernames',
                items: { type: 'string', minLength: 1 },
                uniqueItems: true,
                minItems: 1
            },
            dateRange: {
                type: 'object',
                description: 'Inclusive date range in ISO 8601',
                properties: {
                    from: { type: 'string', minLength: 1 },
                    to: { type: 'string', minLength: 1 }
                },
                additionalProperties: false
            },
            page: {
                type: 'integer',
                description: 'Page number (1-based)',
                minimum: 1,
                default: 1
            },
            pageSize: {
                type: 'integer',
                description: 'Items per page (default: 20, max: 100)',
                minimum: 1,
                maximum: 100,
                default: 20
            },
            sort: {
                type: 'string',
                description: 'Sort order',
                enum: ['relevance', 'newest', 'oldest'],
                default: 'relevance'
            }
        },
        required: ['query'],
        additionalProperties: false
    }
};

module.exports = searchTool;
