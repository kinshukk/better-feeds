/**
 * Debug utilities for Better Feeds extension
 */

// Define log levels
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

// Global configuration
export const debugConfig = {
  // Set to minimum level to display (0 = all, 3 = only errors)
  logLevel: LogLevel.DEBUG,
  // Enable timing measurements
  enableTimings: true,
  // Prefix for all logs
  logPrefix: '[Better Feeds]',
  // Enable storing logs in memory for popup debugging
  storeLogsInMemory: true,
  // Maximum number of logs to keep in memory
  maxStoredLogs: 500
};

// In-memory log storage for sharing with popup
const logStorage: {
  timestamp: number;
  level: LogLevel;
  message: string;
  data?: any;
}[] = [];

// Color schemes for different log levels
const logColors = {
  [LogLevel.DEBUG]: 'color: #8a8a8a',
  [LogLevel.INFO]: 'color: #0077ff',
  [LogLevel.WARN]: 'color: #ff9900',
  [LogLevel.ERROR]: 'color: #ff0000; font-weight: bold'
};

// Log level names
const logLevelNames = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR'
};

/**
 * Central logging function
 */
function log(level: LogLevel, message: string, data?: any): void {
  // Skip if below configured log level
  if (level < debugConfig.logLevel) return;

  const timestamp = Date.now();
  const logLevelName = logLevelNames[level];
  const prefix = `${debugConfig.logPrefix} [${logLevelName}]`;

  // Store in memory if enabled
  if (debugConfig.storeLogsInMemory) {
    logStorage.push({
      timestamp,
      level,
      message,
      data
    });

    // Trim if exceeding max size
    if (logStorage.length > debugConfig.maxStoredLogs) {
      logStorage.shift();
    }
  }

  // Log to console with appropriate styling
  if (data !== undefined) {
    console.log(`%c${prefix} ${message}`, logColors[level], data);
  } else {
    console.log(`%c${prefix} ${message}`, logColors[level]);
  }
}

/**
 * Logger interface with convenience methods
 */
export const logger = {
  debug: (message: string, data?: any) => log(LogLevel.DEBUG, message, data),
  info: (message: string, data?: any) => log(LogLevel.INFO, message, data),
  warn: (message: string, data?: any) => log(LogLevel.WARN, message, data),
  error: (message: string, data?: any) => log(LogLevel.ERROR, message, data),
  
  // Get all stored logs
  getLogs: () => [...logStorage],
  
  // Clear log storage
  clearLogs: () => {
    logStorage.length = 0;
  }
};

/**
 * Performance measurement utility
 */
export function measureTime<T>(fn: () => T, label: string): T {
  if (!debugConfig.enableTimings) {
    return fn();
  }
  
  const start = performance.now();
  try {
    return fn();
  } finally {
    const duration = performance.now() - start;
    logger.debug(`⏱️ ${label} took ${duration.toFixed(2)}ms`);
  }
}

/**
 * Async performance measurement utility
 */
export async function measureTimeAsync<T>(fn: () => Promise<T>, label: string): Promise<T> {
  if (!debugConfig.enableTimings) {
    return fn();
  }
  
  const start = performance.now();
  try {
    return await fn();
  } finally {
    const duration = performance.now() - start;
    logger.debug(`⏱️ ${label} took ${duration.toFixed(2)}ms`);
  }
}

/**
 * Stats collector for aggregate performance metrics
 */
export class PerformanceStats {
  private counts: Record<string, number> = {};
  private durations: Record<string, number> = {};
  private minimums: Record<string, number> = {};
  private maximums: Record<string, number> = {};
  
  record(operation: string, durationMs: number): void {
    if (!this.counts[operation]) {
      this.counts[operation] = 0;
      this.durations[operation] = 0;
      this.minimums[operation] = durationMs;
      this.maximums[operation] = durationMs;
    } else {
      this.minimums[operation] = Math.min(this.minimums[operation], durationMs);
      this.maximums[operation] = Math.max(this.maximums[operation], durationMs);
    }
    
    this.counts[operation]++;
    this.durations[operation] += durationMs;
  }
  
  getStats(): Record<string, {
    count: number,
    totalMs: number,
    avgMs: number,
    minMs: number,
    maxMs: number
  }> {
    const result: Record<string, any> = {};
    
    Object.keys(this.counts).forEach(operation => {
      result[operation] = {
        count: this.counts[operation],
        totalMs: this.durations[operation],
        avgMs: this.durations[operation] / this.counts[operation],
        minMs: this.minimums[operation],
        maxMs: this.maximums[operation]
      };
    });
    
    return result;
  }
  
  reset(): void {
    this.counts = {};
    this.durations = {};
    this.minimums = {};
    this.maximums = {};
  }
  
  logStats(): void {
    const stats = this.getStats();
    logger.info('Performance statistics:', stats);
  }
}

// Global performance stats instance
export const perfStats = new PerformanceStats();