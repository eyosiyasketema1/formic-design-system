#!/usr/bin/env python3
"""Build the shadcn registry from the source tree.

Every component becomes a registry item the shadcn CLI can install
(`npx shadcn@latest add https://formicai.dev/r/button.json`), and one base
item, `formic`, carries everything a component needs to render: the style
sheets, the scripts, the config, AGENTS.md, VERSION and the shared modules
(primitives, hooks, config, brand, theme, doodle). Nothing is declared by
hand: each item's Formic dependencies come from its relative imports and
its npm dependencies from its package imports, with versions read from
package.json's peerDependencies.

  python3 scripts/build_registry.py            # rebuild registry/
  python3 scripts/build_registry.py --check    # exit 1 when registry/ is stale
  python3 scripts/build_registry.py --base-url http://localhost:8000 --out /tmp/r
                                               # a throwaway build for local CLI tests

qa_check.py runs --check, so a stale registry never reaches main. The output
is deterministic (sorted keys, sorted items, LF line endings) so the check
compares bytes. registry/README.md explains the layout and the item type
decision; read it before changing the shape of an item.

The same run mirrors skill/SKILL.md (the source) to
skills/formic-design-system/SKILL.md, the layout `npx skills add
eyosiyasketema1/formic-design-system` installs from; --check fails when the
two differ, so there is one source of truth.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
COMPONENTS = ROOT / "components"
STYLES = ROOT / "styles"
OUT = ROOT / "registry"

SKILL_SRC = ROOT / "skill" / "SKILL.md"
SKILL_MIRROR = ROOT / "skills" / "formic-design-system" / "SKILL.md"  # the `skills` CLI's layout: skills/<name>/SKILL.md

BASE_URL = "https://formicai.dev/r"
HOMEPAGE = "https://formicai.dev"
BASE_NAME = "formic"
ALL_NAME = "formic-all"
INSTALL_DIR = "src/formic"  # where install.sh vendors Formic; the registry writes the same layout

# The shared layer: modules the base item carries so that every component's
# relative imports resolve after `add formic`. Each is also its own item so a
# single component can pull in only the module it imports.
SHARED = ("primitives", "hooks", "config", "brand", "theme", "doodle")
SCRIPTS = ("set_accent.py", "apply_config.py", "palette.py", "compose_check.py", "formic_check.py")
SKIP_PACKAGES = {"react", "react-dom"}

# Packages a module loads on demand (a dynamic import()) are still
# dependencies: the CLI must install them or the feature fails at runtime.
IMPORT_RE = re.compile(r"""(?:^|\n)\s*(?:import|export)\s[^;]*?from\s*["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)""")


def kebab(stem: str) -> str:
    s = re.sub(r"([A-Z]+)([A-Z][a-z])", r"\1-\2", stem)
    s = re.sub(r"([a-z0-9])([A-Z])", r"\1-\2", s)
    return s.replace("_", "-").lower()


def title_of(stem: str) -> str:
    if stem[0].isupper():
        return re.sub(r"([a-z0-9])([A-Z])", r"\1 \2", re.sub(r"([A-Z]+)([A-Z][a-z])", r"\1 \2", stem))
    return stem.replace("-", " ").capitalize()


def description_of(source: str, title: str) -> str:
    """The first sentence of the file's header block (`/* ─── * NAME — tagline …`)."""
    m = re.search(r"/\*\s*─+\s*\n(.*?)\*/", source, re.S)
    if not m:
        return f"{title} from the Formic AI Design System."
    lines = [re.sub(r"^\s*\*\s?", "", ln).rstrip() for ln in m.group(1).splitlines()]
    lines = [ln for ln in lines if not re.fullmatch(r"─*\s*", ln)]
    if not lines:
        return f"{title} from the Formic AI Design System."
    head, rest = lines[0], lines[1:]
    tagline = head.split(" — ", 1)[1].strip() if " — " in head else ""
    if tagline:
        text = tagline  # the header's own one-liner is the sentence
    else:
        text = ""
        for ln in rest:
            if not ln.strip():
                if text:
                    break
                continue
            text += (" " if text else "") + ln.strip()
            if re.search(r"[.!?]$", ln.strip()):
                break
    text = re.split(r"(?<=[.!?])\s", text.strip(), 1)[0].strip()
    if not text:
        return f"{title} from the Formic AI Design System."
    text = text[0].upper() + text[1:]
    return text if re.search(r"[.!?]$", text) else text + "."


