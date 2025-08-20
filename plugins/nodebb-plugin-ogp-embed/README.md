# NodeBB OGP Embed Plugin

A NodeBB plugin that automatically embeds Open Graph Protocol (OGP) previews for URLs in posts.

## Features

- Automatic URL detection in posts
- Rich preview cards with OGP metadata
- Caching for improved performance
- Responsive design
- Dark theme support
- XSS protection

## Installation

1. Copy the plugin to your NodeBB plugins directory:
   ```bash
   cp -r nodebb-plugin-ogp-embed /path/to/nodebb/node_modules/
   ```

2. Install plugin dependencies:
   ```bash
   cd /path/to/nodebb/node_modules/nodebb-plugin-ogp-embed
   npm install
   ```

3. Activate the plugin in NodeBB admin panel or via CLI:
   ```bash
   ./nodebb activate nodebb-plugin-ogp-embed
   ```

4. Rebuild and restart NodeBB:
   ```bash
   ./nodebb build
   ./nodebb restart
   ```

## Usage

The plugin automatically detects URLs at the beginning of lines in posts and replaces them with OGP preview cards. It supports:

- Plain URLs: `https://example.com`
- Markdown links: `[Link text](https://example.com)`

## Configuration

Currently, the plugin uses default settings:

- Cache TTL: 24 hours
- Request timeout: 5 seconds
- User agent: Mozilla/5.0 (compatible; NodeBB OGP Embed Bot/1.0)

## API Endpoints

### Fetch OGP Data
```
GET /api/ogp-embed/fetch?url={url}
```
Returns OGP metadata for the specified URL.

### Clear Cache (Admin only)
```
POST /api/ogp-embed/cache/clear
Body: { "url": "https://example.com" }
```
Clears cache for a specific URL or all URLs if no URL is provided.

## Security

The plugin includes several security measures:

- SSRF protection (blocks private IPs)
- XSS protection (HTML escaping)
- URL validation
- Request timeout limits

## Styling

The plugin includes responsive styles that adapt to both light and dark themes. Cards are styled using Bootstrap-compatible classes.

## License

MIT