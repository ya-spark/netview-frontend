/**
 * Logger utility for frontend application
 * Respects VITE_LOG_LEVEL environment variable
 * 
 * Log levels: DEBUG, INFO, WARN, ERROR
 * Only logs at or above the configured level
 */

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

const LOG_LEVELS: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

/**
 * Get the current log level from environment variable
 * Defaults to INFO if not set or invalid
 */
function getLogLevel(): LogLevel {
  const envLevel = import.meta.env.VITE_LOG_LEVEL?.toUpperCase();
  
  if (envLevel && envLevel in LOG_LEVELS) {
    return envLevel as LogLevel;
  }
  
  // Default to INFO if not set or invalid
  return 'INFO';
}

const currentLogLevel = getLogLevel();
const currentLevelValue = LOG_LEVELS[currentLogLevel];

/**
 * Check if a log level should be logged based on current configuration
 */
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= currentLevelValue;
}

/**
 * Logger interface with methods for different log levels
 */
export const logger = {
  /**
   * Log debug messages (only in DEBUG mode)
   */
  debug: (...args: unknown[]): void => {
    if (shouldLog('DEBUG')) {
      console.debug('[DEBUG]', ...args);
    }
  },

  /**
   * Log info messages
   */
  info: (...args: unknown[]): void => {
    if (shouldLog('INFO')) {
      console.info('[INFO]', ...args);
    }
  },

  /**
   * Log warning messages
   */
  warn: (...args: unknown[]): void => {
    if (shouldLog('WARN')) {
      console.warn('[WARN]', ...args);
    }
  },

  /**
   * Log error messages
   */
  error: (...args: unknown[]): void => {
    if (shouldLog('ERROR')) {
      console.error('[ERROR]', ...args);
    }
  },
};

