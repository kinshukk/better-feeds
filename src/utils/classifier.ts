import { TweetData } from '../types';

// Simple classifier that doesn't rely on Node.js-specific libraries
export class TweetClassifier {
  private trained: boolean = false;
  private likedWords: Map<string, number> = new Map();
  private dislikedWords: Map<string, number> = new Map();
  private minTrainingExamples = 10; // Minimum examples needed before prediction
  
  constructor() {
    // No initialization needed
  }
  
  // Process text for classification (tokenize, remove stopwords, etc.)
  private processText(text: string): string[] {
    if (!text) return [];
    
    // Convert to lowercase and tokenize
    const tokens = text.toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .split(/\s+/)
      .filter(Boolean); // Remove empty tokens
    
    // Very basic stopword removal
    const stopwords = ['a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'in', 'to', 'of', 'for'];
    return tokens.filter(token => 
      // Remove stopwords and tokens that are just very short
      !stopwords.includes(token) && token.length > 1
    );
  }
  
  // Train the classifier with rated tweets
  public train(tweets: TweetData[]): boolean {
    // Filter to only include tweets that have ratings
    const ratedTweets = tweets.filter(tweet => 
      tweet.rating !== undefined && tweet.content
    );
    
    if (ratedTweets.length < this.minTrainingExamples) {
      console.log(`Not enough rated tweets to train classifier (${ratedTweets.length}/${this.minTrainingExamples})`);
      return false;
    }
    
    // Reset word counts
    this.likedWords.clear();
    this.dislikedWords.clear();
    
    // Process each tweet and count word occurrences
    for (const tweet of ratedTweets) {
      const words = this.processText(tweet.content);
      const wordMap = tweet.rating === 1 ? this.likedWords : this.dislikedWords;
      
      for (const word of words) {
        wordMap.set(word, (wordMap.get(word) || 0) + 1);
      }
    }
    
    this.trained = true;
    console.log('Classifier trained successfully');
    return true;
  }
  
  // Predict if a user would like or dislike a tweet
  public predict(tweetContent: string): { prediction: 'like' | 'dislike' | null; confidence: number } {
    if (!this.trained) {
      return { prediction: null, confidence: 0 };
    }
    
    const words = this.processText(tweetContent);
    if (words.length === 0) {
      return { prediction: null, confidence: 0 };
    }
    
    let likeScore = 0;
    let dislikeScore = 0;
    
    // Calculate score based on word frequencies
    for (const word of words) {
      likeScore += this.likedWords.get(word) || 0;
      dislikeScore += this.dislikedWords.get(word) || 0;
    }
    
    // Normalize scores
    const totalScore = likeScore + dislikeScore;
    if (totalScore === 0) {
      return { prediction: null, confidence: 0 };
    }
    
    const likeConfidence = likeScore / totalScore;
    const dislikeConfidence = dislikeScore / totalScore;
    
    if (likeConfidence > dislikeConfidence) {
      return { prediction: 'like', confidence: likeConfidence };
    } else {
      return { prediction: 'dislike', confidence: dislikeConfidence };
    }
  }
  
  // Check if the classifier has been trained
  public isReady(): boolean {
    return this.trained;
  }
  
  // Generate a simple sentiment label
  public generateSimpleSentiment(text: string): string {
    const positiveWords = ['good', 'great', 'love', 'excellent', 'happy', 'amazing'];
    const negativeWords = ['bad', 'terrible', 'hate', 'awful', 'sad', 'horrible'];
    
    let positiveCount = 0;
    let negativeCount = 0;
    
    const words = text.toLowerCase().split(/\s+/);
    
    words.forEach(word => {
      if (positiveWords.includes(word)) positiveCount++;
      if (negativeWords.includes(word)) negativeCount++;
    });
    
    if (positiveCount > negativeCount) return 'Positive';
    if (negativeCount > positiveCount) return 'Negative';
    return 'Neutral';
  }
} 