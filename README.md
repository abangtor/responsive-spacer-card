# Responsive Spacer Card

A tiny Home Assistant Lovelace custom card that reserves vertical space based on its own rendered width.

It uses `ResizeObserver`, so the gap responds to dashboard column changes, phone rotation, browser resizing, and zoom. It is intended for layouts where `custom:gap-card`'s fixed pixel height is unsuitable.

## Installation with HACS

1. In HACS, open **Frontend** → menu → **Custom repositories**.
2. Add this repository with category **Dashboard**.
3. Install **Responsive Spacer Card**.
4. Reload the browser, then add the resource if Home Assistant does not add it automatically:
   `/hacsfiles/responsive-spacer-card/responsive-spacer-card.js` as a JavaScript module.

## Usage

```yaml
type: custom:responsive-spacer-card
ratio: 0.17
```

`ratio` is a decimal proportion of the card width. For example, `0.17` creates a gap 17% as high as the card is wide; a 350px-wide card receives a 60px gap.

Use the card as an item in an `entities` card:

```yaml
type: entities
entities:
  - type: custom:responsive-spacer-card
    ratio: 0.17
  - entity: light.wet_kitchen_down_light
    name: Down Light
```

## Notes

- `ratio` must be zero or a positive number.
- The card intentionally has no visual surface, margin, or padding.
- This is a frontend-only Lovelace card; it has no Home Assistant integration or configuration entry.

## License

MIT. See [LICENSE](LICENSE).
