import type { TweetData, Settings, MessageType } from '../types';
import { logger, measureTime } from '../utils/debug';

// Log extension initialization
logger.info('Twitter content script loading');

// Types for our tweet data
interface TweetInteractionState {
  [tweetId: string]: {
    element: HTMLElement;
    hasButtons: boolean;
    isHidden: boolean;
    prediction?: 'like' | 'dislike' | null;
    confidence?: number;
    sentiment?: string;
  }
}

// Keep track of processed tweets
const processedTweets: TweetInteractionState = {};

// Extension settings
let settings: Settings = {
  filterEnabled: false,
  filterThreshold: 50
};

// Initialize when DOM is ready
function init() {
  logger.info('Twitter content script initialized', { url: window.location.href });
  
  // Log browser and environment info for debugging
  logger.debug('Environment info', {
    userAgent: navigator.userAgent,
    url: window.location.href,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    }
  });
  
  // Get current settings
  chrome.runtime.sendMessage({ action: 'getSettings' } as MessageType, (response: Settings) => {
    if (response) {
      settings = response;
      logger.info('Settings loaded', settings);
    } else {
      logger.warn('Failed to load settings, using defaults');
    }
  });
  
  // Set up observer to watch for new tweets
  observeTimeline();
  // Animation listener is now set up within the class constructor
}


// --- Twitter DOM Handler Class ---
class TwitterDOMHandler {
  private observer: MutationObserver;
  private isListeningAnimation = false; // Flag to prevent multiple listeners

  constructor() {
    logger.debug('TwitterDOMHandler constructor');
    // Configure MutationObserver to watch for new tweets
    this.observer = new MutationObserver(this.handleMutations.bind(this));
    // Set up the animation listener once
    this.setupAnimationListener();
  }

  // --- Animation Listener Logic (moved into class) ---
  private setupAnimationListener(): void {
    if (this.isListeningAnimation) return; // Only attach once

    logger.debug('Setting up animation listener for action bar markers');
    document.addEventListener('animationstart', (event) => {
      // Use a specific, descriptive animation name
      if (event.animationName === 'bf-marker-action-bar') {
        logger.debug('Detected action bar marker animation', { target: event.target });
        // Ensure the target is an HTMLElement before proceeding
        if (event.target instanceof HTMLElement) {
          this.handleActionBarMarker(event.target);
        } else {
           logger.warn('Animation target is not an HTMLElement', { target: event.target });
        }
      }
    });
    this.isListeningAnimation = true;
  }

