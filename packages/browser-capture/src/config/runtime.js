let isMcpServerMode = false;
let sanitizeEnabled = true;

/**
 * Initialize process-wide capture mode before CLI or MCP startup.
 *
 * @param {{ isMcpServer: boolean }} params
 */
export function initRuntime({ isMcpServer }) {
  isMcpServerMode = isMcpServer;
}

export function isMcpServer() {
  return isMcpServerMode;
}

export function isSanitizeEnabled() {
  return sanitizeEnabled;
}

/**
 * Toggle post-capture artifact sanitization globally; `--no-sanitize` calls this during CLI parsing.
 *
 * @param {boolean} value
 */
export function setSanitizeEnabled(value) {
  sanitizeEnabled = value;
}
