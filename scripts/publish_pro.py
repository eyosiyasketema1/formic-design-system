#!/usr/bin/env python3
"""Publish a Pro registry to formicai.dev (or staging).

For the private formic-pro repo, which has this repo's layout (components/,
styles/, package.json, scripts/build_registry.py copied over). Builds the
registry items exactly as build_registry.py does, marks each one `pro`, and
POSTs the lot to /api/pro/publish, which writes them to the store the keyed
registry at /r/pro/<name>.json reads from.

  python3 scripts/publish_pro.py                # build from this repo and publish
  python3 scripts/publish_pro.py --dry-run      # print names and payload size, send nothing
  python3 scripts/publish_pro.py --root ../formic-pro --url https://staging.formicai.dev

Env (or .env.local in the repo root, never committed):
  PRO_PUBLISH_SECRET   the bearer secret the endpoint checks (Vercel has the same value)
  FORMIC_PRO_URL       where to publish; default https://formicai.dev, --url overrides

Vercel stops a request body at 4.5 MB, so items are sent in chunks under that
(prune off), then one final call with the catalogue and the full name list
prunes whatever is no longer published. A registry that fits in one call is
sent in one call. Exit 1 on any refusal, with the endpoint's message.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import re
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
CHUNK = int(3.5 * 1024 * 1024)  # bytes of items per call, under Vercel's 4.5 MB body cap
PRO_INSTALL_DIR = "src/formic/pro"


def load_env(root: Path) -> None:
    env = root / ".env.local"
    if not env.exists():
        return
    for line in env.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def load_builder(root: Path):
    """build_registry.py from the repo being published (it reads ROOT-relative paths), else this one."""
    for cand in (root / "scripts" / "build_registry.py", HERE / "build_registry.py"):
        if cand.exists():
            spec = importlib.util.spec_from_file_location("build_registry", cand)
            mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(mod)  # type: ignore[union-attr]
            mod.ROOT = root
            mod.COMPONENTS = root / "components"
            mod.STYLES = root / "styles"
            return mod
    sys.exit("publish_pro: no scripts/build_registry.py found")


IMPORT_RE = re.compile(r"(from\s+|import\s*\(\s*|import\s+)([\"'])\./([A-Za-z0-9_.-]+?)(\.tsx?|\.js)?\2")


def rewrite_imports(content: str, pro_names: set) -> str:
    """`./X` imports of free modules become `../components/X`; imports of other Pro items stay `./X`."""
    def fix(m):
        stem = m.group(3)
        if stem in pro_names:
            return m.group(0)
        return f"{m.group(1)}{m.group(2)}../components/{stem}{m.group(4) or ''}{m.group(2)}"
    return IMPORT_RE.sub(fix, content)


def build_items(root: Path, base_url: str, install_dir: str = PRO_INSTALL_DIR) -> tuple[dict[str, dict], dict]:
    br = load_builder(root)
    items = br.build(base_url)
    version = items[br.BASE_NAME]["meta"]["formic"]["version"]
    # Pro ships components only: the base and the all-item come from the free registry.
    # Every item points at the free base for tokens and primitives, and installs under src/formic/pro/.
    skip = {br.BASE_NAME, br.ALL_NAME, *br.SHARED}
    pro_names = {n for n in items if n not in skip}
    pro: dict[str, dict] = {}
    for name in sorted(pro_names):
        it = json.loads(json.dumps(items[name]))
        it["pro"] = True
        # a Pro component that imports another Pro component links it in the Pro registry; the base and the shared modules stay free
        it["registryDependencies"] = sorted(
            f"{base_url.rstrip('/')}/pro/{Path(dep).stem}.json" if Path(dep).stem in pro_names else dep
            for dep in it["registryDependencies"]
        )
        for f in it["files"]:
            f["target"] = f["target"].replace(f"~/{br.INSTALL_DIR}/components/", f"~/{install_dir}/")
            # a Pro file lives one folder away from the free components it imports:
            # `./primitives` must become `../components/primitives`; a Pro sibling stays `./X`
            f["content"] = rewrite_imports(f["content"], pro_names)
        it["meta"]["formic"]["pro"] = True
        pro[name] = it
    registry = br.index_of({n: pro[n] for n in pro}, version) if pro else {"items": []}
    registry.update({"$schema": "https://ui.shadcn.com/schema/registry.json", "name": "formic-pro", "homepage": "https://formicai.dev/pro", "version": version})
    registry["items"] = [{**i, "pro": True} for i in registry["items"]]
    return pro, registry


def post(url: str, secret: str, body: dict) -> dict:
    data = json.dumps(body, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        f"{url.rstrip('/')}/api/pro/publish", data=data, method="POST",
        headers={"Authorization": f"Bearer {secret}", "Content-Type": "application/json", "Content-Length": str(len(data)), "User-Agent": "publish_pro.py"},
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        try:
            msg = json.loads(e.read().decode("utf-8"))
            sys.exit(f"publish_pro: {e.code} {msg.get('error', '')}: {msg.get('message', '')}".rstrip(": "))
        except (ValueError, AttributeError):
            sys.exit(f"publish_pro: the endpoint answered {e.code}")
    except urllib.error.URLError as e:
        sys.exit(f"publish_pro: could not reach {url} ({e.reason})")


def chunks(items: dict[str, dict]) -> list[dict[str, dict]]:
    out: list[dict[str, dict]] = [{}]
    size = 0
    for name, it in items.items():
        n = len(json.dumps(it, ensure_ascii=False).encode("utf-8"))
        if size + n > CHUNK and out[-1]:
            out.append({})
            size = 0
        out[-1][name] = it
        size += n
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description="publish a Pro registry to /api/pro/publish")
    ap.add_argument("--root", default=str(HERE.parent), help="the repo to build from (default: this one)")
    ap.add_argument("--url", default=None, help="site to publish to (default FORMIC_PRO_URL or https://formicai.dev)")
    ap.add_argument("--base-url", default="https://formicai.dev/r", help="the free registry the items link their base to")
    ap.add_argument("--install-dir", default=PRO_INSTALL_DIR, help=f"where items install in an app (default {PRO_INSTALL_DIR})")
    ap.add_argument("--dry-run", action="store_true", help="print names and payload size, send nothing")
    args = ap.parse_args()
    root = Path(args.root).resolve()
    load_env(root)
    url = args.url or os.environ.get("FORMIC_PRO_URL") or "https://formicai.dev"

    items, registry = build_items(root, args.base_url, args.install_dir)
    version = registry["version"]
    total = len(json.dumps({"version": version, "registry": registry, "items": items}, ensure_ascii=False).encode("utf-8"))
    parts = chunks(items)
    print(f"publish_pro: {len(items)} Pro item(s) at version {version}, {total // 1024} KB, {len(parts)} call(s) to {url}")
    for name in sorted(items):
        print(f"  {name}  ({len(json.dumps(items[name]).encode()) // 1024} KB)")
    if args.dry_run:
        return 0
    secret = os.environ.get("PRO_PUBLISH_SECRET", "")
    if not secret:
        sys.exit("publish_pro: PRO_PUBLISH_SECRET is not set (env or .env.local)")

    if len(parts) == 1:
        out = post(url, secret, {"version": version, "registry": registry, "items": parts[0]})
    else:
        for i, part in enumerate(parts, 1):
            post(url, secret, {"version": version, "items": part, "prune": False})
            print(f"  sent chunk {i}/{len(parts)} ({len(part)} items)")
        out = post(url, secret, {"version": version, "registry": registry, "items": {}, "names": sorted(items)})
        out["items"] = len(items)
    print(f"publish_pro: published {out.get('items', 0)} item(s), removed {out.get('removed', 0)}; catalogue at {url.rstrip('/')}/r/pro/registry.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
