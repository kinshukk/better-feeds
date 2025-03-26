# Better Feeds Testing Strategy

This document outlines the testing strategy for the Better Feeds Chrome extension to ensure functionality, reliability, and performance.

## 1. Testing Approach Overview

The testing strategy for Better Feeds follows a multi-layered approach:

1. **Unit Testing**: Testing individual components and functions in isolation
2. **Integration Testing**: Testing interactions between different parts of the extension
3. **End-to-End Testing**: Testing the complete user flow and extension functionality
4. **Manual Testing**: Hands-on verification of features and edge cases
5. **Performance Testing**: Ensuring the extension doesn't impact browser performance

## 2. Test Environments

### 2.1 Local Test Environment

We'll use a local test page that simulates Twitter's DOM structure for rapid development and testing without requiring network access or a real Twitter account:

```
test/test-page.html
```

This approach offers several advantages:
- Fast feedback loop during development
- No need for a Twitter account during testing
- Controlled environment to test specific scenarios
- Ability to test edge cases that are hard to reproduce on Twitter

### 2.2 Chrome Extension Test Environment

Testing within Chrome using the unpacked extension:
- Development build loaded in Chrome
- Dev tools for debugging and monitoring
- Works with both the test page and real Twitter

## 3. Types of Tests

### 3.1 Unit Tests

Unit tests focus on testing small, isolated pieces of functionality:

**Target Components:**
- Classifier (`src/utils/classifier.ts`)
- Database operations (`src/utils/db.ts`)
- DOM parsing functions
- Utility functions

**Approach:**
- Use Bun test runner for fast execution
- Mock dependencies and external APIs
- Focus on pure functions and algorithmic components

**Example Test Cases:**
```javascript
// Example unit test for classifier
import { test, expect } from "bun:test";
import { Classifier } from "../src/utils/classifier";

test("classifier correctly identifies positive sentiment", () => {
  const classifier = new Classifier();
  classifier.train("I love this", 1);
  classifier.train("This is great", 1);
  
  const prediction = classifier.predict("I really love this content");
  expect(prediction.prediction).toBe("like");
  expect(prediction.confidence).toBeGreaterThan(0.5);
});
```

### 3.2 Integration Tests

Integration tests verify the interaction between different components:

**Target Interactions:**
- Content script & background script communication
- DOM observer & UI manipulation
- Storage & classification pipeline

**Approach:**
- Create mocked Twitter-like DOM environment
- Simulate user interactions programmatically
- Test the complete data pipeline from DOM to storage

**Example Test Cases:**
```javascript
// Example integration test
import { test, expect } from "bun:test";
import { TwitterDOMHandler } from "../src/content/twitter";
import { mockTweetElement, mockChrome } from "./mocks";

// Mock Chrome API
global.chrome = mockChrome();

test("TwitterDOMHandler extracts and processes tweet data correctly", async () => {
  const handler = new TwitterDOMHandler();
  const tweetElement = mockTweetElement({
    id: "123456789",
    text: "This is a test tweet",
    author: "@testuser"
  });
  
  document.body.appendChild(tweetElement);
  
  // Trigger mutation observer
  const observer = handler.startObserving();
  
  // Wait for processing to complete
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Check if message was sent to background script
  expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
    expect.objectContaining({
      action: "getPrediction",
      tweetId: "123456789"
    })
  );
  
  // Check if buttons were injected
  expect(tweetElement.querySelector('.better-feeds-rating')).not.toBeNull();
});
```

### 3.3 End-to-End Tests

End-to-end tests verify complete user flows:

**Target Scenarios:**
- Extension installation and initialization
- Rating tweets and saving preferences
- Filtering tweets based on preferences
- Settings changes propagating to content script

**Approach:**
- Use Playwright or Puppeteer for browser automation
- Test with both the test page and real Twitter (where possible)
- Create reproducible scenarios with predefined data

**Example Test Cases:**
```javascript
// Example E2E test with Playwright
import { test, expect } from '@playwright/test';

test('Extension correctly filters disliked content', async ({ page }) => {
  // Load test page with extension
  await page.goto('chrome-extension://[extension-id]/test/test-page.html');
  
  // Rate a tweet negatively
  await page.click('[data-testid="tweet"]:nth-child(2) .better-feeds-rating button:nth-child(2)');
  
  // Enable filtering in settings
  await page.click('#extension-popup-button');
  await page.click('#enable-filtering');
  await page.click('#save-settings');
  
  // Add a similar tweet
  await page.click('#add-tweet');
  
  // Wait for processing
  await page.waitForTimeout(1000);
  
  // Check if the new tweet was hidden
  const hiddenTweet = await page.$('.better-feeds-hidden-tweet');
  expect(hiddenTweet).not.toBeNull();
});
```

### 3.4 Manual Testing Checklist

**Extension Installation:**
- [ ] Extension loads correctly in Chrome
- [ ] Icons display properly
- [ ] No console errors on load

**Twitter Integration:**
- [ ] Extension activates on Twitter
- [ ] Tweet detection works for timeline, profile, and search results
- [ ] Rating buttons appear correctly positioned
- [ ] No visual regressions or layout issues

**Core Functionality:**
- [ ] Rating tweets (like/dislike) works
- [ ] Ratings persist across page reloads
- [ ] Filtering works based on settings
- [ ] Classification works as expected over time

