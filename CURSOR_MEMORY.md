# Better Feeds - Chrome Extension

## Project Overview

Better Feeds is a Chrome extension that helps users curate their social media feeds based on personal preferences. The extension allows users to rate posts (upvote/downvote), learns from these preferences over time, and can filter out content the user is likely to dislike.

### Core Functionality

- DOM observation to capture posts from social media sites
- Rating UI (👍/👎) injected next to posts
- Local data storage of user preferences
- Machine learning classifier for predicting post relevance
- Feed filtering based on learned preferences

## Code Structure

```
better-feeds/
├── src/
│   ├── content/
│   │   └── twitter.ts     # Twitter-specific DOM handler
│   ├── background/
│   │   └── index.ts       # Background script for Chrome extension
│   ├── utils/
│   │   ├── db.ts          # IndexedDB wrapper using Dexie.js
│   │   ├── classifier.ts  # ML classifier implementation
│   │   └── debug.ts       # Debugging and logging utilities
│   ├── popup/
│   │   ├── popup.html     # Extension popup UI
│   │   └── popup.ts       # Popup UI logic
│   ├── types/
│   │   └── global.d.ts    # TypeScript type declarations
│   └── types.ts           # Shared TypeScript interfaces
├── public/
│   ├── manifest.json      # Chrome extension manifest
│   └── icons/             # Extension icons
├── test/
│   └── test-page.html     # Test page simulating Twitter's DOM
├── scripts/
│   ├── build.js           # Custom build script
│   └── generate-icons.js  # Icon generation utility
├── tsconfig.json          # TypeScript configuration
└── package.json           # Project dependencies
```

### Key Components

1. **Content Script (`twitter.ts`)**: 
   - Observes DOM changes on Twitter
   - Injects rating buttons next to tweets
   - Captures tweet content and metadata
   - Communicates with background script

2. **Background Script (`index.ts`)**:
   - Manages data storage through IndexedDB
   - Maintains the classifier and settings
   - Handles message passing between components

3. **Database (`db.ts`)**:
   - Uses Dexie.js to wrap IndexedDB
   - Stores tweets, ratings, and settings
   - Provides an API for data operations

4. **Classifier (`classifier.ts`)**:
   - Simple bag-of-words + frequency-based classifier
   - Learns from user ratings
   - Predicts whether user would like/dislike content

5. **Popup UI (`popup.html`, `popup.ts`)**:
   - Settings interface for the extension
   - Toggles for filtering functionality
   - Stats display for rated content

## Current Project Status (Updated 2025-03-30)

### Recent Updates

1. **Fixed Twitter DOM Selection and Button Injection**:
   - Implemented multi-strategy approach for reliable button injection
   - Enhanced CSS selectors for more robust animation triggers
   - Added direct button injection as fallback for animation triggers
   - Created comprehensive logging for troubleshooting
   - Added fallback to timestamp-based injection when action bar detection fails

2. **Improved Build Process**:
   - Created a robust build script (`scripts/build.js`) that:
     - Properly handles icon generation
     - Creates necessary directories
     - Copies all required files to dist/
     - Bundles TypeScript files for browser compatibility

3. **Enhanced Testing Infrastructure**:
   - Added a test page (`test/test-page.html`) that simulates Twitter's DOM
   - Implemented test controls for simulating tweets and interactions
   - Created a command to serve the test page locally

4. **Development Documentation**:
   - Created `DEVELOPMENT.md` with setup instructions and workflows
   - Created `TESTING_STRATEGY.md` with comprehensive testing approach
   - Created `DEVELOPMENT_PLAN.md` with phased development roadmap
   - Created `IMMEDIATE_ACTION_PLAN.md` for fixing current issues

5. **Debugging Utilities**:
   - Enhanced debug utilities in `src/utils/debug.ts`
   - Added performance measurement tools
   - Implemented structured logging with different levels

### Known Issues

1. **Twitter DOM Observation Reliability**:
   - ✅ FIXED: The extension now uses multiple fallback strategies to reliably find and inject buttons
   - Twitter still frequently updates its DOM structure, but our solution is now much more resilient

2. **Testing Coverage**:
   - Limited automated tests for core functionality
   - Need to implement unit and integration tests

## Next Steps

Based on our progress, the next steps are:

1. **Implement Automated Testing**:
   - Set up test framework with Bun
   - Create tests for critical components
   - Verify extension loading and functionality

2. **Enhance Development Workflow**:
   - Improve build process with better error handling
   - Add hot-reloading for faster iteration
   - Create better debugging visualizations

3. **Support for Additional Platforms**:
   - Expand DOM handling to other social media sites
   - Create platform-specific content scripts

## Development Phases

### Phase 1: Basic Extension Setup + Twitter DOM Capture
- Extension boilerplate ✅
- Twitter DOM observation ✅
- IndexedDB setup ✅
- Build process improvements ✅
- Testing infrastructure ✅

### Phase 2: Rating System + Local Storage
- Up/down vote UI ✅
- Store ratings with post content ✅
- Basic dashboard ✅
- Reliability improvements ✅

### Phase 3: Simple Sentiment Analysis
- Bag of words preprocessing ✅
- Basic classifier implementation ✅
- Sentiment display ✅
- Classifier enhancements 🔄

