# Design spec validation

How to check that a component matches a design (tokens and layout taken from Figma or a pasted SVG) while developing. This is a functional check, not pixel regression: pixel regression belongs to Chromatic on Storybook stories (no workflow yet, #126), and CI page-region checks to [Playwright E2E](e2e.md).

Agents set up the browser with the [browser-validation skill](../.claude/skills/x-browser-validation/SKILL.md): Step 1 (start the app), then tier C (the CLI). Run `pnpm browser:ensure-app` first; `pnpm browser` commands then find the app URL themselves. Pass `--url` only to override it, for example with a [Storybook canvas URL](app-url.md#storybook-canvas). To keep checking a visible tab across HMR updates, add `--attach` ([how](browser-validation.md)). Selectors come from the [`data-testid` registry](component-validation-contract.md#registry).

## Pick a layer

| Layer                  | Question                              | Tool                                                     |
| ---------------------- | ------------------------------------- | -------------------------------------------------------- |
| **1. Renders**         | Does the region exist?                | `pnpm browser validate --selector …`                     |
| **2. Token spec**      | Are colors, spacing and fonts right?  | `pnpm browser eval --expr … --expect`                    |
| **3. Visual likeness** | Does it look like the design overall? | `pnpm browser screenshot` + agent vision vs Figma export |

Layers 1 and 2 pass or fail on their own; layer 3 is the agent's judgement. None of them needs `browser-capture`.

## Look at the page first

```bash
pnpm browser snapshot
pnpm browser snapshot --selector "[data-testid=app-header]"
```

## Check that a region renders (layer 1)

```bash
pnpm browser validate --selector "[data-testid=app-header]"

pnpm browser validate \
  --selector "[data-testid=app-header]" \
  --contains "Turborepo" \
  --no-console-errors
```

## Check token values (layer 2)

`pnpm browser eval` reads computed styles (`getComputedStyle`), which the browser normalizes: colors become `rgb(r, g, b)` or `rgba(...)`, sizes become `px` strings. Take the expected values from Figma dev mode, or read them once from a reference build, and hard-code them in `--expr`.

Print several values:

```bash
pnpm browser eval \
  --selector "[data-testid=app-header]" \
  --expr "() => {
    const el = document.querySelector('[data-testid=app-header]');
    const s = getComputedStyle(el);
    return {
      display: s.display,
      paddingTop: s.paddingTop,
      color: s.color,
    };
  }" \
  --json
```

Assert one, with `--expect`, which exits 1 when the expression returns a falsy value:

```bash
pnpm browser eval \
  --selector "[data-testid=app-header]" \
  --expr "() => {
    const s = getComputedStyle(document.querySelector('[data-testid=app-header]'));
    return s.display !== 'none';
  }" \
  --expect
```

### Inline SVG icons

Check the `viewBox` and fill or color tokens; compare path data only once the design is stable. The story id `icons--default` and testid `icon` below are placeholders:

```bash
ICON_CANVAS_URL=$(tsx -e \
  "import { loadAppEndpoints } from '@repo/dev-tools/config/app-port'; \
  const { devUrl } = loadAppEndpoints('ui-storybook'); \
  console.log(\`\${devUrl}/iframe.html?id=icons--default\`)")

pnpm browser eval \
  --url "$ICON_CANVAS_URL" \
  --selector "[data-testid=icon]" \
  --expr "() => {
    const svg = document.querySelector('[data-testid=icon] svg');
    return svg?.getAttribute('viewBox') === '0 0 24 24';
  }" \
  --expect
```

## Compare with the design (layer 3)

```bash
pnpm browser screenshot \
  --selector "[data-testid=app-header]" \
  --output /tmp/app-header.png
```

An agent with vision compares `/tmp/app-header.png` with a Figma export or a pasted reference image. This is a spot check, not a CI gate. CLI flags: [`packages/browser-tools/README.md`](../packages/browser-tools/README.md).
