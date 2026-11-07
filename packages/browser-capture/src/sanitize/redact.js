export const PII_PATTERNS = [
  {
    pattern: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,
    label: 'EMAIL',
  },
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, label: 'SSN' },
  { pattern: /\b(?:\d[ \-]?){13,18}\d\b/g, label: 'CREDIT-CARD' },
  {
    pattern: /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    label: 'PHONE',
  },
  { pattern: /\bBearer\s+[A-Za-z0-9\-._~+/]+=*/g, label: 'BEARER-TOKEN' },
  { pattern: /\b[0-9a-fA-F]{32,}\b/g, label: 'HEX-SECRET' },
];

export const SENSITIVE_FIELD_RE =
  /password|passwd|pwd|secret|token|api[_-]?key|auth(?:orization)?|ssn|social.?security|credit.?card|card.?num|cvv|cvc|\bpin\b|access.?key|private.?key/i;

/**
 * Replace known PII and secret patterns in a string with labeled placeholders.
 *
 * @param {string} text
 * @returns {string}
 */
export function redactPii(text) {
  if (typeof text !== 'string') return text;
  let result = text;
  for (const { pattern, label } of PII_PATTERNS) {
    result = result.replace(pattern, `[REDACTED-${label}]`);
  }
  return result;
}

/**
 * Whether a field name matches sensitive-data patterns (password, token, etc.).
 *
 * @param {string} name
 * @returns {boolean}
 */
export function isSensitiveField(name) {
  return typeof name === 'string' && SENSITIVE_FIELD_RE.test(name);
}
