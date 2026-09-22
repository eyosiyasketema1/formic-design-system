/* The files init writes around the Formic folder: the instruction files every
   AI coding tool reads, the pre-commit hook, the `formic` script, the CSS
   imports, components.json and the ESLint ignore. Same words as install.sh,
   so the two paths leave the same project behind; the CLI's hook, script and
   instruction files pass --config=package.json to the gates, so scope and
   legacy (formicai scope) apply everywhere. */
import fs from "node:fs";
import path from "node:path";
import { say, skip, warn, note, stringify, relFrom, cssImportOrder, grey, cyan } from "./util.js";

const gatesLine = (dir, src) => `\`python3 ${dir}/scripts/formic_check.py ${src} --config=package.json\` and \`python3 ${dir}/scripts/compose_check.py ${src} --config=package.json\` (what \`npm run formic\` runs; the config names the folders in scope and the legacy ones)`;

export function claudeSection(dir, src) {
  return `

## UI: Formic AI Design System

All UI in this project is built with Formic, vendored at \`${dir}/\`. Before writing or changing any UI, read \`AGENTS.md\` at the project root and follow its procedure: import components from \`${dir}/components\` (never a raw <button>, <input>, <table> or <svg>; when no component fits, build one in \`${dir}/components\` from primitives and say so), use only the token utilities (\`text-ink\`, \`bg-surface\`, \`text-body\`, ...), never hardcode colours, font sizes, radii, shadows, or easings, and finish by running ${gatesLine(dir, src)} until both pass.
`;
}

export function cursorRule(dir, src) {
  return `---
description: Formic AI Design System, how UI is built in this project
alwaysApply: true
---

All UI in this project is built with the Formic AI Design System, vendored at \`${dir}/\`.

Before writing or changing any UI, read @AGENTS.md and follow its procedure in order: confirm \`${dir}/styles/tokens.css\` exists, read it, list \`${dir}/components/\`, import existing components instead of re-creating them, compose new patterns from \`${dir}/components/primitives.tsx\`, build only from its components (a raw <button>, <input>, <table> or <svg> in a page is a defect; when no component fits, build one in \`${dir}/components\` from primitives and say so), and finish by running ${gatesLine(dir, src)} until both pass.
`;
}

export function copilotSection(dir, src) {
  return `

## UI: Formic AI Design System

All UI in this project is built with the Formic AI Design System, vendored at \`${dir}/\`. Before writing or changing any UI, read \`AGENTS.md\` at the project root and follow its procedure: import components from \`${dir}/components\` (never a raw <button>, <input>, <table> or <svg>; when no component fits, build one in \`${dir}/components\` from primitives and say so), use only the token utilities (\`text-ink\`, \`bg-surface\`, \`text-body\`, ...), never hardcode colours, font sizes, radii, shadows, or easings, and finish by running ${gatesLine(dir, src)} until both pass.
`;
}

/* the hook checks the files in the commit, not the whole app: in an existing
   project the old pages fail the gates until they are migrated, and a hook
   that blocks every commit from day one gets deleted. `npm run formic` still
   checks all of the source folder. Both read package.json's formic section
   (--config=package.json): a staged file in a legacy folder that no scope
   folder claims is skipped with a note, never refused. */
export function hookBody(dir) {
  return `# Formic gates on the files being committed (npm run formic checks everything; package.json → formic.scope / formic.legacy decide what is gated)
FORMIC_FILES=$(git diff --cached --name-only --diff-filter=ACMR -- '*.tsx' '*.jsx' | grep -v '^${dir}/' || true)
if [ -n "$FORMIC_FILES" ]; then
  python3 ${dir}/scripts/formic_check.py --config=package.json $FORMIC_FILES && python3 ${dir}/scripts/compose_check.py --config=package.json $FORMIC_FILES || exit 1
fi`;
}

export function formicScript(dir, src) {
  return `python3 ${dir}/scripts/formic_check.py ${src} --config=package.json && python3 ${dir}/scripts/compose_check.py ${src} --config=package.json`;
}

export function writeAgentFiles(plan, dir, src) {
  const claude = plan.read("CLAUDE.md");
  if (claude === null || !claude.includes("Formic")) plan.append("CLAUDE.md", claudeSection(dir, src), "CLAUDE.md (Formic section)");
  else if (!plan.dryRun) skip("CLAUDE.md already mentions Formic");
  plan.write(".cursor/rules/formic-design-system.mdc", cursorRule(dir, src), ".cursor/rules/formic-design-system.mdc");
  const copilot = plan.read(".github/copilot-instructions.md");
  if (copilot === null || !copilot.includes("Formic")) plan.append(".github/copilot-instructions.md", copilotSection(dir, src), ".github/copilot-instructions.md (Formic section)");
  else if (!plan.dryRun) skip(".github/copilot-instructions.md already mentions Formic");
}

