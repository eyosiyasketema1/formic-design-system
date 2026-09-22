/* formicai doctor: one line per check, and for every ✗ the exact fix. */
import fs from "node:fs";
import path from "node:path";
import { green, red, grey, yellow, note, detectProject, cssImportOrder, installedVersion, tryJson } from "./util.js";
import { BASE, catalogue } from "./registry.js";

export const help = `formicai doctor

  Checks that the project is ready for Formic and says what to fix:
  Node, the package manager, Tailwind v4, the three CSS imports and their
  order, the @ alias, the peer packages, components.json, the installed
  version against the registry, the ESLint ignore, formic.config.json and
  the pre-commit hook. Exits 1 when anything is wrong.

  Example
    npx formicai doctor
`;

const CONFIG_KEYS = ["accent", "palette", "paletteColor", "radius", "cardRadius", "corners", "controls", "size", "type", "theme", "avatar", "sidebar", "sidebarState", "font", "layout", "motion"];
const PEERS = ["@phosphor-icons/react", "@dicebear/core", "@dicebear/notionists"];

export async function run() {
  const cwd = process.cwd();
  const p = detectProject(cwd);
  const { dir, srcDir } = p;
  let bad = 0;
  const ok = (m) => note(`  ${green("✓")} ${m}`);
  const no = (m, fix) => { bad++; note(`  ${red("✗")} ${m}\n      ${yellow("fix:")} ${fix}`); };
  const na = (m) => note(`  ${grey("–")} ${m}`);
  note("");

  const major = Number(process.versions.node.split(".")[0]);
  if (major >= 20) ok(`Node ${process.versions.node}`); else no(`Node ${process.versions.node} is too old`, "install Node 20 or newer (https://nodejs.org)");

  if (!p.pkg) { no("no package.json here", "run formicai doctor in the root of your app"); return finish(bad); }
  ok(`package manager: ${p.pm}${p.pm === "npm" && !fs.existsSync(path.join(cwd, "package-lock.json")) ? grey(" (no lockfile yet)") : ""}`);

  const tw = p.deps.tailwindcss;
  const twMajor = tw ? Number((tw.match(/\d+/) ?? ["0"])[0]) : 0;
  if (twMajor >= 4) ok(`tailwindcss ${tw}`);
  else if (tw) no(`tailwindcss ${tw}; Formic needs v4`, `${p.pm === "npm" ? "npm install -D" : p.pm + " add -D"} tailwindcss@^4 (and @tailwindcss/vite or @tailwindcss/postcss)`);
  else no("tailwindcss is not in package.json", `${p.pm === "npm" ? "npm install -D" : p.pm + " add -D"} tailwindcss@^4 (and @tailwindcss/vite or @tailwindcss/postcss)`);

  if (p.installed) ok(`Formic ${installedVersion(cwd, dir)} in ${dir}`); else no(`Formic is not installed in ${dir}`, "formicai init");

  if (p.cssFile) {
    const order = cssImportOrder(fs.readFileSync(path.join(cwd, p.cssFile), "utf8"));
    if (order.join(" ") === "fonts.css tailwindcss formic.css") ok(`${p.cssFile} imports fonts.css, tailwindcss, formic.css in order`);
    else no(`${p.cssFile} imports: ${order.join(", ") || "none of the three"}`, `in ${p.cssFile}, in this order: @import "<path>/${dir}/styles/fonts.css"; @import "tailwindcss"; @import "<path>/${dir}/styles/formic.css"; (formicai init writes them)`);
  } else no(`no stylesheet with @import "tailwindcss" found`, `create ${srcDir}/index.css with the three imports and import it from your entry file`);

  const paths = p.tsconfig?.compilerOptions?.paths ?? {};
  const tsAlias = Object.keys(paths).some((k) => k.startsWith("@/"));
  const bundler = p.bundlerConfig ? fs.readFileSync(path.join(cwd, p.bundlerConfig), "utf8") : "";
  if (p.framework === "next") { if (tsAlias) ok(`@ alias in tsconfig.json (Next.js reads it)`); else no("no @/* alias in tsconfig.json", `add "paths": { "@/*": ["./*"] } under compilerOptions in tsconfig.json`); }
  else {
    const viteAlias = /alias[\s\S]{0,200}["']@["']\s*:/.test(bundler) || /find:\s*["']@["']/.test(bundler);
    if (tsAlias && viteAlias) ok(`@ alias in tsconfig.json and ${p.bundlerConfig}`);
    else if (!tsAlias && !viteAlias) na(`no @ alias (relative imports work; add one in tsconfig.json paths and ${p.bundlerConfig ?? "the bundler config"} to import "@/formic/…")`);
    else if (tsAlias) no(`@ alias is in tsconfig.json but not in ${p.bundlerConfig ?? "the bundler config"}`, `in ${p.bundlerConfig ?? "vite.config.ts"}: resolve: { alias: { "@": fileURLToPath(new URL("./${srcDir}", import.meta.url)) } }`);
    else no(`@ alias is in ${p.bundlerConfig} but not in tsconfig.json`, `add "baseUrl": ".", "paths": { "@/*": ["${srcDir}/*"] } under compilerOptions in tsconfig.json`);
  }

  const missingPeers = PEERS.filter((n) => !fs.existsSync(path.join(cwd, "node_modules", n)));
  const notListed = PEERS.filter((n) => !p.has(n));
  if (missingPeers.length === 0 && notListed.length === 0) ok(`peer packages installed (${PEERS.join(", ")})`);
  else no(`peer packages missing: ${[...new Set([...notListed, ...missingPeers])].join(", ")}`, `${p.pm === "npm" ? "npm install" : p.pm + " add"} ${[...new Set([...notListed, ...missingPeers])].join(" ")}`);

  if (p.components?.registries?.["@formic"]) ok(`components.json names the @formic registry`);
  else if (p.components) no("components.json has no @formic registry", `formicai init adds it (or put "registries": { "@formic": "${BASE}/{name}.json" } in components.json)`);
  else no("no components.json", "formicai init writes it");

  const local = installedVersion(cwd, dir);
  if (local) {
    try {
      const idx = await catalogue();
      const remote = idx.version ?? idx.items?.find?.((i) => i.name === "formic")?.meta?.formic?.version ?? null;
      if (!remote) na(`registry version unknown (${BASE}/registry.json has no version field)`);
      else if (remote === local) ok(`Formic ${local} is the current release`);
      else no(`Formic ${local} installed, ${remote} in the registry`, "formicai update");
    } catch (e) { na(`registry not reachable (${e.message.split("(")[0].trim()}); version not compared`); }
  }

  if (p.eslintConfig) {
    const text = fs.readFileSync(path.join(cwd, p.eslintConfig), "utf8");
    if (text.includes(dir)) ok(`${p.eslintConfig} ignores ${dir}`);
    else no(`${p.eslintConfig} does not ignore ${dir}`, `formicai init --eslint-ignore, or add { ignores: ["${dir}/**"] } to ${p.eslintConfig}`);
  } else na("no ESLint config");

  const cfgPath = path.join(cwd, dir, "formic.config.json");
  if (fs.existsSync(cfgPath)) {
    const cfg = tryJson(cfgPath);
    if (!cfg || typeof cfg !== "object") no(`${dir}/formic.config.json is not valid JSON`, "fix the JSON, or copy a fresh block from https://formicai.dev/customize");
    else {
      const unknown = Object.keys(cfg).filter((k) => !CONFIG_KEYS.includes(k));
      if (unknown.length) no(`${dir}/formic.config.json has unknown keys: ${unknown.join(", ")}`, `known keys are ${CONFIG_KEYS.join(", ")}`);
      else ok(`${dir}/formic.config.json is valid (${Object.keys(cfg).length} keys)`);
    }
  } else if (p.installed) no(`${dir}/formic.config.json is missing`, "formicai init writes the stock one, or paste a block from https://formicai.dev/customize");

  if (p.git) {
    const hook = path.join(cwd, ".git", "hooks", "pre-commit");
    if (fs.existsSync(hook) && fs.readFileSync(hook, "utf8").includes("formic_check")) ok("pre-commit hook runs the Formic gates on staged files");
    else no("no pre-commit hook with the Formic gates", "formicai init writes it (it only checks the files in each commit)");
  } else na("not a git repository, so no pre-commit hook");

  if (p.pkg.scripts?.formic) ok("npm run formic runs both gates"); else if (p.installed) no("package.json has no formic script", `formicai init adds it: "formic": "python3 ${dir}/scripts/formic_check.py ${srcDir} && python3 ${dir}/scripts/compose_check.py ${srcDir}"`);

  return finish(bad);
}

function finish(bad) {
  note(bad ? `\n${bad} thing(s) to fix.\n` : `\nAll good.\n`);
  return bad ? 1 : 0;
}
