// In-process tests for the Pro registry functions: a Map stands in for
// Upstash, a stub for Polar, no network. Run with `node api/pro/test.mjs`
// (qa_check.py step 4g does); exits 1 on any failure.
import { createRequire } from "node:module";
import { createHash } from "node:crypto";

const require = createRequire(import.meta.url);
const item = require("./item.js");
const activate = require("./activate.js");
const publish = require("./publish.js");
const lib = require("./_lib.js");

process.env.POLAR_ORG_ID = "org-formic";
process.env.POLAR_BENEFIT_ID = "benefit-pro";
process.env.PRO_PUBLISH_SECRET = "publish-secret";
delete process.env.KV_REST_API_URL;
delete process.env.KV_REST_API_TOKEN;

// ── fakes ──────────────────────────────────────────────────
function fakeStore() {
  const kv = new Map(), sets = new Map();
  const exec = (parts) => {
    const [cmd, ...a] = parts;
    switch (cmd) {
      case "GET": return kv.has(a[0]) ? kv.get(a[0]) : null;
      case "SET": kv.set(a[0], a[1]); return "OK";
      case "DEL": { let n = 0; for (const k of a) n += kv.delete(k) ? 1 : 0; return n; }
      case "INCR": { const v = (Number(kv.get(a[0])) || 0) + 1; kv.set(a[0], String(v)); return v; }
      case "EXPIRE": return 1;
      case "SADD": { const s = sets.get(a[0]) || new Set(); const before = s.size; a.slice(1).forEach((x) => s.add(x)); sets.set(a[0], s); return s.size - before; }
      case "SREM": { const s = sets.get(a[0]) || new Set(); let n = 0; a.slice(1).forEach((x) => { n += s.delete(x) ? 1 : 0; }); return n; }
      case "SMEMBERS": return [...(sets.get(a[0]) || [])];
      default: throw new Error(`fake store: ${cmd} not implemented`);
    }
  };
  return { kv, sets, cmd: async (...parts) => exec(parts), pipeline: async (cmds) => cmds.map(exec) };
}

// Polar as its docs and source describe it: validate answers 200 for a live
// key and 404 with a detail sentence for every refusal; activate answers 200
// with the activation, 403 for a refusal, 404 for an unknown key.
const KEYS = {
  "good-key": { status: "granted", expires_at: "2099-01-01T00:00:00Z", benefit_id: "benefit-pro", display_key: "GOOD-****" },
  "expired-key": { detail: "License key has expired." },
  "revoked-key": { detail: "License key is no longer active." },
  "other-product-key": { status: "granted", expires_at: null, benefit_id: "benefit-other", display_key: "OTHR-****" },
  "no-seats-key": { status: "granted", expires_at: null, benefit_id: "benefit-pro", display_key: "SEAT-****", activate: { status: 403, detail: "License key does not support activations." } },
};
function fakePolar() {
  const calls = [];
  const reply = (status, body) => ({ status, ok: status < 400, text: async () => JSON.stringify(body) });
  const fetch = async (url, init) => {
    const body = JSON.parse(init.body);
    calls.push({ url, body });
    const k = KEYS[body.key];
    if (url.endsWith("/validate")) {
      if (!k) return reply(404, { error: "ResourceNotFound", detail: "Not found" });
      if (k.detail) return reply(404, { error: "ResourceNotFound", detail: k.detail });
      if (body.benefit_id && body.benefit_id !== k.benefit_id) return reply(404, { error: "ResourceNotFound", detail: "License key does not match given benefit." });
      return reply(200, { ...k, id: "lk-1", key: body.key });
    }
    if (url.endsWith("/activate")) {
      if (!k) return reply(404, { error: "ResourceNotFound", detail: "Not found" });
      if (k.detail) return reply(403, { error: "NotPermitted", detail: k.detail });
      if (k.activate) return reply(k.activate.status, { error: "NotPermitted", detail: k.activate.detail });
      return reply(200, { id: "act-1", license_key_id: "lk-1", label: body.label, meta: {}, license_key: { ...k } });
    }
    return reply(500, {});
  };
  return { calls, fetch };
}

