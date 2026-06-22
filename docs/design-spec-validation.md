# Design Spec Validation

Lightweight functional design checks for agents while developing — **not** pixel regression.

Use this when verifying a component matches design **tokens and layout constraints** extracted from Figma (or a pasted SVG). For pixel-perfect CI regression, use Chromatic on Storybook stories. For CI gates, use Playwright E2E (planned).

---

## Three layers (pick the right one)

| Layer                  | Question                              | Tool                                                     |
| ---------------------- | ------------------------------------- | -------------------------------------------------------- |
| **1. Renders**         | Does the region exist?                | `pnpm browser validate --selector …`                     |
| **2. Token spec**      | Are colors/spacing/fonts correct?     | `pnpm browser eval --expr … --expect`                    |
| **3. Visual likeness** | Does it look like the design overall? | `pnpm browser screenshot` + agent vision vs Figma export |

Layer 2 is automatable and lightweight. Layer 3 is agent-assisted (subjective). Do not use `browser-capture` for routine checks.

**While developing:** prefer `pnpm browser snapshot` (DOM + `data-testid` regions) and `pnpm browser screenshot` (visual) before deep token checks — see the [browser-validation skill](../.claude/skills/x-browser-validation/SKILL.md).

For Storybook: `--url` from
`${loadAppEndpoints('ui-storybook').devUrl}/iframe.html?id=<story-id>` in `app-port.ts` — not
`?path=/story/…`.

### Style values

`pnpm browser eval` reads **computed styles** (`getComputedStyle`). Browsers normalize values:

- Colors → `rgb(r, g, b)` or `rgba(...)`
- Sizes → `px` strings

Extract expected values from Figma dev mode or inspect a reference build once, then hard-code in the `--expr`.

---

## Running checks

Bootstrap via the **[browser-validation skill](../.claude/skills/x-browser-validation/SKILL.md)** (Step 1 + Tier C).

> **URL:** run `pnpm browser:ensure-app` first — it prints the resolved URL and `pnpm browser`
> commands pick it up automatically. Pass `--url <url>` only to override.

### See the page (start here)

```bash
pnpm browser snapshot
pnpm browser snapshot --selector "[data-testid=app-header]"
pnpm browser screenshot --selector "[data-testid=app-header]" --output /tmp/app-header.png
```

Use `--attach` when iterating on a visible tab after HMR (see [`docs/browser-validation.md`](browser-validation.md)).

### Exists + text (layer 1)

```bash
pnpm browser validate \
  --selector "[data-testid=app-header]"

pnpm browser validate \
  --selector "[data-testid=app-header]" \
  --contains "Turborepo" \
  --no-console-errors
```

### Token check (layer 2)

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

Assert a single property with `--expect`:

```bash
pnpm browser eval \
  --selector "[data-testid=app-header]" \
  --expr "() => {
    const s = getComputedStyle(document.querySelector('[data-testid=app-header]'));
    return s.display !== 'none';
  }" \
  --expect
```

### SVG / icon shape (layer 2, niche)

When the component renders inline SVG:

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

Compare path data only when designs are stable; prefer viewBox + fill/color tokens otherwise.

### Visual review (layer 3)

```bash
pnpm browser screenshot \
  --selector "[data-testid=app-header]" \
  --output /tmp/app-header.png
```

Agents with vision compare `/tmp/app-header.png` to a Figma export or pasted reference image. This is a spot-check, not a CI gate.

---

## Related

- [`docs/component-validation-contract.md`](component-validation-contract.md) — `data-testid` naming
- [`docs/browser-validation.md`](browser-validation.md) — URL derivation, edge-case scenarios, Storybook
- [`packages/browser-tools/README.md`](../packages/browser-tools/README.md) — CLI reference
