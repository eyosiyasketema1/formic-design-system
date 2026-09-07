#!/usr/bin/env python3
"""
Composition lint — the mechanical half of "nothing on a screen without a reason".

    python3 src/formic/scripts/compose_check.py src/          # an app
    python3 scripts/compose_check.py components/Foo.tsx       # one file

Reads every .tsx / .jsx under the paths given (the vendored src/formic folder
is skipped) and reports the tells that an element was placed by habit rather
than intent. It cannot judge whether a chart answers the screen's question;
that is what the Brief comment and the reviewer are for. What it can see:

  brief     a screen file (one that renders a Panel, StatCard, chart or
            DataTable) carries no /* Brief … Register: … */ comment
  register  a file whose brief says Text renders charts or headline figures;
            one that says Visual renders figures or charts
  figures   more than five headline figures (StatCard / StatStrip items) in
            one file, or a StatCard delta with no period in reach (no
            `caption`, `period` or a "vs" / "last" / "this" word nearby)
  trend     a Sparkline / MiniBars / trend= with fewer than 6 points; a
            LineChart series with fewer than 5
  parts     a DonutChart segments / ShareBar with fewer than 3 or more than
            6 parts (two parts is a sentence, seven is a BarList)
  accent    more than one iconTone="accent" in a file
  gauge     a Gauge or ring whose max is missing (a rate needs a target)
  filler    placeholder copy (lorem, TODO, "Sample", "Placeholder") shipped
            in JSX text

Exit status is 1 when anything is flagged, so it can gate a commit.
"""
import re
import sys
from pathlib import Path

sys.dont_write_bytecode = True

SCREEN_MARKERS = ("<Panel", "<StatCard", "<StatStrip", "<LineChart", "<BarChart", "<DonutChart", "<DataTable", "<BarList", "<ShareBar", "<RadarChart", "<ScatterChart", "<Gauge", "<ActivityCalendar")
CHARTS = ("LineChart", "BarChart", "DonutChart", "BarList", "ShareBar", "RadarChart", "ScatterChart", "Gauge", "ActivityCalendar", "Sparkline", "MiniBars")
FIGURES = ("StatCard", "StatStrip")
PLACEHOLDER = re.compile(r">\s*(lorem ipsum|todo\b|placeholder|sample (text|data)|coming soon)", re.I)
BRIEF = re.compile(r"/\*\s*Brief[\s\S]*?Register:\s*([A-Za-z]+)[\s\S]*?\*/")


def array_len(src, start):
    """length of the JS array literal that starts at src[start] == '['"""
    depth, nest, i, items, empty = 0, 0, start, 1, True
    while i < len(src):
        c = src[i]
        if c == "[":
            depth += 1
        elif c == "]":
            depth -= 1
            if depth == 0:
                return 0 if empty else items
        elif c in "{(":
            nest += 1
        elif c in "})":
            nest -= 1
        elif depth == 1 and nest == 0:
            if c == ",":
                items += 1
            elif not c.isspace():
                empty = False
        elif depth == 1 and not c.isspace():
            empty = False
        i += 1
    return items


