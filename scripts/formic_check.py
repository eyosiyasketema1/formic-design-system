#!/usr/bin/env python3
"""
Formic usage gate — is this app actually built on Formic, or on generic Tailwind
wearing Formic's tokens?

    python3 src/formic/scripts/formic_check.py src/         # an app (the default)
    python3 src/formic/scripts/formic_check.py src/pages/Billing.tsx

Reads every .tsx / .jsx under the paths given, skipping the vendored src/formic
folder itself, and reports the tells of an agent that invented UI instead of
importing it. Each hit names the file and line, what was found, and what
Formic wants instead. Exit status is 1 when anything is flagged, so it gates a
commit; run it with compose_check.py, which judges what is on the screen while
this judges how it was built.

What it catches:

  colour     hex colours, Tailwind's palette classes (bg-gray-100, text-blue-600),
             bg-white / text-white / text-black, opacity fades on text
  type       text-xs / sm / base / lg / xl, text-[Npx], font-bold, arbitrary tracking
  shape      rounded-lg / xl / 2xl, rounded-[..], shadow-sm / md / lg, drop-shadow,
             cubic-bezier(), hardcoded pixel widths on layout
  element    a raw <button>, <input>, <select>, <textarea>, <table> or <svg> in an
             app file; a Formic component exists for each and a hand-rolled one
             loses the control metrics, the focus rule and the theme
  import     lucide, heroicons, react-icons, recharts, chart.js, MUI, antd, Chakra,
             Radix, shadcn, framer-motion: a second kit or a chart library
  formic     a file that renders JSX and imports nothing from src/formic
  shell      a page with a rail (AppSidebar / ProjectSidebar / TopBar) whose main
             column carries no .page-content, so the layout choice is ignored
  readable   text-nano in a muted ink, body copy in text-ink-3, text faded with
             opacity: the three ways copy stops being readable

Legitimate exceptions are rare; when one is real, put the reason on the same
line in a comment containing `formic-ok` and the line is skipped.
"""
import re
import sys
from pathlib import Path

sys.dont_write_bytecode = True

PALETTE = r"(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)"
LINE_RULES = [
    # (kind, regex, message)
    ("colour", re.compile(r"(?<![\w&])#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3}(?:[0-9a-fA-F]{2})?)?\b(?![\w-])"), "a hex colour; use a token utility (text-ink, bg-surface, border-line, text-accent) and add the token first if none fits"),
    ("colour", re.compile(r"\b(?:bg|text|border|ring|fill|stroke|from|to|via|divide|outline|shadow)-" + PALETTE + r"-\d{2,3}\b"), "a Tailwind palette class; Formic colours are tokens: ink / ink-2 / ink-3, canvas / surface / field / inset / hover, line, accent, green / red / orange and their -tint"),
    ("colour", re.compile(r"\b(?:bg-white|bg-black|text-white|text-black|border-white|border-black)\b"), "white / black by name; use bg-surface or bg-canvas, text-ink, text-canvas on coloured fills, so dark mode and every palette keep contrast"),
    ("colour", re.compile(r"\btext-[\w-]*\b[^\"'`]*(?<![:\w-])opacity-(?:[1-7]0|5|25|75)\b|(?<![:\w-])opacity-(?:[1-7]0|5|25|75)\b[^\"'`]*\btext-"), "text faded with opacity; faded text is the unreadable kind. Say the hierarchy with text-ink-2 / text-ink-3 and the size ramp instead"),
    ("type", re.compile(r"\btext-(?:xs|sm|base|lg|xl|[2-9]xl)\b"), "Tailwind's type sizes; the ramp is text-tiny / small / caption / body / lead / title / heading / display / display-lg / display-xl"),
    ("type", re.compile(r"\btext-\[\d"), "an arbitrary font size; the ramp is integer and fixed, pick the nearest step"),
    ("type", re.compile(r"\bfont-(?:bold|extrabold|black)\b"), "font-bold; font-semibold is the maximum, for titles, names and key values, font-medium is the working weight"),
    ("type", re.compile(r"\btracking-(?:\[|tighter\b|wider\b|widest\b)"), "an off-scale tracking; only tracking-tight and tracking-wide exist"),
    ("shape", re.compile(r"\brounded(?:-[trbl]{1,2})?-(?:xs|lg|xl|2xl|3xl|4xl)\b|\brounded-\[(?![1-5]px\])|\brounded(?:-[trbl]{1,2})?(?=[\s\"'`])"), "an off-scale radius; the scale is rounded-sm 6 / chip 7 / control 8 / md 10 / card 14 / capsule 22, rounded-full for circles (tiny optical radii of 1 to 5px may stay arbitrary), and the app's radius choice rewrites all of them"),
    ("shape", re.compile(r"\bshadow-(?:sm|md|lg|xl|2xl|inner)\b|\bdrop-shadow|\bshadow-\["), "a drop shadow; elevation is a hairline: shadow-hairline, shadow-card, shadow-btn, shadow-overlay"),
    ("shape", re.compile(r"cubic-bezier\("), "a cubic-bezier literal; the one easing is var(--ease-out-quint)"),
    ("shape", re.compile(r"\b(?:w|max-w|min-w|h|min-h)-\[\d+px\]"), "a hardcoded pixel dimension on layout; roots are fluid (w-full plus a max-w-* cap) and heights come from content or the control scale"),
    ("shape", re.compile(r"\bh-screen\b"), "h-screen; app shells use h-dvh so mobile browser chrome does not clip the rail"),
    ("element", re.compile(r"<button\b"), "a raw <button>; use Button (10 variants, 4 sizes) or IconButton, which carry the control metrics, the focus ring and the optical text trim"),
    ("element", re.compile(r"<input\b(?![^>]*type=\"(?:hidden|file)\")"), "a raw <input>; use Input, Textarea, Select, Checkbox, Switch, Slider, DatePicker or OTPInput"),
    ("element", re.compile(r"<(?:select|textarea)\b"), "a raw form element; use Select / Textarea"),
    ("element", re.compile(r"<table\b"), "a raw <table>; use DataTable (columns, rows, selection, row actions, footer paging, empty state)"),
    ("element", re.compile(r"<svg\b"), "an inline <svg>; icons are <Icon name=…/> from primitives (Tabler), charts come from charts.tsx"),
    ("import", re.compile(r"from\s+[\"'](?:lucide-react|@heroicons/|react-icons|@phosphor-icons|@radix-ui|@mui/|antd|@chakra-ui|@headlessui|recharts|chart\.js|react-chartjs|victory|nivo|@nivo|framer-motion|motion/react|@shadcn|cmdk|vaul|sonner)"), "a second UI kit, icon set, chart or motion library; Formic ships all of these and a mix reads as two products"),
    ("readable", re.compile(r"\btext-nano\b[^\"'`]*\btext-ink-(?:2|3)\b|\btext-ink-(?:2|3)\b[^\"'`]*\btext-nano\b"), "8px letters in a muted ink; text-nano is for the letters inside a mini badge, in text-canvas on a fill, never running copy"),
    ("readable", re.compile(r"(?<![:\w-])text-ink-3\b[^\"'`]*(?<![:\w-])(?:text-body|text-lead)\b|(?<![:\w-])(?:text-body|text-lead)\b[^\"'`]*(?<![:\w-])text-ink-3\b"), "body copy in the mutest ink; text-ink-3 is for eyebrows, captions and hints, running text is text-ink or text-ink-2"),
]
SHELLS = ("<AppSidebar", "<ProjectSidebar", "<TopBar", "<SidebarNav")
JSX = re.compile(r"<[a-z][\w-]*[\s/>]")  # a lowercase tag: markup of its own. A file that only composes components (App.tsx) is fine
FORMIC_IMPORT = re.compile(r"from\s+[\"'][^\"']*formic/(?:components|styles)")
FORMIC_IMPORT_ALT = re.compile(r"from\s+[\"'](?:@/formic|@formic|~/formic)")
SKIP_DIRS = ("/formic/", "node_modules", "/dist/", "/build/", "/.next/")


