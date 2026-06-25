/**
 * Resolve app URL/port from BUNDLER / TARGET_URL, or run a child with TARGET_URL injected.
 *
 * Usage:
 *   dev-tools-app-target url [--preview]         Print resolved app URL
 *   dev-tools-app-target port [--preview]        Print resolved app port
 *   dev-tools-app-target resolve [--preview]     Print URL and port (tab-separated)
 *   dev-tools-app-target run <cmd> [args...]     Run command with dev TARGET_URL set
 *
 * `run` passes through an existing TARGET_URL; otherwise resolves dev default from BUNDLER
 * and injects TARGET_URL on the child env.
 *
 * Invoked via `dev-tools-app-target` (bin/app-target.js → run-ts.js).
 */

import { spawn } from 'node:child_process';
import {
  resolveAppTargets,
  warnIfStaleLocalTargetUrlOverride,
  type AppTargetMode,
} from '../config/app-port';
import { resolveRunChildEnv } from '../config/run-child-env';

function usage(): never {
  console.error(`Usage:
  dev-tools-app-target url [--preview]         Print resolved app URL
  dev-tools-app-target port [--preview]        Print resolved app port
  dev-tools-app-target resolve [--preview]     Print URL and port (tab-separated)
  dev-tools-app-target run <cmd> [args...]     Run command with dev TARGET_URL set`);
  process.exit(1);
}

function resolutionHint(mode: AppTargetMode): string {
  if (mode === 'preview') {
    return 'Set BUNDLER (e.g. app-vite) before invoking dev-tools-app-target with --preview.';
  }
  return 'Set BUNDLER (e.g. app-vite) or TARGET_URL before invoking dev-tools-app-target.';
}

function resolveMode(argv: string[]): {
  mode: AppTargetMode;
  positional: string[];
} {
  const preview = argv.includes('--preview');
  return {
    mode: preview ? 'preview' : 'dev',
    positional: argv.filter((arg) => arg !== '--preview'),
  };
}

function resolveTargetsOrExit(mode: AppTargetMode) {
  try {
    const targets = resolveAppTargets(process.env, mode);
    if (targets) return targets;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${message}`);
    process.exit(1);
  }

  console.error(
    `Error: could not resolve ${mode} target.\n  ${resolutionHint(mode)}`,
  );
  process.exit(1);
}

const [subcommand, ...rest] = process.argv.slice(2);
if (!subcommand) usage();

if (subcommand === 'run') {
  const [cmd, ...args] = rest;
  if (!cmd) {
    console.error('Error: run requires a command.');
    usage();
  }

  let env: NodeJS.ProcessEnv;
  try {
    env = resolveRunChildEnv(process.env);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${message}`);
    process.exit(1);
  }

  const child = spawn(cmd, args, { stdio: 'inherit', env });

  child.on('error', (err) => {
    console.error(`Error: could not start command '${cmd}': ${err.message}`);
    process.exit(1);
  });

  child.on('exit', (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    else process.exit(code ?? 0);
  });
} else if (
  subcommand === 'url' ||
  subcommand === 'port' ||
  subcommand === 'resolve'
) {
  const { mode, positional } = resolveMode(rest);
  if (positional.length > 0) {
    console.error(`Error: unexpected arguments: ${positional.join(' ')}`);
    usage();
  }

  const targets = resolveTargetsOrExit(mode);
  warnIfStaleLocalTargetUrlOverride(process.env, mode);
  if (subcommand === 'resolve') {
    console.log(`${targets.url}\t${targets.port}`);
  } else {
    console.log(subcommand === 'url' ? targets.url : targets.port);
  }
} else {
  console.error(`Error: unknown subcommand '${subcommand}'.`);
  usage();
}
