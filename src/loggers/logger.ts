import { createLogger, format, transports, Logger } from 'winston';

export class ScrapeLogger {
  private static _logger: Logger;
  private static _telegram_logger: Logger;
  static getInstance(): Logger {
    if (!this._logger) {
      this._logger = createLogger({
        format: format.combine(format.timestamp(), format.simple()),
        transports: [
          new transports.File({ filename: './logs/scrapper.log' }),
          new transports.Console({}),
        ],
      });
    }
    return this._logger;
  }
  static getTelegramInstance(): Logger {
    if (!this._telegram_logger) {
      this._telegram_logger = createLogger({
        format: format.combine(format.timestamp(), format.simple()),
        transports: [
          new transports.File({ filename: './logs/scrapper.log' }),
          new transports.Console({}),
        ],
      });
    }
    return this._telegram_logger;
  }
}
