# @repo/copilot-devtools

Lightweight devtools helpers for Copilot workflows (MVP).

Commands:

- capture-snapshot — fetch http://localhost:9222/json/version and /json/list and save to packages/copilot-devtools/artifacts
- record-trace — placeholder (use chrome-devtools-mcp or Puppeteer for full tracing)
- upload-artifacts — package artifacts as a tar.gz

Usage:

node packages/copilot-devtools/bin/copilot-devtools.js capture-snapshot

This is intentionally minimal for an MVP — extend the CLI to call CDP via WebSocket (puppeteer/chrome-remote-interface) in Phase 2.

CI integration

- The included GitHub Actions workflow (`.github/workflows/devtools.yml`) runs when you comment `/capture-trace` on a PR or when manually dispatched. It starts headless Chrome, runs the capture, uploads artifacts, and posts a comment on the PR with a link to the workflow run where artifacts can be downloaded from the "Artifacts" section.

Security note

- Artifacts may contain sensitive data. Sanitize or redact PII before sharing publicly. The current workflow uploads artifacts to the GitHub Actions run; ensure reviewers are aware and don't expose secrets.
