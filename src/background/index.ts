import { getDbInstance } from '../utils/db'; // Import the instance getter
import { TweetClassifier } from '../utils/classifier';
import { logger } from '../utils/debug';
import type { MessageType, TweetData } from '../types';

// Log background script initialization
logger.info('Background script initializing');

// Initialize classifier
const classifier = new TweetClassifier();
const db = getDbInstance(); // Get the singleton DB instance

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
  // Handle debug logging from content scripts
  if (message.action === 'log') {
    const { level, message: logMessage, data, source, timestamp } = message;
    console.log(`[From ${source}][${level}] ${logMessage}`, data || '');
    return false; // No response needed
  }
  
  // Log incoming messages (but not logs to avoid recursion)
  logger.debug('Received message', { action: message.action, sender: sender.url });
  // Wrap in async function since we need to use async/await
  const handleMessage = async () => {
    switch (message.action) {
      case 'saveTweetRating': {
        try {
          logger.info('Saving tweet rating', { tweetId: message.data?.id });
          await db.saveTweet(message.data);
          
          // Attempt to train classifier if we have new data
          logger.debug('Getting rated tweets for classifier training');
          const ratedTweets = await db.getRatedTweets();
          
          if (ratedTweets.length > 0) {
            logger.info(`Training classifier with ${ratedTweets.length} tweets`);
            const trainSuccess = classifier.train(ratedTweets);
            logger.debug(`Classifier training ${trainSuccess ? 'succeeded' : 'needs more data'}`);
          }
          
          return { success: true };
        } catch (error) {
          logger.error('Failed to save tweet rating', error);
          return { success: false, error: (error as Error).message };
        }
      }
      
      case 'getPrediction': {
        try {
          logger.debug('Getting prediction', { tweetId: message.tweetId });
          
          // First check if we already have this tweet in the DB
          const existingTweet = await db.getTweet(message.tweetId);
          if (existingTweet?.rating !== undefined) {
            // If user has already rated this tweet, use that rating
            logger.debug('Using existing rating', { tweetId: message.tweetId, rating: existingTweet.rating });
            return {
              prediction: existingTweet.rating === 1 ? 'like' : 'dislike',
              confidence: 1.0,
              isUserRated: true
            };
          }
          
          // If classifier isn't ready, generate simple sentiment
          if (!classifier.isReady()) {
            logger.debug('Classifier not ready, using simple sentiment');
            const sentiment = classifier.generateSimpleSentiment(message.content);
            logger.debug('Generated sentiment', { sentiment });
            return {
              prediction: null,
              confidence: 0,
              sentiment
            };
          }
          
          // Otherwise get prediction from classifier
          logger.debug('Getting prediction from classifier');
          const result = classifier.predict(message.content);
          logger.debug('Prediction result', result);
          
          return {
            ...result,
            isUserRated: false
          };
        } catch (error) {
          logger.error('Failed to get prediction', error);
          return {
            prediction: null,
            confidence: 0,
            error: (error as Error).message
          };
        }
      }
      
      case 'getSettings': {
        try {
          logger.debug('Getting settings');
          const settings = await db.getSettings();
          logger.debug('Retrieved settings', settings);
          return settings;
        } catch (error) {
          logger.error('Failed to get settings', error);
          return {
            filterEnabled: false,
            filterThreshold: 50,
            error: (error as Error).message
          };
        }
      }
      
      case 'updateSettings': {
        try {
          logger.info('Updating settings', message.settings);
          await db.updateSettings(message.settings);
          return { success: true };
        } catch (error) {
          logger.error('Failed to update settings', error);
          return {
            success: false,
            error: (error as Error).message
          };
        }
      }
      
      case 'toggleDebug': {
        try {
          const isEnabled = message.enabled;
          if (isEnabled !== undefined) {
            // Set debug mode to specific value
            if (isEnabled) {
              logger.info('Enabling debug mode');
            } else {
              logger.info('Disabling debug mode');
            }
            // TODO: Update settings to store debug mode
          } else {
            // Toggle current debug mode
            logger.info('Toggling debug mode');
            // TODO: Update settings to store debug mode
          }
          return { success: true, debugEnabled: true };
        } catch (error) {
          logger.error('Failed to toggle debug mode', error);
          return { success: false, error: (error as Error).message };
        }
      }
      
      default: {
        logger.warn('Unknown message action received', { action: message.action });
        return { error: 'Unknown action' };
      }
    }
  };
  
  // Execute async function and send response when done
  handleMessage().then(sendResponse);
  
  // Return true to indicate we will send response asynchronously
  return true;
});

// Initialize on extension install
chrome.runtime.onInstalled.addListener(async (details) => {
  logger.info('Extension installed/updated', {
    reason: details.reason,
    version: chrome.runtime.getManifest().version
  });
  
  try {
    // Initialize settings
    const settings = await db.getSettings();
    logger.info('Initial settings loaded', settings);
    
    // Check if we have any existing rated tweets to train classifier
    const ratedTweets = await db.getRatedTweets();
    logger.info(`Found ${ratedTweets.length} rated tweets`);
    
    if (ratedTweets.length > 0) {
      logger.info('Training classifier with existing data');
      classifier.train(ratedTweets);
    }
  } catch (error) {
    logger.error('Error during initialization', error);
  }
});

// Listen for debug logs from content scripts
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message && message.type === 'DEBUG_LOG') {
    const { level, text, data } = message;
    console.log(`[Content Script][${level}] ${text}`, data || '');
  }
});