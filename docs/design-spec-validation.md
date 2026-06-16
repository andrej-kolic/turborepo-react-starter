# Design Spec Validation

Lightweight functional design checks for agents — **not** pixel regression.

Use this when verifying a component matches design **tokens and layout constraints** extracted from Figma (or a pasted SVG). For pixel-perfect CI regression, use Chromatic on Storybook stories.

---

## Three layers (pick the right one)

| Layer                  | Question                              | Tool                                                     |
| ---------------------- | ------------------------------------- | -------------------------------------------------------- |
| **1. Renders**         | Does the region exist?                | `pnpm browser validate --selector …`                     |
| **2. Token spec**      | Are colors/spacing/fonts correct?     | `pnpm browser eval --expr … --expect`                    |
| **3. Visual likeness** | Does it look like the design overall? | `pnpm browser screenshot` + agent vision vs Figma export |

Layer 2 is automatable and lightweight. Layer 3 is agent-assisted (subjective). Do not use `browser-capture` for routine checks.

---

## Spec format (YAML)

Store specs next to the component or story they validate. Example:

```yaml
# specs/app-header.spec.yaml
url: <url> # e.g. http://localhost:5173 or a Storybook canvas URL
checks:
  - selector: '[data-testid=app-header]'
    exists: true
  - selector: '[data-testid=app-header]'
    text_contains: 'Turborepo'
  - selector: '[data-testid=app-header]'
    styles:
      display: block
  - console_errors: false
```

For Storybook: `url` from
`${loadAppEndpoints('ui-storybook').devUrl}/iframe.html?id=<story-id>` in `app-port.ts` — not
`?path=/story/…`.

### Style values

`pnpm browser eval` reads **computed styles** (`getComputedStyle`). Browsers normalize values:

- Colors → `rgb(r, g, b)` or `rgba(...)`
- Sizes → `px` strings

Extract expected values from Figma dev mode or inspect a reference build once, then hard-code in the spec.

---

## Running checks manually

> **URL:** run `pnpm browser:ensure-app` first — it prints the resolved URL and the `pnpm browser`
> commands below will pick it up automatically. Pass `--url <url>` explicitly only to override.

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

## Agent workflow (no MCP)

```bash
pnpm browser:ensure-app   # starts dev server if needed; resolves URL
pnpm browser:setup        # required_permissions: all

# 1. Smoke — region renders, no console errors
pnpm browser validate --selector "[data-testid=…]" --no-console-errors

# 2. Token spec — computed styles match design
pnpm browser eval --selector "[data-testid=…]" --expr "<fn>" --expect

# 3. Visual spot-check — screenshot for comparison
pnpm browser screenshot --selector "[data-testid=…]" --output /tmp/check.png
```

---

## Future: `browser check-spec`

A `pnpm browser check-spec specs/app-header.spec.yaml` runner may be added later. Until then, agents run the `pnpm browser validate` / `pnpm browser eval` commands implied by each spec row.

---

## Related

- [`docs/component-validation-contract.md`](component-validation-contract.md) — `data-testid` naming
- [`docs/browser-validation.md`](browser-validation.md) — URL derivation, edge-case scenarios, Storybook
- [`packages/browser-tools/README.md`](../packages/browser-tools/README.md) — CLI reference
