#!/usr/bin/env node
/* A stand-in for formicai.dev's Pro endpoints, for cli/test/run.sh. Node's
   http module, no dependencies. Speaks the contract in api/pro/README.md:

     GET  /r/pro/registry.json        the public catalogue, every item pro: true
     GET  /r/pro/<name>.json          the item, behind Authorization: Bearer <key>
     POST /api/pro/activate           { key, label } → { activation_id, expires_at, display_key }

   Keys: TEST-GRANTED is accepted (activation act-1, expires 2027-01-01),
   TEST-EXPIRED is refused as expired (with the date, as the site does), any
   other key as invalid_key; no key is missing_key. The key is checked before
   the name is looked up, as the real item function does, so a name that does
   not exist answers not_found for a good key and the key's refusal for a bad
   one (formicai doctor relies on that). Every error is { error, message }.

   Two items: pro-sample (depends on button from the free registry, whose base
   URL is argv[3]) and pro-other (depends on pro-sample, a Pro-to-Pro link).

     node cli/test/pro-server.mjs <port> <free registry base url>            */
import http from "node:http";

const port = Number(process.argv[2] || 0);
const FREE = (process.argv[3] || "https://formicai.dev/r").replace(/\/+$/, "");
const PRO_PAGE = "https://formicai.dev/pro";
let self = "";

const ERRORS = {
  missing_key: [401, `This component is in Formic Pro. Add your key with: npx formicai key <key>. Get one at ${PRO_PAGE}`],
  invalid_key: [401, `That key is not valid. Check it in your Polar purchase page, or get one at ${PRO_PAGE}`],
  expired: [403, `Your Formic Pro key expired on 2026-01-31. Renew at ${PRO_PAGE}`],
  not_found: [404, "No Pro component named {name}. npx formicai add --list shows the names"],
  method: [405, "GET only"],
};

const items = () => ({
  "pro-sample": {
    $schema: "https://ui.shadcn.com/schema/registry-item.json",
    name: "pro-sample", type: "registry:item", title: "Pro Sample", description: "A Pro component for the test, built on Button.",
    registryDependencies: [`${FREE}/formic.json`, `${FREE}/button.json`],
    dependencies: [],
    files: [{ path: "components/ProSample.tsx", type: "registry:file", target: "~/src/formic/pro/ProSample.tsx", content:
      `import Button from "../components/Button";\n\nexport type ProSampleProps = {\n  /** the label on the one action */\n  label?: string;\n  onAct?: () => void;\n};\n\nexport default function ProSample({ label = "Act", onAct }: ProSampleProps) {\n  return <Button variant="accent" onClick={onAct}>{label}</Button>;\n}\n` }],
    meta: { formic: { file: "components/ProSample.tsx", version: "1.0.0", pro: true } },
    pro: true,
  },
  "pro-other": {
    $schema: "https://ui.shadcn.com/schema/registry-item.json",
    name: "pro-other", type: "registry:item", title: "Pro Other", description: "A second Pro component that composes the first.",
    registryDependencies: [`${FREE}/formic.json`, `${self}/r/pro/pro-sample.json`],
    dependencies: [],
    files: [{ path: "components/ProOther.tsx", type: "registry:file", target: "~/src/formic/pro/ProOther.tsx", content:
      `import ProSample from "./ProSample";\n\nexport default function ProOther() {\n  return <ProSample label="Other" />;\n}\n` }],
    meta: { formic: { file: "components/ProOther.tsx", version: "1.0.0", pro: true } },
    pro: true,
  },
});

const catalogue = () => ({
  $schema: "https://ui.shadcn.com/schema/registry.json", name: "formic-pro", homepage: PRO_PAGE, version: "1.0.0",
  items: Object.values(items()).map(({ files, ...it }) => ({ ...it, files: files.map(({ content, ...f }) => f) })),
});

const KEYS = { "TEST-GRANTED": { activation_id: "act-1", expires_at: "2027-01-01T00:00:00.000Z", display_key: "TEST-****" } };

function send(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "private, no-store" });
  res.end(JSON.stringify(body));
}
const refuse = (res, code, vars = {}) => { const [status, msg] = ERRORS[code]; send(res, status, { error: code, message: msg.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "") }); };
const verdict = (key) => (!key ? "missing_key" : key === "TEST-EXPIRED" ? "expired" : KEYS[key] ? "granted" : "invalid_key");

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  let body = "";
  req.on("data", (c) => { body += c; });
  req.on("end", () => {
    if (req.method === "POST" && url.pathname === "/api/pro/activate") {
      let json = {};
      try { json = JSON.parse(body || "{}"); } catch { json = {}; }
      const v = verdict(String(json.key || "").trim());
      if (v !== "granted") return refuse(res, v === "missing_key" ? "invalid_key" : v);
      process.stderr.write(`pro-server: activated for ${json.label}\n`);
      return send(res, 200, KEYS[json.key]);
    }
    if (req.method !== "GET") return refuse(res, "method");
    if (url.pathname === "/r/pro/registry.json") return send(res, 200, catalogue());
    const m = url.pathname.match(/^\/r\/pro\/([a-z0-9][a-z0-9-]*)\.json$/);
    if (!m) return refuse(res, "not_found", { name: url.pathname });
    const key = (req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
    const v = verdict(key);
    if (v !== "granted") return refuse(res, v);
    const it = items()[m[1]];
    if (!it) return refuse(res, "not_found", { name: m[1] });
    return send(res, 200, it);
  });
});

server.listen(port, "127.0.0.1", () => {
  self = `http://127.0.0.1:${server.address().port}`;
  process.stdout.write(`${self}\n`);
});
