import Dexie from 'dexie';
import type { TweetData, Settings } from '../types';

// Define our database schema using Dexie
// Export the class directly
export class BetterFeedsDatabase extends Dexie {
  tweets!: Dexie.Table<TweetData, string>; // string = type of the primary key
  settings!: Dexie.Table<Settings, string>;

  constructor() {
    super('BetterFeedsDB');
    
    // Define tables and indices
    this.version(1).stores({
      tweets: 'id, username, timestamp, rating, ratedAt',
      settings: 'id'
    });
    
    // Initialize with default settings if none exist
    this.on('ready', async () => {
      const settingsCount = await this.settings.count();
      if (settingsCount === 0) {
        await this.settings.put({
          id: 'default',
          filterEnabled: false,
          filterThreshold: 50 // Default middle threshold
        });
      }
    });
  }

  // Helper methods for common operations
  async saveTweet(tweet: TweetData): Promise<void> {
    await this.tweets.put(tweet);
  }

  async getTweet(id: string): Promise<TweetData | undefined> {
    return this.tweets.get(id);
  }

  async getRatedTweets(): Promise<TweetData[]> {
    return this.tweets
      .filter(tweet => tweet.rating !== undefined)
      .toArray();
  }

  async getSettings(): Promise<Settings> {
    const settings = await this.settings.get('default');
    // Fallback settings if somehow the default settings are missing
    return settings || { 
      id: 'default', 
      filterEnabled: false, 
      filterThreshold: 50 
    };
  }

  async updateSettings(newSettings: Omit<Settings, 'id'>): Promise<void> {
    await this.settings.update('default', newSettings);
  }
}

// Singleton pattern for the main application instance
let dbInstance: BetterFeedsDatabase | null = null;

export function getDbInstance(): BetterFeedsDatabase {
  if (!dbInstance) {
    console.log("Creating DB instance..."); // Added log for debugging
    dbInstance = new BetterFeedsDatabase();
  }
  return dbInstance;
}

// Note: Other parts of the application will need to be updated
// to use getDbInstance() instead of the direct 'db' import.