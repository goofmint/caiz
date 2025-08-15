# NodeBB AI Topic Summary

Automatically generate AI-powered summaries for NodeBB topics to help users quickly understand discussion flows.

## Features

- 🤖 **Automatic Summary Generation**: Creates summaries when topics reach configurable post counts (default: every 10 posts)
- 📱 **Responsive UI**: Clean, collapsible summary cards that work on all devices
- 🌍 **Multi-language Support**: Detects content language and generates summaries accordingly (Japanese/English)
- 🔧 **Admin Control**: Full administrative control with settings panel
- 🛡️ **Permission-based**: Respects NodeBB's permission system
- ⚡ **Performance Optimized**: Async processing that doesn't block the UI

## Requirements

- NodeBB 1.19.0 or higher
- Google Gemini API key
- Node.js 12+ 

## Installation

1. Clone or download this plugin to your NodeBB's `node_modules` directory
2. Restart NodeBB
3. Go to Admin Panel → Extend → Plugins and activate "NodeBB AI Topic Summary"
4. Configure the plugin in Admin Panel → Plugins → AI Topic Summary

## Configuration

### Getting a Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key
5. Paste it in the plugin settings and test the connection

### Settings

- **Gemini API Key**: Required for AI summary generation
- **Summary Generation Trigger**: Number of posts that trigger auto-generation (10, 15, 20, 25, or 30)
- **AI Model**: Choose between Gemini 1.5 Flash, Flash-8B, or Pro models
- **Auto Generate**: Enable/disable automatic summary generation
- **Allow Manual**: Let moderators manually generate summaries
- **Default State**: Whether summaries appear expanded or collapsed by default
- **Minimum Posts**: Minimum posts required before showing summaries
- **Show Metadata**: Display generation info (post count, timestamp, AI model)

## How It Works

1. **Automatic Trigger**: When a topic reaches the configured post count (e.g., 10, 20, 30 posts), the plugin automatically generates a summary
2. **Content Processing**: The plugin extracts all non-deleted posts from the topic, removing user names and metadata for privacy
3. **Language Detection**: Automatically detects if content is Japanese or English
4. **AI Generation**: Sends the content to Gemini AI with appropriate prompts based on detected language
5. **Display**: The summary appears as a collapsible card at the top of the topic

## Privacy & Security

- **No Personal Data**: User names and personal metadata are excluded from AI processing
- **Permission-based Access**: Summaries are only visible to users who can read the topic
- **Local Storage**: User preferences (expanded/collapsed state) are stored locally
- **Secure API**: All API calls are made server-side with proper authentication

## Database Storage

The plugin uses NodeBB's built-in database system to store summaries:

- **Key Format**: `aiTopicSummary:{topicId}`
- **Data Stored**: Summary text, post count, generation timestamp, AI model used
- **No Schema Changes**: Uses NodeBB's key-value storage, no database migrations required

## Troubleshooting

### Summary Not Generating

1. Check that the Gemini API key is valid (use Test Connection)
2. Verify the topic has enough posts to trigger generation
3. Check NodeBB logs for error messages
4. Ensure auto-generation is enabled in settings

### Summary Not Displaying

1. Verify the user has read permissions for the topic
2. Check that the topic has a saved summary in the database
3. Ensure JavaScript is enabled in the browser
4. Check browser console for JavaScript errors

### API Issues

- **Rate Limiting**: Gemini API has generous free quotas, but very high usage may hit limits
- **Network Issues**: Check server internet connectivity
- **API Changes**: Keep the plugin updated for API compatibility

## Development

### File Structure

```
nodebb-plugin-ai-topic-summary/
├── plugin.json           # Plugin configuration
├── package.json          # npm dependencies
├── library.js            # Main server-side logic
├── static/
│   ├── style.css         # UI styles
│   ├── main.js           # Client-side JavaScript
│   └── admin.js          # Admin panel JavaScript
├── templates/
│   └── admin/
│       └── plugins/
│           └── ai-topic-summary.tpl  # Admin panel template
└── languages/
    ├── en-GB/
    │   └── ai-topic-summary.json     # English translations
    └── ja/
        └── ai-topic-summary.json     # Japanese translations
```

### Hooks Used

- `filter:post.create` - Triggers summary generation after new posts
- `filter:topic.get` - Injects summary data into topic pages
- `static:app.load` - Initializes routes and API endpoints

### API Endpoints

- `GET /api/v3/plugins/ai-topic-summary/:tid` - Get existing summary
- `POST /api/v3/plugins/ai-topic-summary/generate/:tid` - Manually generate summary (moderators only)
- `POST /api/v3/plugins/ai-topic-summary/settings` - Save admin settings

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and support:
1. Check the troubleshooting section above
2. Review NodeBB logs for error messages
3. Create an issue on GitHub with detailed information

## Changelog

### Version 1.0.0
- Initial release
- Automatic summary generation every 10 posts
- Multi-language support (Japanese/English)
- Administrative configuration panel
- Responsive UI with collapsible summaries
- Permission-based access control