/* Presets: a design configuration as one short code.

   The code is the base64url of the JSON of the keys that differ from the
   stock formic.config.json (compact, keys sorted), nothing more: no server,
   no lookup, the same string the customizer shows under its copy block.
   `formicai init --preset <code>` writes those keys into
   src/formic/formic.config.json and applies them; `formicai preset` prints
   the current project's code so a design travels in one line. */
import fs from "node:fs";
import path from "node:path";
import { note, die, tryJson, stringify, detectProject } from "./util.js";
import { BASE_ITEM, fetchItem } from "./registry.js";

export const help = `formicai preset

  Prints this project's preset code: the keys of src/formic/formic.config.json
  that differ from the stock config, as one string. Hand it to
  npx formicai init --preset <code> in another project (or to an agent) and
  the same accent, palette, radius, font, rail and the rest apply there.

  The code is only the base64url of the changed keys' JSON, so it can be
  read with any base64 decoder and made by hand:
    echo -n '{"accent":"#2563EB","radius":"rounded"}' | base64 | tr '+/' '-_' | tr -d '='

  Examples
    npx formicai preset
    npx formicai init --preset eyJhY2NlbnQiOiIjMjU2M0VCIn0
`;

export const CONFIG_KEYS = ["accent", "palette", "paletteColor", "radius", "cardRadius", "corners", "controls", "size", "type", "theme", "avatar", "sidebar", "sidebarState", "font", "layout", "motion"];

export function encode(obj) {
  const sorted = Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)));
  return Buffer.from(JSON.stringify(sorted), "utf8").toString("base64url");
}

export function decode(code) {
  const s = String(code).trim().replace(/^["']|["']$/g, "");
  let obj;
  try { obj = JSON.parse(Buffer.from(s, "base64url").toString("utf8")); } catch { obj = null; }
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) die(`"${s.slice(0, 24)}${s.length > 24 ? "…" : ""}" is not a preset code (the base64url of a JSON object of config keys; formicai preset --help)`);
  const unknown = Object.keys(obj).filter((k) => !CONFIG_KEYS.includes(k));
  if (unknown.length) die(`the preset has keys formic.config.json does not know: ${unknown.join(", ")} (known: ${CONFIG_KEYS.join(", ")})`);
  return obj;
}

/* the stock config: from the registry's base item, or the file the CLI
   already wrote if the registry is not reachable */
export async function stockConfig(cwd, dir) {
  try {
    const base = await fetchItem(BASE_ITEM);
    const f = base?.files?.find((x) => x.target.endsWith("formic.config.json"));
    if (f) return JSON.parse(f.content);
  } catch {}
  return null;
}

/* the keys of `cfg` that differ from `stock` (all of them when stock is unknown) */
export function changedKeys(cfg, stock) {
  const out = {};
  for (const k of CONFIG_KEYS) {
    if (!(k in cfg)) continue;
    if (k === "paletteColor" && cfg.palette !== "custom") continue;
    const norm = (v) => (typeof v === "string" && (k === "accent" || k === "paletteColor") ? v.toLowerCase() : v);
    if (stock && JSON.stringify(norm(cfg[k])) === JSON.stringify(norm(stock[k]))) continue;
    out[k] = cfg[k];
  }
  return out;
}

/* writes the preset's keys over the project's config; returns the keys written */
export function applyPreset(plan, dir, preset) {
  const file = `${dir}/formic.config.json`;
  const cur = plan.read(file);
  const cfg = cur === null ? {} : tryJson(plan.abs(file)) ?? {};
  const next = { ...cfg, ...preset };
  if (next.palette !== "custom") delete next.paletteColor;
  plan.write(file, stringify(next), `${file}: ${Object.keys(preset).join(", ")} from the preset`);
  return Object.keys(preset);
}

export async function run() {
  const cwd = process.cwd();
  const p = detectProject(cwd);
  if (!p.pkg) die("no package.json here; run formicai preset in the root of your app");
  const file = path.join(cwd, p.dir, "formic.config.json");
  if (!fs.existsSync(file)) die(`no ${p.dir}/formic.config.json; run formicai init first`);
  const cfg = tryJson(file);
  if (!cfg) die(`${p.dir}/formic.config.json is not valid JSON`);
  const stock = await stockConfig(cwd, p.dir);
  const changed = changedKeys(cfg, stock);
  if (Object.keys(changed).length === 0) { note(`  – this project is on the stock configuration; there is nothing to encode (change something at https://formicai.dev/customize first)`); return 0; }
  const code = encode(changed);
  note(`\n  npx formicai init --preset ${code}\n`);
  note(`  carries: ${Object.entries(changed).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(", ")}${stock ? "" : " (the registry was not reachable, so every key is included)"}\n`);
  return 0;
}
