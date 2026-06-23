let isMcpServerMode = false;
let sanitizeEnabled = true;

export function initRuntime({ isMcpServer }) {
  isMcpServerMode = isMcpServer;
}

export function isMcpServer() {
  return isMcpServerMode;
}

export function isSanitizeEnabled() {
  return sanitizeEnabled;
}

export function setSanitizeEnabled(value) {
  sanitizeEnabled = value;
}
