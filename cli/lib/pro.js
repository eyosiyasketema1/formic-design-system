/* Formic Pro from the CLI's side: the key in .env.local, the keyed registry
   at <site>/r/pro, and the one error shape every Pro endpoint answers with.

   The site is https://formicai.dev (FORMIC_PRO_URL overrides it, for the
   tests, which point it at cli/test/pro-server.mjs). The public catalogue is
   /r/pro/registry.json (no key, every item marked `pro: true`); an item at
   /r/pro/<name>.json needs `Authorization: Bearer <key>` and takes the
   activation id from `formicai key` as X-Formic-Activation. Every refusal
   is { error: <code>, message: <sentence> }: the message is printed as it
   came, the code decides what else to say.

   The key is never printed or logged in full: `mask` shows the last six
   characters behind ****-, and that is the only form that reaches a
   terminal or a log. */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { CliError, bad, note, grey, yellow } from "./util.js";

export const PRO_SITE = (process.env.FORMIC_PRO_URL || "https://formicai.dev").replace(/\/+$/, "");
export const PRO_BASE = `${PRO_SITE}/r/pro`;
export const PRO_PAGE = "https://formicai.dev/pro";
export const ENV_FILE = ".env.local";
export const KEY_LINE = "Pro components need a key: npx formicai key <key> (https://formicai.dev/pro)";

export const proItemUrl = (name) => `${PRO_BASE}/${name}.json`;
export const mask = (key) => `****-${String(key).slice(-6)}`;
/* "2027-01-01" from an ISO stamp, or "" */
export const dateOnly = (iso) => { if (!iso) return ""; const d = new Date(iso); return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10); };

/* a refusal from the Pro site: the code from the JSON, the message verbatim */
export class ProRefused extends CliError {
  constructor(code, message, status = 0) { super(message); this.code = code; this.status = status; }
}

/* ── the key on disk ───────────────────────────────────────
   Three lines in .env.local, kept together: a comment with the date the key
   was added and the expiry the site reported (nothing else records it), then
   FORMIC_KEY and FORMIC_KEY_ACTIVATION. Everything else in the file is left
   as it is. The env wins over the file, so CI can carry the key as a secret. */
const COMMENT = /^# Formic Pro key/;
const KEY_RE = /^FORMIC_KEY=(.*)$/;
const ACT_RE = /^FORMIC_KEY_ACTIVATION=(.*)$/;
const unquote = (v) => v.trim().replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");

export function readKey(cwd = process.cwd()) {
  const out = { key: "", activation: "", expires: "", added: "", source: "" };
  const p = path.join(cwd, ENV_FILE);
  if (fs.existsSync(p)) {
    for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
      const k = line.match(KEY_RE), a = line.match(ACT_RE);
      if (k) { out.key = unquote(k[1]); out.source = ENV_FILE; }
      else if (a) out.activation = unquote(a[1]);
      else if (COMMENT.test(line)) {
        const until = line.match(/valid until (\S+)/), added = line.match(/added (\S+)/);
        if (until) out.expires = until[1].replace(/[,;.]$/, "");
        if (added) out.added = added[1].replace(/[,;.]$/, "");
      }
    }
  }
  if (process.env.FORMIC_KEY) { out.key = process.env.FORMIC_KEY; out.source = "the environment"; }
  if (process.env.FORMIC_KEY_ACTIVATION) out.activation = process.env.FORMIC_KEY_ACTIVATION;
  return out.key ? out : null;
}

export function writeKey(cwd, { key, activation, expires }) {
  const p = path.join(cwd, ENV_FILE);
  const cur = fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
  const kept = cur.split(/\r?\n/).filter((l) => !KEY_RE.test(l) && !ACT_RE.test(l) && !COMMENT.test(l));
  while (kept.length && kept[kept.length - 1] === "") kept.pop();
  const comment = `# Formic Pro key, added ${dateOnly(new Date().toISOString())}, ${expires ? `valid until ${expires}` : "no expiry"} (npx formicai key shows the status, --remove deletes it)`;
  const block = [comment, `FORMIC_KEY=${key}`, `FORMIC_KEY_ACTIVATION=${activation || ""}`];
  const next = [...kept, ...(kept.length ? [""] : []), ...block].join("\n") + "\n";
  fs.writeFileSync(p, next);
  return cur === "" ? "write" : "change";
}

/* drop the three lines; the file goes when nothing else is in it */
export function removeKey(cwd) {
  const p = path.join(cwd, ENV_FILE);
  if (!fs.existsSync(p)) return false;
  const cur = fs.readFileSync(p, "utf8");
  const lines = cur.split(/\r?\n/);
  const kept = lines.filter((l) => !KEY_RE.test(l) && !ACT_RE.test(l) && !COMMENT.test(l));
  if (kept.length === lines.length) return false;
  while (kept.length && kept[kept.length - 1] === "") kept.pop();
  if (kept.length === 0) fs.unlinkSync(p);
  else fs.writeFileSync(p, kept.join("\n") + "\n");
  return true;
}

