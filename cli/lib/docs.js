/* formicai docs [<name>]

   The reference for one component, from the terminal: its title and
   description, the file it lives in, its props (read from the exported
   function's props type in the .tsx), what it depends on, and one example.
   The source is the installed copy in src/formic when there is one, else the
   registry item's file content, so `docs` works before `add`. Without a name
   it lists every item with its one-line description, Formic Pro after the
   free ones. A Pro item is read with the key; without one the public index
   still gives the title, description and dependencies, and the props say
   what to do. `formicai mcp` serves the same text as the component_docs
   tool. */
import fs from "node:fs";
import path from "node:path";
import { note, bold, grey, cyan, die, detectProject } from "./util.js";
import { ALL_ITEM, BASE_ITEM, catalogue, fetchItem, nameOf, nearest } from "./registry.js";
import { KEY_LINE, ProRefused, fetchProItem, proCatalogue, proUnreachableNote, readKey } from "./pro.js";

export const help = `formicai docs [<name>]

  Prints a component's reference: title, description, file, props (with
  their types, defaults and doc comments), its dependencies, and an example
  import plus the simplest JSX. Without a name, lists every component with
  its one-line description, Formic Pro items after the free ones. A Pro
  item's props need the key (npx formicai key <key>); the rest shows without.

  --json            the same as JSON (what the MCP server returns)

  Examples
    npx formicai docs
    npx formicai docs data-table
    npx formicai docs button --json
`;

/* ── source parsing ─────────────────────────────────────── */

/* index of the bracket that closes the one at `open` */
function matching(src, open) {
  const pairs = { "(": ")", "{": "}", "[": "]", "<": ">" };
  const close = pairs[src[open]];
  let depth = 0, i = open;
  let str = null;
  for (; i < src.length; i++) {
    const c = src[i];
    if (str) { if (c === "\\") i++; else if (c === str) str = null; continue; }
    if (c === '"' || c === "'" || c === "`") { str = c; continue; }
    if (c === "/" && src[i + 1] === "*") { i = src.indexOf("*/", i + 2) + 1; continue; }
    if (c === "/" && src[i + 1] === "/") { i = src.indexOf("\n", i); continue; }
    if (c === src[open]) depth++;
    else if (c === close && --depth === 0) return i;
  }
  return -1;
}

