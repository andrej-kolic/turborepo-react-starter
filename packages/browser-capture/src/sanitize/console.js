import fs from 'node:fs';
import { redactPii } from './redact.js';

export function sanitizeConsoleLog(consolePath) {
  if (!fs.existsSync(consolePath)) return { messagesRedacted: 0 };

  const data = JSON.parse(fs.readFileSync(consolePath, 'utf8'));
  let messagesRedacted = 0;

  for (const entry of data?.entries ?? []) {
    const original = entry.text;
    entry.text = redactPii(entry.text ?? '');
    if (entry.text !== original) messagesRedacted += 1;
    if (typeof entry.stack === 'string') entry.stack = redactPii(entry.stack);
  }

  fs.writeFileSync(consolePath, `${JSON.stringify(data, null, 2)}\n`);
  return { messagesRedacted };
}
