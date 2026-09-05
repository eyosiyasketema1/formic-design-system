#!/usr/bin/env python3
"""
Apply formic.config.json — the one file that says how this app looks.

    python3 scripts/apply_config.py                 # inside the Formic repo
    python3 src/formic/scripts/apply_config.py      # inside an app that vendors Formic
    python3 src/formic/scripts/apply_config.py path/to/other.json

The json comes from https://formicai.dev/customize (the Copy button) or is
edited by hand. Every key is optional; a missing key keeps the system default.

    {
      "accent":  "#29E0C2",        any colour — both modes are derived from it
      "palette": "paper",          paper | sage | twilight | clay | ocean
      "radius":  "default",        sharp | default | rounded | full
      "size":    "default",        default | comfortable | spacious
      "theme":   "light",          light | dark   (the app's starting theme)
      "avatar":  "initials",       initials | doodle   (people without a photo)
      "sidebar": "expanded",       expanded | rail     (AppSidebar's first variant)
      "motion":  true              charts animate in
    }

What it writes, deterministically:

  accent   -> scripts/set_accent.py: --accent in the light and dark blocks of
              styles/tokens.css, each fitted to AA for its own surfaces
  palette, radius, size, theme
           -> data-* attributes on the <html> tag of the app's index.html
              (the nearest index.html with a #root above the formic folder).
              Inside the design-system repo there is no app, so this step is
              reported and skipped.
  avatar, sidebar, motion
           -> components/config.ts, which Avatar, AppSidebar and the charts
              read as their prop defaults

The agent's job is: save the json, run this, done. Never write --accent or
the data-* attributes by hand, and never override a config value inline in a
component call — the config is the source of truth for the whole app.
"""
import json
import re
import sys
from pathlib import Path

sys.dont_write_bytecode = True  # no __pycache__ inside an app's vendored folder

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(HERE))
import set_accent  # noqa: E402  (same folder)

DEFAULTS = {
    "accent": None,
    "palette": "paper",
    "radius": "default",
    "size": "default",
    "theme": "light",
    "avatar": "initials",
    "sidebar": "expanded",
    "motion": True,
}
CHOICES = {
    "palette": ("paper", "sage", "twilight", "clay", "ocean"),
    "radius": ("sharp", "default", "rounded", "full"),
    "size": ("default", "comfortable", "spacious"),
    "theme": ("light", "dark"),
    "avatar": ("initials", "doodle"),
    "sidebar": ("expanded", "rail"),
}


def load(path):
    try:
        raw = json.loads(path.read_text())
    except json.JSONDecodeError as e:
        raise SystemExit(f"{path}: not valid JSON ({e})")
    if not isinstance(raw, dict):
        raise SystemExit(f"{path}: expected an object at the top level")
    cfg = dict(DEFAULTS)
    for k, v in raw.items():
        if k not in DEFAULTS:
            print(f"  note: unknown key {k!r} ignored")
            continue
        cfg[k] = v
    for k, opts in CHOICES.items():
        if cfg[k] not in opts:
            raise SystemExit(f"{path}: {k} must be one of {', '.join(opts)} (got {cfg[k]!r})")
    if not isinstance(cfg["motion"], bool):
        raise SystemExit(f"{path}: motion must be true or false")
    if cfg["accent"] is not None:
        set_accent.hex_to_rgb(cfg["accent"])  # validates
    return cfg


def write_config_ts(cfg):
    path = ROOT / "components" / "config.ts"
    if not path.exists():
        raise SystemExit(f"{path} not found; this Formic copy predates apply_config — re-run the installer")
    src = path.read_text()
    body = (
        "export const FORMIC_CONFIG: FormicConfig = {\n"
        f"  avatar: \"{cfg['avatar']}\",\n"
        f"  sidebar: \"{cfg['sidebar']}\",\n"
        f"  motion: {'true' if cfg['motion'] else 'false'},\n"
        "};\n"
    )
    new, n = re.subn(r"export const FORMIC_CONFIG: FormicConfig = \{.*?\};\n", body, src, count=1, flags=re.S)
    if n != 1:
        raise SystemExit(f"{path}: could not find the FORMIC_CONFIG block")
    if new != src:
        path.write_text(new)
    return path


def write_preview_mirrors(cfg):
    """inside the design-system repo only: preview.html mirrors config.ts
    (FORMIC_CONFIG) and the customizer's stock choices (CZ_DEFAULTS)"""
    path = ROOT / "preview.html"
    if not path.exists():
        return None
    src = path.read_text()
    fc = f'const FORMIC_CONFIG = {{ avatar: "{cfg["avatar"]}", sidebar: "{cfg["sidebar"]}", motion: {"true" if cfg["motion"] else "false"} }};'
    cz = (f'const CZ_DEFAULTS = {{ accent: "{(cfg["accent"] or DEFAULTS_ACCENT).lower()}", palette: "{cfg["palette"]}", radius: "{cfg["radius"]}", '
          f'size: "{cfg["size"]}", theme: "{cfg["theme"]}", avatar: "{cfg["avatar"]}", sidebar: "{cfg["sidebar"]}", motion: {"true" if cfg["motion"] else "false"} }};')
    new, n1 = re.subn(r"const FORMIC_CONFIG = \{[^}]*\};", fc, src, count=1)
    new, n2 = re.subn(r"const CZ_DEFAULTS = \{[^}]*\};", cz, new, count=1)
    if new != src:
        path.write_text(new)
    return n1 + n2


