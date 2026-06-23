export const PORT = Number(process.env.CHROME_DEBUG_PORT || 9222);
export const HOST = process.env.CHROME_DEBUG_HOST || 'localhost';

let defaultDurationMs = 10_000;

/**
 * Read CAPTURE_DURATION_MS at startup and set the default recording duration.
 * Exits the process when the value is invalid and not running as MCP server.
 *
 * @param {boolean} isMcpServer
 */
export function validateCaptureDuration(isMcpServer) {
  const raw = Number(process.env.CAPTURE_DURATION_MS || 10_000);
  const valid = Number.isFinite(raw) && raw > 0;

  if (!valid && !isMcpServer) {
    process.stderr.write(
      `Error: CAPTURE_DURATION_MS must be a positive number, got: ${process.env.CAPTURE_DURATION_MS}\n`,
    );
    process.exit(1);
  }

  defaultDurationMs = valid ? raw : 10_000;
}

/** Default capture duration in milliseconds after validateCaptureDuration has run. */
export function getDefaultDurationMs() {
  return defaultDurationMs;
}
