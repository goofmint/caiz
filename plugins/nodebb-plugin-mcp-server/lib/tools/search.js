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
            limit: {
                type: 'integer',
                description: 'Maximum number of results to return (default: 20)',
                minimum: 1,
                maximum: 100,
                default: 20
            }
        },
        required: ['query'],
        additionalProperties: false
    }
};

module.exports = searchTool;