export function writeHook(plan, dir, { soon = false } = {}) {
  if (!plan.exists(".git")) {
    if (soon && plan.dryRun) console.log(`  ${cyan("+")} would write .git/hooks/pre-commit ${grey("(after git init)")}`);
    return false;
  }
  const p = ".git/hooks/pre-commit";
  const cur = plan.read(p);
  if (cur === null) {
    plan.write(p, `#!/bin/sh\n${hookBody(dir)}\n`, ".git/hooks/pre-commit (formic_check + compose_check run on the files of every commit)");
    plan.chmodx(p);
  } else if (!cur.includes("formic_check")) {
    plan.append(p, `\n${hookBody(dir)}\n`, ".git/hooks/pre-commit (Formic gates appended)");
  } else if (!cur.includes("--config=package.json") && /# Formic gates on the files being committed[\s\S]*?\nfi/.test(cur)) {
    /* a hook from an earlier release: same block, now reading scope and legacy */
    plan.write(p, cur.replace(/# Formic gates on the files being committed[\s\S]*?\nfi/, hookBody(dir)), ".git/hooks/pre-commit (the Formic gates now read package.json → formic.scope / legacy)");
  } else if (!plan.dryRun) skip(".git/hooks/pre-commit already runs the Formic gates");
  return true;
}

export function writePackageJson(plan, pkg, dir, src, { legacy = [] } = {}) {
  if (!pkg) return;
  const next = { ...pkg };
  const parts = [];
  if (!pkg.scripts?.formic) { next.scripts = { ...(pkg.scripts ?? {}), formic: formicScript(dir, src) }; parts.push("npm run formic (formic_check + compose_check)"); }
  else if (!pkg.scripts.formic.includes("--config=") && /^python3 \S+formic_check\.py \S+ && python3 \S+compose_check\.py \S+$/.test(pkg.scripts.formic)) {
    /* the script from an earlier release: the same two gates, now reading scope and legacy */
    next.scripts = { ...pkg.scripts, formic: formicScript(dir, src) }; parts.push("npm run formic now reads package.json → formic.scope / legacy");
  }
  const section = formicSection(pkg, dir, src, legacy);
  if (JSON.stringify(pkg.formic ?? null) !== JSON.stringify(section)) { next.formic = section; parts.push(`the formic section (dir, srcDir, scope, legacy${legacy.length ? `: ${legacy.join(", ")} marked legacy` : ""})`); }
  if (!parts.length) { if (!plan.dryRun) skip("package.json already has the formic script and section"); return; }
  plan.write("package.json", stringify(next), `package.json: ${parts.join(" and ")}`);
}

/* the three imports around @import "tailwindcss", in a file that has exactly
   one; anything less clear is printed for the person to do */
export function wireCss(plan, cssFiles, dir) {
  if (cssFiles.length === 1) {
    const file = cssFiles[0];
    const text = plan.read(file) ?? "";
    if (text.includes("formic.css")) {
      const order = cssImportOrder(text);
      if (order.join(" ") === "fonts.css tailwindcss formic.css") { if (!plan.dryRun) skip(`${file} already imports Formic`); return true; }
      warn(`${file} imports Formic in the wrong order (${order.join(", ")}); it must be fonts.css, tailwindcss, formic.css`);
      return false;
    }
    const rel = relFrom(file, dir);
    const lines = text.split("\n");
    const i = lines.findIndex((l) => l.includes('@import "tailwindcss"'));
    lines.splice(i, 1,
      `@import "${rel}/styles/fonts.css";    /* first: the Urbanist font */`,
      lines[i],
      `@import "${rel}/styles/formic.css";   /* tokens, palettes, Tailwind bridge, component sheets */`);
    plan.write(file, lines.join("\n"), `${file}: Formic imports added around @import "tailwindcss"`);
    return true;
  }
  const why = cssFiles.length === 0 ? `no stylesheet with @import "tailwindcss" was found` : `${cssFiles.length} stylesheets import tailwindcss (${cssFiles.join(", ")})`;
  warn(`${why}; add these to your global CSS, in this order:`);
  note(`      @import "<path to>/${dir}/styles/fonts.css";\n      @import "tailwindcss";\n      @import "<path to>/${dir}/styles/formic.css";`);
  return false;
}

/* components.json: the registry client's own config, so `--diff`, `--view`
   and `@formic/<name>` work with it. Its schema is strict (an unknown key
   makes the client refuse the file), so Formic's own section goes in
   package.json instead. */
export function componentsJson(existing, { cssFile, srcDir, registryUrl }) {
  const base = existing ?? {
    $schema: "https://ui.shadcn.com/schema.json",
    style: "new-york",
    rsc: false,
    tsx: true,
    tailwind: { config: "", css: cssFile ?? `${srcDir}/index.css`, baseColor: "neutral", cssVariables: true },
    aliases: { components: "@/components", utils: "@/lib/utils", ui: "@/components/ui", lib: "@/lib", hooks: "@/hooks" },
  };
  const next = { ...base };
  next.registries = { ...(base.registries ?? {}), "@formic": `${registryUrl}/{name}.json` };
  return next;
}

export function writeComponentsJson(plan, existing, opts) {
  const next = componentsJson(existing, opts);
  const what = existing ? "components.json (@formic registry added)" : "components.json (@formic registry, aliases, the stylesheet)";
  const r = plan.write("components.json", stringify(next), what);
  if (r === "same" && !plan.dryRun) skip("components.json already names the @formic registry");
}

/* package.json → "formic": where Formic is, where the app's code is, which
   folders are on Formic (`scope`) and which the gates skip until migrated
   (`legacy`; scope wins for its subtree). Read by the gates through
   --config=package.json, so formicai gates, npm run formic and the hook agree.
   A section the project already has is kept as it is; `legacy` only seeds a
   new one (init in a project with pages of its own). */
export function formicSection(pkg, dir, srcDir, legacy = []) {
  return { dir, srcDir, scope: [], legacy, ...(pkg?.formic ?? {}) };
}

/* .tsx / .jsx files under the source folder that are not Formic's: the pages
   an existing project already has. init marks their folder legacy so the
   gates and the hook leave them alone until they are moved into scope. */
export function uiFiles(cwd, srcDir, dir, limit = Infinity) {
  const out = [];
  const root = path.join(cwd, srcDir);
  if (!fs.existsSync(root)) return out;
  const walk = (d) => {
    if (out.length >= limit) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      const rel = path.relative(cwd, p).split(path.sep).join("/");
      if (e.name === "node_modules" || e.name.startsWith(".") || rel === dir || rel.startsWith(dir + "/")) continue;
      if (e.isDirectory()) walk(p);
      else if (/\.(tsx|jsx)$/.test(e.name)) { out.push(rel); if (out.length >= limit) return; }
    }
  };
  walk(root);
  return out;
}

/* ESLint: a standalone `ignores` entry is a global ignore in flat config.
   Written only into shapes that are unambiguous; anything else gets the line
   to add printed. */
export function eslintIgnore(plan, configFile, dir, write) {
  if (!configFile) return true;
  const text = plan.read(configFile) ?? "";
  if (text.includes(dir)) { if (!plan.dryRun) skip(`${configFile} already ignores ${dir}`); return true; }
  const entry = `"${dir}/**"`;
  const flat = /^eslint\.config\./.test(configFile);
  if (write && flat) {
    let next = null;
    /* first choice: a new first entry with only `ignores`, which is a global
       ignore whatever the other entries say; the config is an array
       (export default [ … ]) or a call that takes one (defineConfig([ … ]),
       tseslint.config( … )). Second choice: an existing `ignores` array.
       Anything else is printed for the person. */
    const open = text.match(/export\s+default\s+(?:defineConfig\(\s*\[|tseslint\.config\(|\[)/);
    const m = text.match(/ignores\s*:\s*\[/);
    if (open) {
      const at = open.index + open[0].length;
      next = text.slice(0, at) + `\n  { ignores: [${entry}] },` + text.slice(at);
    } else if (m) next = text.slice(0, m.index + m[0].length) + entry + ", " + text.slice(m.index + m[0].length);
    if (next) {
      plan.write(configFile, next, `${configFile}: ${dir}/** ignored (Formic keeps its own lint conventions)`);
      return true;
    }
  }
  note(`\nNote: your ESLint config does not ignore ${dir}. Formic keeps its own conventions (it uses useEffect and a few patterns\n      a strict project config may ban); add ${grey(`{ ignores: [${entry}] }`)} to ${configFile} so the vendored files do not fail your lint${flat && !write ? ", or run formicai init --eslint-ignore to have it written" : ""}.`);
  return false;
}

/* formic.config.json seeded from what index.html already says, as install.sh does */
export function seedConfig(cwd, content) {
  const html = path.join(cwd, "index.html");
  if (!fs.existsSync(html)) return content;
  const text = fs.readFileSync(html, "utf8");
  if (!text.includes('id="root"')) return content;
  const tag = text.match(/<html\b([^>]*)>/);
  if (!tag) return content;
  let cfg;
  try { cfg = JSON.parse(content); } catch { return content; }
  for (const [, k, v] of tag[1].matchAll(/data-(theme|palette|radius|corners|size|type|layout)="([^"]+)"/g)) cfg[k] = v;
  return stringify(cfg);
}

export const migrationPrompt = (dir, src) =>
  `Use Formic (${dir}), read AGENTS.md, then migrate this whole app to Formic the way AGENTS.md (Migrating an existing app) says: run npx formicai inventory for the list, show me the plan, then folder by folder run npx formicai scope add <folder>, npx formicai migrate <file> --write on each file, finish each file by hand until both gates print clean. Keep every route, behaviour and data call; do not leave any page on the old UI.`;