  private handleActionBarMarker(anchorElement: HTMLElement): void {
    try {
      // Find the parent tweet article - using multiple selector strategies
      let tweetElement: HTMLElement | null = null;
      
      // Strategy 1: Standard article selector
      tweetElement = anchorElement.closest('article[data-testid="tweet"]');
      
      // Strategy 2: Look for article with any data-testid containing "tweet"
      if (!tweetElement) {
        tweetElement = anchorElement.closest('article[data-testid*="tweet"]');
      }
      
      // Strategy 3: Look for any element with a status URL nearby
      if (!tweetElement) {
        const permalink = anchorElement.closest('div:has(a[href*="/status/"])');
        if (permalink instanceof HTMLElement) {
          tweetElement = permalink;
        }
      }
      
      if (!tweetElement) {
        logger.warn('Could not find parent tweet element for marker', {
          anchor: anchorElement,
          html: anchorElement.outerHTML.substring(0, 100)
        });
        return;
      }

      // Ensure it's an HTMLElement before proceeding
      if (!(tweetElement instanceof HTMLElement)) {
          logger.warn('Parent tweet element is not an HTMLElement', { tweetElement });
          return;
      }

      // Extract tweet ID using the class method
      const tweetId = this.extractTweetId(tweetElement);
      if (!tweetId) {
        // This might happen if the anchor is found before the tweet ID link is fully rendered
        logger.debug('Could not extract tweet ID from parent element in animation handler', {
          tweetElement: tweetElement.outerHTML.substring(0, 100)
        });
        return;
      }

      // Find the action bar container using multiple strategies
      let actionBar: HTMLElement | null = null;
      
      // Strategy 1: Role group near the anchor (primary method)
      actionBar = anchorElement.closest('[role="group"]');
      
      // Strategy 2: Find any role="group" within the tweet
      if (!actionBar && tweetElement) {
        const actionBars = tweetElement.querySelectorAll('[role="group"]');
        if (actionBars.length > 0) {
          // Get the last one which is usually the action bar
          actionBar = actionBars[actionBars.length - 1] as HTMLElement;
        }
      }
      
      // Strategy 3: Locate the element containing reply/retweet/like buttons
      if (!actionBar) {
        const possibleContainers = tweetElement.querySelectorAll('div');
        for (const container of possibleContainers) {
          if (container.childElementCount >= 3 &&
              container.children[0] instanceof HTMLElement &&
              container.children[0].textContent?.includes('Reply') ||
              container.innerText.includes('Reply')) {
            actionBar = container as HTMLElement;
            break;
          }
        }
      }
      
      if (!actionBar || !(actionBar instanceof HTMLElement)) {
        logger.warn('Could not find action bar container using multiple strategies', {
          tweetId,
          anchorHtml: anchorElement.outerHTML.substring(0, 100)
        });
        return;
      }

      // Check if buttons already exist (using a class on the container)
      if (actionBar.querySelector('.better-feeds-rating')) {
        // logger.debug(`Buttons already exist for tweet ${tweetId} (checked in animation handler)`);
        // Ensure state is updated if needed (though processTweet should handle initial state)
        if (processedTweets[tweetId] && !processedTweets[tweetId].hasButtons) {
           processedTweets[tweetId].hasButtons = true;
        }
        return;
      }

      // Ensure the tweet has been initially processed by MutationObserver
      if (!processedTweets[tweetId]) {
        logger.debug(`Tweet ${tweetId} not yet in processed state during animation handling, initializing it now`);
        // Initialize the tweet state instead of deferring
        processedTweets[tweetId] = {
          element: tweetElement,
          hasButtons: false,
          isHidden: false
        };
        
        // Extract tweet data and get prediction
        const tweetData = this.extractTweetData(tweetElement, tweetId);
        this.getPrediction(tweetId, tweetData.content);
      }

      // If tweet state exists but buttons are missing, inject them now.
      if (processedTweets[tweetId] && !processedTweets[tweetId].hasButtons) {
        logger.debug(`Injecting buttons via animation trigger for tweet ${tweetId}`);
        this.injectRatingButtons(actionBar, tweetId); // Call the modified injection method
      }

    } catch (error) {
      logger.error('Error handling action bar marker animation', error);
    }
  }
  // --- End Animation Listener Logic ---


  public startObserving(): void {
    // Twitter's main timeline element - may need adjusting as Twitter updates
    logger.debug('Looking for Twitter timeline element');
    
    // Try multiple selectors to find the timeline element
    const selectors = [
      '[aria-label="Timeline: Your Home Timeline"]',
      '[data-testid="primaryColumn"]',
      'main[role="main"]',
      '[data-testid="cellInnerDiv"]'
    ];
    
    let feedElement = null;
    for (const selector of selectors) {
      feedElement = document.querySelector(selector);
      if (feedElement) {
        logger.debug(`Found timeline element using selector: ${selector}`);
        break;
      }
    }
    
    if (!feedElement) {
      logger.warn('Timeline element not found, retrying in 2 seconds...', {
        url: window.location.href,
        selectors: selectors,
        bodyContent: document.body.innerHTML.substring(0, 200) + '...' // Log a snippet of the body for debugging
      });
      setTimeout(() => this.startObserving(), 2000);
      return;
    }
    
    logger.info('Starting to observe timeline', {
      element: feedElement.tagName,
      childCount: feedElement.childElementCount
    });
    
    this.observer.observe(feedElement, {
      childList: true,
      subtree: true,
      attributes: false
    });
  }
  
  private handleMutations(mutations: MutationRecord[]): void {
    // Use performance measurement in debug mode
    measureTime(() => {
      // Find new tweets that were added to the DOM
      let addedNodesCount = 0;
      
      mutations.forEach(mutation => {
        if (mutation.type === 'childList' && mutation.addedNodes.length) {
          addedNodesCount += mutation.addedNodes.length;
          this.processAddedNodes(mutation.addedNodes);
        }
      });
      
      if (addedNodesCount > 0) {
        logger.debug(`Processed ${addedNodesCount} added DOM nodes`);
      }
    }, 'handleMutations');
  }
  