def imports_of(source: str) -> tuple[set[str], set[str]]:
    """(relative module stems, npm package names) a file imports."""
    relative, packages = set(), set()
    for a, b in IMPORT_RE.findall(source):
        spec = a or b
        if spec.startswith("."):
            relative.add(Path(spec).stem)
        elif not spec.startswith(("node:", "/")):
            parts = spec.split("/")
            packages.add("/".join(parts[:2]) if spec.startswith("@") else parts[0])
    return relative, packages


def peer_versions() -> dict[str, str]:
    pkg = json.loads((ROOT / "package.json").read_text())
    return dict(pkg.get("peerDependencies", {}))


def with_version(name: str, peers: dict[str, str]) -> str:
    v = peers.get(name)
    if v is None:
        raise SystemExit(f"build_registry: {name} is imported but not in package.json peerDependencies; add it there first")
    return f"{name}@{v}" if v and not v.startswith(">=") else name


def file_entry(path: Path, target: str) -> dict:
    return {"path": str(path.relative_to(ROOT)), "type": "registry:file", "target": target, "content": path.read_text()}


def build(base_url: str) -> dict[str, dict]:
    peers = peer_versions()
    version = json.loads((ROOT / "package.json").read_text())["version"]
    sources = sorted(p for p in COMPONENTS.iterdir() if p.suffix in (".tsx", ".ts") and not p.name.endswith(".d.ts"))
    by_stem = {p.stem: p for p in sources}
    names = {}
    for p in sources:
        n = kebab(p.stem)
        if n in names:
            raise SystemExit(f"build_registry: {p.name} and {names[n].name} both map to the item name {n}")
        names[n] = p
    if BASE_NAME in names or ALL_NAME in names:
        raise SystemExit(f"build_registry: a component is named like the base item ({BASE_NAME} / {ALL_NAME})")

    ref = lambda name: f"{base_url.rstrip('/')}/{name}.json"
    items: dict[str, dict] = {}

    for name, p in sorted(names.items()):
        src = p.read_text()
        rel, pkgs = imports_of(src)
        missing = sorted(s for s in rel if s not in by_stem)
        if missing:
            raise SystemExit(f"build_registry: {p.name} imports {', '.join(missing)} but no such file exists in components/")
        title = title_of(p.stem)
        reg_deps = sorted({ref(BASE_NAME)} | {ref(kebab(s)) for s in rel})
        items[name] = {
            "$schema": "https://ui.shadcn.com/schema/registry-item.json",
            "name": name,
            "type": "registry:item",
            "title": title,
            "description": description_of(src, title),
            "dependencies": sorted(with_version(k, peers) for k in pkgs if k not in SKIP_PACKAGES),
            "registryDependencies": reg_deps,
            "files": [file_entry(p, f"~/{INSTALL_DIR}/components/{p.name}")],
            "meta": {"formic": {"file": f"components/{p.name}", "version": version}},
        }

    # The base: everything a component needs around it.
    base_files = [file_entry(p, f"~/{INSTALL_DIR}/styles/{p.name}") for p in sorted(STYLES.glob("*.css"))]
    base_files += [file_entry(ROOT / "scripts" / s, f"~/{INSTALL_DIR}/scripts/{s}") for s in SCRIPTS]
    base_files.append(file_entry(ROOT / "formic.config.json", f"~/{INSTALL_DIR}/formic.config.json"))
    base_files.append(file_entry(ROOT / "AGENTS.md", "~/AGENTS.md"))
    # the Claude Code skill install.sh writes; one source, so `formicai init` and the registry agree
    base_files.append(file_entry(ROOT / "skill" / "SKILL.md", "~/.claude/skills/formic-design-system/SKILL.md"))
    base_files.append({
        "path": "VERSION", "type": "registry:file", "target": f"~/{INSTALL_DIR}/VERSION",
        "content": f"formic-design-system {version} (registry)\nhttps://github.com/eyosiyasketema1/formic-design-system\nnpx formicai update to refresh\n",
    })
    base_pkgs: set[str] = set()
    for stem in SHARED:
        p = by_stem[stem]
        base_files.append(file_entry(p, f"~/{INSTALL_DIR}/components/{p.name}"))
        base_pkgs |= imports_of(p.read_text())[1]
    items[BASE_NAME] = {
        "$schema": "https://ui.shadcn.com/schema/registry-item.json",
        "name": BASE_NAME,
        "type": "registry:item",
        "title": "Formic",
        "description": "The Formic AI Design System base: tokens, palettes, the Tailwind v4 bridge, fonts, component sheets, the shared modules every component imports, the config scripts, the gates and AGENTS.md.",
        "dependencies": sorted(with_version(k, peers) for k in base_pkgs if k not in SKIP_PACKAGES),
        "registryDependencies": [],
        "files": base_files,
        "docs": (
            f"Formic {version} is in {INSTALL_DIR}/. Wire the stylesheet stack in your CSS entry, in this order:\n"
            f'  @import "./formic/styles/fonts.css";\n  @import "tailwindcss";\n  @import "./formic/styles/formic.css";\n'
            f"Then run python3 {INSTALL_DIR}/scripts/apply_config.py once (it applies {INSTALL_DIR}/formic.config.json: accent, html attributes, component defaults). "
            f"Add components with npx formicai add <name> (or add {ref('<name>')} with the registry client) — the list is at {base_url.rstrip('/')}/registry.json; "
            f"{ref(ALL_NAME)} installs all of them. Read AGENTS.md before building UI."
        ),
        "meta": {"formic": {"version": version, "install": INSTALL_DIR}},
    }

    # Everything: what install.sh copies, as one item that depends on all the others.
    items[ALL_NAME] = {
        "$schema": "https://ui.shadcn.com/schema/registry-item.json",
        "name": ALL_NAME,
        "type": "registry:item",
        "title": "Formic, every component",
        "description": "Every Formic component plus the base, in one add: the same set install.sh vendors into src/formic.",
        "dependencies": [],
        "registryDependencies": [ref(BASE_NAME)] + [ref(n) for n in sorted(names)],
        "files": [],
        "meta": {"formic": {"version": version}},
    }
    return items