/* the members of a `{ … }` type block at depth 0, each with its doc comment */
function members(block) {
  const body = block.slice(1, -1);
  const out = [];
  let i = 0, doc = "";
  while (i < body.length) {
    while (i < body.length && /\s/.test(body[i])) i++;
    if (i >= body.length) break;
    if (body.startsWith("/**", i)) { const e = body.indexOf("*/", i); doc = body.slice(i + 3, e).replace(/^\s*\*\s?/gm, "").replace(/\s+/g, " ").trim(); i = e + 2; continue; }
    if (body.startsWith("//", i)) { i = body.indexOf("\n", i); if (i < 0) break; continue; }
    /* one member runs to the next `;` or newline at depth 0 */
    let j = i, depth = 0, str = null;
    for (; j < body.length; j++) {
      const c = body[j];
      if (str) { if (c === "\\") j++; else if (c === str) str = null; continue; }
      if (c === '"' || c === "'" || c === "`") { str = c; continue; }
      if ("({[<".includes(c)) depth++;
      else if (c === ">" && body[j - 1] === "=") continue; /* an arrow, not a generic */
      else if (")}]>".includes(c)) depth--;
      else if (depth === 0 && (c === ";" || c === "\n")) break;
    }
    const text = body.slice(i, j).trim();
    i = j + 1;
    if (!text) continue;
    const m = text.match(/^(?:readonly\s+)?([A-Za-z_$][\w$]*|"[^"]+")(\?)?\s*:\s*([\s\S]+)$/);
    if (m) out.push({ name: m[1].replace(/"/g, ""), optional: Boolean(m[2]), type: m[3].replace(/\s+/g, " ").trim(), doc });
    doc = "";
  }
  return out;
}

/* `name = value` pairs of a destructuring pattern `{ a = 1, b, ...rest }` */
function defaults(pattern) {
  const out = {};
  const body = pattern.slice(1, -1);
  let i = 0;
  while (i < body.length) {
    let j = i, depth = 0, str = null;
    for (; j < body.length; j++) {
      const c = body[j];
      if (str) { if (c === "\\") j++; else if (c === str) str = null; continue; }
      if (c === '"' || c === "'" || c === "`") { str = c; continue; }
      if ("({[<".includes(c)) depth++;
      else if (c === ">" && body[j - 1] === "=") continue; /* an arrow, not a generic */
      else if (")}]>".includes(c)) depth--;
      else if (depth === 0 && c === ",") break;
    }
    const part = body.slice(i, j).trim();
    i = j + 1;
    const m = part.match(/^([A-Za-z_$][\w$]*)\s*=\s*([\s\S]+)$/);
    if (m) out[m[1]] = m[2].replace(/\s+/g, " ").trim();
  }
  return out;
}

/* a string-literal union alias in the file: type ButtonVariant = "a" | "b" */
function aliases(src) {
  const out = {};
  for (const m of src.matchAll(/(?:export\s+)?type\s+([A-Z]\w*)\s*=\s*([^;{]+);/g)) {
    const v = m[2].replace(/\s+/g, " ").trim().replace(/^\|\s*/, "");
    if (/^"[^"]*"(\s*\|\s*"[^"]*")*$/.test(v)) out[m[1]] = v;
  }
  return out;
}

/* the props of the file's main export: the default export, else the export
   whose name is the file's stem, else the first exported function */
export function parseComponent(src, stem) {
  const fns = [...src.matchAll(/export\s+(default\s+)?function\s+([A-Za-z_$][\w$]*)\s*(<[^(]*>)?\s*\(/g)]
    .map((m) => ({ isDefault: Boolean(m[1]), name: m[2], at: m.index + m[0].length - 1 }));
  const named = [...src.matchAll(/export\s+(?:const|function|class)\s+([A-Za-z_$][\w$]*)/g)].map((m) => m[1]);
  const exported = [...src.matchAll(/export\s*\{([^}]*)\}/g)].flatMap((m) => m[1].split(",").map((s) => s.trim().split(/\s+as\s+/).pop()).filter(Boolean));
  const main = fns.find((f) => f.isDefault) ?? fns.find((f) => f.name.toLowerCase() === stem.toLowerCase()) ?? fns.find((f) => /^[A-Z]/.test(f.name)) ?? fns[0] ?? null;
  const result = { name: main?.name ?? stem, isDefault: Boolean(main?.isDefault), props: [], exports: [...new Set([...named, ...exported])].filter((n) => n !== main?.name) };
  if (!main) return result;
  const close = matching(src, main.at);
  if (close < 0) return result;
  const params = src.slice(main.at + 1, close);
  const brace = params.indexOf("{");
  let pattern = "", typeText = "";
  if (brace === 0 || /^\s*\{/.test(params)) {
    const start = params.indexOf("{");
    const end = matching(params, start);
    pattern = params.slice(start, end + 1);
    typeText = params.slice(end + 1).replace(/^\s*:\s*/, "");
  } else {
    const m = params.match(/^\s*[A-Za-z_$][\w$]*\s*:\s*([\s\S]+)$/);
    typeText = m ? m[1] : "";
  }
  let block = null;
  const t = typeText.trim();
  if (t.startsWith("{")) block = t.slice(0, matching(t, 0) + 1);
  else {
    const alias = t.match(/^([A-Za-z_$][\w$]*)/)?.[1];
    if (alias) {
      const decl = src.match(new RegExp(`(?:type|interface)\\s+${alias}\\b`));
      if (decl) {
        /* past the generic parameters, then `=` (a type) or straight to `{` (an interface) */
        let s = decl.index + decl[0].length;
        while (s < src.length && /\s/.test(src[s])) s++;
        if (src[s] === "<") s = matching(src, s) + 1;
        const m2 = src.slice(s).match(/^\s*(?:=\s*)?\{/);
        if (m2) { s = s + m2[0].length - 1; block = src.slice(s, matching(src, s) + 1); }
      }
    }
  }
  if (!block) return result;
  const defs = defaults(pattern);
  const als = aliases(src);
  result.props = members(block).map((p) => ({ ...p, default: defs[p.name], values: als[p.type] }));
  return result;
}

/* ── the reference ──────────────────────────────────────── */

export async function reference(name, cwd = process.cwd()) {
  const project = detectProject(cwd);
  const idx = await catalogue();
  const proIdx = ((await proCatalogue())?.items ?? []).filter((i) => !idx.items.some((f) => f.name === i.name));
  const known = [...idx.items.map((i) => i.name), ...proIdx.map((i) => i.name)];
  if (!known.includes(name) || name === ALL_ITEM || name === BASE_ITEM) {
    const near = nearest(name, known.filter((n) => n !== ALL_ITEM && n !== BASE_ITEM));
    die(`no component named "${name}" in the registry${near.length ? `; did you mean ${near.join(", ")}?` : ""} (formicai docs lists every name)`);
  }
  /* a Pro item: the keyed copy when the key is accepted, else the public index
     entry (title, description, dependencies, target) with no file content */
  const proEntry = proIdx.find((i) => i.name === name) ?? null;
  let item = proEntry ? null : await fetchItem(name);
  let locked = null;
  if (proEntry) {
    try { item = await fetchProItem(name, readKey(cwd)); }
    catch (e) { if (!(e instanceof ProRefused)) throw e; locked = e.message; item = { ...proEntry, files: (proEntry.files ?? []).map((f) => ({ ...f, content: "" })) }; }
  }
  const file = item.files?.[0];
  const rel = file ? file.target.replace(/^~\//, "") : `${project.dir}/${proEntry ? "pro" : "components"}/${name}`;
  const local = path.join(cwd, rel.replace(/^src\/formic/, project.dir));
  const installed = fs.existsSync(local);
  const src = installed ? fs.readFileSync(local, "utf8") : file?.content ?? "";
  const stem = path.basename(rel).replace(/\.tsx?$/, "");
  const parsed = parseComponent(src, stem);
  const deps = (item.registryDependencies ?? []).map(nameOf).filter((d) => d !== BASE_ITEM);
  const importPath = "./" + rel.replace(/^src\//, "").replace(/\.tsx?$/, "");
  const required = parsed.props.filter((p) => !p.optional && p.name !== "children");
  const attrs = required.map((p) => {
    if (p.values) return `${p.name}=${p.values.split("|")[0].trim()}`;
    if (/^string$/.test(p.type)) return `${p.name}="…"`;
    if (/^number$/.test(p.type)) return `${p.name}={0}`;
    if (/^boolean$/.test(p.type)) return p.name;
    if (/^\(/.test(p.type)) return `${p.name}={() => {}}`;
    if (/\[\]$/.test(p.type) || /^Array</.test(p.type)) return `${p.name}={[…]}`;
    return `${p.name}={…}`;
  });
  const hasChildren = parsed.props.some((p) => p.name === "children");
  const tag = `<${parsed.name}${attrs.length ? " " + attrs.join(" ") : ""}${hasChildren ? `>…</${parsed.name}>` : " />"}`;
  return {
    name, title: item.title, description: item.description, file: rel, installed, pro: Boolean(proEntry),
    propsLocked: locked && !installed ? "install with a key to see the props (npx formicai key <key>, https://formicai.dev/pro)" : null,
    component: parsed.name, isDefault: parsed.isDefault, props: parsed.props, exports: parsed.exports,
    dependencies: deps, packages: item.dependencies ?? [],
    example: [parsed.isDefault ? `import ${parsed.name} from "${importPath}";` : `import { ${parsed.name} } from "${importPath}";`, tag],
  };
}

export function renderReference(r) {
  const lines = [];
  lines.push(`${bold(r.title)} ${grey(`(${r.name})`)}${r.pro ? `  ${cyan("Pro")}` : ""}`);
  lines.push(`  ${r.description}`);
  lines.push(`  file: ${r.file}${r.installed ? "" : grey("  (not installed; npx formicai add " + r.name + ")")}`);
  if (r.dependencies.length) lines.push(`  needs: ${r.dependencies.join(", ")}`);
  if (r.packages.length) lines.push(`  packages: ${r.packages.join(", ")}`);
  if (r.exports.length) lines.push(`  also exports: ${r.exports.join(", ")}`);
  lines.push("");
  if (r.props.length) {
    lines.push(`  ${cyan("props")}`);
    for (const p of r.props) {
      const type = p.values ? p.values : p.type;
      lines.push(`    ${p.name}${p.optional ? "?" : ""}: ${type}${p.default !== undefined ? grey(` = ${p.default}`) : ""}`);
      if (p.doc) lines.push(`      ${grey(p.doc)}`);
    }
  } else if (r.propsLocked) lines.push(`  ${grey(`props: ${r.propsLocked}`)}`);
  else lines.push(`  ${grey("props: see the file; its main export takes no props block this reference can read")}`);
  lines.push("");
  lines.push(`  ${cyan("example")}`);
  for (const l of r.example) lines.push(`    ${l}`);
  return lines.join("\n");
}

/* every component with its one-line description, installed ones marked;
   the free items first, then Formic Pro's with `pro: true` */
export async function listing(cwd = process.cwd()) {
  const project = detectProject(cwd);
  const idx = await catalogue();
  const pro = ((await proCatalogue())?.items ?? []).filter((i) => !idx.items.some((f) => f.name === i.name));
  const row = (it, isPro) => {
    const target = it.files?.[0]?.target?.replace(/^~\//, "") ?? "";
    const installed = Boolean(target) && fs.existsSync(path.join(cwd, target.replace(/^src\/formic/, project.dir)));
    return { name: it.name, title: it.title, description: it.description, installed, pro: isPro };
  };
  return [
    ...idx.items.filter((it) => it.name !== ALL_ITEM && it.name !== BASE_ITEM).map((it) => row(it, false)),
    ...pro.map((it) => row(it, true)),
  ];
}

/* the listing as lines: free, then a Formic Pro heading, then the key line when there is no key */
export function renderListing(items, cwd = process.cwd()) {
  const lines = [];
  for (const it of items.filter((i) => !i.pro)) lines.push(`  ${bold(it.name.padEnd(22))} ${grey(it.description)}${it.installed ? grey("  (installed)") : ""}`);
  const pro = items.filter((i) => i.pro);
  if (pro.length) {
    lines.push("", `  ${bold("Formic Pro")}`);
    for (const it of pro) lines.push(`  ${bold(it.name.padEnd(22))} ${cyan("Pro")}  ${grey(it.description)}${it.installed ? grey("  (installed)") : ""}`);
    if (!readKey(cwd)) lines.push("", `  ${KEY_LINE}`);
  } else if (proUnreachableNote()) lines.push("", `  ${grey(proUnreachableNote())}`);
  return lines;
}

export async function run(flags) {
  const name = flags._[0] ? nameOf(flags._[0]) : null;
  if (!name) {
    const items = await listing();
    if (flags.json) { process.stdout.write(JSON.stringify(items, null, 2) + "\n"); return 0; }
    for (const l of renderListing(items)) note(l);
    note(`\n  npx formicai docs <name> for the props and an example; npx formicai add <name> installs it.`);
    return 0;
  }
  const r = await reference(name);
  if (flags.json) { process.stdout.write(JSON.stringify(r, null, 2) + "\n"); return 0; }
  note("\n" + renderReference(r) + "\n");
  return 0;
}
