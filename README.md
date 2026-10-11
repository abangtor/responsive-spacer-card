# Responsive Spacer Card

An invisible Home Assistant Lovelace card that reserves vertical space based on its rendered width, its containing card, or its parent card.

Unlike fixed-pixel spacer cards, it uses `ResizeObserver` to respond to dashboard column changes, browser resizing, zoom, and phone rotation. It includes a visual editor in Home Assistant's card editor.

## Install with HACS

1. In HACS, open **Frontend** → menu → **Custom repositories**.
2. Add `https://github.com/abangtor/responsive-spacer-card` with category **Dashboard**.
3. Install **Responsive Spacer Card**.
4. Reload the browser. If HACS does not add it automatically, add `/hacsfiles/responsive-spacer-card/responsive-spacer-card.js` as a JavaScript module resource.

## Use

Add the card in the visual editor, or use YAML:

```yaml
type: custom:responsive-spacer-card
ratio: 0.17
```

`ratio` is the spacer height divided by its rendered width in the default `gap` mode. For example, a ratio of `0.17` gives a 60px gap when the card is 350px wide.

Inside an entities card:

```yaml
type: entities
entities:
  - type: custom:responsive-spacer-card
    ratio: 0.17
    width_source: parent_card
  - entity: light.wet_kitchen_down_light
    name: Down Light
```

## Configuration

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `ratio` | number | `0.17` | Spacer height divided by rendered width. `0.17` means 17%. |
| `width_source` | `self`, `card`, or `parent_card` | `self` | `self` measures the spacer row. `card` measures its containing Lovelace card. `parent_card` measures one card level above that, which is useful inside nested room tiles. |
| `height_mode` | `gap` or `remaining` | `gap` | `gap` sets the gap itself to width × ratio. `remaining` subtracts space already above the spacer, aligning its bottom relative to the selected card top. Requires `card` or `parent_card`. |
| `min_height` | number | `0` | Optional minimum height in pixels. `0` disables it. |
| `max_height` | number | `0` | Optional maximum height in pixels. `0` disables it. |

```yaml
type: custom:responsive-spacer-card
ratio: 0.17
min_height: 32
max_height: 120
```

All values must be non-negative. When set, `max_height` must not be less than `min_height`.

## Aligning controls with a room image

A proportional **gap** is not a proportional **header region**. For example,
66px of title/padding plus a 14% gap places controls at approximately 27% of a
500px card, but 32% of a 374px card. Measuring a different width cannot fix that
fixed-height contribution.

Use the visual editor's **Height calculation → Fill to position from card top**:

```yaml
type: custom:responsive-spacer-card
width_source: parent_card
height_mode: remaining
ratio: 0.29
```

This computes `max(0, card_width * ratio - space_above_spacer)`. The selected
card is a real enclosing `ha-card`, found across shadow roots, not a picture or
an arbitrary sibling. Use `card` for a single card, `parent_card` for a nested
card. If there is no parent card, the containing card is used. If no card is
available at all, sizing falls back to the spacer itself.

- `ratio` now describes the position of the spacer's **bottom** from the card top.
- Minimum and maximum heights limit the remaining gap, so limits can prevent exact alignment.
- A title taller than the target leaves a zero-height spacer; preceding content is never overlapped.
- Margins/gaps **after** the spacer are outside its height. For exact alignment of the next row, remove that one gap in the containing card's styling. On current HA Entities cards with UIX, for a spacer in the first row:

```yaml
uix:
  style: |
    #states > div:first-child {
      margin-bottom: calc(-1 * var(--entities-card-row-gap, var(--card-row-gap, 8px))) !important;
    }
```

Merge this into any existing UIX style. Card-mod installations can use the same
CSS under `card_mod`; do not mix both styling systems on one card. This selector
is specific to the current Entities card layout, not a universal custom-card rule.

### Background briefly visible, then gone

The spacer never changes ancestor backgrounds or requests a page reload. If
`vertical-stack-in-card` reconstructs its shadow root after UIX inserts a style,
that style can be removed. This is a wrapper lifecycle issue, not an image-load
failure. In that situation, a `stack-in-card` wrapper can retain the injected
background; verify this against the versions installed on your dashboard.

## Development and checks

No build is required; HACS loads the root `responsive-spacer-card.js` directly.

```sh
npm ci
npx playwright-core install --with-deps chromium firefox
npm run check
npm test
```

Browser regressions cover nested width selection, desktop/mobile widths, title
reflow, clamps, reconnection, idle observer stability, validation, and editor
configuration events. CI runs the same checks. Native `ha-form` rendering and
third-party wrappers must additionally be checked in Home Assistant itself.

## Notes

- The card intentionally has no visual surface, margin, padding, or click target.
- It is frontend-only; no Home Assistant integration or configuration entry is needed.
- The card works in stacks, grids, and entity-card rows as long as Home Assistant gives it a measurable width.

## License

MIT. See [LICENSE](LICENSE).