def index_of(items: dict[str, dict], version: str) -> dict:
    keep = ("name", "type", "title", "description", "dependencies", "registryDependencies")
    return {
        "$schema": "https://ui.shadcn.com/schema/registry.json",
        "name": "formic",
        "homepage": HOMEPAGE,
        "version": version,  # not in the shadcn schema (the CLI ignores it); `formicai doctor` compares it with src/formic/VERSION
        "items": [{k: it[k] for k in keep} | {"files": [{k: f[k] for k in ("path", "type", "target")} for f in it["files"]]}
                  for _, it in sorted(items.items())],
    }


def render(items: dict[str, dict]) -> dict[str, str]:
    out = {f"{n}.json": json.dumps(it, indent=2, ensure_ascii=False, sort_keys=True) + "\n" for n, it in items.items()}
    out["registry.json"] = json.dumps(index_of(items, items[BASE_NAME]["meta"]["formic"]["version"]), indent=2, ensure_ascii=False, sort_keys=True) + "\n"
    return out


def main() -> int:
    argv = sys.argv[1:]
    known = {"--check", "--base-url", "--out"}
    unknown = [a for a in argv if a.startswith("-") and a not in known]
    if unknown or "--help" in argv or "-h" in argv:
        print("usage: build_registry.py [--check] [--base-url URL] [--out DIR]\n  --check     exit 1 when registry/ differs from a fresh build (the gate runs this)\n  --base-url  the URL the items reference each other by (default https://formicai.dev/r)\n  --out       write somewhere else, for a local CLI test")
        return 0 if not unknown else 2
    check = "--check" in argv
    base_url = argv[argv.index("--base-url") + 1] if "--base-url" in argv else BASE_URL
    out_dir = Path(argv[argv.index("--out") + 1]).resolve() if "--out" in argv else OUT
    files = render(build(base_url))
    if check:
        stale = [n for n, body in files.items() if not (out_dir / n).exists() or (out_dir / n).read_text() != body]
        extra = sorted(p.name for p in out_dir.glob("*.json") if p.name not in files) if out_dir.exists() else []
        if out_dir == OUT and (not SKILL_MIRROR.exists() or SKILL_MIRROR.read_text() != SKILL_SRC.read_text()):
            stale.append(str(SKILL_MIRROR.relative_to(ROOT)) + " (differs from skill/SKILL.md)")
        if stale or extra:
            what = ", ".join(stale[:6]) + (" …" if len(stale) > 6 else "")
            if extra:
                what += (", " if what else "") + "stray " + ", ".join(extra)
            print(f"build_registry: registry/ is out of date ({what}); run python3 scripts/build_registry.py")
            return 1
        print(f"build_registry: registry/ is current ({len(files) - 1} items)")
        return 0
    out_dir.mkdir(parents=True, exist_ok=True)
    for n, body in files.items():
        (out_dir / n).write_text(body)
    if out_dir == OUT:
        SKILL_MIRROR.parent.mkdir(parents=True, exist_ok=True)
        SKILL_MIRROR.write_text(SKILL_SRC.read_text())
    size = sum((out_dir / n).stat().st_size for n in files)
    print(f"build_registry: wrote {len(files) - 1} items to {out_dir.relative_to(ROOT) if out_dir.is_relative_to(ROOT) else out_dir} ({size // 1024} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
