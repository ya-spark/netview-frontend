/**
 * Logger utility for frontend application with best practices
 * Respects VITE_LOG_LEVEL and VITE_LOG_FORMAT environment variables
 * 
 * Features:
 * - Structured logging (JSON format for production)
 * - Context support (user ID, request ID, component name, etc.)
 * - Security: Automatic sanitization of sensitive data
 * - Error tracking integration ready
 * - Performance logging
 * - Different behavior for development vs production
 * - Stack trace support for errors
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

interface LogContext {
  userId?: string;
  tenantId?: number;
  requestId?: string;
  component?: string;
  action?: string;
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  data?: unknown;
}

// Sensitive data patterns to sanitize
const SENSITIVE_PATTERNS = [
  /password["\']?\s*[:=]\s*["\']?([^"\'\s]+)/gi,
  /token["\']?\s*[:=]\s*["\']?([^"\'\s]+)/gi,
  /api[_-]?key["\']?\s*[:=]\s*["\']?([^"\'\s]+)/gi,
  /auth[_-]?token["\']?\s*[:=]\s*["\']?([^"\'\s]+)/gi,
  /secret["\']?\s*[:=]\s*["\']?([^"\'\s]+)/gi,
  /private[_-]?key["\']?\s*[:=]\s*["\']?([^"\'\s]+)/gi,
  /authorization["\']?\s*[:=]\s*["\']?([^"\'\s]+)/gi,
  /bearer\s+[\w-]+/gi,
];

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

/**
 * Get the log format type from environment variable
 * Options: 'json' for structured JSON logging, 'text' for human-readable
 * Defaults to 'text' if not set or invalid
 */
function getLogFormat(): 'json' | 'text' {
  const format = import.meta.env.VITE_LOG_FORMAT?.toLowerCase();
  if (format === 'json' || format === 'text') {
    return format;
  }
  return 'text';
}

/**
 * Check if running in development mode
 */
function isDevelopmentMode(): boolean {
  return import.meta.env.DEV || import.meta.env.MODE === 'development';
}

/**
 * Check if running in production mode
 */
function isProductionMode(): boolean {
  return import.meta.env.PROD || import.meta.env.MODE === 'production';
}

const currentLogLevel = getLogLevel();
const currentLevelValue = LOG_LEVELS[currentLogLevel];
const logFormat = getLogFormat();
const isDev = isDevelopmentMode();

/**
 * Check if a log level should be logged based on current configuration
 */
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= currentLevelValue;
}

/**
 * Sanitize sensitive data from strings
 */
function sanitizeData(data: unknown): unknown {
  if (typeof data === 'string') {
    let sanitized = data;
    for (const pattern of SENSITIVE_PATTERNS) {
      sanitized = sanitized.replace(pattern, (match) => {
        if (match.toLowerCase().includes('password')) {
          return 'password": "***REDACTED***';
        }
        if (match.toLowerCase().includes('token')) {
          return 'token": "***REDACTED***';
        }
        if (match.toLowerCase().includes('key')) {
          return 'key": "***REDACTED***';
        }
        if (match.toLowerCase().includes('secret')) {
          return 'secret": "***REDACTED***';
        }
        return '***REDACTED***';
      });
    }
    return sanitized;
  }
  
  if (typeof data === 'object' && data !== null) {
    if (Array.isArray(data)) {
      return data.map(sanitizeData);
    }
    
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes('password') ||
        lowerKey.includes('token') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('key') ||
        lowerKey.includes('auth')
      ) {
        sanitized[key] = '***REDACTED***';
      } else {
        sanitized[key] = sanitizeData(value);
      }
    }
    return sanitized;
  }
  
  return data;
}

/**
 * Format log entry as JSON
 */
function formatAsJSON(entry: LogEntry): string {
  return JSON.stringify(entry);
}

/**
 * Format log entry as human-readable text
 */
function formatAsText(entry: LogEntry): string {
  const timestamp = new Date(entry.timestamp).toISOString();
  const contextStr = entry.context
    ? ` [${Object.entries(entry.context)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ')}]`
    : '';
  const errorStr = entry.error
    ? `\n  Error: ${entry.error.name}: ${entry.error.message}${entry.error.stack ? `\n  Stack: ${entry.error.stack}` : ''}`
    : '';
  const dataStr = entry.data ? `\n  Data: ${JSON.stringify(sanitizeData(entry.data), null, 2)}` : '';
  
  return `${timestamp} [${entry.level}] ${entry.message}${contextStr}${errorStr}${dataStr}`;
}

