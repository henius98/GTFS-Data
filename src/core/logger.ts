// src/core/logger.ts
export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

export const consoleLogger: Logger = {
  info(message, meta) {
    if (meta) {
      // eslint-disable-next-line no-console
      console.log(`[INFO] ${message}`, meta);
    } else {
      console.log(`[INFO] ${message}`);
    }
  },
  warn(message, meta) {
    if (meta) {
      console.warn(`[WARN] ${message}`, meta);
    } else {
      console.warn(`[WARN] ${message}`);
    }
  },
  error(message, meta) {
    if (meta) {
      console.error(`[ERROR] ${message}`, meta);
    } else {
      console.error(`[ERROR] ${message}`);
    }
  }
};
