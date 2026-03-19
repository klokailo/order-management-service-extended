import winston from 'winston';
import { piiMaskFormat } from './masking/winstonPiiTransport';

// DO NOT add console.log anywhere in this service. Use this logger.
// The PII masking format is baked in here. If you bypass the logger you bypass masking.
// Yes this has happened before. Yes it was a compliance issue. Yes it was bad.

const { combine, timestamp, json, errors } = winston.format;

const isProd = process.env.NODE_ENV === 'production';

// errors() needs to come first so stack traces are captured before masking
// if you put piiMaskFormat before errors() you get "[object Object]" in your stack field
// learned this the hard way
const formats = combine(
  errors({ stack: true }),
  timestamp(),
  piiMaskFormat,
  json()
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
  format: formats,
  transports: [
    new winston.transports.Console({
      silent: process.env.NODE_ENV === 'test', // don't spam test output
    }),
  ],
  // don't crash the app if the logger itself errors
  exitOnError: false,
});

// quick helpers so callers don't have to import winston directly
export const logInfo = (msg: string, meta?: object) => logger.info(msg, meta);
export const logError = (msg: string, err?: unknown, meta?: object) => {
  logger.error(msg, { err, ...meta });
};
export const logWarn = (msg: string, meta?: object) => logger.warn(msg, meta);
export const logDebug = (msg: string, meta?: object) => logger.debug(msg, meta);
