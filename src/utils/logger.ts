/**
 * Centralized Logger - SIKAD v4.0
 * Safely handles logs across environments, suppressing console logs in production.
 */

const IS_PROD = import.meta.env.PROD;

export const logger = {
  info: (message: string, ...args: any[]) => {
    if (!IS_PROD) {
      console.log(`[INFO] ${message}`, ...args);
    }
  },

  warn: (message: string, ...args: any[]) => {
    if (!IS_PROD) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  },

  error: (message: string, ...args: any[]) => {
    // Error is always logged for diagnostics, but can be forwarded to a monitoring service in prod
    console.error(`[ERROR] ${message}`, ...args);
  },
};
