/* Shared helpers for every formicai command: coloured one-line messages in
   the installer's voice, a dry-run aware writer, project detection (framework,
   source folder, global CSS, package manager) and process spawning. Only
   node:child_process, node:fs and node:path are used, so the package has no
   dependencies. */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const tty = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code) => (s) => (tty ? `\x1b[${code}m${s}\x1b[0m` : s);
export const green = paint(32), red = paint(31), grey = paint(90), yellow = paint(33), bold = paint(1), cyan = paint(36);

export const say = (m) => console.log(`  ${green("✓")} ${m}`);
export const skip = (m) => console.log(`  ${grey("–")} ${m}`);
export const warn = (m) => console.log(`  ${yellow("!")} ${m}`);
export const bad = (m) => console.log(`  ${red("✗")} ${m}`);
export const note = (m) => console.log(m);

export class CliError extends Error {}
export const die = (m) => { throw new CliError(m); };

/* Every write and every command goes through a Plan. With --dry-run it only
   says what it would do; otherwise it does it and says what it did. */
export class Plan {
  constructor({ dryRun = false, cwd = process.cwd() } = {}) {
    this.dryRun = dryRun;
    this.cwd = cwd;
    this.touched = [];
  }
  abs(p) { return path.isAbsolute(p) ? p : path.join(this.cwd, p); }
  exists(p) { return fs.existsSync(this.abs(p)); }
  read(p) { return fs.existsSync(this.abs(p)) ? fs.readFileSync(this.abs(p), "utf8") : null; }
  write(p, content, what) {
    const abs = this.abs(p);
    const had = fs.existsSync(abs);
    const same = had && fs.readFileSync(abs, "utf8") === content;
    if (same) return "same";
    const verb = had ? "change" : "write";
    if (this.dryRun) {
      const why = what && what.startsWith(p) ? what.slice(p.length).trim() : what;
      console.log(`  ${cyan(verb === "write" ? "+" : "~")} would ${verb} ${p}${why ? grey(`  ${why}`) : ""}`);
    } else {
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, content);
      if (what) say(what);
    }
    this.touched.push(p);
    return verb;
  }
  append(p, content, what) {
    const cur = this.read(p) ?? "";
    return this.write(p, cur + content, what);
  }
  chmodx(p) { if (!this.dryRun) fs.chmodSync(this.abs(p), 0o755); }
  /* run <cmd> and stream its output; returns the exit status */
  run(cmd, args, { what, quiet = false, env, cwd } = {}) {
    const line = [cmd, ...args].join(" ");
    if (this.dryRun) { console.log(`  ${cyan("$")} would run ${line}`); return 0; }
    if (what) console.log(`\n${what} (${grey(line)})`);
    const r = spawnSync(cmd, args, { cwd: cwd ?? this.cwd, stdio: quiet ? ["ignore", "pipe", "pipe"] : "inherit", env: { ...process.env, ...env }, shell: process.platform === "win32" });
    if (r.error) return 127;
    return r.status ?? 1;
  }
}

/* run a command and capture its output (never dry-run aware: only reads) */
export function capture(cmd, args, cwd) {
  const r = spawnSync(cmd, args, { cwd, encoding: "utf8", shell: process.platform === "win32" });
  return { status: r.error ? 127 : r.status ?? 1, out: (r.stdout ?? "") + (r.stderr ?? "") };
}

export const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
export const tryJson = (p) => { try { return readJson(p); } catch { return null; } };
export const stringify = (o) => JSON.stringify(o, null, 2) + "\n";

/* The package manager, from the lockfile the project keeps */
export function detectPm(cwd) {
  if (fs.existsSync(path.join(cwd, "pnpm-lock.yaml"))) return "pnpm";
  if (fs.existsSync(path.join(cwd, "yarn.lock"))) return "yarn";
  if (fs.existsSync(path.join(cwd, "bun.lockb")) || fs.existsSync(path.join(cwd, "bun.lock"))) return "bun";
  return "npm";
}
export function installArgs(pm, pkgs) {
  if (pm === "pnpm") return ["pnpm", ["add", ...pkgs]];
  if (pm === "yarn") return ["yarn", ["add", ...pkgs]];
  if (pm === "bun") return ["bun", ["add", ...pkgs]];
  return ["npm", ["install", "--no-fund", "--no-audit", ...pkgs]];
}
export function installAllArgs(pm) {
  if (pm === "pnpm") return ["pnpm", ["install"]];
  if (pm === "yarn") return ["yarn", ["install"]];
  if (pm === "bun") return ["bun", ["install"]];
  return ["npm", ["install", "--no-fund", "--no-audit"]];
}

