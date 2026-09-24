// Shared pieces for the Formic Pro registry functions (item, activate,
// publish). Vercel ignores files in api/ that start with an underscore, so
// this one is a module, not an endpoint. No npm dependencies: Upstash is its
// REST API over fetch, Polar is its public customer-portal endpoints over
// fetch, and everything a caller could see is a JSON body in one shape.
//
// Env (set in Vercel, never in code; api/pro/README.md documents each one):
//   KV_REST_API_URL, KV_REST_API_TOKEN   the Upstash store (shared with the waitlist)
//   POLAR_ORG_ID                         the Polar organization that sells Pro
//   POLAR_BENEFIT_ID                     the license-key benefit; other benefits are refused
//   PRO_PUBLISH_SECRET                   bearer secret for POST /api/pro/publish
//   POLAR_SANDBOX=1                      point at sandbox-api.polar.sh while testing
//
// Everything that talks to the outside world goes through `deps` so the test
// file can swap in a Map for the store and a stub for Polar without a network.
const crypto = require("crypto");

const PRO_URL = "https://formicai.dev/pro";
const CACHE_TTL = 600; // seconds a key's verdict is trusted before Polar is asked again
const RATE_KEYED = 60; // requests a minute per key
const RATE_KEYLESS = 20; // requests a minute per IP without a key

// The one error shape every endpoint answers with. Codes are stable: the CLI
// switches on them; messages are what the person reads.
const ERRORS = {
  missing_key: [401, `This component is in Formic Pro. Add your key with: npx formicai key <key>. Get one at ${PRO_URL}`],
  invalid_key: [401, `That key is not valid. Check it in your Polar purchase page, or get one at ${PRO_URL}`],
  expired: [403, `Your Formic Pro key has expired. Renew at ${PRO_URL}`],
  revoked: [403, "Your Formic Pro key was revoked. Contact hello@formicai.dev"],
  wrong_product: [403, `That key is for a different product. Formic Pro keys come from ${PRO_URL}`],
  activation_limit: [403, "Every seat on that key is in use. Free one in your Polar purchase page, or contact hello@formicai.dev"],
  not_found: [404, "No Pro component named {name}. npx formicai add --list shows the names"],
  rate_limited: [429, "Too many requests; wait a minute and try again"],
  not_configured: [503, "Formic Pro is not open yet. Join the list at https://formicai.dev/#pro"],
  upstream: [502, "Could not check your key right now; try again in a minute"],
  store: [502, "The Pro registry is not reachable right now; try again in a minute"],
  bad_request: [400, "{detail}"],
  unauthorized: [401, "That publish secret is not right"],
  too_large: [413, "That payload is above the 8 MB publish limit; split it"],
  method: [405, "{detail}"],
};

class ProError extends Error {
  constructor(code, vars = {}) {
    const [status, template] = ERRORS[code] || [500, "Something went wrong"];
    super(template.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : "")));
    this.code = code;
    this.status = status;
  }
}

/* "Your key expired on 2027-01-31." when the date is known, the plain sentence when not */
function expiredError(expiresAt) {
  const err = new ProError("expired");
  const day = dateOnly(expiresAt);
  if (day) err.message = `Your Formic Pro key expired on ${day}. Renew at ${PRO_URL}`;
  return err;
}

function dateOnly(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

function send(res, err) {
  const e = err instanceof ProError ? err : new ProError("upstream");
  if (!(err instanceof ProError)) console.error("pro", err);
  return res.status(e.status).json({ error: e.code, message: e.message });
}

function safeJson(text) {
  try { return JSON.parse(text); } catch { return null; }
}

function bodyOf(req) {
  if (req.body == null) return {};
  if (typeof req.body === "string") return safeJson(req.body) || {};
  if (Buffer.isBuffer(req.body)) return safeJson(req.body.toString("utf8")) || {};
  return req.body;
}

function header(req, name) {
  const v = req.headers[name.toLowerCase()];
  return Array.isArray(v) ? v[0] : v || "";
}

function bearer(req) {
  const m = /^Bearer\s+(.+)$/i.exec(header(req, "authorization").trim());
  return m ? m[1].trim() : "";
}

function ipOf(req) {
  return header(req, "x-real-ip") || header(req, "x-forwarded-for").split(",")[0].trim() || "unknown";
}

const keyHash = (key) => crypto.createHash("sha256").update(key).digest("hex");

function timingEqual(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y);
}

