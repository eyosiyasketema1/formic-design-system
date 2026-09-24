// POST /api/pro/publish   Authorization: Bearer <PRO_PUBLISH_SECRET>
// body { version, registry: {...}, items: { "<name>": <item json> }, names?: [...], prune?: bool }
//
// What the private formic-pro repo's CI calls (scripts/publish_pro.py) after
// a merge: writes the catalogue to pro:registry, every item to
// pro:item:<name>, keeps the set pro:names current and deletes the items that
// are no longer published. Answers { ok: true, items: N, removed: M }.
//
// Vercel stops request bodies at 4.5 MB before a function runs, so the
// script sends a large registry in several calls: item-only calls with
// prune:false, then one call carrying the registry and the full `names` list
// with prune left on, which drops everything not in that list. A single call
// under the limit needs none of that. 8 MB is refused here regardless.
const lib = require("./_lib");

const LIMIT = 8 * 1024 * 1024;
const NAME = /^[a-z0-9][a-z0-9-]{0,63}$/;
const RESERVED = new Set(["registry"]);

async function run(req, res, deps) {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      throw new lib.ProError("method", { detail: "POST only" });
    }
    const secret = process.env.PRO_PUBLISH_SECRET || "";
    if (!secret) throw new lib.ProError("not_configured");
    if (!lib.timingEqual(lib.bearer(req), secret)) throw new lib.ProError("unauthorized");
    const length = Number(lib.header(req, "content-length") || 0);
    if (length > LIMIT) throw new lib.ProError("too_large");

    const body = lib.bodyOf(req);
    const items = body.items && typeof body.items === "object" && !Array.isArray(body.items) ? body.items : null;
    if (!items) throw new lib.ProError("bad_request", { detail: "Body needs items: { name: item }" });
    const prune = body.prune !== false;
    for (const [name, item] of Object.entries(items)) {
      if (!NAME.test(name) || RESERVED.has(name)) throw new lib.ProError("bad_request", { detail: `"${name}" is not a valid item name` });
      if (!item || typeof item !== "object" || item.name !== name) throw new lib.ProError("bad_request", { detail: `Item "${name}" must be an object whose name field is "${name}"` });
    }
    let names = null;
    if (body.names !== undefined) {
      if (!Array.isArray(body.names) || !body.names.every((n) => typeof n === "string" && NAME.test(n))) throw new lib.ProError("bad_request", { detail: "names must be a list of item names" });
      names = body.names;
    }
    if (body.registry !== undefined && (!body.registry || typeof body.registry !== "object" || !Array.isArray(body.registry.items))) {
      throw new lib.ProError("bad_request", { detail: "registry must be a catalogue object with an items list" });
    }
    const store = lib.makeStore(deps);
    if (!store) throw new lib.ProError("store");

    const cmds = [];
    for (const [name, item] of Object.entries(items)) {
      cmds.push(["SET", `pro:item:${name}`, JSON.stringify({ ...item, pro: true })]);
      cmds.push(["SADD", "pro:names", name]);
    }
    if (body.registry) {
      const registry = { ...body.registry, name: "formic-pro", homepage: lib.PRO_URL, version: String(body.version || body.registry.version || "0") };
      registry.items = registry.items.map((it) => ({ ...it, pro: true }));
      cmds.push(["SET", "pro:registry", JSON.stringify(registry)]);
    }
    if (cmds.length) await store.pipeline(cmds);

    let removed = 0;
    if (prune) {
      const keep = new Set(names || Object.keys(items));
      const known = (await store.cmd("SMEMBERS", "pro:names")) || [];
      const gone = known.filter((n) => !keep.has(n));
      if (gone.length) {
        await store.pipeline([["DEL", ...gone.map((n) => `pro:item:${n}`)], ["SREM", "pro:names", ...gone]]);
        removed = gone.length;
      }
    }
    return res.status(200).json({ ok: true, items: Object.keys(items).length, removed });
  } catch (err) {
    return lib.send(res, err);
  }
}

module.exports = (req, res) => run(req, res, {});
module.exports.withDeps = (deps) => (req, res) => run(req, res, deps);
