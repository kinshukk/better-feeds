// Common interfaces used across the extension

// Represents a captured tweet with user rating
export interface TweetData {
  id: string;
  username: string;
  content: string;
  timestamp: number; // When the tweet was observed
  rating?: number;   // 1 for upvote, -1 for downvote
  ratedAt?: number;  // When the user rated it
  sentiment?: string; // LLM-generated sentiment (future feature)
}

// Extension settings
export interface Settings {
  id?: string;       // ID for database storage
  filterEnabled: boolean;
  filterThreshold: number; // 0-100, sensitivity for hiding posts
}

// Message types for communication between content and background scripts
export type MessageType = 
  | { action: 'saveTweetRating'; data: TweetData }
  | { action: 'getPrediction'; tweetId: string; content: string }
  | { action: 'getSettings' }
  | { action: 'getRatedTweets' }
  | { action: 'updateSettings'; settings: Settings }; 