// ── the store ──────────────────────────────────────────────
// Upstash REST: one command is a POST of ["CMD", arg, ...] to the base URL,
// several are a POST of [[...], [...]] to /pipeline. `cmd` and `pipeline`
// here are the two shapes; the test file replaces them with an in-memory
// version that speaks the same commands.
function makeStore(deps) {
  const url = process.env.KV_REST_API_URL, token = process.env.KV_REST_API_TOKEN;
  if (deps && deps.store) return deps.store;
  if (!url || !token) return null;
  const post = async (path, body) => {
    const r = await fetch(url.replace(/\/+$/, "") + path, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`store ${r.status}`);
    return r.json();
  };
  return {
    cmd: async (...parts) => (await post("", parts)).result,
    pipeline: async (cmds) => (await post("/pipeline", cmds)).map((x) => x.result),
  };
}

// INCR + EXPIRE on first hit, as waitlist.js does; throws rate_limited past the cap.
async function rateLimit(store, bucket, cap, seconds = 60) {
  const k = `pro:rate:${bucket}`;
  const hits = await store.cmd("INCR", k);
  if (hits === 1) await store.cmd("EXPIRE", k, seconds);
  if (hits > cap) throw new ProError("rate_limited");
}

// ── Polar ──────────────────────────────────────────────────
function polarBase() {
  return process.env.POLAR_SANDBOX === "1" ? "https://sandbox-api.polar.sh" : "https://api.polar.sh";
}

function polarConfig() {
  const org = process.env.POLAR_ORG_ID || "";
  if (!org) throw new ProError("not_configured");
  return { org, benefit: process.env.POLAR_BENEFIT_ID || "" };
}

