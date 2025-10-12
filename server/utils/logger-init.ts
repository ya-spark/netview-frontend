import { logger } from './rotating-logger';
import { inspect } from 'util';

const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleInfo = console.info;

function safeStringify(arg: any): string {
  if (typeof arg === 'string') {
    return arg;
  }
  if (typeof arg === 'object' && arg !== null) {
    return inspect(arg, { depth: 3, colors: false, compact: true });
  }
  return String(arg);
}

console.log = (...args: any[]) => {
  try {
    const message = args.map(safeStringify).join(' ');
    logger.info(message, 'console');
  } catch (error) {
    // Fallback in case of any error
    logger.error(`Failed to log message: ${error}`, 'console');
  }
  originalConsoleLog(...args);
};

console.error = (...args: any[]) => {
  try {
    const message = args.map(safeStringify).join(' ');
    logger.error(message, 'console');
  } catch (error) {
    // Fallback in case of any error
    logger.error(`Failed to log error: ${error}`, 'console');
  }
  originalConsoleError(...args);
};

console.warn = (...args: any[]) => {
  try {
    const message = args.map(safeStringify).join(' ');
    logger.warn(message, 'console');
  } catch (error) {
    // Fallback in case of any error
    logger.error(`Failed to log warning: ${error}`, 'console');
  }
  originalConsoleWarn(...args);
};

console.info = (...args: any[]) => {
  try {
    const message = args.map(safeStringify).join(' ');
    logger.info(message, 'console');
  } catch (error) {
    // Fallback in case of any error
    logger.error(`Failed to log info: ${error}`, 'console');
  }
  originalConsoleInfo(...args);
};

export { logger };
