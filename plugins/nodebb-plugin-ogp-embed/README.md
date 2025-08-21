# NodeBB OGP Embed Plugin

A NodeBB plugin that embeds Open Graph Protocol (OGP) previews and custom regex-based embeds in posts.

## Features

- **OGP Card Embedding**: Automatically converts URLs to rich preview cards using Open Graph metadata
- **Custom Regex Rules**: Create custom embedding rules using regular expressions
- **Admin Management Interface**: Easy-to-use admin panel for managing embed rules
- **Security**: Built-in SSRF protection and XSS prevention
- **Performance**: Caching system for optimal performance
- **Flexible Templates**: Define custom HTML templates for different URL patterns
- **Slack-style Design**: Modern, compact card layout with blue accent

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

## Configuration

### Basic OGP Embedding

The plugin automatically fetches and displays OGP metadata for URLs in posts. No configuration needed for basic functionality.

### Custom Regex Rules

Access the admin panel at **ACP → Plugins → OGP Embed Rules** to:

1. **Create Rules**: Define custom embedding patterns
2. **Set Priorities**: Control rule execution order (lower number = higher priority)
3. **Test Rules**: Preview how URLs will be embedded
4. **Enable/Disable**: Toggle rules without deleting them
5. **Drag to Reorder**: Change rule priorities by dragging

### Rule Examples

#### YouTube Short URLs
- **Pattern**: `^https?://youtu\.be/([a-zA-Z0-9_-]{11})$`
- **Template**: 
```html
<iframe width="560" height="315" 
        src="https://www.youtube.com/embed/$1" 
        frameborder="0" allowfullscreen></iframe>
```

#### Twitter/X Posts
- **Pattern**: `^https?://(?:www\.|mobile\.)?twitter\.com/\w+/status/(\d+)`
- **Template**:
```html
<blockquote class="twitter-tweet">
    <a href="https://twitter.com/twitter/status/$1"></a>
</blockquote>
<script async src="https://platform.twitter.com/widgets.js"></script>
```

#### Vimeo Videos
- **Pattern**: `^https?://vimeo\.com/(\d+)`
- **Template**:
```html
<iframe src="https://player.vimeo.com/video/$1" 
        width="640" height="360" 
        frameborder="0" allowfullscreen></iframe>
```

## How It Works

1. **URL Detection**: When a post is saved, the plugin extracts all URLs
2. **Rule Matching**: URLs are tested against custom regex rules (in priority order)
3. **Template Rendering**: If a rule matches, the template is rendered with captured groups
4. **OGP Fallback**: If no rules match, standard OGP metadata is fetched and displayed
5. **Caching**: Results are cached to improve performance

## Security Features

- **SSRF Protection**: 
  - Blocks requests to private IPs (RFC1918)
  - Blocks IPv6 reserved addresses
  - Validates hostnames
- **ReDoS Prevention**: 
  - Validates regex patterns for potential denial-of-service vulnerabilities
  - Limits pattern complexity
  - Timeout protection on regex execution
- **XSS Protection**: 
  - Automatic HTML escaping for user content
  - Safe template variable substitution
- **Admin-Only Configuration**: Only administrators can manage embedding rules

## API

### Socket.IO Events

#### Admin Events
- `admin.ogpEmbed.getRules`: Get all rules
- `admin.ogpEmbed.createRule`: Create a new rule
- `admin.ogpEmbed.updateRule`: Update an existing rule
- `admin.ogpEmbed.deleteRule`: Delete a rule
- `admin.ogpEmbed.reorderRules`: Change rule priorities
- `admin.ogpEmbed.testRule`: Test a rule with a sample URL

### REST API Endpoints

All endpoints require admin authentication:

- `GET /api/admin/plugins/ogp-embed/rules` - List all rules
- `POST /api/admin/plugins/ogp-embed/rules` - Create a rule
- `PUT /api/admin/plugins/ogp-embed/rules/:ruleId` - Update a rule
- `DELETE /api/admin/plugins/ogp-embed/rules/:ruleId` - Delete a rule
- `POST /api/admin/plugins/ogp-embed/rules/reorder` - Reorder rules
- `POST /api/admin/plugins/ogp-embed/rules/test` - Test a rule

## Template Variables

In your custom templates, you can use:
- `$0` - The full matched URL
- `$1`, `$2`, ... `$9` - Captured groups from the regex pattern

Variables are automatically escaped when not in URL attributes.

## Settings

Default settings (configurable via code):
- **Cache TTL**: 24 hours
- **Request timeout**: 5 seconds
- **Max description length**: 200 characters
- **User agent**: Mozilla/5.0 (compatible; NodeBB OGP Embed Bot/1.0)
- **Concurrent processing limit**: 3 URLs at a time

## Performance Considerations

- Rules are cached in memory for fast matching
- OGP data is cached in the database (default: 24 hours)
- Regex patterns are pre-compiled for efficiency
- Concurrent URL processing is limited to prevent overload
- Rule cache expires after 1 minute to pick up changes

## Troubleshooting

### Rules not matching
- Check regex syntax using the test feature in admin panel
- Ensure the pattern matches the entire URL format
- Verify rule is enabled and has appropriate priority
- Check NodeBB logs for detailed error messages

### OGP cards not showing
- Check if the target site provides OGP metadata
- Verify the site is publicly accessible
- Ensure the URL is not blocked by SSRF protection
- Check cache status in database

### Performance issues
- Reduce the number of active rules
- Simplify complex regex patterns
- Increase cache TTL in settings
- Check for ReDoS vulnerable patterns

## File Structure

```
nodebb-plugin-ogp-embed/
├── lib/
│   ├── rules/
│   │   ├── manager.js      # Rule database management
│   │   ├── processor.js    # Regex processing engine
│   │   └── validator.js    # Input validation
│   ├── admin/
│   │   └── rules.js        # Admin API endpoints
│   ├── cache.js            # Caching system
│   ├── parser.js           # OGP parser
│   ├── renderer.js         # Template renderer
│   └── settings.js         # Settings management
├── static/
│   ├── admin/
│   │   └── rules.js        # Admin UI JavaScript
│   ├── client.js           # Client-side logic
│   └── style.less          # Styles
├── templates/
│   ├── admin/
│   │   └── rules.tpl       # Admin interface template
│   └── partials/
│       └── ogp-card.tpl    # OGP card template
├── library.js              # Main plugin file
├── plugin.json             # Plugin manifest
├── package.json            # NPM package info
└── README.md               # This file
```

## License

MIT

## Contributing

Contributions are welcome! Please submit pull requests or issues on GitHub.

## Credits

Developed for NodeBB community forums.