async function polarPost(deps, path, body) {
  const doFetch = (deps && deps.fetch) || fetch;
  let r;
  try {
    r = await doFetch(polarBase() + path, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": "formicai-pro" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new ProError("upstream");
  }
  const text = await r.text();
  const json = safeJson(text);
  if (r.status >= 500 || (r.status !== 200 && json === null)) throw new ProError("upstream");
  return { status: r.status, json };
}

// Polar's public validate answers 404 for every kind of refusal and tells them
// apart in `detail` (their license_key/service.py: "Not found",
// "License key is no longer active.", "License key has expired.",
// "License key does not match given benefit."). Map that to our codes.
function classifyRefusal(detail) {
  const d = String(detail || "").toLowerCase();
  if (d.includes("expired")) return "expired";
  if (d.includes("no longer active")) return "revoked";
  if (d.includes("benefit")) return "wrong_product";
  if (d.includes("activation limit")) return "activation_limit";
  if (d.includes("does not support activations")) return "no_activations";
  return "invalid_key";
}

// The verdict for a key: { status: "granted" | "expired" | "revoked" | "wrong_product" | "invalid_key",
// expires_at, benefit_id, display_key, checked_at }. Cached in the store for
// CACHE_TTL under the key's hash, refusals included, so a build that adds ten
// components asks Polar once. Throws a ProError for anything but "granted".
async function verifyKey(key, { activationId = "", store, deps } = {}) {
  const { org, benefit } = polarConfig();
  const cacheKey = `pro:key:${keyHash(key)}`;
  let verdict = null;
  if (store) {
    const raw = await store.cmd("GET", cacheKey).catch(() => null);
    verdict = raw ? safeJson(raw) : null;
  }
  if (!verdict) {
    verdict = await askPolar(deps, key, org, benefit, activationId);
    if (store) await store.cmd("SET", cacheKey, JSON.stringify(verdict), "EX", CACHE_TTL).catch(() => {});
  }
  if (verdict.status === "granted") {
    if (benefit && verdict.benefit_id && verdict.benefit_id !== benefit) throw new ProError("wrong_product");
    if (verdict.expires_at && Date.now() >= new Date(verdict.expires_at).getTime()) throw expiredError(verdict.expires_at);
    return verdict;
  }
  if (verdict.status === "expired") throw expiredError(verdict.expires_at);
  throw new ProError(verdict.status in ERRORS ? verdict.status : "invalid_key");
}

async function askPolar(deps, key, org, benefit, activationId) {
  const body = { key, organization_id: org };
  if (benefit) body.benefit_id = benefit;
  if (activationId) body.activation_id = activationId;
  let { status, json } = await polarPost(deps, "/v1/customer-portal/license-keys/validate", body);
  // a stale activation id (the person reinstalled) must not read as a bad key: ask once more without it
  if (status === 404 && activationId && classifyRefusal(json && json.detail) === "invalid_key") {
    delete body.activation_id;
    ({ status, json } = await polarPost(deps, "/v1/customer-portal/license-keys/validate", body));
  }
  const checked_at = new Date().toISOString();
  if (status === 200 && json && json.status === "granted") {
    return { status: "granted", expires_at: json.expires_at || null, benefit_id: json.benefit_id || null, display_key: json.display_key || null, checked_at };
  }
  if (status === 404 || status === 403 || status === 400) {
    return { status: classifyRefusal(json && json.detail), expires_at: null, benefit_id: null, display_key: null, checked_at };
  }
  if (status === 422) return { status: "invalid_key", expires_at: null, benefit_id: null, display_key: null, checked_at };
  throw new ProError("upstream");
}

// Activate: reserve a seat for this machine. Returns the activation id, or
// null when the benefit has no activation limit (Polar answers 403 "does not
// support activations"; the key is still fine, so we validate and carry on).
async function activateKey(key, label, { store, deps } = {}) {
  const { org, benefit } = polarConfig();
  const { status, json } = await polarPost(deps, "/v1/customer-portal/license-keys/activate", { key, organization_id: org, label: String(label || "formicai").slice(0, 120) });
  if (status === 200 && json && json.id) {
    const lk = json.license_key || {};
    if (benefit && lk.benefit_id && lk.benefit_id !== benefit) throw new ProError("wrong_product");
    if (lk.expires_at && Date.now() >= new Date(lk.expires_at).getTime()) throw expiredError(lk.expires_at);
    if (store) {
      const verdict = { status: "granted", expires_at: lk.expires_at || null, benefit_id: lk.benefit_id || null, display_key: lk.display_key || null, checked_at: new Date().toISOString() };
      await store.cmd("SET", `pro:key:${keyHash(key)}`, JSON.stringify(verdict), "EX", CACHE_TTL).catch(() => {});
    }
    return { activation_id: json.id, expires_at: lk.expires_at || null, display_key: lk.display_key || null };
  }
  const code = classifyRefusal(json && json.detail);
  if (status === 403 && code === "no_activations") {
    const v = await verifyKey(key, { store, deps });
    return { activation_id: null, expires_at: v.expires_at, display_key: v.display_key };
  }
  if (status === 404) throw new ProError("invalid_key");
  if (status === 403) throw code === "expired" ? expiredError(null) : new ProError(code === "invalid_key" ? "revoked" : code);
  if (status === 422) throw new ProError("invalid_key");
  throw new ProError("upstream");
}

module.exports = {
  PRO_URL, CACHE_TTL, RATE_KEYED, RATE_KEYLESS, ERRORS, ProError, expiredError,
  send, bodyOf, header, bearer, ipOf, keyHash, timingEqual, safeJson,
  makeStore, rateLimit, verifyKey, activateKey, classifyRefusal, polarBase,
};