function req({ method = "GET", query = {}, headers = {}, body } = {}) {
  const h = {};
  for (const [k, v] of Object.entries(headers)) h[k.toLowerCase()] = v;
  return { method, query, headers: h, body };
}
function res() {
  const r = { statusCode: 200, headers: {}, body: undefined };
  r.setHeader = (k, v) => { r.headers[k.toLowerCase()] = v; return r; };
  r.status = (c) => { r.statusCode = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  r.end = (b) => { r.body = b; return r; };
  return r;
}
async function call(handler, input) {
  const r = res();
  await handler(req(input), r);
  return r;
}

// ── harness ────────────────────────────────────────────────
let failed = 0, passed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log(`  ok   ${name}`); }
  else { failed++; console.log(`  FAIL ${name}${detail ? `: ${JSON.stringify(detail)}` : ""}`); }
}
const auth = (key) => ({ authorization: `Bearer ${key}` });

const store = fakeStore();
const polar = fakePolar();
const deps = { store, fetch: polar.fetch };
const getItem = item.withDeps(deps);
const postActivate = activate.withDeps(deps);
const postPublish = publish.withDeps(deps);

const itemOf = (name) => ({
  $schema: "https://ui.shadcn.com/schema/registry-item.json", name, type: "registry:item", title: name,
  description: `${name} from Formic Pro.`, dependencies: [], registryDependencies: ["https://formicai.dev/r/formic.json"],
  files: [{ path: `components/${name}.tsx`, type: "registry:file", target: `~/src/formic/pro/${name}.tsx`, content: "export const x = 1;\n" }],
});
const catalogue = (names) => ({ $schema: "https://ui.shadcn.com/schema/registry.json", name: "formic-pro", homepage: "https://formicai.dev/pro", version: "0", items: names.map((n) => ({ name: n, type: "registry:item", title: n, description: "", dependencies: [], registryDependencies: [] })) });

console.log("api/pro tests");

// registry before anything is published
{
  const r = await call(getItem, { query: { name: "registry" } });
  check("empty registry is public and versioned 0", r.statusCode === 200 && r.body.version === "0" && r.body.items.length === 0 && r.body.name === "formic-pro", r.body);
  check("registry is never CDN-cached", r.headers["cache-control"] === "private, no-store", r.headers);
}

// publish, then the item is served
{
  const r = await call(postPublish, { method: "POST", headers: auth("publish-secret"), body: { version: "1.0.0", registry: catalogue(["agent-workspace", "old-one"]), items: { "agent-workspace": itemOf("agent-workspace"), "old-one": itemOf("old-one") } } });
  check("publish writes two items", r.statusCode === 200 && r.body.ok === true && r.body.items === 2 && r.body.removed === 0, r.body);
  const reg = await call(getItem, { query: { name: "registry" } });
  check("registry carries version and pro flags", reg.body.version === "1.0.0" && reg.body.items.length === 2 && reg.body.items.every((i) => i.pro === true), reg.body);
}
{
  const r = await call(postPublish, { method: "POST", headers: auth("wrong-secret"), body: { items: {} } });
  check("publish with the wrong secret is 401", r.statusCode === 401 && r.body.error === "unauthorized", r.body);
  const r2 = await call(postPublish, { method: "POST", headers: {}, body: { items: {} } });
  check("publish with no secret is 401", r2.statusCode === 401, r2.body);
  const r3 = await call(postPublish, { method: "POST", headers: { ...auth("publish-secret"), "content-length": String(9 * 1024 * 1024) }, body: { items: {} } });
  check("publish above 8 MB is 413", r3.statusCode === 413 && r3.body.error === "too_large", r3.body);
  const r4 = await call(postPublish, { method: "POST", headers: auth("publish-secret"), body: { items: { registry: itemOf("registry") } } });
  check("publish refuses the reserved name registry", r4.statusCode === 400, r4.body);
}

