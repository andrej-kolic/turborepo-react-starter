import fs from 'node:fs';
import { isSensitiveField } from './redact.js';

export const SAFE_HAR_HEADERS = new Set([
  'accept',
  'accept-encoding',
  'accept-language',
  'age',
  'cache-control',
  'content-encoding',
  'content-language',
  'content-length',
  'content-type',
  'etag',
  'expires',
  'last-modified',
  'transfer-encoding',
  'user-agent',
  'vary',
  'x-content-type-options',
  'x-frame-options',
  'x-xss-protection',
]);

/**
 * Redact non-safe HAR headers and sensitive query/post params in place.
 *
 * @param {string} harPath
 * @returns {{ headersRedacted: number, paramsRedacted: number }}
 */
export function sanitizeHar(harPath) {
  if (!fs.existsSync(harPath)) return { headersRedacted: 0, paramsRedacted: 0 };

  const har = JSON.parse(fs.readFileSync(harPath, 'utf8'));
  let headersRedacted = 0;
  let paramsRedacted = 0;

  for (const entry of har?.log?.entries ?? []) {
    for (const header of entry?.request?.headers ?? []) {
      if (!SAFE_HAR_HEADERS.has(header.name.toLowerCase())) {
        header.value = '[REDACTED]';
        headersRedacted += 1;
      }
    }
    for (const header of entry?.response?.headers ?? []) {
      if (!SAFE_HAR_HEADERS.has(header.name.toLowerCase())) {
        header.value = '[REDACTED]';
        headersRedacted += 1;
      }
    }
    for (const param of entry?.request?.queryString ?? []) {
      if (isSensitiveField(param.name)) {
        param.value = '[REDACTED]';
        paramsRedacted += 1;
      }
    }
    for (const param of entry?.request?.postData?.params ?? []) {
      if (isSensitiveField(param.name)) {
        param.value = '[REDACTED]';
        paramsRedacted += 1;
      }
    }
  }

  fs.writeFileSync(harPath, `${JSON.stringify(har, null, 2)}\n`);
  return { headersRedacted, paramsRedacted };
}