/**
 * Create a log entry
 */
function createLogEntry(
  level: LogLevel,
  message: string,
  context?: LogContext,
  error?: Error,
  data?: unknown
): LogEntry {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message: sanitizeData(message) as string,
  };

  if (context) {
    entry.context = sanitizeData(context) as LogContext;
  }

  if (error) {
    entry.error = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  if (data !== undefined) {
    entry.data = sanitizeData(data);
  }

  return entry;
}

/**
 * Output log entry to console
 */
function outputLog(entry: LogEntry): void {
  const formatted = logFormat === 'json' ? formatAsJSON(entry) : formatAsText(entry);

  switch (entry.level) {
    case 'DEBUG':
      console.debug(formatted);
      break;
    case 'INFO':
      console.info(formatted);
      break;
    case 'WARN':
      console.warn(formatted);
      break;
    case 'ERROR':
      console.error(formatted);
      // In production, could send to error tracking service here
      if (isProductionMode() && entry.error) {
        // Example: sendToErrorTracking(entry);
      }
      break;
  }
}

/**
 * Logger interface with methods for different log levels
 */
export const logger = {
  /**
   * Log debug messages (only in DEBUG mode)
   */
  debug: (message: string, context?: LogContext, data?: unknown): void => {
    if (shouldLog('DEBUG')) {
      const entry = createLogEntry('DEBUG', message, context, undefined, data);
      outputLog(entry);
    }
  },

  /**
   * Log info messages
   */
  info: (message: string, context?: LogContext, data?: unknown): void => {
    if (shouldLog('INFO')) {
      const entry = createLogEntry('INFO', message, context, undefined, data);
      outputLog(entry);
    }
  },

  /**
   * Log warning messages
   */
  warn: (message: string, context?: LogContext, data?: unknown): void => {
    if (shouldLog('WARN')) {
      const entry = createLogEntry('WARN', message, context, undefined, data);
      outputLog(entry);
    }
  },

  /**
   * Log error messages with optional error object
   */
  error: (message: string, error?: Error, context?: LogContext, data?: unknown): void => {
    if (shouldLog('ERROR')) {
      const entry = createLogEntry('ERROR', message, context, error, data);
      outputLog(entry);
    }
  },

  /**
   * Log exception with full stack trace
   */
  exception: (message: string, error: Error, context?: LogContext, data?: unknown): void => {
    if (shouldLog('ERROR')) {
      const entry = createLogEntry('ERROR', message, context, error, data);
      outputLog(entry);
    }
  },

  /**
   * Log with context (convenience method)
   */
  withContext: (context: LogContext) => {
    return {
      debug: (message: string, data?: unknown) => logger.debug(message, context, data),
      info: (message: string, data?: unknown) => logger.info(message, context, data),
      warn: (message: string, data?: unknown) => logger.warn(message, context, data),
      error: (message: string, error?: Error, data?: unknown) => logger.error(message, error, context, data),
      exception: (message: string, error: Error, data?: unknown) => logger.exception(message, error, context, data),
    };
  },

  /**
   * Performance logging - log execution time
   */
  performance: (label: string, fn: () => void): void => {
    if (shouldLog('DEBUG')) {
      const start = performance.now();
      fn();
      const duration = performance.now() - start;
      logger.debug(`Performance: ${label} took ${duration.toFixed(2)}ms`);
    } else {
      fn();
    }
  },

  /**
   * Performance logging - async version
   */
  performanceAsync: async <T>(label: string, fn: () => Promise<T>): Promise<T> => {
    if (shouldLog('DEBUG')) {
      const start = performance.now();
      const result = await fn();
      const duration = performance.now() - start;
      logger.debug(`Performance: ${label} took ${duration.toFixed(2)}ms`);
      return result;
    } else {
      return await fn();
    }
  },
};

/**
 * Create a logger instance with default context
 * Useful for component-level logging
 */
export function createLogger(defaultContext: LogContext) {
  return logger.withContext(defaultContext);
}