**Settings and UI:**
- [ ] Popup UI loads correctly
- [ ] Settings changes take effect immediately
- [ ] Dashboard displays accurate statistics

## 4. Testing Tools

### 4.1 Unit and Integration Testing Tools

- **Bun Test**: Built-in test runner for unit tests
- **JSDOM**: For simulating browser environment
- **Sinon.js**: For mocks, stubs, and spies
- **Chrome Extension Testing Library**: For simulating Chrome API

### 4.2 End-to-End Testing Tools

- **Playwright**: For browser automation testing
- **Chrome DevTools Protocol**: For direct Chrome control
- **Extension Testing API**: For programmatic control of extensions

### 4.3 Manual Testing Tools

- **Chrome DevTools**: For debugging and monitoring
- **React DevTools**: If using React for popup UI
- **Network Monitor**: For tracking message passing

## 5. Testing Utilities to Develop

### 5.1 Mock Twitter Page

Expand the existing test page to create a more comprehensive testing environment:

- More diverse tweet structures (retweets, quotes, threads)
- Different timeline views (home, profile, search)
- Dynamic content loading scenarios

### 5.2 Chrome API Mocks

Create comprehensive mocks for Chrome extension APIs:

```javascript
// Example Chrome API mock
export function mockChrome() {
  return {
    runtime: {
      sendMessage: jest.fn((message, callback) => {
        if (callback) callback({ success: true });
        return true;
      }),
      onMessage: {
        addListener: jest.fn()
      }
    },
    storage: {
      local: {
        get: jest.fn(),
        set: jest.fn()
      }
    }
  };
}
```

### 5.3 Test Fixtures

Create reusable test fixtures:

- Sample tweets with different content types
- User preference profiles
- Classification training data sets

## 6. Debugging and Troubleshooting

### 6.1 Extension Loading Issues

Specific tests for extension loading problems:

1. **Manifest Validation**:
   ```javascript
   test("manifest.json is valid", async () => {
     const manifest = JSON.parse(await fs.readFile('dist/manifest.json', 'utf-8'));
     expect(manifest.manifest_version).toBe(3);
     expect(manifest.background).toHaveProperty('service_worker');
     // Check that all referenced files exist
     expect(fs.existsSync(`dist/${manifest.background.service_worker}`)).toBe(true);
   });
   ```

2. **File Structure Tests**:
   ```javascript
   test("built extension has required files", async () => {
     const requiredFiles = [
       'manifest.json',
       'background/index.js',
       'content/twitter.js',
       'popup/popup.html',
       'popup/popup.js',
       'icons/icon-16.png',
       'icons/icon-48.png',
       'icons/icon-128.png'
     ];
     
     for (const file of requiredFiles) {
       expect(fs.existsSync(`dist/${file}`)).toBe(true);
     }
   });
   ```

3. **Resource Loading Test**:
   ```javascript
   test("content script loads in target pages", async ({ page }) => {
     // Use puppeteer to load the test page
     await page.goto('http://localhost:3000/test-page.html');
     
     // Check for extension initialization log
     const logs = await page.evaluate(() => {
       return new Promise(resolve => {
         const logs = [];
         const originalLog = console.log;
         console.log = (...args) => {
           logs.push(args.join(' '));
           originalLog(...args);
         };
         
         // Wait a bit for extension to initialize
         setTimeout(() => {
           console.log = originalLog;
           resolve(logs);
         }, 1000);
       });
     });
     
     expect(logs.some(log => log.includes('[Better Feeds] Twitter content script initialized'))).toBe(true);
   });
   ```

### 6.2 Runtime Debugging

Create utilities to help diagnose runtime issues:

```javascript
// Debug mode toggle
function enableDebugMode() {
  localStorage.setItem('better-feeds-debug', 'true');
  location.reload();
}

// Performance monitoring
function monitorMessagePassing() {
  const originalSendMessage = chrome.runtime.sendMessage;
  chrome.runtime.sendMessage = function(message, callback) {
    console.time(`Message: ${message.action}`);
    return originalSendMessage.call(this, message, (...args) => {
      console.timeEnd(`Message: ${message.action}`);
      if (callback) callback(...args);
    });
  };
}
```

## 7. Continuous Testing Process

### 7.1 Pre-commit Checks

- Linting and type checking
- Unit tests
- Build verification

### 7.2 Integration Testing Before PR Merge

- Complete test suite including integration tests
- Manual testing of changed features

### 7.3 Release Testing

- Complete end-to-end test suite
- Cross-browser compatibility testing
- Performance benchmarking

## 8. Performance Testing

1. **Memory Usage Testing**:
   - Monitor memory usage over time
   - Check for memory leaks after prolonged usage

2. **CPU Usage Testing**:
   - Profile CPU usage during scrolling and tweet processing
   - Ensure the extension doesn't significantly impact browsing experience

3. **Storage Testing**:
   - Test with large amounts of stored data
   - Verify indexing and query performance

## 9. Next Steps for Testing Implementation

1. **Initial Setup**: Create basic unit test framework and fixtures
2. **Critical Path Tests**: Focus first on extension loading and critical functionality
3. **Regression Test Suite**: Develop automated regression tests for core features
4. **Expand Coverage**: Gradually improve test coverage across all components
5. **Integration**: Set up CI/CD pipeline for automated testing

By implementing this testing strategy, we can identify and resolve issues early, ensure the extension works reliably, and maintain a high-quality user experience as the extension evolves.