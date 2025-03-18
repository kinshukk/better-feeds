import type { Settings, TweetData } from '../types';

// UI Elements
const filterToggle = document.getElementById('filter-toggle') as HTMLInputElement;
const thresholdSlider = document.getElementById('threshold-slider') as HTMLInputElement;
const thresholdValue = document.querySelector('.threshold-value') as HTMLDivElement;
const ratedCount = document.getElementById('rated-count') as HTMLSpanElement;
const likesCount = document.getElementById('likes-count') as HTMLSpanElement;
const dislikesCount = document.getElementById('dislikes-count') as HTMLSpanElement;

// Load settings and update UI
async function loadSettings() {
  try {
    // Get settings from background script
    chrome.runtime.sendMessage({ action: 'getSettings' }, (settings: Settings) => {
      if (!settings) return;
      
      // Update UI with current settings
      filterToggle.checked = settings.filterEnabled;
      thresholdSlider.value = settings.filterThreshold.toString();
      thresholdValue.textContent = `${settings.filterThreshold}%`;
    });
    
    // Get stats for display
    await loadStats();
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

// Load stats about rated tweets
async function loadStats() {
  try {
    // Get all rated tweets from IndexedDB
    chrome.runtime.sendMessage({ action: 'getRatedTweets' }, (tweets: TweetData[]) => {
      if (!tweets || !Array.isArray(tweets)) return;
      
      // Count total rated and likes/dislikes
      const total = tweets.length;
      const likes = tweets.filter(tweet => tweet.rating === 1).length;
      const dislikes = tweets.filter(tweet => tweet.rating === -1).length;
      
      // Update UI
      ratedCount.textContent = total.toString();
      likesCount.textContent = likes.toString();
      dislikesCount.textContent = dislikes.toString();
    });
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

// Save settings when changed
function saveSettings() {
  const settings: Omit<Settings, 'id'> = {
    filterEnabled: filterToggle.checked,
    filterThreshold: parseInt(thresholdSlider.value, 10)
  };
  
  // Send to background script
  chrome.runtime.sendMessage({ 
    action: 'updateSettings', 
    settings: settings
  });
}

// Update threshold value display when slider changes
function updateThresholdDisplay() {
  thresholdValue.textContent = `${thresholdSlider.value}%`;
}

// Add event listeners
filterToggle.addEventListener('change', saveSettings);
thresholdSlider.addEventListener('input', updateThresholdDisplay);
thresholdSlider.addEventListener('change', saveSettings);

// Load settings when popup opens
document.addEventListener('DOMContentLoaded', loadSettings); 