# Frontend Instructions

These rules extend the repository-level `AGENTS.md` for `apps/frontend/`.

## Icons

- All icons come from `@lucide/svelte`. Do not inline SVG.
- Never let an icon's paint color carry an alpha channel — no `text-*/NN`
  (including `muted-text`, which is `text-base-content/60`) on the icon
  itself or on an ancestor it inherits `currentColor` from. Lucide icons are
  stroked outlines, so a translucent stroke color double-blends at every
  point two strokes cross, making the crossing look darker/uneven.
- To dim an icon, use the `opacity-NN` utility instead, either directly on
  the icon or on a wrapping element that also contains its label. CSS
  `opacity` composites the whole element as one opaque group before fading
  it, so crossing strokes stay uniform. Add `hover:opacity-100` alongside any
  `hover:text-*` that should look fully bright on interaction.
