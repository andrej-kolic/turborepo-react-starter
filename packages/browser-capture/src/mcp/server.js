import fs from 'node:fs';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { captureSnapshot } from '../capture/snapshot.js';
import { recordConsole } from '../capture/console.js';
import { recordInteractions } from '../capture/interactions.js';
import { recordPerformance } from '../capture/performance.js';
import { recordTrace } from '../capture/trace.js';
import { sanitizeArtifacts } from '../sanitize/index.js';

function toolError(err) {
  const message = err instanceof Error ? err.message : String(err);
  return {
    content: [{ type: 'text', text: `Error: ${message}` }],
    isError: true,
  };
}

function mcpCaptureOptions(args) {
  const options = {};
  if (args.duration !== undefined) {
    options.duration = String(args.duration);
  }
  if (args.attach === true) {
    options.attach = true;
  }
  return options;
}

/**
 * Start the browser-capture MCP server over stdio with capture tool handlers.
 *
 * @returns {Promise<void>}
 */
export async function startMcpServer() {
  const pkg = JSON.parse(
    fs.readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
  );

  const server = new McpServer({
    name: 'browser-capture',
    version: pkg.version,
  });

  server.registerTool(
    'capture_snapshot',
    {
      title: 'Capture Snapshot',
      description:
        'Capture Chrome browser metadata and the list of open pages. Requires Chrome running with --remote-debugging-port=9222 (run: pnpm chrome:debug).',
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async () => {
      try {
        const result = await captureSnapshot();
        return {
          content: [
            {
              type: 'text',
              text: `Snapshot saved to ${result.artifactsDir}\nFiles: metadata.json, version.json, pages.json\nPages found: ${result.metadata.pageCount}`,
            },
          ],
          structuredContent: {
            artifactsDir: result.artifactsDir,
            pageCount: result.metadata.pageCount,
            chrome: result.metadata.chrome,
            capturedAt: result.metadata.capturedAt,
          },
        };
      } catch (err) {
        return toolError(err);
      }
    },
  );

  server.registerTool(
    'record_trace',
    {
      title: 'Record Trace',
      description:
        'Navigate to a URL and record a full trace: HAR network log, Playwright trace (screenshots + DOM snapshots), console messages, and Web Vitals. Requires Chrome running with --remote-debugging-port=9222. Set attach=true to record the existing visible tab at the URL origin without navigating; trace.zip is browser-context scoped (may include other tabs).',
      inputSchema: z.object({
        url: z.string().url().describe('URL to navigate to and record'),
        duration: z
          .number()
          .optional()
          .describe(
            'Capture duration in seconds after page load (default: 10)',
          ),
        attach: z
          .boolean()
          .optional()
          .describe(
            'Record on the existing visible tab at the URL origin (no navigation). trace.zip is browser-context scoped.',
          ),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async (args) => {
      try {
        const result = await recordTrace(args.url, mcpCaptureOptions(args));
        const { lcp, cls, inp } = result.webVitals;
        const traceNote =
          result.metadata.traceScope === 'browser-context'
            ? 'Note: trace.zip is browser-context scoped (may include other tabs).'
            : null;
        return {
          content: [
            {
              type: 'text',
              text: [
                `Trace saved to ${result.artifactsDir}`,
                `Files: metadata.json, har.json, trace.zip, console.json, performance.json`,
                `View trace: npx playwright show-trace ${result.artifactsDir}/trace.zip`,
                traceNote,
                `Web Vitals: LCP=${lcp != null ? `${Math.round(lcp)}ms` : 'n/a'}, CLS=${cls}, INP=${inp != null ? `${Math.round(inp)}ms` : 'n/a'}`,
                `Requests: ${result.requestCount}, Console messages: ${result.consoleMessageCount}`,
              ]
                .filter(Boolean)
                .join('\n'),
            },
          ],
          structuredContent: {
            artifactsDir: result.artifactsDir,
            files: [
              'metadata.json',
              'har.json',
              'trace.zip',
              'console.json',
              'performance.json',
            ],
            traceScope: result.metadata.traceScope ?? null,
            url: result.metadata.url,
            webVitals: result.webVitals,
            requestCount: result.requestCount,
            consoleMessageCount: result.consoleMessageCount,
            durationMs: result.metadata.durationMs,
          },
        };
      } catch (err) {
        return toolError(err);
      }
    },
  );

  server.registerTool(
    'record_performance',
    {
      title: 'Record Performance',
      description:
        'Navigate to a URL and collect Web Vitals (LCP, CLS, INP) plus 36 CDP browser metrics. Requires Chrome running with --remote-debugging-port=9222. Set attach=true to measure the existing visible tab at the URL origin without navigating.',
      inputSchema: z.object({
        url: z.string().url().describe('URL to navigate to and measure'),
        duration: z
          .number()
          .optional()
          .describe(
            'Observation duration in seconds after page load (default: 10)',
          ),
        attach: z
          .boolean()
          .optional()
          .describe(
            'Measure the existing visible tab at the URL origin (no navigation)',
          ),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async (args) => {
      try {
        const result = await recordPerformance(
          args.url,
          mcpCaptureOptions(args),
        );
        const { lcp, cls, inp } = result.webVitals;
        return {
          content: [
            {
              type: 'text',
              text: [
                `Performance saved to ${result.artifactsDir}`,
                `Files: metadata.json, performance.json`,
                `Web Vitals: LCP=${lcp != null ? `${Math.round(lcp)}ms` : 'n/a'}, CLS=${cls}, INP=${inp != null ? `${Math.round(inp)}ms` : 'n/a'}`,
                `Browser metrics: ${result.browserMetricsCount} measurements`,
              ].join('\n'),
            },
          ],
          structuredContent: {
            artifactsDir: result.artifactsDir,
            files: ['metadata.json', 'performance.json'],
            url: result.metadata.url,
            webVitals: result.webVitals,
            browserMetricsCount: result.browserMetricsCount,
            durationMs: result.metadata.durationMs,
          },
        };
      } catch (err) {
        return toolError(err);
      }
    },
  );

  server.registerTool(
    'record_console',
    {
      title: 'Record Console',
      description:
        'Listen to console output of the currently open Chrome tab for a specified duration. Requires Chrome running with --remote-debugging-port=9222 and at least one open tab. For navigating to a URL, use record_trace instead. Set attach=true with url to match a tab by origin.',
      inputSchema: z.object({
        duration: z
          .number()
          .optional()
          .describe('Duration to listen in seconds (default: 10)'),
        url: z
          .string()
          .url()
          .optional()
          .describe('When attach=true, match the open tab by this URL origin'),
        attach: z
          .boolean()
          .optional()
          .describe(
            'Match the open tab by url origin. Requires url when attach=true.',
          ),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async (args) => {
      try {
        const result = await recordConsole(mcpCaptureOptions(args), args.url);
        return {
          content: [
            {
              type: 'text',
              text: [
                `Console log saved to ${result.artifactsDir}`,
                `Files: metadata.json, console.json`,
                `Messages captured: ${result.consoleMessageCount}`,
                `Page: ${result.metadata.url || 'unknown'}`,
              ].join('\n'),
            },
          ],
          structuredContent: {
            artifactsDir: result.artifactsDir,
            files: ['metadata.json', 'console.json'],
            url: result.metadata.url,
            consoleMessageCount: result.consoleMessageCount,
            durationMs: result.metadata.durationMs,
          },
        };
      } catch (err) {
        let message = err instanceof Error ? err.message : String(err);
        if (message.includes('No existing Chrome page')) {
          message =
            'record_console requires an already-open Chrome tab. Open a page in Chrome first, then retry. For navigating to a URL, use record_trace instead.';
        }
        return {
          content: [{ type: 'text', text: `Error: ${message}` }],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    'record_interactions',
    {
      title: 'Record Interactions',
      description:
        'Navigate to a URL, record user interactions (clicks, form fills, navigation) for a given duration, and generate a ready-to-run Playwright test file. React component source locations are included when available (requires the app to be running in dev mode). Requires Chrome running with --remote-debugging-port=9222. Set attach=true to record on the existing visible tab at the URL origin without navigating.',
      inputSchema: z.object({
        url: z
          .string()
          .url()
          .describe('URL to navigate to and record interactions on'),
        duration: z
          .number()
          .optional()
          .describe(
            'Recording duration in seconds — interact with the page during this window (default: 10)',
          ),
        attach: z
          .boolean()
          .optional()
          .describe(
            'Record on the existing visible tab at the URL origin (no navigation)',
          ),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async (args) => {
      try {
        const result = await recordInteractions(
          args.url,
          mcpCaptureOptions(args),
        );
        return {
          content: [
            {
              type: 'text',
              text: [
                `Interactions saved to ${result.artifactsDir}`,
                `Files: metadata.json, interactions.json, generated.test.ts`,
                `Interactions captured: ${result.interactionCount}`,
                `Generated test: ${result.testFile}`,
              ].join('\n'),
            },
          ],
          structuredContent: {
            artifactsDir: result.artifactsDir,
            files: ['metadata.json', 'interactions.json', 'generated.test.ts'],
            url: result.metadata.url,
            interactionCount: result.interactionCount,
            testFile: result.testFile,
            durationMs: result.metadata.durationMs,
          },
        };
      } catch (err) {
        return toolError(err);
      }
    },
  );

  server.registerTool(
    'sanitize_artifacts',
    {
      title: 'Sanitize Artifacts',
      description:
        'Sanitize a capture artifact directory: strip sensitive HTTP headers (Authorization, Cookie, Set-Cookie, etc.), redact PII from console logs, and redact secret fill values from interaction recordings. Safe to re-run on already-sanitized directories.',
      inputSchema: z.object({
        dir: z
          .string()
          .describe('Absolute path to the artifact directory to sanitize'),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async (args) => {
      try {
        const result = sanitizeArtifacts(args.dir);
        return {
          content: [
            {
              type: 'text',
              text: [
                `Sanitized ${args.dir}`,
                `Headers redacted: ${result.har.headersRedacted}`,
                `Query params redacted: ${result.har.paramsRedacted}`,
                `Console messages redacted: ${result.console.messagesRedacted}`,
                `Interaction values redacted: ${result.interactions.valuesRedacted}`,
              ].join('\n'),
            },
          ],
          structuredContent: {
            dir: args.dir,
            headersRedacted: result.har.headersRedacted,
            queryParamsRedacted: result.har.paramsRedacted,
            consoleMessagesRedacted: result.console.messagesRedacted,
            interactionValuesRedacted: result.interactions.valuesRedacted,
            sanitizedAt: result.sanitizedAt,
          },
        };
      } catch (err) {
        return toolError(err);
      }
    },
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write('browser-capture MCP server started (stdio)\n');

  process.once('SIGINT', async () => {
    await server.close();
    process.exit(0);
  });
  process.once('SIGTERM', async () => {
    await server.close();
    process.exit(0);
  });
}
