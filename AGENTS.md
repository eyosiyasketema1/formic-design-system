# Instructions for AI coding agents

Read this before writing UI in a project that uses the Formic AI Design System. It applies to Claude Code, Cursor, Copilot, and any other coding agent.

Gallery: https://formicai.dev/preview.html

## Compose, never fork

Use the components in `components/` as they are. If a pattern is missing, build it from the primitives in `components/primitives.tsx` (Icon, Chip, Card, Avatar, Popover, Switch, Skeleton, ...) rather than writing new markup from scratch, and never edit a component's internals to bend it into a one-off shape.

## The rules that matter most

1. **Tokens only.** No hardcoded colors, font sizes, radii, shadows, or easings. Use the generated utilities: `text-ink`, `text-ink-2`, `text-ink-3`, `bg-canvas`, `bg-surface`, `bg-field`, `bg-hover`, `bg-hover-2`, `bg-inset`, `bg-sidebar`, `border-line`, `border-line-strong`, `text-accent`, `text-green`, `text-red`, `text-orange`, and the `*-tint` backgrounds. If a value has no token, add the token first.
2. **Type scale.** A 14px base integer ramp: `text-nano` 8, `text-micro` 10, `text-tiny` 11, `text-small` 12, `text-caption` 13, `text-body` 14, `text-lead` 16, `text-title` 18, `text-heading` 20, `text-display` 24, `text-display-lg` 32, `text-display-xl` 48. Never `text-[Npx]`.
3. **Weights and tracking.** `font-medium` is the default, `font-semibold` is the maximum, `font-bold` is never used. Only `tracking-wide` and `tracking-tight`, never an arbitrary value.
4. **Radii.** `rounded-sm` 6, `rounded-chip` 7, `rounded-control` 8, `rounded-md` 10, `rounded-card` 14, `rounded-capsule` 22.
5. **Motion.** One easing: `var(--ease-out-quint)`. Hover color transitions are `duration-150`. No `cubic-bezier()` literals.
6. **No drop shadows.** Elevation comes from hairline borders. The `--shadow-*` tokens are 1px rings or `none`.
7. **Control metrics.** Heights 24 / 32 / 36 / 40 (xs / sm / md / lg), shared by buttons and inputs, so a md button lines up with a md input. Horizontal padding is roughly height/3.
8. **Accent carries the primary action.** One accent CTA per view, one destructive action per view; everything else is secondary, outline, or ghost.
9. **Light by default.** Dark is opt in through `<html data-theme="dark">`. Components never branch on theme or palette, they only read tokens, so both modes come for free.
10. **Contrast.** Keep WCAG AA in both modes and all five palettes: text at least 4.5:1, non-text UI at least 3:1.
11. **Icons.** Tabler only, through the shared `Icon` wrapper: `<Icon name="check" size={14} strokeWidth={2} />`. To add one, map a Tabler component into `ICONS` in `primitives.tsx`. Never inline SVG icon paths, never add a second icon package.
12. **Responsive by default.** Fluid roots (`w-full` plus a `max-w-*` cap), wide content scrolls inside its own `overflow-x-auto`, text truncates with `min-w-0 truncate`, touch targets at least 24px. Check the layout at about 360px wide before calling it done.

## Data, not hardcoded content

Every component ships demo content as prop defaults (`DEFAULT_*`). In an app, always pass real data through props. Variant props are typed unions, never plain `string`.

## If you are changing the design system itself

Read `CLAUDE.md` at the repo root and follow its QA workflow. Run `python3 scripts/qa_check.py`; it must pass before committing, and any token or component change must be mirrored into `preview.html`.
