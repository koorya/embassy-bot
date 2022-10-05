import { createLogger, format, transports } from 'winston';

export const scrapLog = createLogger({
  format: format.combine(format.timestamp(), format.simple()),
  transports: [
    new transports.File({ filename: './logs/scrapper.log' }),
    new transports.Console({}),
  ],
});

export const botLog = createLogger({
  format: format.combine(format.timestamp(), format.simple()),
  transports: [
    new transports.File({ filename: './logs/bot.log' }),
    new transports.Console({}),
  ],
});
