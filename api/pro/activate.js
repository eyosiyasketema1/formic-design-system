// POST /api/pro/activate  body { key, label }
// Reserves a seat on a Formic Pro key for one machine (Polar "activation";
// the CLI sends the hostname or project name as the label) and answers
//   { activation_id, expires_at, display_key }
// The CLI stores activation_id and sends it back as X-Formic-Activation on
// every item request. When the benefit has no activation limit Polar refuses
// to activate; the key is still checked and activation_id comes back null.
// Errors are the same { error, message } JSON as the item endpoint, so the
// CLI prints them the same way.
const lib = require("./_lib");

async function run(req, res, deps) {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      throw new lib.ProError("method", { detail: "POST only" });
    }
    const body = lib.bodyOf(req);
    const key = String(body.key || lib.bearer(req) || "").trim();
    if (!key) throw new lib.ProError("missing_key");
    if (key.length > 512) throw new lib.ProError("invalid_key");
    const label = String(body.label || "").trim() || "formicai";
    const store = lib.makeStore(deps);
    if (store) await lib.rateLimit(store, `activate:${lib.ipOf(req)}`, lib.RATE_KEYLESS);
    const out = await lib.activateKey(key, label, { store, deps });
    return res.status(200).json(out);
  } catch (err) {
    return lib.send(res, err);
  }
}

module.exports = (req, res) => run(req, res, {});
module.exports.withDeps = (deps) => (req, res) => run(req, res, deps);