DEFAULTS_ACCENT = "#a5e12a"


def app_index():
    """the Vite entry of the app that vendors this copy: the nearest
    index.html with a #root above this folder (src/formic, app/formic,
    lib/ui/formic all work). None inside the design-system repo."""
    if set_accent.in_repo(ROOT):
        return None
    for parent in ROOT.parents[:4]:
        cand = parent / "index.html"
        if cand.exists() and 'id="root"' in cand.read_text():
            return cand
    return None


def write_html_attrs(path, cfg):
    src = path.read_text()
    m = re.search(r"<html\b([^>]*)>", src)
    if not m:
        raise SystemExit(f"{path}: no <html> tag")
    attrs = m.group(1)
    attrs = re.sub(r'\s+data-(theme|palette|radius|size)="[^"]*"', "", attrs)
    add = []
    if cfg["theme"] == "dark":
        add.append('data-theme="dark"')
    if cfg["palette"] != "paper":
        add.append(f'data-palette="{cfg["palette"]}"')
    if cfg["radius"] != "default":
        add.append(f'data-radius="{cfg["radius"]}"')
    if cfg["size"] != "default":
        add.append(f'data-size="{cfg["size"]}"')
    tag = "<html" + attrs.rstrip() + ("" if not add else " " + " ".join(add)) + ">"
    new = src[: m.start()] + tag + src[m.end():]
    if new != src:
        path.write_text(new)
    return add


def main():
    cfg_path = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else ROOT / "formic.config.json"
    if not cfg_path.exists():
        raise SystemExit(f"{cfg_path} not found. Paste the block from https://formicai.dev/customize there, or write one — see --help in this file's docstring.")
    cfg = load(cfg_path)
    print(f"applying {cfg_path.relative_to(Path.cwd()) if cfg_path.is_relative_to(Path.cwd()) else cfg_path}")

    # accent, both modes
    if cfg["accent"]:
        v = set_accent.derive(cfg["accent"])
        touched = []
        for p in (ROOT / "styles" / "tokens.css", ROOT / "preview.html", ROOT / "index.html"):
            if p.exists() and set_accent.rewrite(p, v["light"], v["dark"]):
                touched.append(p.name)
        # in an app the brand accent also replaces every palette's own accent
        # (as setAccent() does at runtime); the repo keeps them for the gallery
        if not set_accent.in_repo(ROOT) and set_accent.rewrite(ROOT / "styles" / "themes.css", v["light"], v["dark"], palettes=True):
            touched.append("themes.css (all palettes)")
        lr, dr = set_accent.hex_to_rgb(v["light"]), set_accent.hex_to_rgb(v["dark"])
        tint = set_accent.mix(lr, set_accent.hex_to_rgb(set_accent.TINT_SURFACE_ANCHOR), 0.1)
        print(f"  accent   {cfg['accent']} -> light {v['light']} ({set_accent.contrast(lr, set_accent.hex_to_rgb(set_accent.LIGHT_ANCHOR)):.2f}:1 on white, "
              f"{set_accent.contrast(lr, tint):.2f}:1 on tint), dark {v['dark']} ({set_accent.contrast(dr, set_accent.hex_to_rgb(set_accent.DARK_ANCHOR)):.2f}:1)"
              f"  -> {', '.join(touched) or 'no --accent lines found'}")
    else:
        print("  accent   unchanged (no accent in config)")

    # html attributes
    idx = app_index()
    attrs = [f"{k}={cfg[k]}" for k in ("theme", "palette", "radius", "size")]
    if idx:
        added = write_html_attrs(idx, cfg)
        print(f"  html     {', '.join(attrs)} -> <html {' '.join(added) if added else '(defaults, no attributes)'}> in {idx.name}")
    else:
        where = "the design-system repo keeps none" if set_accent.in_repo(ROOT) else "no index.html with id=\"root\" found above this folder; set data-* on <html> in the app yourself"
        print(f"  html     {', '.join(attrs)} — {where}")

    # component defaults
    p = write_config_ts(cfg)
    print(f"  defaults avatar={cfg['avatar']} sidebar={cfg['sidebar']} motion={str(cfg['motion']).lower()} -> {p.relative_to(ROOT)}")
    if write_preview_mirrors(cfg):
        print("  mirrors  preview.html FORMIC_CONFIG and CZ_DEFAULTS")

    if (ROOT / "scripts" / "qa_check.py").exists():
        print("  run python3 scripts/qa_check.py to confirm the gate is green")
    print("done — restart the dev server if it is running")


if __name__ == "__main__":
    main()