  private processAddedNodes(nodes: NodeList): void {
    // Track metrics for debugging
    let processedTweetCount = 0;
    
    nodes.forEach(node => {
      if (node instanceof HTMLElement) {
        // Twitter tweets are usually in article elements
        const tweetElements = node.querySelectorAll('article[data-testid="tweet"]');
        
        if (tweetElements.length > 0) {
          logger.debug(`Found ${tweetElements.length} tweet elements in node`);
          tweetElements.forEach(tweetEl => {
            this.processTweet(tweetEl as HTMLElement);
            processedTweetCount++;
          });
        }
        
        // Also check if the node itself is a tweet
        if (node.matches('article[data-testid="tweet"]')) {
          logger.debug('Node itself is a tweet element');
          this.processTweet(node);
          processedTweetCount++;
        }
      }
    });
    
    if (processedTweetCount > 0) {
      logger.debug(`Processed ${processedTweetCount} tweets`);
    }
  }
  
  private processTweet(tweetElement: HTMLElement): void {
    try {
      // Extract tweet ID from attributes or data
      const tweetId = this.extractTweetId(tweetElement);
      if (!tweetId) {
        logger.debug('Could not extract tweet ID, skipping tweet', {
          elementHtml: tweetElement.outerHTML.substring(0, 200) + '...'
        });
        return;
      }
      
      // Skip if we've already processed this tweet
      if (processedTweets[tweetId]) {
        logger.debug(`Tweet ${tweetId} already processed`);
        
        // If we've processed this tweet but still need to add buttons
        if (!processedTweets[tweetId].hasButtons) {
          logger.debug(`Tweet ${tweetId} missing buttons, trying to inject now`);
          this.attemptDirectButtonInjection(tweetElement, tweetId);
        }
        return;
      }
      
      logger.debug(`Processing new tweet: ${tweetId}`);
      
      // Add to processed tweets list
      processedTweets[tweetId] = {
        element: tweetElement,
        hasButtons: false,
        isHidden: false
      };
      
      // Extract tweet data
      const tweetData = this.extractTweetData(tweetElement, tweetId);
      logger.debug('Extracted tweet data', {
        id: tweetId,
        username: tweetData.username,
        contentLength: tweetData.content.length
      });

      // Try directly injecting buttons instead of relying solely on animation
      this.attemptDirectButtonInjection(tweetElement, tweetId);

      // Get prediction for this tweet
      this.getPrediction(tweetId, tweetData.content);
    } catch (error) {
      logger.error('Error processing tweet', error);
    }
  }
  
  // New helper method to attempt button injection using multiple strategies
  private attemptDirectButtonInjection(tweetElement: HTMLElement, tweetId: string): void {
    // Skip if buttons already exist
    if (processedTweets[tweetId]?.hasButtons) {
      return;
    }
    
    try {
      // Strategy 1: Find the standard action bar within the tweet
      let actionBar = tweetElement.querySelector('[role="group"]') as HTMLElement;
      
      // Strategy 2: Find by container with multiple action buttons
      if (!actionBar) {
        const containers = tweetElement.querySelectorAll('div');
        for (const container of containers) {
          if (container.childElementCount >= 3 &&
              (container.querySelectorAll('button').length >= 3 ||
               container.querySelectorAll('svg').length >= 3)) {
            actionBar = container as HTMLElement;
            break;
          }
        }
      }
      
      // Strategy 3: Look for text content related to actions
      if (!actionBar) {
        const elements = tweetElement.querySelectorAll('*');
        for (const el of elements) {
          if (el instanceof HTMLElement &&
              (el.textContent?.includes('Reply') ||
               el.textContent?.includes('Retweet') ||
               el.textContent?.includes('Like'))) {
            const parent = el.parentElement;
            if (parent && parent.childElementCount >= 3) {
              actionBar = parent as HTMLElement;
              break;
            }
          }
        }
      }
      
      if (actionBar) {
        logger.info(`Directly injecting buttons into tweet ${tweetId} (backup method)`);
        this.injectRatingButtons(actionBar, tweetId);
      } else {
        logger.warn(`Could not find action bar for direct injection in tweet ${tweetId}`);
      }
    } catch (error) {
      logger.error('Error in direct button injection', error);
    }
  }
  