/* css files that hold @import "tailwindcss", outside the Formic folder */
export function findGlobalCss(cwd, dir) {
  const hits = [];
  const roots = ["src", "app", "styles", "."].map((r) => path.join(cwd, r)).filter((r) => fs.existsSync(r));
  const walk = (d, depth) => {
    if (depth > 4) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      const rel = path.relative(cwd, p);
      if (e.name === "node_modules" || e.name.startsWith(".") || rel === dir || rel.startsWith(dir + path.sep) || e.name === "dist" || e.name === "build") continue;
      if (e.isDirectory()) walk(p, depth + 1);
      else if (e.name.endsWith(".css") && fs.readFileSync(p, "utf8").includes('@import "tailwindcss"')) hits.push(rel);
    }
  };
  for (const r of roots) walk(r, r === cwd ? 4 : 0);
  return [...new Set(hits)].sort((a, b) => a.length - b.length);
}

/* the order the three imports appear in a stylesheet */
export function cssImportOrder(text) {
  const found = [];
  for (const line of text.split("\n")) {
    if (!line.includes("@import")) continue;
    if (line.includes("fonts.css")) found.push("fonts.css");
    else if (line.includes('"tailwindcss"')) found.push("tailwindcss");
    else if (line.includes("formic.css")) found.push("formic.css");
  }
  return found;
}

/* the path from a css file to the Formic folder, as an @import would write it */
export function relFrom(fromFile, toDir) {
  let rel = path.relative(path.dirname(fromFile), toDir).split(path.sep).join("/");
  if (!rel.startsWith(".")) rel = "./" + rel;
  return rel;
}

/* what kind of project this is */
export function detectProject(cwd, dir = "src/formic") {
  const pkgPath = path.join(cwd, "package.json");
  const pkg = fs.existsSync(pkgPath) ? tryJson(pkgPath) : null;
  const deps = { ...(pkg?.dependencies ?? {}), ...(pkg?.devDependencies ?? {}) };
  const has = (n) => Object.hasOwn(deps, n);
  const framework = has("next") ? "next" : has("vite") ? "vite" : "other";
  const srcDir = fs.existsSync(path.join(cwd, "src")) ? "src" : fs.existsSync(path.join(cwd, "app")) ? "app" : "src";
  const bundlerConfig = ["vite.config.ts", "vite.config.js", "vite.config.mts", "vite.config.mjs", "next.config.ts", "next.config.js", "next.config.mjs"].find((f) => fs.existsSync(path.join(cwd, f))) ?? null;
  const eslintConfig = ["eslint.config.js", "eslint.config.mjs", "eslint.config.cjs", "eslint.config.ts", "eslint.config.mts", ".eslintrc.js", ".eslintrc.cjs", ".eslintrc.json", ".eslintrc"].find((f) => fs.existsSync(path.join(cwd, f))) ?? null;
  const components = tryJson(path.join(cwd, "components.json"));
  const cssFiles = findGlobalCss(cwd, dir);
  const cssFile = components?.tailwind?.css && fs.existsSync(path.join(cwd, components.tailwind.css)) ? components.tailwind.css : cssFiles[0] ?? null;
  return {
    cwd, pkg, deps, has, framework, srcDir: pkg?.formic?.srcDir ?? srcDir, dir: pkg?.formic?.dir ?? dir,
    scope: pkg?.formic?.scope ?? [], legacy: pkg?.formic?.legacy ?? [],
    bundlerConfig, eslintConfig, components, cssFiles, cssFile, pm: detectPm(cwd),
    installed: fs.existsSync(path.join(cwd, dir, "VERSION")),
    tsconfig: tryJson(path.join(cwd, "tsconfig.json")),
    git: fs.existsSync(path.join(cwd, ".git")),
  };
}

/* the version line of src/formic/VERSION: "formic-design-system 0.3.0 (…)" */
export function installedVersion(cwd, dir) {
  const p = path.join(cwd, dir, "VERSION");
  if (!fs.existsSync(p)) return null;
  const m = fs.readFileSync(p, "utf8").match(/formic-design-system\s+(\S+)/);
  return m ? m[1] : "unknown";
}

/* argv → { _: positionals, flags } ; "--name value" for the keys in `takes` */
export function parseArgs(argv, takes = []) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--") { out._.push(...argv.slice(i + 1)); break; }
    if (a.startsWith("--")) {
      const [k, v] = a.slice(2).split("=");
      if (v !== undefined) out[k] = v;
      else if (takes.includes(k) && argv[i + 1] !== undefined && !argv[i + 1].startsWith("-")) out[k] = argv[++i];
      else out[k] = true;
    } else if (a === "-h") out.help = true;
    else if (a === "-y") out.yes = true;
    else if (a === "-v") out.version = true;
    else out._.push(a);
  }
  return out;
}

export function askYesNo(question) {
  /* a synchronous y/n on the terminal; anything but y is no */
  if (!process.stdin.isTTY) return false;
  const buf = Buffer.alloc(64);
  process.stdout.write(`${question} ${grey("(y/N)")} `);
  let n = 0;
  try { n = fs.readSync(0, buf, 0, 64, null); } catch { return false; }
  const a = buf.toString("utf8", 0, n).trim().toLowerCase();
  return a === "y" || a === "yes";
}
