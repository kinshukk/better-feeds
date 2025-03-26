# Better Feeds - Chrome Extension

A Chrome extension to filter Twitter/X content based on your preferences.

![Better Feeds Logo](public/icons/icon_template.svg)

## Overview

Better Feeds is a Chrome extension that helps you curate your Twitter/X feed by learning from your preferences. Rate tweets with 👍 or 👎, and the extension will:

- Learn which content you prefer
- Filter out tweets you're likely to dislike (optional)
- Show sentiment analysis for tweets
- Improve your social media experience

## Features

- Injects rating buttons (👍/👎) next to tweets
- Stores your preferences locally in your browser
- Uses a simple machine learning classifier to predict content you'll like
- Optionally filters out tweets likely to be irrelevant or uninteresting
- Shows sentiment analysis for tweets
- All processing happens locally - your data stays private

## Installation

### From Source

1. Clone this repository
   ```bash
   git clone https://github.com/yourusername/better-feeds.git
   cd better-feeds
   ```

2. Install dependencies
   ```bash
   bun install
   ```

3. Build the extension
   ```bash
   bun run build
   ```

4. Load in Chrome
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right corner)
   - Click "Load unpacked" and select the `dist` directory
   
The extension should now be installed and active when you visit Twitter/X.

## Usage

1. Visit Twitter/X (https://twitter.com or https://x.com)
2. Browse your feed as normal
3. Use the 👍/👎 buttons to rate tweets
4. After rating several tweets, the extension will learn your preferences
5. To enable filtering, click the extension icon and toggle filtering on

## How It Works

### Content Analysis
Better Feeds analyzes tweet content using a simple bag-of-words classifier that learns from your ratings. It examines patterns in the tweets you like and dislike to predict your preferences for new content.

### Data Storage
All your preferences are stored locally in IndexedDB, which:
- Keeps your data private (nothing is sent to remote servers)
- Persists across browser sessions
- Provides higher storage limits than localStorage

### Feed Filtering
When filtering is enabled, tweets that match patterns you've disliked in the past can be hidden. A placeholder appears allowing you to reveal the tweet if desired.

## Project Structure

```
better-feeds/
├── src/                  # Source code
│   ├── content/          # Content scripts injected into the page
│   ├── background/       # Extension background script
│   ├── utils/            # Shared utilities
│   ├── popup/            # Extension popup UI
│   └── types.ts          # TypeScript types
├── public/               # Static assets
├── scripts/              # Build and utility scripts
├── test/                 # Test pages and test utilities
└── dist/                 # Build output (not in repo)
```

## Development

For development information, see:
- [DEVELOPMENT.md](DEVELOPMENT.md) - Setup, building, and testing
- [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md) - Roadmap and future plans
- [TESTING_STRATEGY.md](TESTING_STRATEGY.md) - Testing approach

## Technical Details

- Built with TypeScript for type safety
- Uses Dexie.js for IndexedDB management
- Implements MutationObserver for detecting DOM changes
- Uses a simple bag-of-words classifier for content analysis
- Built with Bun for fast development and bundling

## Privacy

Better Feeds:
- Never sends your data to any remote servers
- Keeps all preferences and learned patterns in your local browser storage
- Doesn't track you or your browsing history
- Doesn't require any account or login

## License

[MIT License](LICENSE)

## Contributing

Contributions are welcome! See [DEVELOPMENT.md](DEVELOPMENT.md) for setup instructions.