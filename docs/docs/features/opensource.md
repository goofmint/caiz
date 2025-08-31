# Opensource

Caiz.dev is developed based on NodeBB. The core remains untouched, with functionality provided through plugins and themes.
[goofmint/caiz](https://github.com/goofmint/caiz)

## Plugins & Themes

The plugins and themes we are developing are listed below. While some can be used independently, dependencies exist due to multilingual deployment requirements.

### [nodebb-plugin-ai-moderation](https://github.com/goofmint/caiz/tree/main/plugins/nodebb-plugin-ai-moderation)

Automatically moderates posts using AI.

### [nodebb-plugin-ai-topic-summary](https://github.com/goofmint/caiz/tree/main/plugins/nodebb-plugin-ai-topic-summary)

Summarizes thread content using AI every 10 posts. Translates the summary into 20 languages and saves it to the database.

### [nodebb-plugin-auto-translate](https://github.com/goofmint/caiz/tree/main/plugins/nodebb-plugin-auto-translate)

Automatically translates communities, categories, threads, and posts into 20 languages. Each data point is stored in the database.

### [nodebb-plugin-caiz-elastic](https://github.com/goofmint/caiz/tree/main/plugins/nodebb-plugin-caiz-elastic)

Search with support for 20 languages. Uses Elasticsearch.

### [nodebb-plugin-caiz](https://github.com/goofmint/caiz/tree/main/plugins/nodebb-plugin-caiz)

A plugin providing essential Caiz.dev functionality like creating/editing communities and changing URLs.

### [nodebb-plugin-mcp-server](https://github.com/goofmint/caiz/tree/main/plugins/nodebb-plugin-mcp-server)

Provides Caiz.dev's MCP server and OAuth2 functionality.

### [nodebb-plugin-ogp-embed](https://github.com/goofmint/caiz/tree/main/plugins/nodebb-plugin-ogp-embed)

Retrieves OGP data for URLs and stores it in the database. Provides OGP previews for posts.
Offers regular expression-based URL replacement. For example, pasting a YouTube video URL converts it into an embedded video.

### [nodebb-theme-caiz](https://github.com/goofmint/caiz/tree/main/plugins/nodebb-theme-caiz)

The theme for Caiz.dev.

## Architecture

The architecture we use is as follows.

- Docker
- Nginx
- NodeBB
- PostgreSQL
- Elasticsearch
