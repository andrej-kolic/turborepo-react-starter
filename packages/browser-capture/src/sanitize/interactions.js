import fs from 'node:fs';
import { isSensitiveField, redactPii } from './redact.js';

/**
 * Redact sensitive fill values and PII from interaction log entries in place.
 *
 * @param {string} interactionsPath
 * @returns {{ valuesRedacted: number }}
 */
export function sanitizeInteractionLog(interactionsPath) {
  if (!fs.existsSync(interactionsPath)) return { valuesRedacted: 0 };

  const data = JSON.parse(fs.readFileSync(interactionsPath, 'utf8'));
  let valuesRedacted = 0;

  for (const interaction of data?.interactions ?? []) {
    if (interaction.type === 'fill' && interaction.value != null) {
      const el = interaction.element ?? {};
      const isSensitive =
        isSensitiveField(el.name) ||
        isSensitiveField(el.id) ||
        isSensitiveField(el.testId);

      if (isSensitive) {
        interaction.value = '[REDACTED]';
        valuesRedacted += 1;
      } else {
        const original = interaction.value;
        interaction.value = redactPii(String(interaction.value));
        if (interaction.value !== original) valuesRedacted += 1;
      }
    }
  }

  fs.writeFileSync(interactionsPath, `${JSON.stringify(data, null, 2)}\n`);
  return { valuesRedacted };
}
