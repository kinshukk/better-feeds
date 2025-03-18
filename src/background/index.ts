import { db } from '../utils/db';
import { TweetClassifier } from '../utils/classifier';
import type { MessageType, TweetData } from '../types';

// Initialize classifier
const classifier = new TweetClassifier();

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message: MessageType, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
  // Wrap in async function since we need to use async/await
  const handleMessage = async () => {
    switch (message.action) {
      case 'saveTweetRating': {
        try {
          await db.saveTweet(message.data);
          
          // Attempt to train classifier if we have new data
          const ratedTweets = await db.getRatedTweets();
          classifier.train(ratedTweets);
          
          return { success: true };
        } catch (error) {
          console.error('Error saving tweet rating:', error);
          return { success: false, error: (error as Error).message };
        }
      }
      
      case 'getPrediction': {
        try {
          // First check if we already have this tweet in the DB
          const existingTweet = await db.getTweet(message.tweetId);
          if (existingTweet?.rating !== undefined) {
            // If user has already rated this tweet, use that rating
            return { 
              prediction: existingTweet.rating === 1 ? 'like' : 'dislike',
              confidence: 1.0,
              isUserRated: true
            };
          }
          
          // If classifier isn't ready, generate simple sentiment
          if (!classifier.isReady()) {
            const sentiment = classifier.generateSimpleSentiment(message.content);
            return { 
              prediction: null, 
              confidence: 0,
              sentiment 
            };
          }
          
          // Otherwise get prediction from classifier
          const result = classifier.predict(message.content);
          return {
            ...result,
            isUserRated: false
          };
        } catch (error) {
          console.error('Error getting prediction:', error);
          return { 
            prediction: null, 
            confidence: 0,
            error: (error as Error).message 
          };
        }
      }
      
      case 'getSettings': {
        try {
          const settings = await db.getSettings();
          return settings;
        } catch (error) {
          console.error('Error getting settings:', error);
          return { 
            filterEnabled: false, 
            filterThreshold: 50,
            error: (error as Error).message 
          };
        }
      }
      
      case 'updateSettings': {
        try {
          await db.updateSettings(message.settings);
          return { success: true };
        } catch (error) {
          console.error('Error updating settings:', error);
          return { 
            success: false, 
            error: (error as Error).message 
          };
        }
      }
      
      default: {
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
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Better Feeds extension installed');
  
  // Initialize settings
  const settings = await db.getSettings();
  console.log('Initial settings:', settings);
}); 