/* formicai mcp [install]

   A Model Context Protocol server over stdio, so Claude Code, Cursor and
   any other MCP client can browse and install Formic without reading the
   gallery: list_components, component_docs, add_component, inventory,
   doctor, gates. JSON-RPC 2.0, one message per line, nothing on stdout
   that is not a message (logs go to stderr), the handshake the 2025-06-18
   specification asks for (initialize, notifications/initialized,
   tools/list, tools/call, ping). No SDK: the CLI stays dependency-free.

   `formicai mcp install` writes the server into .mcp.json (Claude Code)
   and .cursor/mcp.json (Cursor), merging with what is there; init runs it. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { Plan, say, skip, note, stringify, tryJson, detectProject } from "./util.js";
import { listing, reference, renderReference } from "./docs.js";

export const help = `formicai mcp [install]

  Runs the Formic MCP server on stdio (what the entry in .mcp.json starts;
  you never run it by hand). The tools it offers:

    list_components   every component: name, title, description, installed
    component_docs    props, dependencies and an example for one component
    add_component     adds components (npx formicai add) and says what it wrote
    inventory         the files still to migrate, worst first
    doctor            the setup report
    gates             both gates on the source folder

  formicai mcp install   writes the server into .mcp.json (Claude Code) and
                         .cursor/mcp.json (Cursor), keeping other servers;
                         formicai init runs it, --no-mcp skips it

  Example
    npx formicai mcp install
`;

const PROTOCOL = "2025-06-18";
const here = path.dirname(fileURLToPath(import.meta.url));
const BIN = path.join(here, "..", "bin", "formicai.js");
const version = JSON.parse(fs.readFileSync(path.join(here, "..", "package.json"), "utf8")).version;

const TOOLS = [
  { name: "list_components", title: "List Formic components", description: "Every component in the Formic registry with its name, title, one-line description and whether it is installed in this project (src/formic/components). Use it to find the component for a piece of UI before writing one.", inputSchema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "component_docs", title: "Component reference", description: "The reference for one component: title, description, file, props with types, defaults and doc comments, its dependencies, and an example import plus the simplest JSX. Works before the component is installed.", inputSchema: { type: "object", properties: { name: { type: "string", description: "the registry name, e.g. data-table (list_components has them)" } }, required: ["name"], additionalProperties: false } },
  { name: "add_component", title: "Add components", description: "Installs one or more components into src/formic with whatever they need (npx formicai add) and returns the files written. Run it when a component you need is not in src/formic/components; never write a stand-in.", inputSchema: { type: "object", properties: { names: { type: "array", items: { type: "string" }, minItems: 1, description: "registry names, e.g. [\"data-table\", \"panel\"]" }, overwrite: { type: "boolean", description: "replace files that exist and differ (default false)" } }, required: ["names"], additionalProperties: false } },
  { name: "inventory", title: "Migration inventory", description: "Every UI file with its issue count and whether it imports Formic, worst first (npx formicai inventory); legacy folders are marked.", inputSchema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "doctor", title: "Check the setup", description: "The setup report (npx formicai doctor): Node, Tailwind v4, the CSS imports, the alias, peer packages, a second UI kit, components.json, the installed version, the ESLint ignore, formic.config.json, the hook, each with its fix.", inputSchema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "gates", title: "Run both gates", description: "Runs formic_check.py and compose_check.py on the source folder (npx formicai gates) and returns their output. Both must print clean before UI work is done.", inputSchema: { type: "object", properties: {}, additionalProperties: false } },
];

/* the CLI commands that print, run as a child so their output never lands
   on this process's stdout (which carries only JSON-RPC) */
