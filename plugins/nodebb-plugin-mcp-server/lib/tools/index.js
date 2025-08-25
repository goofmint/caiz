'use strict';

const searchTool = require('./search');
const readTool = require('./read');

/**
 * All available tool definitions
 */
const BUILTIN_TOOLS = [
    searchTool,
    readTool
];

module.exports = {
    BUILTIN_TOOLS,
    searchTool,
    readTool
};