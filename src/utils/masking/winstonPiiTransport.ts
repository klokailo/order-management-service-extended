import winston from 'winston';
import { maskPii } from './piiMasker';

// Custom winston format that runs everything through the masker
// Note: this runs on EVERY log line so keep maskPii fast
// Benchmarked at ~0.2ms per call on avg log payload - acceptable
// If we ever go above 1ms we need to look at moving this to a worker thread

export const piiMaskFormat = winston.format((info) => {
  // winston puts the message in info.message and extra fields directly on info
  // we have to handle both because our codebase is inconsistent about how it logs

  const { level, message, timestamp, ...rest } = info;

  const maskedMessage = typeof message === 'string' ? maskPii(message) : maskPii(message);
  const maskedRest = maskPii(rest);

  return {
    level,
    message: maskedMessage,
    timestamp,
    ...(maskedRest as object),
  };
})();

// thin wrapper - exists so you can swap out the masking impl without touching logger.ts
export function applyPiiMasking(formats: winston.Logform.Format[]): winston.Logform.Format[] {
  // insert BEFORE json() but AFTER timestamp() so timestamps aren't mangled
  const jsonIndex = formats.findIndex((f) => {
    // winston formats don't expose their name reliably, this is a hack
    // but it works and I'm not rewriting the logger config right now
    return f.toString().includes('json') || (f as any)._id === 'json';
  });

  if (jsonIndex === -1) {
    return [piiMaskFormat, ...formats];
  }

  const result = [...formats];
  result.splice(jsonIndex, 0, piiMaskFormat);
  return result;
}
