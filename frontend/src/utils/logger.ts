/**
 * Centralized Logging System
 * Replaces direct console usage with structured logging
 * Provides different log levels and formatting
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: string;
  data?: unknown;
}

class Logger {
  private currentLevel: LogLevel = __DEV__ ? LogLevel.DEBUG : LogLevel.WARN;

  private formatMessage(level: LogLevel, message: string, context?: string): string {
    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level];
    const contextStr = context ? `[${context}]` : '';
    return `${timestamp} ${levelName} ${contextStr} ${message}`;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.currentLevel;
  }

  private logToConsole(level: LogLevel, message: string, data?: unknown): void {
    const formattedMessage = this.formatMessage(level, message);

    switch (level) {
      case LogLevel.DEBUG:
        // eslint-disable-next-line no-console
        console.debug(formattedMessage, data);
        break;
      case LogLevel.INFO:
        // eslint-disable-next-line no-console
        console.log(formattedMessage, data);
        break;
      case LogLevel.WARN:
        // eslint-disable-next-line no-console
        console.warn(formattedMessage, data);
        break;
      case LogLevel.ERROR:
        // eslint-disable-next-line no-console
        console.error(formattedMessage, data);
        break;
    }
  }

  setLogLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  debug(message: string, context?: string, data?: unknown): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.logToConsole(LogLevel.DEBUG, message, data);
    }
  }

  info(message: string, context?: string, data?: unknown): void {
    if (this.shouldLog(LogLevel.INFO)) {
      this.logToConsole(LogLevel.INFO, message, data);
    }
  }

  warn(message: string, context?: string, data?: unknown): void {
    if (this.shouldLog(LogLevel.WARN)) {
      this.logToConsole(LogLevel.WARN, message, data);
    }
  }

  error(message: string, context?: string, data?: unknown): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      this.logToConsole(LogLevel.ERROR, message, data);
    }
  }

  // Recovery and diagnostic logging methods
  recovery(message: string, data?: unknown): void {
    this.info(message, 'RECOVERY', data);
  }

  wsodFix(message: string, data?: unknown): void {
    this.info(message, 'WSOD_FIX', data);
  }

  timingCoordination(message: string, data?: unknown): void {
    this.warn(message, 'TIMING_COORDINATION', data);
  }
}

// Export singleton instance
export const logger = new Logger();

// Convenience exports for common usage patterns
export const logRecovery = (message: string, data?: unknown): void =>
  logger.recovery(message, data);

export const logWsodFix = (message: string, data?: unknown): void =>
  logger.wsodFix(message, data);

export const logTimingCoordination = (message: string, data?: unknown): void =>
  logger.timingCoordination(message, data);
