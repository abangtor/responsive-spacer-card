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

`ratio` is the spacer height divided by its rendered width. For example, a ratio of `0.17` gives a 60px gap when the card is 350px wide.

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
| `min_height` | number | `0` | Optional minimum height in pixels. `0` disables it. |
| `max_height` | number | `0` | Optional maximum height in pixels. `0` disables it. |

```yaml
type: custom:responsive-spacer-card
ratio: 0.17
min_height: 32
max_height: 120
```

All values must be non-negative. When set, `max_height` must not be less than `min_height`.

## Notes

- The card intentionally has no visual surface, margin, padding, or click target.
- It is frontend-only; no Home Assistant integration or configuration entry is needed.
- The card works in stacks, grids, and entity-card rows as long as Home Assistant gives it a measurable width.

## License

MIT. See [LICENSE](LICENSE).