def check(path):
    src = path.read_text(errors="replace")
    lines = src.split("\n")
    out = []
    in_block_comment = False
    for no, line in enumerate(lines, 1):
        stripped = line.strip()
        if "formic-ok" in line:
            continue
        if in_block_comment:
            if "*/" in line:
                in_block_comment = False
            continue
        if stripped.startswith("/*") and "*/" not in stripped:
            in_block_comment = True
            continue
        if stripped.startswith("//") or stripped.startswith("*"):
            continue
        for kind, rx, msg in LINE_RULES:
            m = rx.search(line)
            if m:
                out.append((no, kind, m.group(0).strip()[:40], msg))
    renders = bool(JSX.search(src))
    imports_formic = bool(FORMIC_IMPORT.search(src) or FORMIC_IMPORT_ALT.search(src))
    if renders and not imports_formic and len(lines) > 12:
        out.append((1, "formic", path.name, "this file renders UI and imports nothing from src/formic; every screen is composed from the system's components, or it is not Formic"))
    if any(s in src for s in SHELLS) and "<main" in src and "page-content" not in src:
        out.append((1, "shell", "<main>", "a page with a rail but no .page-content wrapper inside <main>; the layout choice in formic.config.json (compact / medium / full) applies through that class"))
    return out


def main():
    roots = [Path(p) for p in sys.argv[1:]] or [Path("src")]
    files = []
    for r in roots:
        if r.is_file():
            files.append(r)
        elif r.is_dir():
            for ext in ("*.tsx", "*.jsx"):
                files += [p for p in r.rglob(ext) if not any(s in str(p) for s in SKIP_DIRS)]
    if not files:
        raise SystemExit(f"no .tsx/.jsx files under {', '.join(str(r) for r in roots)} (the vendored src/formic folder is skipped on purpose)")
    total = 0
    for f in sorted(files):
        hits = check(f)
        if not hits:
            continue
        total += len(hits)
        print(f"{f}")
        for no, kind, found, msg in hits:
            print(f"  ✗ {no:>4}  {kind:<8} {found:<40} {msg}")
    if total:
        print(f"\n{total} usage issue(s). Import the component, use the token, or put the reason on the line as `formic-ok`. See AGENTS.md → Build protocol.")
        sys.exit(1)
    print(f"formic: {len(files)} file(s) built on the system — tokens, ramp, radii, Formic components, no second kit")


if __name__ == "__main__":
    main()