  private extractTweetId(tweetElement: HTMLElement): string | null {
    // Twitter embeds tweet IDs in various ways, often in links
    const permalinkElement = tweetElement.querySelector('a[href*="/status/"]');
    if (!permalinkElement) return null;
    
    const href = permalinkElement.getAttribute('href');
    if (!href) return null;
    
    // Extract ID from permalink URL
    const match = href.match(/\/status\/(\d+)/);
    return match ? match[1] : null;
  }
  
  private extractTweetData(tweetElement: HTMLElement, tweetId: string): TweetData {
    // Find username element 
    const usernameElement = tweetElement.querySelector('[data-testid="User-Name"]');
    const username = usernameElement ? 
      usernameElement.textContent?.trim().replace('@', '') || 'unknown' : 
      'unknown';
    
    // Find tweet text
    const contentElement = tweetElement.querySelector('[data-testid="tweetText"]');
    const content = contentElement ? contentElement.textContent?.trim() || '' : '';
    
    return {
      id: tweetId,
      username,
      content,
      timestamp: Date.now()
    };
  }

  // Modified to accept the specific action bar element found by the animation handler
  private injectRatingButtons(actionBar: HTMLElement, tweetId: string): void {
    // Check if buttons already exist within this specific action bar
    if (actionBar.querySelector('.better-feeds-rating')) {
       logger.debug(`Buttons already present in action bar for tweet ${tweetId}`);
       return;
    }

    // We already have the action bar, no need to query for it again
    // const actionBar = tweetElement.querySelector('[role="group"]'); // REMOVED
    // if (!actionBar) return; // REMOVED

    logger.debug(`Creating and injecting buttons into action bar for tweet ${tweetId}`);

    // Create our custom rating buttons
    const ratingContainer = document.createElement('div');
    ratingContainer.className = 'better-feeds-rating';
    ratingContainer.style.display = 'inline-flex';
    ratingContainer.style.alignItems = 'center';
    ratingContainer.style.marginLeft = '12px';
    
    // Add sentiment label if available
    if (processedTweets[tweetId]?.sentiment) {
      const sentimentLabel = document.createElement('span');
      sentimentLabel.textContent = processedTweets[tweetId].sentiment || '';
      sentimentLabel.style.fontSize = '13px';
      sentimentLabel.style.marginRight = '8px';
      sentimentLabel.style.opacity = '0.7';
      ratingContainer.appendChild(sentimentLabel);
    }
    
    // Add up/down buttons
    const upButton = this.createRatingButton('👍', 1, tweetId);
    const downButton = this.createRatingButton('👎', -1, tweetId);
    
    ratingContainer.appendChild(upButton);
    ratingContainer.appendChild(downButton);
    
    // Add our buttons to the action bar
    actionBar.appendChild(ratingContainer);
    
    // Mark as having buttons
    if (processedTweets[tweetId]) {
      processedTweets[tweetId].hasButtons = true;
    }
  }
  
  private createRatingButton(emoji: string, rating: number, tweetId: string): HTMLButtonElement {
    const button = document.createElement('button');
    button.textContent = emoji;
    button.style.background = 'none';
    button.style.border = 'none';
    button.style.cursor = 'pointer';
    button.style.fontSize = '16px';
    button.style.padding = '8px';
    button.style.opacity = '0.6';
    button.style.transition = 'opacity 0.2s';
    
    // Hover effect
    button.addEventListener('mouseover', () => {
      button.style.opacity = '1';
    });
    
    button.addEventListener('mouseout', () => {
      button.style.opacity = '0.6';
    });
    
    // Click handler to save rating
    button.addEventListener('click', () => {
      // Get current tweet data
      const tweetElement = processedTweets[tweetId]?.element;
      if (!tweetElement) return;
      
      const tweetData = this.extractTweetData(tweetElement, tweetId);
      const ratedTweetData: TweetData = {
        ...tweetData,
        rating,
        ratedAt: Date.now()
      };
      
      // Send to background script for storage
      chrome.runtime.sendMessage({
        action: 'saveTweetRating',
        data: ratedTweetData
      } as MessageType);
      
      // Visual feedback that rating was saved
      button.style.opacity = '1';
      button.style.transform = 'scale(1.2)';
      setTimeout(() => {
        button.style.transform = 'scale(1)';
      }, 200);
    });
    
    return button;
  }
  
