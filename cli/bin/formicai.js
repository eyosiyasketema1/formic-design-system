#!/usr/bin/env node
/* formicai: the Formic AI Design System command line.
   npx formicai init | add | update | doctor | gates | inventory | scope | migrate | docs | mcp | preset */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, CliError, red } from "../lib/util.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const version = JSON.parse(fs.readFileSync(path.join(here, "..", "package.json"), "utf8")).version;

const usage = `formicai ${version}: the Formic AI Design System

  npx formicai init [--new <dir>]   add Formic to this project, or start a new app
  npx formicai add <name…>          add components (formicai add --list shows them)
  npx formicai update               refresh the installed files from the registry
  npx formicai doctor               check the setup and say what to fix
  npx formicai gates                run both gates on the source folder
  npx formicai inventory            list the files still to migrate, worst first
  npx formicai scope add <folder>   put a folder of an existing app under the gates
  npx formicai migrate <file…>      rewrite the mechanical part of a page onto Formic
  npx formicai docs [<name>]        a component's props and an example, or the whole list
  npx formicai mcp install          register the Formic MCP server for Claude Code and Cursor
  npx formicai preset               this project's design choices as one code (init --preset)

  formicai <command> --help for the options. --dry-run on init, add and
  update shows what would change and writes nothing. FORMIC_REGISTRY
  overrides the registry URL (https://formicai.dev/r).
`;

const commands = {
  init: async () => (await import("../lib/init.js")),
  add: async () => (await import("../lib/add.js")),
  update: async () => (await import("../lib/update.js")),
  doctor: async () => (await import("../lib/doctor.js")),
  gates: async () => { const m = await import("../lib/gates.js"); return { help: m.helpGates, run: m.gates }; },
  inventory: async () => { const m = await import("../lib/gates.js"); return { help: m.helpInventory, run: m.inventory }; },
  scope: async () => (await import("../lib/scope.js")),
  migrate: async () => (await import("../lib/migrate.js")),
  docs: async () => (await import("../lib/docs.js")),
  mcp: async () => (await import("../lib/mcp.js")),
  preset: async () => (await import("../lib/preset.js")),
};

async function main() {
  const argv = process.argv.slice(2);
  const cmd = argv[0];
  const flags = parseArgs(argv.slice(1), ["new", "preset"]);
  if (!cmd || cmd === "--help" || cmd === "-h" || cmd === "help") { process.stdout.write(usage); return 0; }
  if (cmd === "--version" || cmd === "-v" || cmd === "version") { console.log(version); return 0; }
  if (!commands[cmd]) { process.stderr.write(`  ${red("✗")} unknown command "${cmd}"\n\n${usage}`); return 2; }
  const mod = await commands[cmd]();
  if (flags.help) { process.stdout.write(mod.help); return 0; }
  return (await mod.run(flags)) ?? 0;
}

main().then((code) => process.exit(code), (e) => {
  if (e instanceof CliError) process.stderr.write(`  ${red("✗")} ${e.message}\n`);
  else process.stderr.write(`  ${red("✗")} ${e.stack ?? e}\n`);
  process.exit(1);
});
