'use strict';

/**
 * Read tool definition
 * Reads specific NodeBB content by ID
 */
const readTool = {
    name: 'read',
    description: 'Read specific NodeBB content by ID',
    inputSchema: {
        type: 'object',
        properties: {
            type: {
                type: 'string',
                description: 'Type of content to read',
                enum: ['topic', 'post', 'user', 'category']
            },
            id: {
                type: 'string',
                description: 'Unique identifier of the content',
                minLength: 1
            }
        },
        required: ['type', 'id'],
        additionalProperties: false
    }
};

module.exports = readTool;