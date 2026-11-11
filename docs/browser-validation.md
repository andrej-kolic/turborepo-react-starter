# Browser validation: special setups

How to check the page in setups the [browser-validation skill](../.claude/skills/x-browser-validation/SKILL.md) does not cover. Start with the skill; how the app URL is found is in [`docs/app-url.md`](app-url.md).

## Check a page you are logged in to (`--attach`)

Use this to sign in by hand, then let the agent inspect that session without resetting cookies.

```bash
pnpm browser:ensure-app                                   # 1. app running
curl -sf http://localhost:9222/json/version || pnpm chrome:debug   # 2. visible Chrome
pnpm browser open --url <url>                             # 3. open the app
# 4. sign in by hand in that window
pnpm browser snapshot --url <url> --attach                # 5. inspect without navigating
pnpm browser validate --url <url> --selector "[data-testid=app-header]" --attach
# 6. edit components, HMR updates the tab, re-run step 5
```

`--attach` picks the tab by origin only and does not navigate. With several tabs on the same origin it takes the most recent and brings it to the front. The tab must already be open, so it does not work in CI or headless runs. With `pnpm capture --attach`, the HAR holds only traffic during the capture, `trace.zip` may include other tabs, and `record-console --attach` needs a URL.

## Check a deployed URL

Chrome runs locally; only the URL is remote.

```bash
pnpm chrome:debug
pnpm browser validate --url https://your-preview.netlify.app --selector body
```

With the `chrome-devtools` MCP, call `navigate_page` with the deployed URL instead.

## Check through an SSH tunnel

Chrome runs on a remote machine; assertions run locally.

```bash
pnpm chrome:debug                          # on the remote machine, port 9222
ssh -L 9222:localhost:9222 user@remote-host   # on your machine
pnpm browser validate --url http://<remote-host>:<port> --selector "[data-testid=app-header]"
```

Keep `CHROME_DEBUG_HOST=localhost` and `CHROME_DEBUG_PORT=9222` locally.

## Check a Storybook component

1. Start Storybook with `pnpm dev:ui`.
2. Build the canvas URL as in [`docs/app-url.md`](app-url.md#storybook-canvas).
3. Run `pnpm browser read --url <canvas-url> --selector <selector>`.

Only `packages/ui` components are in Storybook. Check `packages/app-core` components against the live app, not Storybook.
