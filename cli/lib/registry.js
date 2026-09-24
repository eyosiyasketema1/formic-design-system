/* The Formic registry: one catalogue (registry.json) and one item per
   component at <base>/<name>.json, each carrying its files inline. The base
   URL is https://formicai.dev/r, or FORMIC_REGISTRY for a local build during
   tests. registry.lock in the install folder records what was installed and
   the content hash of every file, so `update` can tell an upstream change
   from a local edit. */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { die } from "./util.js";
import { ProRefused, fetchProItem, proNames } from "./pro.js";

export const BASE = (process.env.FORMIC_REGISTRY || "https://formicai.dev/r").replace(/\/+$/, "");
export const BASE_ITEM = "formic";
export const ALL_ITEM = "formic-all";
export const LOCK = "registry.lock";

export const itemUrl = (name) => `${BASE}/${name}.json`;
export const nameOf = (ref) => ref.replace(/^@formic\//, "").replace(/^.*\//, "").replace(/\.json$/, "");
export const sha = (s) => "sha256:" + createHash("sha256").update(s).digest("hex");
export const targetPath = (t) => t.replace(/^~\//, "");
/* files apply_config.py rewrites after every install (accent, font, component
   defaults): they never match the registry byte for byte, so they are compared
   by the hash the lock recorded, and refreshed whenever upstream changed */
export const configDerived = (t) => /\/styles\/[^/]+\.css$/.test(t) || t.endsWith("/components/config.ts");

const cache = new Map();
export async function fetchJson(url) {
  if (cache.has(url)) return cache.get(url);
  let res;
  try { res = await fetch(url, { headers: { "user-agent": "formicai" } }); }
  catch (e) { die(`could not reach the registry at ${url} (${e.cause?.code ?? e.message}); check your connection, or FORMIC_REGISTRY if you set it`); }
  if (res.status === 404) return null;
  if (!res.ok) die(`the registry answered ${res.status} for ${url}`);
  const body = await res.json();
  cache.set(url, body);
  return body;
}

export async function catalogue() {
  const idx = await fetchJson(`${BASE}/registry.json`);
  if (!idx) die(`no catalogue at ${BASE}/registry.json`);
  return idx;
}

export async function fetchItem(name) {
  return fetchJson(itemUrl(name));
}

/* the free index and, after it, the Pro one: a name is looked up in the free
   catalogue first and in the Pro catalogue only when the free one has no
   such item. Pro items are fetched with the key from .env.local; a refusal
   is a ProRefused with the site's message. */
export async function isPro(name) {
  const it = await fetchItem(name);
  if (it) return false;
  return (await proNames()).includes(name);
}

/* an item and everything it depends on, flattened: files (first writer wins,
   which is the item that was asked for) and npm dependencies. Pro items
   carry `pro: true`. `onRefused(name, err)` decides what a refused Pro item
   does: return true to leave it out (update does), otherwise it throws. */
export async function resolve(names, { onRefused } = {}) {
  const items = new Map();
  const order = [];
  const skipped = [];
  const visit = async (name) => {
    if (items.has(name) || skipped.some((s) => s.name === name)) return;
    let it = await fetchItem(name);
    if (!it) {
      if (!(await proNames()).includes(name)) die(`no item named "${name}" in the registry`);
      try { it = await fetchProItem(name); }
      catch (e) {
        if (e instanceof ProRefused && onRefused && onRefused(name, e)) { skipped.push({ name, error: e }); return; }
        throw e;
      }
    }
    items.set(name, it);
    for (const dep of it.registryDependencies ?? []) await visit(nameOf(dep));
    order.push(name);
  };
  for (const n of names) await visit(n);
  const files = new Map();
  const dependencies = new Set();
  for (const name of [...names, ...order]) {
    const it = items.get(name);
    if (!it) continue;
    for (const f of it.files ?? []) {
      const target = targetPath(f.target);
      if (!files.has(target)) files.set(target, { target, content: f.content, item: name, pro: Boolean(it.pro) });
    }
    for (const d of it.dependencies ?? []) dependencies.add(d);
  }
  return { items, files: [...files.values()], dependencies: [...dependencies].sort(), skipped };
}

/* "name@range" → name */
export const depName = (d) => d.replace(/(?!^)@.*$/, "");

/* the closest catalogue names to a misspelt one */
export function nearest(name, names, n = 3) {
  const dist = (a, b) => {
    const m = [...Array(a.length + 1)].map((_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 1; j <= b.length; j++) m[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
      m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return m[a.length][b.length];
  };
  const bare = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  return names
    .map((c) => ({ c, d: c.includes(name) || bare && c.replace(/-/g, "").includes(bare) ? 0 : dist(name, c) }))
    .sort((x, y) => x.d - y.d || x.c.localeCompare(y.c))
    .slice(0, n)
    .filter((x) => x.d <= Math.max(3, name.length / 2))
    .map((x) => x.c);
}

export function readLock(cwd, dir) {
  const p = path.join(cwd, dir, LOCK);
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; }
}

/* a lock from what was just resolved; files whose content on disk differs
   from the registry were kept by the person, so their hash is left out */
export function lockFrom(previous, resolved, version, cwd) {
  const lock = { version, registry: BASE, items: { ...(previous?.items ?? {}) }, files: { ...(previous?.files ?? {}) } };
  for (const [name, it] of resolved.items) if (name !== ALL_ITEM) lock.items[name] = it.pro ? { version: it.meta?.formic?.version ?? version, pro: true } : it.meta?.formic?.version ?? version;
  for (const f of resolved.files) {
    const abs = path.join(cwd, f.target);
    if (fs.existsSync(abs) && (configDerived(f.target) || fs.readFileSync(abs, "utf8") === f.content)) lock.files[f.target] = sha(f.content);
  }
  lock.items = Object.fromEntries(Object.entries(lock.items).sort());
  lock.files = Object.fromEntries(Object.entries(lock.files).sort());
  return lock;
}

export const lockText = (lock) => JSON.stringify(lock, null, 2) + "\n";