/* .env.local must never be committed: append it to .gitignore unless a
   pattern there already covers it. Returns what was done. */
export function ignoreEnv(cwd) {
  const p = path.join(cwd, ".gitignore");
  const cur = fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
  const covered = cur.split(/\r?\n/).map((l) => l.trim()).some((l) => [".env.local", "/.env.local", ".env*.local", ".env*", ".env.*", "*.local", ".env", "*.env*"].includes(l));
  if (covered) return "covered";
  fs.writeFileSync(p, (cur && !cur.endsWith("\n") ? cur + "\n" : cur) + ".env.local\n");
  return cur === "" ? "written" : "appended";
}

/* ── the site ──────────────────────────────────────────────── */

/* one request to the Pro site: the JSON body on success, a ProRefused on an
   error body, a CliError when it cannot be reached */
async function request(url, { method = "GET", headers = {}, body } = {}) {
  let res;
  try {
    res = await fetch(url, { method, headers: { "user-agent": "formicai", accept: "application/json", ...(body ? { "content-type": "application/json" } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
  } catch (e) {
    throw new CliError(`could not reach Formic Pro at ${PRO_SITE} (${e.cause?.code ?? e.message}); check your connection, or FORMIC_PRO_URL if you set it`);
  }
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { json = null; }
  if (res.ok && json !== null) return json;
  if (json && typeof json.error === "string") throw new ProRefused(json.error, String(json.message ?? json.error), res.status);
  throw new CliError(`Formic Pro answered ${res.status} for ${url}`);
}

export function keyHeaders(creds) {
  if (!creds?.key) return {};
  const h = { authorization: `Bearer ${creds.key}` };
  if (creds.activation) h["x-formic-activation"] = creds.activation;
  return h;
}

/* the public Pro catalogue, fetched once per run. null when the site cannot
   be reached or answers with a refusal (the free registry must keep working
   with Pro down), so callers show what they can. */
let catalogueP = null;
export function proCatalogue() {
  if (!catalogueP) catalogueP = request(`${PRO_BASE}/registry.json`).then((idx) => (idx && Array.isArray(idx.items) ? idx : { items: [] })).catch((e) => { proCatalogue.error = e; return null; });
  return catalogueP;
}
proCatalogue.error = null;
/* one line for lists and lookups when the Pro site could not be reached: the free registry still works, the person should know why the Pro section is missing */
export function proUnreachableNote() {
  return proCatalogue.error ? `Formic Pro could not be reached (${proCatalogue.error.code ?? proCatalogue.error.message ?? "network"}); Pro components are hidden until it is back` : null;
}
export const proNames = async () => ((await proCatalogue())?.items ?? []).map((i) => i.name);
export async function proIndexItem(name) { return ((await proCatalogue())?.items ?? []).find((i) => i.name === name) ?? null; }

/* a Pro item with its files, behind the key */
export async function fetchProItem(name, creds = readKey()) {
  const it = await request(proItemUrl(name), { headers: keyHeaders(creds) });
  return { ...it, pro: true };
}

/* POST /api/pro/activate: a seat for this machine, the expiry, nothing else */
export async function activate(key, label) {
  const r = await request(`${PRO_SITE}/api/pro/activate`, { method: "POST", body: { key, label } });
  return { activation: r.activation_id || "", expires: dateOnly(r.expires_at) };
}

/* is the stored key still accepted? The item endpoint checks the key before
   it looks the name up, so an item that cannot exist answers not_found for a
   good key and the key's refusal for a bad one; no seat is used. */
export async function checkKey(creds) {
  try { await request(proItemUrl("key-check"), { headers: keyHeaders(creds) }); return { ok: true }; }
  catch (e) {
    if (e instanceof ProRefused && e.code === "not_found") return { ok: true };
    if (e instanceof ProRefused) return { ok: false, code: e.code, message: e.message };
    return { ok: null, message: e.message };
  }
}

/* the ✗ line for a refusal, and the command that fixes it */
export function reportRefusal(e) {
  bad(e.message);
  if (e.code === "missing_key") note(`      ${yellow("fix:")} npx formicai key <key>  ${grey(`(${PRO_PAGE})`)}`);
  else if (["invalid_key", "expired", "revoked", "wrong_product"].includes(e.code)) note(`      ${yellow("fix:")} npx formicai key <new key>  ${grey(`(${PRO_PAGE})`)}`);
}

/* the label a seat is registered under: this machine and this project */
export const seatLabel = (cwd = process.cwd()) => `${os.hostname()}:${path.basename(cwd)}`.slice(0, 120);
