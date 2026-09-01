# Contributing to Formic

Thanks for looking. Formic is a small, opinionated design system, and that shapes what contributions fit. This page tells you what gets merged, what gets declined, and how to make a PR that passes on the first try.

If you only remember one thing: **`python3 scripts/qa_check.py` must pass.** It is not advisory, it runs on every PR.

---

## What this is

A token-driven React + Tailwind v4 design system for AI product interfaces. It is vendored, not installed: people copy `styles/` and `components/` into their project and own the files from then on. There is no npm package, no semver, and no build step.

That has one consequence worth stating up front: **anyone can fork it and change whatever they like.** So this repo does not have to accept every idea to be useful to you. If your direction differs from the system's, forking is a legitimate and friction-free answer, not a consolation prize.

---

## What's welcome

- **Bug fixes.** A component that misbehaves, breaks at a viewport, or violates one of the rules in `CLAUDE.md`.
- **Accessibility fixes.** Missing ARIA, a broken focus path, a contrast pair that fails, a keyboard trap. These get reviewed fastest.
- **Responsive fixes.** Anything that clips, overflows, or falls apart on a narrow viewport.
- **New components built from the existing primitives**, following the existing patterns.
- **Documentation.** Corrections, clarifications, better examples.
- **Browser compatibility.** Especially fallbacks for progressive features like `corner-shape` and `backdrop-filter`.

## What's maintainer-decided

These are the system's spine, and changes to them are a judgement call rather than a patch. Open an issue to discuss before writing code:

- **Design tokens** — colors, the type ramp, radii, spacing, easing
- **The rules in `CLAUDE.md`** themselves
- **Control metrics** — the 24/32/36/40 height scale and its padding relationship
- **Elevation and motion philosophy** — flat borders, one easing curve
- **Adding a dependency.** The answer is almost certainly no. Two peer dependencies is a feature.

A PR that changes these without a prior issue will likely be asked to become an issue first. That is not a rejection of the idea, just of the order.

---

## Setup

There is nothing to install to look at the system:

```bash
git clone https://github.com/eyosiyasketema1/formic-design-system.git
cd formic-design-system
open preview.html          # the full gallery, CDN React and Tailwind, no build
```

To run the QA gate you need Python 3 and Node (for the compile check):

```bash
python3 scripts/qa_check.py
```

---

## The rules

They live in [`CLAUDE.md`](CLAUDE.md), and a condensed version for AI coding agents is in [`AGENTS.md`](AGENTS.md). Read `CLAUDE.md` before writing a component. The short version:

1. **Tokens only.** Never hardcode a color, font size, radius, shadow, or easing. If a value has no token, add the token first.
2. **Compose, never fork.** Build from `components/primitives.tsx`. If a pattern appears a second time, extract it and rewire the first use in the same PR.
3. **Both themes for free.** Components read tokens and never branch on theme or palette.
4. **Mirror into `preview.html`.** It duplicates styles inline so it can run standalone. Any token or component change has to appear there too, and the QA gate checks for drift.
5. **Responsive by default.** Fluid roots with a `max-w-*` cap, wide content scrolls in its own container, text truncates. Check it at 360px before you call it done.

---

## Making a pull request

1. **Fork and branch.** Branch off `main`, one topic per branch.
2. **Keep it small.** A focused PR gets reviewed in a day; a sweeping one can sit for weeks. If you're changing five components, that is five PRs.
3. **Run the gate.** `python3 scripts/qa_check.py` must exit clean. So must `python3 scripts/check_sri.py` if you touched a `<script>` tag.
4. **Check both themes and 360px width.** Most review comments are one of these two.
5. **Write a real description.** What changed, why, and what you checked. Screenshots for anything visual, in light *and* dark.
6. **Open the PR.** CI runs the same gate. A preview deployment builds for the landing page and gallery so reviewers can click through your change.

### Commit messages

Present tense, scope first, explain the why when it isn't obvious:

```
Calendar: size the panel to its grid instead of a fixed width
Glow ring: match the card's squircle corner
```

### What gets declined quickly

- QA failing, with no explanation
- Hardcoded values where a token exists
- A new dependency
- `font-bold`, arbitrary `tracking-[...]`, `text-[14px]`, a `cubic-bezier()` literal — the gate catches all of these
- Drop shadows. Elevation here is hairline borders, and the shadow tokens are 1px rings by design
- A component change not mirrored into `preview.html`
- Reformatting or restyling unrelated files alongside a real change

---

## Reporting a bug

Open an [issue](https://github.com/eyosiyasketema1/formic-design-system/issues). Useful reports include the component, the browser and viewport width, the theme and palette, and what you expected instead. A gallery link or screenshot beats a paragraph.

Issues are the front door for everything: bugs, component requests, questions, and proposals for the maintainer-decided list above. Public and searchable means the next person finds the answer.

---

## Licence

Formic is MIT. By contributing, you agree your contributions are licensed under it too. There is no CLA.