  private getPrediction(tweetId: string, content: string): void {
    chrome.runtime.sendMessage({
      action: 'getPrediction',
      tweetId,
      content
    } as MessageType, (response: {
      prediction?: 'like' | 'dislike' | null;
      confidence?: number;
      sentiment?: string;
      isUserRated?: boolean;
    }) => {
      if (!response) return;
      
      if (processedTweets[tweetId]) {
        // Store prediction
        processedTweets[tweetId].prediction = response.prediction;
        processedTweets[tweetId].confidence = response.confidence;
        processedTweets[tweetId].sentiment = response.sentiment;
        
        // Add sentiment label if available
        if (response.sentiment && processedTweets[tweetId].hasButtons) {
          const tweetElement = processedTweets[tweetId].element;
          const ratingContainer = tweetElement.querySelector('.better-feeds-rating');
          
          if (ratingContainer && !ratingContainer.querySelector('.better-feeds-sentiment')) {
            const sentimentLabel = document.createElement('span');
            sentimentLabel.className = 'better-feeds-sentiment';
            sentimentLabel.textContent = response.sentiment;
            sentimentLabel.style.fontSize = '13px';
            sentimentLabel.style.marginRight = '8px';
            sentimentLabel.style.opacity = '0.7';
            ratingContainer.prepend(sentimentLabel);
          }
        }
        
        // If filtering is enabled, hide low-confidence tweets
        if (settings.filterEnabled && 
            response.prediction === 'dislike' && 
            response.confidence && 
            response.confidence > (settings.filterThreshold / 100)) {
          this.hideTweet(tweetId);
        }
      }
    });
  }
  
  private hideTweet(tweetId: string): void {
    if (!processedTweets[tweetId] || processedTweets[tweetId].isHidden) return;
    
    const tweetElement = processedTweets[tweetId].element;
    
    // Create a placeholder element
    const placeholder = document.createElement('div');
    placeholder.className = 'better-feeds-hidden-tweet';
    placeholder.style.padding = '16px';
    placeholder.style.backgroundColor = 'rgba(0,0,0,0.02)';
    placeholder.style.borderRadius = '12px';
    placeholder.style.margin = '12px 0';
    placeholder.style.color = 'rgba(0,0,0,0.6)';
    placeholder.style.cursor = 'pointer';
    
    // Add text and button
    placeholder.innerHTML = `
      <div>Tweet hidden by Better Feeds</div>
      <button class="better-feeds-show-tweet">Show Tweet</button>
    `;
    
    const showButton = placeholder.querySelector('.better-feeds-show-tweet');
    if (showButton) {
      showButton.addEventListener('click', (e) => {
        e.stopPropagation();
        tweetElement.style.display = '';
        placeholder.remove();
        processedTweets[tweetId].isHidden = false;
      });
    }
    
    // Hide original tweet and insert placeholder
    tweetElement.style.display = 'none';
    tweetElement.parentNode?.insertBefore(placeholder, tweetElement);
    
    // Mark as hidden
    processedTweets[tweetId].isHidden = true;
  }
}

// Start observing the timeline for changes
function observeTimeline() {
  const handler = new TwitterDOMHandler();
  handler.startObserving();
  
  // Twitter uses SPA navigation, so we need to re-observe when page changes
  let lastUrl = location.href;
  new MutationObserver(() => {
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      handler.startObserving();
    }
  }).observe(document, { subtree: true, childList: true });
}

// Initialize when DOM is fully loaded
document.addEventListener('DOMContentLoaded', init);

// Handle settings updates
chrome.runtime.onMessage.addListener((message: MessageType) => {
  if (message.action === 'updateSettings') {
    settings = { ...settings, ...message.settings };
  }
}); 