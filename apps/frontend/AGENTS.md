# Frontend Instructions

These rules extend the repository-level `AGENTS.md` for `apps/frontend/`.

## Icons

- All icons come from `@lucide/svelte`. Do not inline SVG.
- Don't apply opacity directly to an icon (e.g. `text-base-content/60` on the
  icon itself, or wrapping it in an opacity utility). Lucide icons are stroked
  outlines, so opacity makes overlapping/crossing lines show through each
  other and looks broken. Fade an icon by wrapping it in a container that
  carries the opacity, or by using a muted solid color token instead.
