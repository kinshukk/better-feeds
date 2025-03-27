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

## Current Project Status (Updated)

### Recent Updates

1. **Improved Build Process**:
   - Created a robust build script (`scripts/build.js`) that:
     - Properly handles icon generation
     - Creates necessary directories
     - Copies all required files to dist/
     - Bundles TypeScript files for browser compatibility

2. **Enhanced Testing Infrastructure**:
   - Added a test page (`test/test-page.html`) that simulates Twitter's DOM
   - Implemented test controls for simulating tweets and interactions
   - Created a command to serve the test page locally

3. **Development Documentation**:
   - Created `DEVELOPMENT.md` with setup instructions and workflows
   - Created `TESTING_STRATEGY.md` with comprehensive testing approach
   - Created `DEVELOPMENT_PLAN.md` with phased development roadmap
   - Created `IMMEDIATE_ACTION_PLAN.md` for fixing current issues

4. **Debugging Utilities**:
   - Enhanced debug utilities in `src/utils/debug.ts`
   - Added performance measurement tools
   - Implemented structured logging with different levels

### Known Issues

1. **Extension Loading Problem**:
   - Extension builds successfully but doesn't load properly in Chrome
   - Need to diagnose if it's a manifest issue, path problem, or code error

2. **Twitter DOM Observation Reliability**:
   - Twitter frequently updates its DOM structure
   - Need more robust selectors and fallback mechanisms

3. **Testing Coverage**:
   - Limited automated tests for core functionality
   - Need to implement unit and integration tests

## Next Steps

Based on the `IMMEDIATE_ACTION_PLAN.md`, the next steps are:

1. **Fix Extension Loading Issues**:
   - Load extension in Chrome with Developer Mode
   - Check console for errors
   - Verify content script injection
   - Fix initialization problems

2. **Implement Basic Testing**:
   - Set up test framework with Bun
   - Create tests for critical components
   - Verify extension loading and functionality

3. **Enhance Development Workflow**:
   - Improve build process with better error handling
   - Add hot-reloading for faster iteration
   - Create better debugging visualizations

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
- Reliability improvements 🔄

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

3. **Machine Learning in the Browser**: Browser environments have limitations for ML libraries. Simplified models that don't rely on Node.js-specific dependencies work best.

4. **Type Safety in Chrome Extensions**: Using TypeScript with Chrome extension APIs requires proper type declarations to avoid compilation errors.

5. **Build Process Optimization**: Bundling for browser extensions requires specific configurations to handle dependencies properly.

6. **Testing Extensions**: Using a simulated DOM environment can speed up development without requiring constant access to the actual website.

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

## DOM Selection Issue Analysis (New Section)

### Current DOM Selection Problems

After analyzing the code, I've identified several issues with the current DOM selection and button injection:

1. **Outdated Selectors**:
   - Current CSS selector in content.css `article[data-testid="tweet"] [data-testid="reply"]` no longer matches Twitter's DOM structure
   - The JavaScript traversal in twitter.ts using `.closest('article[data-testid="tweet"]')` and `.closest('[role="group"]')` is failing to find the required elements

2. **Single-Point-of-Failure Approach**:
   - Code uses a single strategy for element targeting without fallbacks
   - No diagnostic capabilities when selectors fail
   - Animation events aren't triggering, so button injection doesn't happen

3. **Dependency Chain**:
   - The button injection depends on successful MutationObserver processing AND animation triggering
   - If either fails, no buttons appear

### Better Twitter Extension's Effective Techniques

From analyzing the better-twitter code:

1. **SVG Path Data Targeting**: Twitter rarely changes SVG paths for icons, making selectors like:
   ```css
   article:has(path[d^="M4.75 3.79l4"]) {
     display: none !important;
   }
   ```
   Much more reliable than class/attribute-based selectors

2. **Animation-Based Element Discovery + Custom Attributes**:
   ```javascript
   document.addEventListener('animationstart', (e) => {
     if (e.animationName === "bt-marker-wtf") {
       const container = e.target.closest('div:not([class])');
       container.setAttribute('bt-wtf', true);
     }
   });
   ```
   This pattern allows marking elements for later use without relying on brittle selectors

3. **Multiple Fallback Selectors**:
   ```css
   .bt--nowtf [aria-label*="who to follow" i],
   .bt--nowtf [data-testid$="-follow"] {
     /* different targeting methods for the same feature */
   }
   ```
   This provides redundancy when Twitter changes their DOM

### Implementation Plan

I've created a detailed implementation plan in PLAN_FOR_DOM_SELECTION_FIX.md that includes:

1. **Updated CSS Selectors**: Multiple targeting strategies including SVG paths, roles, and ARIA labels
2. **Enhanced Element Discovery**: Fallback traversal methods for tweets and action bars
3. **Debug Utilities**: Visual highlighting and detailed logging
4. **SVG Path Discovery**: Runtime tools to identify current Twitter icon paths

This approach should significantly improve the reliability of DOM selection, making the extension more robust against Twitter's frequent DOM changes.