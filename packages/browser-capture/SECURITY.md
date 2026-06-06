# Security & Access Control

Security policy for the `@repo/browser-capture` DevTools capture package.

---

## Artifact Sanitization

All capture commands (`capture-snapshot`, `record-trace`, `record-performance`,
`record-console`, `record-interactions`) run **automatic sanitization** before
writing the final artifact files. Sanitization is synchronous and in-place.

### What is sanitized

#### `har.json` — HTTP header allowlist

Only the following headers are retained (all others are replaced with
`[REDACTED]`):

| Allowed headers                                                          |
| ------------------------------------------------------------------------ |
| `accept`, `accept-encoding`, `accept-language`                           |
| `age`, `cache-control`                                                   |
| `content-encoding`, `content-language`, `content-length`, `content-type` |
| `etag`, `expires`, `last-modified`                                       |
| `transfer-encoding`, `user-agent`, `vary`                                |
| `x-content-type-options`, `x-frame-options`, `x-xss-protection`          |

**Stripped headers include** (but are not limited to): `Authorization`,
`Cookie`, `Set-Cookie`, `X-Auth-Token`, `X-Api-Key`, `Proxy-Authorization`,
and any other non-allowlisted header.

Query-string and `postData` parameters whose **name** matches the sensitive
field pattern (see below) are also redacted.

> **Note:** Response bodies are already excluded from HAR recording via
> `content: 'omit'` in the Playwright `recordHar` option.

#### `console.json` — PII redaction

Console message text and stack traces are scanned with the following patterns:

| Pattern                                   | Replacement               |
| ----------------------------------------- | ------------------------- |
| Email addresses                           | `[REDACTED-EMAIL]`        |
| US SSN (XXX-XX-XXXX)                      | `[REDACTED-SSN]`          |
| Credit card numbers (13–19 digits)        | `[REDACTED-CREDIT-CARD]`  |
| US phone numbers                          | `[REDACTED-PHONE]`        |
| Bearer / JWT tokens                       | `[REDACTED-BEARER-TOKEN]` |
| Hex secrets ≥ 32 chars (API keys, hashes) | `[REDACTED-HEX-SECRET]`   |

#### `interactions.json` — sensitive fill values

For `fill` interactions, the field name (`name`, `id`, `data-testid`) is
checked against the sensitive field pattern:

```
password, passwd, pwd, secret, token, api_key, api-key,
auth, authorization, ssn, social security, credit card,
card number, cvv, cvc, pin, access key, private key
```

- **Sensitive field** → value replaced with `[REDACTED]`
- **All other fill values** → PII patterns applied (same as console.json)

This means that passwords, tokens, and API keys typed during an
`record-interactions` session will never appear in the generated
`generated.test.ts` or in `interactions.json`.

#### `metadata.json` — sanitization stamp

After sanitization, `metadata.json` is updated with:

```json
{
  "sanitizedAt": "2026-06-01T...",
  "sanitization": {
    "headersRedacted": 14,
    "queryParamsRedacted": 0,
    "consoleMessagesRedacted": 0,
    "interactionValuesRedacted": 1
  }
}
```

### What is NOT sanitized

- **`trace.zip`** — Playwright trace files contain screenshots and DOM
  snapshots. These are not processed by the sanitizer. Do not use
  `record-trace` against pages that display plaintext secrets on screen if
  you intend to share the trace artifact publicly.
- **`performance.json`** — Contains only timing numbers and metric names.
  No sanitization is required.

### Opting out (local debugging only)

Pass `--no-sanitize` to any capture command to skip sanitization:

```bash
node packages/browser-capture/bin/copilot-devtools.js record-trace https://localhost:3000 --no-sanitize
```

> ⚠️ **Never use `--no-sanitize` in CI.** The CI workflow does not pass
> this flag and additionally runs a standalone `sanitize-artifacts` step
> after capture as a defense-in-depth measure.

### Re-sanitizing existing artifacts

Sanitization is idempotent and safe to re-run:

```bash
# Re-sanitize a specific directory
node packages/browser-capture/bin/copilot-devtools.js sanitize-artifacts packages/browser-capture/artifacts/trace-2026-06-01

# Or via MCP tool
# sanitize_artifacts({ dir: "/absolute/path/to/artifacts/trace-2026-06-01" })
```

---

## Access Control (RBAC)

### Who can trigger captures

| Actor                                | Can trigger `workflow_dispatch`    | Can trigger via `/capture-trace` comment |
| ------------------------------------ | ---------------------------------- | ---------------------------------------- |
| Repository owner                     | ✅                                 | ✅                                       |
| Organization member                  | ✅ (with Actions write permission) | ✅                                       |
| External collaborator                | ✅ (with Actions write permission) | ✅                                       |
| Outside contributor (fork PR author) | ❌                                 | ❌                                       |

The CI workflow enforces `author_association` checks — only comments from
`OWNER`, `MEMBER`, or `COLLABORATOR` can trigger the capture job. This
prevents untrusted fork PRs from exfiltrating environment data via
`/capture-trace` comment injection.

### Who can download artifacts

GitHub Actions artifacts from **private repositories** are accessible only
to repository collaborators with at least **read** access.

For **public repositories**, workflow artifacts are downloadable by anyone
with the direct Actions run URL. This is a GitHub platform limitation.
Ensure sanitization runs before `upload-artifact` (the CI workflow
guarantees this).

### Artifact retention

All artifacts uploaded by the CI workflow are retained for **30 days**
(`retention-days: 30` on `upload-artifact`). After 30 days, GitHub
automatically deletes them. GitHub's default is 90 days — we use 30 days
to minimize exposure window.

---

## Audit Logging

Every `metadata.json` file includes:

| Field          | Source                                        | Description                                      |
| -------------- | --------------------------------------------- | ------------------------------------------------ |
| `capturedAt`   | Local clock                                   | ISO 8601 timestamp of capture                    |
| `actor`        | `GITHUB_ACTOR` env var (CI) or `USER` (local) | Who triggered the capture                        |
| `triggerEvent` | `GITHUB_EVENT_NAME` env var                   | `workflow_dispatch`, `issue_comment`, or `local` |
| `branch`       | `git branch` / `CAPTURE_BRANCH`               | Git branch at capture time                       |
| `commit`       | `git rev-parse HEAD`                          | Full commit SHA                                  |
| `sanitizedAt`  | Set by `sanitizeArtifacts()`                  | When sanitization ran                            |
| `sanitization` | Set by `sanitizeArtifacts()`                  | Count of each redaction type                     |

These fields form a per-capture audit trail. For a centralized audit log,
aggregate `metadata.json` files from downloaded artifacts or stream them to
your observability platform.

---

## Responsible Disclosure

If you discover a security issue with this tooling, please open a private
security advisory on GitHub rather than a public issue.
