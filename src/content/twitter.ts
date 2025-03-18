import type { TweetData, Settings, MessageType } from '../types';

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
  console.log('Better Feeds: Twitter content script initialized');
  
  // Get current settings
  chrome.runtime.sendMessage({ action: 'getSettings' } as MessageType, (response: Settings) => {
    if (response) {
      settings = response;
      console.log('Settings loaded:', settings);
    }
  });
  
  // Set up observer to watch for new tweets
  observeTimeline();
}

// Twitter DOM handler class
class TwitterDOMHandler {
  private observer: MutationObserver;
  
  constructor() {
    // Configure MutationObserver to watch for new tweets
    this.observer = new MutationObserver(this.handleMutations.bind(this));
  }
  
  public startObserving(): void {
    // Twitter's main timeline element - may need adjusting as Twitter updates
    const feedElement = document.querySelector('[aria-label="Timeline: Your Home Timeline"], [data-testid="primaryColumn"]');
    if (!feedElement) {
      console.log('Better Feeds: Timeline element not found, retrying in 2 seconds...');
      setTimeout(() => this.startObserving(), 2000);
      return;
    }
    
    console.log('Better Feeds: Starting to observe timeline...');
    this.observer.observe(feedElement, {
      childList: true,
      subtree: true,
      attributes: false
    });
  }
  
  private handleMutations(mutations: MutationRecord[]): void {
    // Find new tweets that were added to the DOM
    mutations.forEach(mutation => {
      if (mutation.type === 'childList' && mutation.addedNodes.length) {
        this.processAddedNodes(mutation.addedNodes);
      }
    });
  }
  
  private processAddedNodes(nodes: NodeList): void {
    nodes.forEach(node => {
      if (node instanceof HTMLElement) {
        // Twitter tweets are usually in article elements
        const tweetElements = node.querySelectorAll('article[data-testid="tweet"]');
        tweetElements.forEach(tweetEl => this.processTweet(tweetEl as HTMLElement));
        
        // Also check if the node itself is a tweet
        if (node.matches('article[data-testid="tweet"]')) {
          this.processTweet(node);
        }
      }
    });
  }
  
  private processTweet(tweetElement: HTMLElement): void {
    // Extract tweet ID from attributes or data
    const tweetId = this.extractTweetId(tweetElement);
    if (!tweetId) return;
    
    // Skip if we've already processed this tweet
    if (processedTweets[tweetId]) {
      // If we've processed this tweet but still need to add buttons
      if (!processedTweets[tweetId].hasButtons) {
        this.injectRatingButtons(tweetElement, tweetId);
      }
      return;
    }
    
    // Add to processed tweets list
    processedTweets[tweetId] = {
      element: tweetElement,
      hasButtons: false,
      isHidden: false
    };
    
    // Extract tweet data
    const tweetData = this.extractTweetData(tweetElement, tweetId);
    
    // Inject rating buttons
    this.injectRatingButtons(tweetElement, tweetId);
    
    // Get prediction for this tweet
    this.getPrediction(tweetId, tweetData.content);
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
  
  private injectRatingButtons(tweetElement: HTMLElement, tweetId: string): void {
    // First check if we already added buttons to this tweet
    if (tweetElement.querySelector('.better-feeds-rating')) return;
    
    // Find the action bar (where retweet, like buttons are)
    const actionBar = tweetElement.querySelector('[role="group"]');
    if (!actionBar) return;
    
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