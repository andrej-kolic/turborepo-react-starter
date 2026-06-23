import fs from 'node:fs';
import path from 'node:path';
import { log } from '../config/log.js';
import { sanitizeConsoleLog } from './console.js';
import { sanitizeHar } from './har.js';
import { sanitizeInteractionLog } from './interactions.js';

export function sanitizeArtifacts(artifactsDir) {
  const harResult = sanitizeHar(path.join(artifactsDir, 'har.json'));
  const consoleResult = sanitizeConsoleLog(
    path.join(artifactsDir, 'console.json'),
  );
  const interactionsResult = sanitizeInteractionLog(
    path.join(artifactsDir, 'interactions.json'),
  );

  const metadataPath = path.join(artifactsDir, 'metadata.json');
  if (fs.existsSync(metadataPath)) {
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    metadata.sanitizedAt = new Date().toISOString();
    metadata.sanitization = {
      headersRedacted: harResult.headersRedacted,
      queryParamsRedacted: harResult.paramsRedacted,
      consoleMessagesRedacted: consoleResult.messagesRedacted,
      interactionValuesRedacted: interactionsResult.valuesRedacted,
    };
    fs.writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);
  }

  const summary = {
    har: harResult,
    console: consoleResult,
    interactions: interactionsResult,
    sanitizedAt: new Date().toISOString(),
  };

  log(
    `Sanitized: ${harResult.headersRedacted} headers, ` +
      `${harResult.paramsRedacted} query params, ` +
      `${consoleResult.messagesRedacted} console messages, ` +
      `${interactionsResult.valuesRedacted} interaction values redacted.`,
  );

  return summary;
}
