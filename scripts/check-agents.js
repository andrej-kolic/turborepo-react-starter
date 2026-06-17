#!/usr/bin/env node
/**
 * Verify generated AI agent configs match .rulesync/ (rulesync programmatic API).
 */
import { generate } from 'rulesync';

try {
  await generate({ check: true, silent: false });
  console.log('Agent configs in sync (.rulesync/ → tool outputs).');
} catch (error) {
  console.error(error.message ?? error);
  console.error('\nRun `pnpm sync:agents` to regenerate tool config files.');
  process.exit(1);
}
