#!/usr/bin/env node
/**
 * Generate AI agent config files from .rulesync/ (rulesync programmatic API).
 * Avoids the rulesync CLI pnpm-install side effect when invoked via pnpm scripts.
 */
import { generate } from 'rulesync';

await generate({ silent: false });
