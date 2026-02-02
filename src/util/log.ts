import { LogLevel } from '../core/types.js';

/**
 * ANSI color codes for terminal output
 */
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
};

/**
 * Check if we're in a TTY context
 */
const isTTY = process.stdout.isTTY ?? false;

/**
 * Apply color only if in TTY
 */
function colorize(text: string, color: keyof typeof colors): string {
  if (!isTTY) return text;
  return `${colors[color]}${text}${colors.reset}`;
}

/**
 * Logger instance
 */
class Logger {
  private level: LogLevel = LogLevel.Info;

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  getLevel(): LogLevel {
    return this.level;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.Silent, LogLevel.Info, LogLevel.Debug];
    return levels.indexOf(level) <= levels.indexOf(this.level);
  }

  /**
   * Info-level log (shows at info and debug)
   */
  info(message: string): void {
    if (this.shouldLog(LogLevel.Info)) {
      console.error(colorize('ℹ', 'blue'), message);
    }
  }

  /**
   * Success message
   */
  success(message: string): void {
    if (this.shouldLog(LogLevel.Info)) {
      console.error(colorize('✓', 'green'), message);
    }
  }

  /**
   * Warning message
   */
  warn(message: string): void {
    if (this.shouldLog(LogLevel.Info)) {
      console.error(colorize('⚠', 'yellow'), colorize('Warning:', 'yellow'), message);
    }
  }

  /**
   * Error message
   */
  error(message: string): void {
    if (this.shouldLog(LogLevel.Info)) {
      console.error(colorize('✖', 'red'), colorize('Error:', 'red'), message);
    }
  }

  /**
   * Debug-level log (only shows at debug)
   */
  debug(message: string): void {
    if (this.shouldLog(LogLevel.Debug)) {
      console.error(colorize('⋯', 'gray'), colorize(message, 'gray'));
    }
  }

  /**
   * Debug-level structured data
   */
  debugData(label: string, data: unknown): void {
    if (this.shouldLog(LogLevel.Debug)) {
      console.error(colorize(`⋯ ${label}:`, 'gray'));
      console.error(colorize(JSON.stringify(data, null, 2), 'gray'));
    }
  }

  /**
   * Print a section header
   */
  header(title: string): void {
    if (this.shouldLog(LogLevel.Info)) {
      console.error('');
      console.error(colorize(colorize(`▶ ${title}`, 'cyan'), 'bold'));
    }
  }

  /**
   * Print a list item
   */
  listItem(text: string): void {
    if (this.shouldLog(LogLevel.Info)) {
      console.error(`  • ${text}`);
    }
  }

  /**
   * Print stats summary
   */
  stats(stats: Record<string, number | string>): void {
    if (this.shouldLog(LogLevel.Info)) {
      console.error('');
      for (const [key, value] of Object.entries(stats)) {
        console.error(`  ${colorize(key + ':', 'gray')} ${value}`);
      }
    }
  }

  /**
   * Print a blank line
   */
  blank(): void {
    if (this.shouldLog(LogLevel.Info)) {
      console.error('');
    }
  }
}

/**
 * Singleton logger instance
 */
export const log = new Logger();
