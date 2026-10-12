# Changelog

## 1.3.0

- Add optional `scale_factor` for manual spacer-height adjustment in YAML and the visual editor (default `1`, preserving existing layouts).
- Apply scaling after fixed-title/padding compensation and before minimum/maximum height limits.
- Explain how scale factor and ratio interact, with desktop/mobile-sized examples.
- Cover scaling at different widths, live editor updates, default behavior, validation, and limits in Chromium and Firefox regression tests.

## 1.2.0

- Add optional `height_mode: remaining` and its visual-editor control. It accounts for fixed title/padding above the spacer when aligning content to a card-width ratio.
- Preserve default gap behavior and all existing width-source options.
- Discover actual enclosing cards across shadow roots and slots, never unrelated descendant cards.
- Preserve fractional sizing and cancel pending frame work on disconnect.
- Keep sequential visual-editor changes instead of merging against stale configuration.
- Add Chromium/Firefox regression tests and CI.
- Document the distinction between proportional spacing and proportional content placement, and the third-party wrapper/UIX background issue.
