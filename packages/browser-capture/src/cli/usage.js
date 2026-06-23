/** Print CLI command and flag help. Callers decide exit code. */
export function usage() {
  console.log('browser-capture CLI');
  console.log(
    'Usage: browser-capture <command> [url] [--duration <seconds>] [--duration-ms <ms>] [--attach]',
  );
  console.log('Commands:');
  console.log(
    '  capture-snapshot                   Fetch browser metadata and page list',
  );
  console.log(
    '  record-trace [url]                 Full trace: HAR + Playwright trace + console + Web Vitals',
  );
  console.log(
    '  record-performance [url]           Web Vitals: LCP, CLS, INP and CDP browser metrics',
  );
  console.log(
    '  record-console [url]               Console messages from current page (omit url: most recent tab)',
  );
  console.log(
    '  record-interactions [url]          Record user interactions and generate a Playwright test',
  );
  console.log(
    '  upload-artifacts                   Package artifacts/  as tar.gz',
  );
  console.log(
    '  sanitize-artifacts <dir>           Sanitize artifact directory: strip secrets and PII',
  );
  console.log(
    '  mcp-server                         Start an MCP server (stdio) exposing capture tools',
  );
  console.log('');
  console.log('Options:');
  console.log(
    '  --attach                           Record on an existing tab at URL origin (requires [url]; no navigation)',
  );
  console.log(
    '  --no-sanitize                      Skip automatic artifact sanitization',
  );
  console.log('');
  console.log(
    'URL resolution when [url] is omitted: positional → APP_URL → CAPTURE_URL',
  );
}