### Phase 4: Feed Filtering
- Filter toggle ✅
- Post hiding based on predictions ✅
- Threshold adjustment ✅
- Filtering enhancements 🔄

## Lessons Learned

1. **Browser Extension Architecture**: Background scripts have different privileges and lifecycle than content scripts, requiring careful message passing design.

2. **Dynamic DOM Handling**: Social media sites frequently update their DOM structure, requiring resilient selectors and observation techniques.

3. **Multi-Strategy DOM Selection**: Using multiple fallback approaches for element selection is crucial for extension resilience against frequent DOM changes.

4. **Machine Learning in the Browser**: Browser environments have limitations for ML libraries. Simplified models that don't rely on Node.js-specific dependencies work best.

5. **Type Safety in Chrome Extensions**: Using TypeScript with Chrome extension APIs requires proper type declarations to avoid compilation errors.

6. **Build Process Optimization**: Bundling for browser extensions requires specific configurations to handle dependencies properly.

7. **Testing Extensions**: Using a simulated DOM environment can speed up development without requiring constant access to the actual website.

## Troubleshooting Common Issues

- **Chrome API Type Errors**: Add `/// <reference types="chrome" />` to a global declaration file.

- **Node.js Module Errors**: Use the `--target browser` flag with Bun or replace Node.js-specific libraries with browser-compatible alternatives.

- **Extension Not Loading**: Ensure `manifest.json` is correctly structured and all required files are included in the build.

- **Content Script Not Running**: Check the "matches" pattern in manifest.json to ensure it correctly targets the desired sites.

- **UI Elements Not Appearing**: Verify DOM selectors are still valid as social media sites frequently change their structure.

## Future Enhancements

1. Support for additional social media platforms
2. More sophisticated ML models for better prediction
3. Cloud synchronization of preferences
4. Advanced filtering options
5. Sentiment analysis using LLMs
6. Comprehensive testing suite
7. Performance optimizations for large feeds

## MCP Servers

### Browser-Use MCP Server

We've integrated the browser-use MCP server for testing automation and web scraping capabilities. This allows us to:

1. **Automated Testing**:
   - Load and interact with test pages
   - Verify DOM modifications
   - Test extension functionality in live environments

2. **Data Collection**:
   - Extract sample posts from social media sites
   - Gather test data for classifier training
   - Validate DOM structure changes

3. **Configuration**:
   - Using existing setup from Claude Desktop
   - Configuration added to VS Code Cline extension settings
   - No additional environment variables required

4. **Usage**:
   - Interact with websites programmatically
   - Extract content for analysis
   - Verify extension functionality

The configuration is stored in:
`/Users/kinshukkashyap/Library/Application Support/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/mcp_settings.json`

## DOM Selection Issue Analysis and Solution (Updated 2025-03-30)

### Previous DOM Selection Problems

We identified several issues with the original DOM selection and button injection:

1. **Outdated Selectors**:
   - CSS selector in content.css `article[data-testid="tweet"] [data-testid="reply"]` no longer matched Twitter's DOM structure
   - The JavaScript traversal using `.closest('article[data-testid="tweet"]')` and `.closest('[role="group"]')` failed to find elements

2. **Single-Point-of-Failure Approach**:
   - Code used a single strategy for element targeting without fallbacks
   - No diagnostic capabilities when selectors failed
   - Animation events weren't triggering, so button injection didn't happen

3. **Dependency Chain**:
   - Button injection depended on successful MutationObserver processing AND animation triggering
   - If either failed, no buttons appeared

### Implemented Solution

We've implemented a comprehensive fix with multiple strategies:

1. **Enhanced CSS Selectors**:
   - Added multiple redundant selectors in content.css to target various elements that could trigger animation
   - Included selectors targeting SVG paths, which tend to be more stable than class names
   - Used case-insensitive matching for attribute values with "i" flag

2. **Multi-Strategy Tweet Detection**:
   - Implemented multiple fallback methods to identify tweet elements:
     - Standard selectors: `article[data-testid="tweet"]`
     - Flexible selectors: `article[data-testid*="tweet"]`
     - Permalink-based: `article:has(a[href*="/status/"])`
     - Generic fallback: Any `article` element

3. **Robust Action Bar Detection**:
   - Added five different strategies to find the action bar:
     - Primary: Find elements with `role="group"`
     - Secondary: Find container with multiple action buttons
     - Tertiary: Walk up from known action button to find parent
     - Quaternary: Look for elements with specific text content
     - Last resort: Insert next to the timestamp

4. **Direct Button Injection**:
   - Added `attemptDirectButtonInjection()` method that doesn't rely on animation triggers
   - Called during initial tweet processing to ensure buttons appear even if animation fails
   - Added fallback to timestamp-based injection as last resort

5. **Improved Error Handling and Logging**:
   - Enhanced logging to help diagnose failed button injections
   - Added detailed context for each failure case
   - Categorized logs by severity for easier debugging

This multi-layered approach makes the extension much more resilient to Twitter's frequent DOM changes and ensures the upvote/downvote buttons are consistently injected.

### Testing Results

We tested the solution directly on Twitter using browser-use MCP and found:
- Button injection now works consistently across tweets
- The multi-strategy approach successfully handles various tweet structures
- Fallback to timestamp-based injection works when action bars cannot be found
- The solution is robust against Twitter's current (March 2025) DOM structure