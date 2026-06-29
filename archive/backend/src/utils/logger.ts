/**
 * Logger Utility
 * Simple logging utility for ScrollUniversity backend
 */

function formatLog(level: string, message: string, data?: any): string {
  const timestamp = new Date().toISOString();
  if ((process.env.LOG_FORMAT || '').toLowerCase() === 'json') {
    const payload: Record<string, any> = { level, timestamp, message };
    if (data !== undefined) payload.data = data;
    return JSON.stringify(payload);
  }
  return `[${level.toUpperCase()}] ${timestamp} - ${message} ${data ? JSON.stringify(data) : ''}`.trim();
}

export const logger = {
  info: (message: string, data?: any) => {
    console.log(formatLog('info', message, data));
  },

  error: (message: string, error?: any) => {
    console.error(formatLog('error', message, error));
  },

  warn: (message: string, data?: any) => {
    console.warn(formatLog('warn', message, data));
  },

  debug: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(formatLog('debug', message, data));
    }
  }
};

// Keep both import styles working across legacy backend services:
//   import logger from '../utils/logger'
//   import { logger } from '../utils/logger'
export default logger;
