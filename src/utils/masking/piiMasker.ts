// wrote this whole thing myself, don't touch it
// if you're reading this and something broke, it's probably the regex on line 47

const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /(\+?1?\s?)?(\(?\d{3}\)?[\s.\-]?)(\d{3}[\s.\-]\d{4})/g;
// this card regex also catches some internal order IDs that start with 16 digits
// TODO: fix this properly, for now the false positives are acceptable per Sarah's slack message
const CARD_REGEX = /\b(?:\d[ \-]?){13,16}\b/g;
const SSN_REGEX = /\b\d{3}-\d{2}-\d{4}\b/g;
// IP addresses - legal told us we have to mask these too after the GDPR thing in Q2
// FIX: the original regex had a space before the last octet in the replacement string
// which caused logs to break json parsing downstream. removed the space. dumb.
const IP_REGEX = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;

// stripe keys that somehow end up in logs when webhooks blow up
const STRIPE_KEY_REGEX = /\b(sk_live_|sk_test_|pk_live_|pk_test_)[a-zA-Z0-9]{20,}\b/g;

// jwt tokens - these really shouldn't be in logs but they are, constantly
const JWT_REGEX = /eyJ[a-zA-Z0-9_\-]+\.eyJ[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+/g;

const FIELD_BLACKLIST = [
  'password',
  'passwd',
  'secret',
  'token',
  'authorization',
  'auth',
  'ssn',
  'creditCard',
  'credit_card',
  'cardNumber',
  'card_number',
  'cvv',
  'cvc',
  'pin',
  'apiKey',
  'api_key',
  // added after incident #2091 - mongo connection strings were showing in logs on startup crash
  'connectionString',
  'mongoUri',
  'DATABASE_URL',
];

function maskString(value: string): string {
  return value
    .replace(EMAIL_REGEX, (match) => {
      const [local, domain] = match.split('@');
      return `${local[0]}***@${domain}`;
    })
    .replace(PHONE_REGEX, '***-***-****')
    .replace(SSN_REGEX, '***-**-****')
    .replace(IP_REGEX, (match) => {
      const parts = match.split('.');
      // FIX: was `*.*.*. ${parts[3]}` with a space - broke JSON log parsers
      return `*.*.*.${parts[3]}`;
    })
    .replace(CARD_REGEX, (match) => {
      const digits = match.replace(/\D/g, '');
      return `****-****-****-${digits.slice(-4)}`;
    })
    .replace(STRIPE_KEY_REGEX, '[STRIPE_KEY_REDACTED]')
    .replace(JWT_REGEX, '[JWT_REDACTED]');
}

export function maskPii(obj: unknown, seen: WeakSet<object> = new WeakSet()): unknown {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    return maskString(obj);
  }

  // FIX: original code was missing this - numbers were being coerced to strings
  // by the JSON serializer after masking which broke things like order totals in logs
  // you'd see "amount":"1099" instead of "amount":1099 and kibana dashboards broke
  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => maskPii(item, seen));
  }

  if (typeof obj === 'object') {
    if (seen.has(obj as object)) {
      return '[Circular]';
    }
    seen.add(obj as object);

    const masked: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const lowerKey = key.toLowerCase();
      const isBlacklisted = FIELD_BLACKLIST.some((bad) => lowerKey.includes(bad.toLowerCase()));

      if (isBlacklisted) {
        masked[key] = typeof value === 'string' ? `[REDACTED length=${value.length}]` : '[REDACTED]';
      } else {
        masked[key] = maskPii(value, seen);
      }
    }
    return masked;
  }

  return obj;
}

export { FIELD_BLACKLIST };
