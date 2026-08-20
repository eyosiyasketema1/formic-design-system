# Design System Audit — 2026-08-20

## Summary

**Components reviewed:** 4 (LoadingState, ThinkingState, ApprovalCard, StreamingText) | **Token files:** 2 (tokens.css, themes.css) | **Issues found:** 9 | **Score: 64/100**

Strong foundation: consistent visual language, full light/dark/5-theme coverage, animations respect reduced motion, and components read tokens instead of branching on theme. The gaps are mostly about *reusability* — demo content baked into components, missing typography/motion tokens, and no focus-visible states.

## Naming Consistency

| Issue | Components | Recommendation |
|-------|------------|----------------|
| ~~`variant` typed as `string` instead of a union~~ | All 4 | ✅ Fixed: unions on LoadingState/ThinkingState; vestigial `variant` props removed from ApprovalCard/StreamingText |
| Variant names are Capitalized strings used as object keys | LoadingState, ThinkingState | Fine, but document as a convention so future components match |
| Internal constant `VARIANTS` vs `PATTERNS` vs `QUESTIONS` for the same role (variant config) | All | Pick one name, e.g. `VARIANTS`, everywhere |

## Token Coverage

| Category | Defined | Hardcoded values found |
|----------|---------|------------------------|
| Colors | ✅ 18 tokens, light+dark, 5 themes | ~4: `text-white` (Dot, ApprovalCard badge), `rgba(255,255,255,0.14)` inset highlight, demo SVG fills (acceptable — demo data) |
| Spacing | ⚠️ Tailwind scale only | Frequent arbitrary values (`px-[3px]`, `ml-[5px]`, `left-[3px]`) — acceptable for fine-tuning, no action needed |
| Typography | ❌ Font tokens only, no scale | ~28 instances of `text-[13px]`, `text-[12.5px]`, `text-[11px]`… — define a type scale (e.g. `--text-body: 13px`, `--text-caption: 12px`, `--text-micro: 10.5px`) |
| Radius | ⚠️ 2 tokens (control, card) | ~14 arbitrary radii (`rounded-[5px]`, `[6px]`, `[8px]`, `[10px]`) — add `--radius-xs/sm/md` |
| Shadows | ✅ 4 tokens | 1 one-off (`shadow-[0_0_0_1.5px_var(--canvas)]` avatar ring — reasonable) |
| Motion | ❌ None | `cubic-bezier(0.23,1,0.32,1)` repeated ~15×; durations (650/950/1400ms) inline — define `--ease-out-quint`, `--duration-*` |

## Component Completeness

| Component | States | Variants | Real-data props | A11y | Docs | Score |
|-----------|--------|----------|-----------------|------|------|-------|
| LoadingState | ✅ | ✅ 4 | ⚠️ label only | ✅ role=status | ⚠️ header comment only | 7/10 |
| ThinkingState | ✅ | ✅ 4 | ❌ rows hardcoded | ✅ aria-expanded, role=status | ⚠️ | 6/10 |
| ApprovalCard | ✅ incl. disabled | — | ❌ questions hardcoded | ⚠️ aria-pressed ✓, no focus-visible | ⚠️ | 6/10 |
| StreamingText | ✅ | — | ❌ text/sources hardcoded | ⚠️ stream not announced (no aria-live) | ⚠️ | 6/10 |

**Cross-cutting gaps**

1. **No `focus-visible` styles anywhere.** Keyboard users get the browser default ring (or nothing). One shared rule fixes all: `:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }`
2. **Demo content is baked in.** ThinkingState rows, ApprovalCard questions, and StreamingText tokens/sources are module constants. Each needs a prop (with the demo data as default) before real projects can use them.
3. **No entry point.** Missing `components/index.ts` barrel and `package.json` — copying files works, but importing as a package doesn't yet.
4. **Preview drift risk.** `preview.html` duplicates all token CSS inline; a token edit in `styles/` won't reach the preview unless changed in both places.
5. **Questrial has one weight.** `font-medium`/`font-semibold` render as browser-synthesized weights. Consider pairing a heavier display font or accepting the synthesis deliberately.

## Priority Actions

1. ~~**Add motion + typography tokens** and sweep components~~ — ✅ Fixed 2026-08-21: `--ease-out-quint` (3 curves collapsed to 1), `--duration-*`, 5-step type scale (`text-body/caption/small/tiny/micro`), `--radius-sm/md`; all components swept.
2. ~~**Lift demo content into props** with current data as defaults~~ — ✅ Fixed 2026-08-21: `rows`/`active`/`done`/`query`/`more` on ThinkingState, `questions` + structured `onSubmitted(answers)` on ApprovalCard, `tokens`/`sources`/`followUps`/`onFollowUp` on StreamingText; variant props typed as unions.
3. ~~**Add a shared `:focus-visible` rule + `aria-live="polite"`** on StreamingText~~ — ✅ Fixed 2026-08-21: accent outline on keyboard focus (tokens.css base), `aria-live="polite"` + `aria-busy` on the stream.
