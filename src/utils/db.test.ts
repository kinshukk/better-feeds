// src/utils/db.test.ts
// Test utilities and the class under test will be imported after preload
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { BetterFeedsDatabase } from './db'; // Import the class
import type { TweetData, Settings } from '../types';

// Use a separate Dexie instance for testing or ensure clean state
// For simplicity, we'll clear the tables before each test

describe('BetterFeedsDatabase Tests', () => {
  let testDb: BetterFeedsDatabase; // Declare test DB instance variable
  // Sample data for testing
  const testTweet1: TweetData = {
    id: 'tweet1',
    username: 'user1',
    content: 'This is a test tweet', // Added content field
    timestamp: new Date('2024-01-01T10:00:00Z').getTime(), // Use getTime()
    rating: 80,
    ratedAt: new Date('2024-01-01T10:05:00Z').getTime(), // Use getTime()
  };
  const testTweet2: TweetData = {
    id: 'tweet2',
    username: 'user2',
    content: 'Another test tweet', // Added content field
    timestamp: new Date('2024-01-02T11:00:00Z').getTime(), // Use getTime()
    // No rating initially
  };
    const testTweet3: TweetData = {
    id: 'tweet3',
    username: 'user3',
    content: 'A rated tweet', // Added content field
    timestamp: new Date('2024-01-03T12:00:00Z').getTime(), // Use getTime()
    rating: 30,
    ratedAt: new Date('2024-01-03T12:05:00Z').getTime(), // Use getTime()
  };

  // Create a fresh DB instance for each test suite run or test
  // Using beforeEach ensures maximum isolation
  beforeEach(async () => {
    // Instantiate the DB *after* fake-indexeddb is active
    testDb = new BetterFeedsDatabase();
    // Ensure the DB is ready before clearing (Dexie might need this)
    await testDb.open();
    console.log('Clearing database tables before test...');
    await testDb.tweets.clear();
    await testDb.settings.clear();
    // Re-initialize default settings as clear removes them
    // Use the testDb instance here
    await testDb.settings.put({
        id: 'default',
        filterEnabled: false,
        filterThreshold: 50
    });
    console.log('Database tables cleared.');
  });
// Close the test database after each test
afterEach(async () => {
  if (testDb.isOpen()) {
      testDb.close();
  }
});

  describe('Tweet Operations', () => {
    it('should save a tweet correctly', async () => {
      console.log('Testing saveTweet...');
      await testDb.saveTweet(testTweet1); // Use testDb
      const count = await testDb.tweets.count(); // Use testDb
      expect(count).toBe(1);
      console.log('saveTweet test passed.');
    });

    it('should retrieve a saved tweet by ID', async () => {
      console.log('Testing getTweet...');
      await testDb.saveTweet(testTweet1); // Use testDb
      const retrievedTweet = await testDb.getTweet(testTweet1.id); // Use testDb
      expect(retrievedTweet).toBeDefined();
      // Add specific checks for the retrieved tweet's properties
      if (retrievedTweet) {
          expect(retrievedTweet.id).toBe(testTweet1.id);
          expect(retrievedTweet.username).toBe(testTweet1.username);
          // Use a type guard for the optional rating
          const rating = retrievedTweet.rating;
          expect(rating).toBeDefined(); // Ensure rating exists for this test case
          if (rating !== undefined) { // Type guard
              expect(rating).toBe(testTweet1.rating as number); // Explicit cast on expected value
          }
      }
      console.log('getTweet test passed.');
    });

    it('should return undefined for a non-existent tweet ID', async () => {
        console.log('Testing getTweet for non-existent ID...');
        const retrievedTweet = await testDb.getTweet('nonexistent'); // Use testDb
        expect(retrievedTweet).toBeUndefined();
        console.log('getTweet non-existent ID test passed.');
    });

    it('should retrieve only rated tweets', async () => {
      console.log('Testing getRatedTweets...');
      await testDb.saveTweet(testTweet1); // Rated // Use testDb
      await testDb.saveTweet(testTweet2); // Not rated // Use testDb
      await testDb.saveTweet(testTweet3); // Rated // Use testDb

      const ratedTweets = await testDb.getRatedTweets(); // Use testDb
      expect(ratedTweets.length).toBe(2);
      // Add type annotation for 't'
      expect(ratedTweets.some((t: TweetData) => t.id === testTweet1.id)).toBe(true);
      expect(ratedTweets.some((t: TweetData) => t.id === testTweet3.id)).toBe(true);
      expect(ratedTweets.some((t: TweetData) => t.id === testTweet2.id)).toBe(false); // Ensure unrated is not included
      console.log('getRatedTweets test passed.');
    });

     it('should return an empty array if no tweets are rated', async () => {
      console.log('Testing getRatedTweets with no rated tweets...');
      await testDb.saveTweet(testTweet2); // Not rated // Use testDb

      const ratedTweets = await testDb.getRatedTweets(); // Use testDb
      expect(ratedTweets.length).toBe(0);
      console.log('getRatedTweets (no rated) test passed.');
    });
  });

  describe('Settings Operations', () => {
    it('should retrieve default settings if none are explicitly set (after clear)', async () => {
      console.log('Testing getSettings (default)...');
      // beforeEach ensures default settings are put after clear using testDb
      const settings = await testDb.getSettings(); // Use testDb
      expect(settings).toBeDefined();
      expect(settings.id).toBe('default');
      expect(settings.filterEnabled).toBe(false);
      expect(settings.filterThreshold).toBe(50);
      console.log('getSettings (default) test passed.');
    });

     it('should retrieve existing settings', async () => {
      console.log('Testing getSettings (existing)...');
      const initialSettings: Settings = {
        id: 'default',
        filterEnabled: true,
        filterThreshold: 75
      };
      await testDb.settings.put(initialSettings); // Overwrite default for this test // Use testDb

      const settings = await testDb.getSettings(); // Use testDb
      expect(settings).toBeDefined();
      expect(settings.id).toBe('default');
      expect(settings.filterEnabled).toBe(true);
      expect(settings.filterThreshold).toBe(75);
      console.log('getSettings (existing) test passed.');
    });

    it('should update settings correctly', async () => {
      console.log('Testing updateSettings...');
      const newSettings: Omit<Settings, 'id'> = {
        filterEnabled: true,
        filterThreshold: 65,
      };
      await testDb.updateSettings(newSettings); // Use testDb

      const updatedSettings = await testDb.getSettings(); // Use testDb
      expect(updatedSettings).toBeDefined();
      expect(updatedSettings.filterEnabled).toBe(newSettings.filterEnabled);
      expect(updatedSettings.filterThreshold).toBe(newSettings.filterThreshold);
      console.log('updateSettings test passed.');
    });
  });
});