// no key
{
  const r = await call(getItem, { query: { name: "agent-workspace" } });
  check("no key is 401 missing_key", r.statusCode === 401 && r.body.error === "missing_key" && r.body.message.includes("npx formicai key"), r.body);
  check("keyed responses are private, no-store", r.headers["cache-control"] === "private, no-store", r.headers);
}
// bad key
{
  const r = await call(getItem, { query: { name: "agent-workspace" }, headers: auth("nope") });
  check("bad key is 401 invalid_key", r.statusCode === 401 && r.body.error === "invalid_key", r.body);
}
// expired
{
  const r = await call(getItem, { query: { name: "agent-workspace" }, headers: auth("expired-key") });
  check("expired key is 403 expired", r.statusCode === 403 && r.body.error === "expired" && r.body.message.includes("Renew"), r.body);
}
// revoked
{
  const r = await call(getItem, { query: { name: "agent-workspace" }, headers: auth("revoked-key") });
  check("revoked key is 403 revoked", r.statusCode === 403 && r.body.error === "revoked" && r.body.message.includes("hello@formicai.dev"), r.body);
}
// wrong benefit
{
  const r = await call(getItem, { query: { name: "agent-workspace" }, headers: auth("other-product-key") });
  check("another product's key is 403 wrong_product", r.statusCode === 403 && r.body.error === "wrong_product", r.body);
}
// valid
{
  const before = polar.calls.length;
  const r = await call(getItem, { query: { name: "agent-workspace" }, headers: auth("good-key") });
  check("valid key gets the item", r.statusCode === 200 && r.body.name === "agent-workspace" && r.body.pro === true && r.body.files[0].content.length > 0, r.body);
  check("the verdict is cached under the key's hash", store.kv.has(`pro:key:${createHash("sha256").update("good-key").digest("hex")}`));
  // cache hit
  const r2 = await call(getItem, { query: { name: "old-one" }, headers: auth("good-key") });
  check("second add with the same key is served", r2.statusCode === 200 && r2.body.name === "old-one", r2.body);
  check("second add does not call Polar", polar.calls.length === before + 1, { calls: polar.calls.length - before });
  // refusals are cached too
  const before2 = polar.calls.length;
  await call(getItem, { query: { name: "agent-workspace" }, headers: auth("revoked-key") });
  check("a revoked verdict is cached as well", polar.calls.length === before2, { calls: polar.calls.length - before2 });
}
// not found, with a valid key
{
  const r = await call(getItem, { query: { name: "no-such-thing" }, headers: auth("good-key") });
  check("unknown item is 404 not_found", r.statusCode === 404 && r.body.error === "not_found" && r.body.message.includes("no-such-thing"), r.body);
  const r2 = await call(getItem, { query: { name: "../etc" }, headers: auth("good-key") });
  check("a name that is not a name is 404", r2.statusCode === 404, r2.body);
}
// rate limit: 60 a minute per key
{
  let last;
  for (let i = 0; i < 70; i++) last = await call(getItem, { query: { name: "old-one" }, headers: auth("good-key") });
  check("61st request in a minute is 429", last.statusCode === 429 && last.body.error === "rate_limited", last.body);
  store.kv.delete(`pro:rate:key:${createHash("sha256").update("good-key").digest("hex")}`);
}
// activation
{
  const r = await call(postActivate, { method: "POST", body: { key: "good-key", label: "eyosiyas-mbp" } });
  check("activate returns an activation id", r.statusCode === 200 && r.body.activation_id === "act-1" && r.body.expires_at === "2099-01-01T00:00:00Z" && r.body.display_key === "GOOD-****", r.body);
  const sent = polar.calls[polar.calls.length - 1].body;
  check("activate sends label and organization", sent.label === "eyosiyas-mbp" && sent.organization_id === "org-formic", sent);
  const r2 = await call(postActivate, { method: "POST", body: { key: "no-seats-key", label: "x" } });
  check("a benefit without activations answers activation_id null after a validate", r2.statusCode === 200 && r2.body.activation_id === null && r2.body.display_key === "SEAT-****", r2.body);
  const r3 = await call(postActivate, { method: "POST", body: { key: "expired-key", label: "x" } });
  check("activate with an expired key is 403 expired", r3.statusCode === 403 && r3.body.error === "expired", r3.body);
  const r4 = await call(postActivate, { method: "POST", body: { key: "nope", label: "x" } });
  check("activate with a bad key is 401 invalid_key", r4.statusCode === 401 && r4.body.error === "invalid_key", r4.body);
  const r5 = await call(postActivate, { method: "POST", body: {} });
  check("activate with no key is 401 missing_key", r5.statusCode === 401 && r5.body.error === "missing_key", r5.body);
  const r6 = await call(getItem, { query: { name: "old-one" }, headers: { ...auth("good-key"), "x-formic-activation": "act-1" } });
  check("an item request may carry the activation header", r6.statusCode === 200, r6.body);
}
// a stale activation id does not read as a bad key
{
  const fresh = fakeStore(); const p2 = fakePolar();
  const orig = p2.fetch;
  p2.fetch = async (url, init) => {
    const b = JSON.parse(init.body);
    if (url.endsWith("/validate") && b.activation_id) { p2.calls.push({ url, body: b }); return { status: 404, ok: false, text: async () => JSON.stringify({ error: "ResourceNotFound", detail: "Not found" }) }; }
    return orig(url, init);
  };
  const get2 = item.withDeps({ store: fresh, fetch: p2.fetch });
  await call(publish.withDeps({ store: fresh }), { method: "POST", headers: auth("publish-secret"), body: { items: { "x-item": itemOf("x-item") }, prune: false } });
  const r = await call(get2, { query: { name: "x-item" }, headers: { ...auth("good-key"), "x-formic-activation": "stale-activation" } });
  check("a stale activation id falls back to a plain validate", r.statusCode === 200 && p2.calls.length === 2, { status: r.statusCode, body: r.body, calls: p2.calls.length });
}
// prune: a publish without old-one removes it
{
  const r = await call(postPublish, { method: "POST", headers: auth("publish-secret"), body: { version: "1.1.0", registry: catalogue(["agent-workspace"]), items: { "agent-workspace": itemOf("agent-workspace") } } });
  check("republish removes items no longer in the payload", r.statusCode === 200 && r.body.removed >= 1, r.body);
  const gone = await call(getItem, { query: { name: "old-one" }, headers: auth("good-key") });
  check("the removed item is 404", gone.statusCode === 404, gone.body);
  const names = await store.cmd("SMEMBERS", "pro:names");
  check("pro:names matches what is published", !names.includes("old-one") && names.includes("agent-workspace"), names);
}
// chunked publish: items with prune:false, then names with the registry
{
  await call(postPublish, { method: "POST", headers: auth("publish-secret"), body: { items: { "chunk-a": itemOf("chunk-a") }, prune: false } });
  await call(postPublish, { method: "POST", headers: auth("publish-secret"), body: { items: { "chunk-b": itemOf("chunk-b") }, prune: false } });
  const r = await call(postPublish, { method: "POST", headers: auth("publish-secret"), body: { version: "1.2.0", registry: catalogue(["chunk-a", "chunk-b"]), items: {}, names: ["chunk-a", "chunk-b"] } });
  const names = (await store.cmd("SMEMBERS", "pro:names")).sort();
  check("chunked publish keeps every chunk and prunes the rest", r.statusCode === 200 && r.body.removed === 1 && names.join(",") === "chunk-a,chunk-b", { body: r.body, names });
}
// not configured
{
  const saved = process.env.POLAR_ORG_ID; delete process.env.POLAR_ORG_ID;
  const r = await call(getItem, { query: { name: "chunk-a" }, headers: auth("good-key-2") });
  check("no POLAR_ORG_ID is 503 not_configured", r.statusCode === 503 && r.body.error === "not_configured", r.body);
  process.env.POLAR_ORG_ID = saved;
}
// Polar down
{
  const down = item.withDeps({ store: fakeStore(), fetch: async () => { throw new Error("ECONNRESET"); } });
  const r = await call(down, { query: { name: "chunk-a" }, headers: auth("good-key") });
  check("Polar unreachable is 502 upstream, not a bad key", r.statusCode === 502 && r.body.error === "upstream", r.body);
}
// method and store checks
{
  const r = await call(getItem, { method: "POST", query: { name: "chunk-a" } });
  check("POST to an item is 405", r.statusCode === 405, r.body);
  const nostore = item.withDeps({ fetch: polar.fetch });
  const r2 = await call(nostore, { query: { name: "registry" } });
  check("no store configured is 502 store", r2.statusCode === 502 && r2.body.error === "store", r2.body);
}
// buyer-facing text: no em dashes, no forbidden names
{
  const texts = Object.values(lib.ERRORS).map(([, m]) => m).join("\n");
  check("messages carry no em dash", !/—/.test(texts));
  check("messages never name the registry client", !/shadcn/i.test(texts));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
