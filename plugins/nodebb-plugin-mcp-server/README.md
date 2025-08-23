# NodeBB MCP Server Plugin

MCP (Model Context Protocol) server implementation for NodeBB.

## Features

- Health check endpoint (`/api/mcp/health`)
- Server metadata endpoint (`/api/mcp/metadata`)
- Capabilities endpoint (`/api/mcp/capabilities`)
- Admin dashboard for monitoring
- System health monitoring (database, cache, filesystem, memory)

## Installation

```bash
npm install nodebb-plugin-mcp-server
```

Then activate the plugin in the NodeBB Admin Control Panel.

## API Endpoints

### GET /api/mcp/health
Returns the health status of the MCP server.

### GET /api/mcp/metadata
Returns server metadata including version and protocol information.

### GET /api/mcp/capabilities
Returns the current capabilities of the MCP server.

## Development

This plugin is part of the Caiz.dev NodeBB instance.

## License

MIT