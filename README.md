# AI Design System

A reusable design system for web projects: CSS design tokens + React (Tailwind) components.

## Structure

```
├── styles/
│   └── tokens.css       # Design tokens (colors, etc.) + shared keyframes — source of truth
├── components/
│   └── LoadingState.tsx # Pixel-grid loader (variants: Drive, Dots, Orbit, Surfer)
└── README.md
```

## Stack

- **React** (client components, TypeScript)
- **Tailwind CSS** with custom theme utilities (`bg-ink`, `text-ink-3`, `shadow-overlay`)
- **CSS variables** for theming (`--ink`, `--ink-3`, `--tooltip-bg`, …)

## Using in a new project

1. Copy `styles/tokens.css` into the project and import it globally (e.g. in `globals.css` or `layout.tsx`).
2. Copy the components you need from `components/`.
3. Ensure the Tailwind theme maps the token variables to utilities (e.g. `ink` color → `var(--ink)`).

## Using with AI tools (Claude, etc.)

Point the tool at this folder or repo and say: *"Use my AI Design System — follow the tokens in `styles/tokens.css` and the component patterns in `components/`."*

## Components

| Component | Purpose | Variants |
|---|---|---|
| `LoadingState` | Loader for long-running work: pixel grid + shimmer label + elapsed timer | `Drive`, `Dots`, `Orbit`, `Surfer` |
| `ThinkingState` | Expandable agent trace with animated timeline | `Steps`, `Reasoning`, `Search`, `Coding` |

## Conventions

- Tokens are CSS variables defined in `styles/tokens.css`; components never hardcode colors.
- Every animated component respects `prefers-reduced-motion`.
- Loaders use `role="status"` for accessibility.
