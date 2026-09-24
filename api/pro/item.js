// The Formic Pro registry: GET /r/pro/registry.json (public, the catalogue)
// and GET /r/pro/<name>.json (one item, behind a license key). vercel.json
// rewrites both onto /api/pro/item?name=…; the free registry at /r/<name>.json
// stays static files. Items live in Upstash under pro:item:<name>, written by
// /api/pro/publish from the private formic-pro repo's CI; the catalogue is
// pro:registry. Keys are checked against Polar through _lib.verifyKey, with
// the verdict cached ten minutes so one build asks Polar once.
//
//   Authorization: Bearer <key>          required for an item
//   X-Formic-Activation: <activation id> optional, from /api/pro/activate
//
// Every error is { error: <code>, message: <sentence> }; the CLI prints the
// message and switches on the code. Responses are never cached by the CDN
// (Cache-Control: private, no-store, also set in vercel.json for /r/pro/*).
const lib = require("./_lib");

const NAME = /^[a-z0-9][a-z0-9-]{0,63}$/;

async function run(req, res, deps) {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  try {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.setHeader("Allow", "GET, HEAD");
      throw new lib.ProError("method", { detail: "GET only" });
    }
    const name = String((req.query && req.query.name) || "").trim().toLowerCase();
    const store = lib.makeStore(deps);
    if (!store) throw new lib.ProError("store");

    if (name === "registry") {
      const raw = await store.cmd("GET", "pro:registry");
      const registry = (raw && lib.safeJson(raw)) || emptyRegistry();
      return res.status(200).json(registry);
    }
    if (!NAME.test(name)) throw new lib.ProError("not_found", { name: name || "(none)" });

    const key = lib.bearer(req);
    if (!key) {
      await lib.rateLimit(store, `ip:${lib.ipOf(req)}`, lib.RATE_KEYLESS);
      throw new lib.ProError("missing_key");
    }
    await lib.rateLimit(store, `key:${lib.keyHash(key)}`, lib.RATE_KEYED);
    await lib.verifyKey(key, { activationId: lib.header(req, "x-formic-activation").trim(), store, deps });

    const raw = await store.cmd("GET", `pro:item:${name}`);
    if (!raw) throw new lib.ProError("not_found", { name });
    const item = lib.safeJson(raw);
    if (!item) throw new lib.ProError("store");
    return res.status(200).json(item);
  } catch (err) {
    return lib.send(res, err);
  }
}

function emptyRegistry() {
  return {
    $schema: "https://ui.shadcn.com/schema/registry.json",
    name: "formic-pro",
    homepage: lib.PRO_URL,
    version: "0",
    items: [],
  };
}

module.exports = (req, res) => run(req, res, {});
module.exports.withDeps = (deps) => (req, res) => run(req, res, deps);
module.exports.emptyRegistry = emptyRegistry;