def check(path):
    src = path.read_text(errors="replace")
    out = []
    is_screen = any(m in src for m in SCREEN_MARKERS)
    brief = BRIEF.search(src)
    register = brief.group(1).lower() if brief else None
    if is_screen and not brief:
        out.append("brief     no /* Brief … Register: … */ comment; write the reader, question, action and register before the markup")
    has_chart = any(f"<{c}" in src for c in CHARTS)
    figure_count = len(re.findall(r"<StatCard\b", src)) + sum(array_len(src, m.end() - 1) for m in re.finditer(r"<StatStrip[^>]*?items=\{\[", src))
    if register == "text" and (has_chart or figure_count):
        out.append("register  brief says Text, but the file renders charts or headline figures; a Text screen explains, it does not chart")
    if register == "visual" and (has_chart or figure_count):
        out.append("register  brief says Visual, but the file renders charts or headline figures; browsing screens are cards, not dashboards")
    if register == "balanced" and figure_count > 1:
        out.append(f"figures   {figure_count} headline figures on a Balanced screen; one at most, the rest are MetricRows")
    if figure_count > 5:
        out.append(f"figures   {figure_count} headline figures in one file; a reader holds three to five, the rest belong in a table or a list")
    for m in re.finditer(r"<StatCard\b([^>]*?)/?>", src, re.S):
        props = m.group(1)
        if "delta=" in props and not re.search(r"caption=|period=|vs\b|last\b|this\b|since\b|prior\b", props, re.I):
            out.append("figures   a StatCard delta with no period in reach (caption=\"vs last month\" or period=); a change without a period is a decoration")
    for m in re.finditer(r"(?:trend|values)=\{\[", src):
        n = array_len(src, m.end() - 1)
        before = src[max(0, m.start() - 200):m.start()]
        if ("<Sparkline" in before[-120:] or "<MiniBars" in before[-120:] or "trend=" in src[m.start():m.start() + 6]) and 0 < n < 6:
            out.append(f"trend     a sparkline with {n} points; under 6 it is a shape, not a trend, so show the number alone")
    for m in re.finditer(r"<LineChart[\s\S]*?series=\{\[", src):
        seg = src[m.end():m.end() + 2000]
        for v in re.finditer(r"values:\s*\[", seg):
            n = array_len(seg, v.end() - 1)
            if 0 < n < 5:
                out.append(f"trend     a LineChart series with {n} points; under 5 a bar or a sentence says it better")
                break
    for m in re.finditer(r"<(DonutChart|ShareBar)[^>]*?(segments|parts)=\{\[", src, re.S):
        n = array_len(src, m.end() - 1)
        if n and n < 3:
            out.append(f"parts     a {m.group(1)} with {n} parts; two parts is a sentence (\"64% billable\")")
        if n > 6:
            out.append(f"parts     a {m.group(1)} with {n} parts; more than six reads as a BarList")
    accents = len(re.findall(r'iconTone="accent"', src))
    if accents > 1:
        out.append(f"accent    {accents} tiles with iconTone=\"accent\"; one tile leads a view, the rest are ink on inset")
    for m in re.finditer(r"<Gauge\b([^>]*?)/?>", src, re.S):
        if "percent=" not in m.group(1):
            out.append("gauge     a Gauge without percent=; a gauge shows a rate toward a target, never a count")
    for m in re.finditer(r"ring=\{\{([^}]*)\}\}", src):
        if "max" not in m.group(1):
            out.append("gauge     a ring without max; a ring is progress toward a known target")
    if PLACEHOLDER.search(src):
        out.append("filler    placeholder copy in JSX; ship real words or a real empty state")
    return out


def main():
    roots = [Path(p) for p in sys.argv[1:]] or [Path("src")]
    files = []
    for r in roots:
        if r.is_file():
            files.append(r)
        else:
            files += [p for p in r.rglob("*.tsx") if "/formic/" not in str(p) and "node_modules" not in str(p)]
            files += [p for p in r.rglob("*.jsx") if "/formic/" not in str(p) and "node_modules" not in str(p)]
    if not files:
        raise SystemExit(f"no .tsx/.jsx files under {', '.join(str(r) for r in roots)}")
    total = 0
    for f in sorted(files):
        issues = check(f)
        if issues:
            total += len(issues)
            print(f"{f}")
            for line in issues:
                print(f"  ✗ {line}")
    if total:
        print(f"\n{total} composition issue(s). The brief is the rubric: keep what serves it, remove the rest. See AGENTS.md → Composition intelligence.")
        sys.exit(1)
    print(f"composition: {len(files)} file(s) clean — every element has a reason on record")


if __name__ == "__main__":
    main()