function cli(args, cwd) {
  const r = spawnSync(process.execPath, [BIN, ...args], { cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" }, shell: false });
  const out = ((r.stdout ?? "") + (r.stderr ?? "")).trim();
  return { status: r.error ? 127 : r.status ?? 1, out };
}

export async function callTool(name, args = {}, cwd = process.cwd()) {
  const text = (t, isError = false) => ({ content: [{ type: "text", text: t }], isError });
  switch (name) {
    case "list_components": {
      const items = await listing(cwd);
      const lines = items.map((it) => `${it.name.padEnd(22)} ${it.installed ? "installed  " : "           "} ${it.title}: ${it.description}`);
      return { ...text(lines.join("\n")), structuredContent: { components: items } };
    }
    case "component_docs": {
      if (!args.name || typeof args.name !== "string") return text("component_docs needs a name (list_components has them)", true);
      try {
        const r = await reference(args.name.trim(), cwd);
        return { ...text(renderReference(r)), structuredContent: r };
      } catch (e) { return text(e.message, true); }
    }
    case "add_component": {
      const names = Array.isArray(args.names) ? args.names.map(String) : [];
      if (!names.length) return text("add_component needs names, e.g. [\"data-table\"]", true);
      const r = cli(["add", ...names, ...(args.overwrite ? ["--overwrite"] : [])], cwd);
      const written = [...r.out.matchAll(/✓ (.+?) in (\S+)/g)].flatMap((m) => m[1].split(", ").map((f) => f.replace(/ and \d+ more$/, "")).filter((f) => /\.(tsx?|css|py|json)$/.test(f)).map((f) => `${m[2]}/${f}`));
      return { ...text(r.out || `added ${names.join(", ")}`, r.status !== 0), structuredContent: { ok: r.status === 0, files: written, output: r.out } };
    }
    case "inventory": { const r = cli(["inventory"], cwd); return text(r.out, r.status !== 0); }
    case "doctor": { const r = cli(["doctor"], cwd); return text(r.out, false); }
    case "gates": { const r = cli(["gates"], cwd); return text(r.out || (r.status === 0 ? "both gates clean" : "the gates failed"), r.status !== 0); }
    default: return null;
  }
}

/* ── the server ─────────────────────────────────────────── */

function serve() {
  const cwd = process.cwd();
  const send = (msg) => process.stdout.write(JSON.stringify(msg) + "\n");
  const reply = (id, result) => send({ jsonrpc: "2.0", id, result });
  const fail = (id, code, message) => send({ jsonrpc: "2.0", id, error: { code, message } });
  const handle = async (msg) => {
    if (!msg || typeof msg !== "object" || msg.jsonrpc !== "2.0") { if (msg?.id !== undefined) fail(msg.id, -32600, "invalid request"); return; }
    const { id, method, params } = msg;
    if (method === undefined) return; /* a response to something we never sent */
    const isNotification = id === undefined;
    try {
      switch (method) {
        case "initialize":
          return reply(id, { protocolVersion: PROTOCOL, capabilities: { tools: { listChanged: false } }, serverInfo: { name: "formic", title: "Formic AI Design System", version }, instructions: "Formic is vendored at src/formic. Before writing UI, list_components; when a piece you need is not installed, add_component; component_docs gives the props and an example; finish with gates until both print clean. Never write a stand-in for a component the registry has." });
        case "notifications/initialized":
        case "notifications/cancelled":
        case "notifications/roots/list_changed":
          return;
        case "ping":
          return reply(id, {});
        case "tools/list":
          return reply(id, { tools: TOOLS });
        case "tools/call": {
          const name = params?.name;
          if (!TOOLS.some((t) => t.name === name)) return fail(id, -32602, `unknown tool: ${name}`);
          const result = await callTool(name, params?.arguments ?? {}, cwd);
          return reply(id, result);
        }
        default:
          if (!isNotification) fail(id, -32601, `method not found: ${method}`);
      }
    } catch (e) {
      if (!isNotification) fail(id, -32603, e.message ?? String(e));
      else process.stderr.write(`formic mcp: ${e.message ?? e}\n`);
    }
  };
  let buf = "";
  let queue = Promise.resolve();
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => {
    buf += chunk;
    let nl;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      let msg;
      try { msg = JSON.parse(line); } catch { send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "parse error" } }); continue; }
      const batch = Array.isArray(msg) ? msg : [msg];
      for (const m of batch) queue = queue.then(() => handle(m));
    }
  });
  process.stdin.on("end", () => { queue.then(() => process.exit(0)); });
  return new Promise(() => {});
}

/* ── the client config ──────────────────────────────────── */

export const SERVER_ENTRY = { command: "npx", args: ["formicai", "mcp"] };

export function installEntry(plan, file) {
  const cur = plan.read(file);
  let cfg = cur === null ? {} : tryJson(plan.abs(file));
  if (cur !== null && (cfg === null || typeof cfg !== "object" || Array.isArray(cfg))) { note(`  ! ${file} is not a JSON object; add the formic server by hand: "mcpServers": { "formic": ${JSON.stringify(SERVER_ENTRY)} }`); return false; }
  cfg = cfg ?? {};
  const servers = { ...(cfg.mcpServers ?? {}) };
  if (servers.formic && JSON.stringify(servers.formic) === JSON.stringify(SERVER_ENTRY)) { if (!plan.dryRun) skip(`${file} already starts the Formic MCP server`); return true; }
  servers.formic = SERVER_ENTRY;
  const next = { ...cfg, mcpServers: servers };
  plan.write(file, stringify(next), `${file} (formic MCP server: list_components, component_docs, add_component, inventory, doctor, gates)`);
  return true;
}

export function install(plan) {
  installEntry(plan, ".mcp.json");
  installEntry(plan, ".cursor/mcp.json");
}

export async function run(flags) {
  const sub = flags._[0];
  if (sub === "install") {
    const plan = new Plan({ dryRun: Boolean(flags["dry-run"]) });
    const p = detectProject(plan.cwd);
    if (!p.pkg) { note("  ! no package.json here; run formicai mcp install in the root of your app"); return 1; }
    install(plan);
    if (!plan.dryRun) say("restart Claude Code or Cursor in this folder and the formic tools appear");
    return 0;
  }
  if (sub) { note(`  ! unknown: formicai mcp ${sub} (formicai mcp runs the server, formicai mcp install registers it)`); return 2; }
  return serve();
}
