#!/usr/bin/env python3
"""Build the landing page's compiled assets.

The landing page (index.html + landing.jsx) used to ship Babel (2.9 MB) and
the Tailwind browser build (275 KB) and compile itself in the visitor's
browser, staying blank until both had run. Now the two compile steps run
here, once, and the page loads plain CSS and JS:

  landing.tailwind.css  (source: the page's tokens, @theme and CSS)  → landing.css
  landing.jsx           (source: the React demos)                     → landing.js

Run it after editing landing.jsx or landing.tailwind.css:

  python3 scripts/build_landing.py          # rebuild both
  python3 scripts/build_landing.py --check  # exit 1 when the outputs are stale

qa_check.py runs --check, so a stale build never reaches main; CI runs the
same. Needs Node: the first run does `npm install` of the pinned devDependencies in
package.json (tailwindcss, @tailwindcss/cli, esbuild) into .build/<platform>/,
so every machine builds the same bytes and no machine's binaries reach another.
"""
from __future__ import annotations

import hashlib
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCES = {"css": ROOT / "landing.tailwind.css", "jsx": ROOT / "landing.jsx"}
OUTPUTS = {"css": ROOT / "landing.css", "jsx": ROOT / "landing.js"}


import platform

# The tools live in a per-platform folder, not in ROOT/node_modules: this repo
# folder is shared between a Mac and a Linux sandbox, and a node_modules
# installed by one holds binaries the other cannot run (which also poisons
# every `npx esbuild` in the gate, since npx prefers a local install).
TOOLS = ROOT / ".build" / f"{platform.system().lower()}-{platform.machine().lower()}"


def node_bin(name: str) -> Path | None:
    """the tool from this platform's own install, made on first use from the
    pinned devDependencies in package.json so every machine builds the same bytes"""
    binary = TOOLS / "node_modules" / ".bin" / name
    if binary.exists():
        return binary
    if shutil.which("npm") is None:
        return None
    TOOLS.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(ROOT / "package.json", TOOLS / "package.json")
    if (ROOT / "package-lock.json").exists():
        shutil.copyfile(ROOT / "package-lock.json", TOOLS / "package-lock.json")
    subprocess.run(["npm", "install", "--no-audit", "--no-fund", "--loglevel=error"], check=True, cwd=TOOLS, capture_output=True, text=True)
    return binary if binary.exists() else None


def build_into(out_css: Path, out_js: Path) -> None:
    env = {**os.environ, "NO_COLOR": "1"}
    # Tailwind resolves `@import "tailwindcss"` from the CSS file's folder
    # upward, so the source is compiled from a copy inside the tools folder
    # with its @source paths made absolute.
    css = SOURCES["css"].read_text(encoding="utf-8")
    css = css.replace('@source "./index.html";', f'@source "{ROOT / "index.html"}";').replace('@source "./landing.jsx";', f'@source "{ROOT / "landing.jsx"}";')
    tmp_css = TOOLS / "landing.tailwind.css"
    tmp_css.write_text(css, encoding="utf-8")
    subprocess.run(
        [str(node_bin("tailwindcss")), "-i", str(tmp_css), "-o", str(out_css), "--minify"],
        check=True, cwd=TOOLS, env=env, capture_output=True, text=True,
    )
    subprocess.run(
        [str(node_bin("esbuild")), str(SOURCES["jsx"]), "--loader:.jsx=jsx", "--jsx=transform", "--minify",
         "--target=es2019", "--log-level=warning", f"--outfile={out_js}"],
        check=True, cwd=ROOT, env=env, capture_output=True, text=True,
    )


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest() if path.exists() else ""


def main() -> int:
    check = "--check" in sys.argv
    for name, src in SOURCES.items():
        if not src.exists():
            print(f"build_landing: missing source {src.name}")
            return 1
    try:
        ready = node_bin("tailwindcss") is not None and node_bin("esbuild") is not None
    except subprocess.CalledProcessError as exc:
        print("build_landing: npm install failed\n" + (exc.stderr or ""))
        return 1
    if not ready:
        print("build_landing: Node (npm) not found; install it to build the landing page"
              + (" (skipping the freshness check)" if check else ""))
        return 0 if check else 1
    with tempfile.TemporaryDirectory() as tmp:
        tmp_css, tmp_js = Path(tmp) / "landing.css", Path(tmp) / "landing.js"
        try:
            build_into(tmp_css, tmp_js)
        except subprocess.CalledProcessError as exc:
            print("build_landing: build failed\n" + (exc.stderr or exc.stdout or ""))
            return 1
        stale = [OUTPUTS[k].name for k, t in (("css", tmp_css), ("jsx", tmp_js)) if digest(t) != digest(OUTPUTS[k])]
        if check:
            if stale:
                print(f"build_landing: {', '.join(stale)} out of date; run python3 scripts/build_landing.py")
                return 1
            print("build_landing: landing.css and landing.js are current")
            return 0
        shutil.copyfile(tmp_css, OUTPUTS["css"])
        shutil.copyfile(tmp_js, OUTPUTS["jsx"])
    print(f"build_landing: wrote landing.css ({OUTPUTS['css'].stat().st_size // 1024} KB) and landing.js ({OUTPUTS['jsx'].stat().st_size // 1024} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
