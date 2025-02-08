import { createLogger, format, Logger, transports } from "winston";

export type LogLevel = "silent" | "error" | "warn" | "info" | "verbose" | "debug" | "silly";
export type LoggerOption = "console" | ((level: string, message: string, context?: object) => void) | Logger;

/**
 * A service for logging messages to the console or other destinations.
 */
export class LogService {
  /** @internal */
  private logger: Logger;

  constructor(loggerOption: LoggerOption = "console", logLevel: LogLevel = "info") {
    this.logger = this.initializeLogger(loggerOption, logLevel);
  }

  /**
   * Gets the current logging level of the logger.
   * @returns The current log level.
   */
  get logLevel(): LogLevel {
    return this.logger.level as LogLevel;
  }

  /**
   * Updates the logging level of the logger dynamically.
   * Useful for changing verbosity without recreating the logger.
   * @param logLevel The new log level to set.
   */
  set logLevel(logLevel: LogLevel) {
    this.logger.level = logLevel;
  }

  /**
   * Clears all transports (output destinations) from the logger.
   * This can be useful if you want to dynamically reconfigure logging outputs.
   */
  clear() {
    this.logger.clear();
  }

  /**
   * Logs a message at the specified level with optional context.
   * Use this method for dynamically specified levels.
   * @param logDomain The domain or category of the log message.
   * @param level The log level (e.g., "info", "error").
   * @param message The message to log.
   * @param context Optional metadata or contextual information to include.
   */
  log(logDomain: string, level: LogLevel, message: string, context?: object) {
    this.logger.log({ level, message, ...context, logDomain });
  }

  /**
   * Logs a silly message with optional context.
   * Use for extremely detailed information during development and debugging.
   * @param logDomain The domain or category of the log message.
   * @param message The message to log.
   * @param context Optional metadata or contextual information to include.
   */
  silly(logDomain: string, message: string, context?: object) {
    if (typeof this.logger.silly === "function") this.logger.silly(message, { ...context, logDomain });
  }

  /**
   * Logs a debug message with optional context.
   * Use for detailed information during development and debugging.
   * @param logDomain The domain or category of the log message.
   * @param message The message to log.
   * @param context Optional metadata or contextual information to include.
   */
  debug(logDomain: string, message: string, context?: object) {
    if (typeof this.logger.debug === "function") this.logger.debug(message, { ...context, logDomain });
  }

  /**
   * Logs a verbose message with optional context.
   * Use for detailed operational logs that are more verbose than "info".
   * @param logDomain The domain or category of the log message.
   * @param message The message to log.
   * @param context Optional metadata or contextual information to include.
   */
  verbose(logDomain: string, message: string, context?: object) {
    if (typeof this.logger.verbose === "function") this.logger.verbose(message, { ...context, logDomain });
  }

  /**
   * Logs an informational message with optional context.
   * Use for high-level operational messages and significant events.
   * @param logDomain The domain or category of the log message.
   * @param message The message to log.
   * @param context Optional metadata or contextual information to include.
   */
  info(logDomain: string, message: string, context?: object) {
    if (typeof this.logger.info === "function") this.logger.info(message, { ...context, logDomain });
  }

  /**
   * Logs a warning message with optional context.
   * Use for recoverable issues or noteworthy events that might require attention.
   * @param logDomain The domain or category of the log message.
   * @param message The message to log.
   * @param context Optional metadata or contextual information to include.
   */
  warn(logDomain: string, message: string, context?: object) {
    if (typeof this.logger.warn === "function") this.logger.warn(message, { ...context, logDomain });
  }

  /**
   * Logs an error message with optional context.
   * Use for critical issues or exceptions that require immediate attention.
   * @param logDomain The domain or category of the log message.
   * @param message The message to log.
   * @param context Optional metadata or contextual information to include.
   */
  error(logDomain: string, message: string, context?: object) {
    if (typeof this.logger.error === "function") this.logger.error(message, { ...context, logDomain });
  }

  /**
   * Initializes the logger based on the provided option.
   * - For "console", creates a pre-configured Winston logger with colored output and timestamps.
   * - For custom functions, wraps them in a Winston-compatible interface.
   * - Uses a pre-existing Winston logger if provided.
   * @param loggerOption The logger option: "console", a custom function, or a pre-existing Winston logger.
   * @param logLevel The logging level to be set for the logger.
   * @returns The initialized Winston logger.
   * @internal
   */
  private initializeLogger(loggerOption: LoggerOption, logLevel: LogLevel): Logger {
    if (loggerOption === "console") {
      return createLogger({
        level: logLevel,
        format: format.combine(
          format.padLevels(),
          format.colorize(),
          format.timestamp(),
          format.printf(({ timestamp, level, message, ...meta }) => {
            const { logDomain, ...context } = meta;
            const metaString = Object.keys(context).length ? ` | context: ${JSON.stringify(context)}` : "";
            return `${timestamp} ${level} ${message} [${logDomain}]${metaString}`;
          }),
        ),
        transports: [new transports.Console()],
      });
    }

    if (typeof loggerOption === "function") {
      return createLogger({
        level: logLevel,
        transports: [
          new transports.Console({
            log(info, callback) {
              loggerOption(info.level, info.message, info.meta);
              callback();
            },
          }),
        ],
      });
    }

    return loggerOption;
  }
}
