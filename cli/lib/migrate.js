/* formicai migrate <file…> [--write]: the codemods in codemods.js on a
   page, shown as a diff (the default) or written to the file (--write),
   with a count per codemod and the todos it left, then formic_check on the
   file so the person sees what is left to do by hand. */
import fs from "node:fs";
import path from "node:path";
import { say, warn, note, die, grey, bold, cyan, yellow, detectProject, capture } from "./util.js";
import { render } from "./diff.js";
import { CODEMODS, migrateSource, iconNames } from "./codemods.js";

export const help = `formicai migrate <file…> [--write | --dry-run]

  Rewrites the mechanical part of a page onto Formic and shows the diff.
  Nothing is written unless --write is given; --dry-run is the default.

  The codemods, in the order they run (each leaves a formic-todo comment
  where it could not decide):
${CODEMODS.map((c) => `    ${c.name.padEnd(9)}${c.what}`).join("\n")}

  What stays for you: a table (DataTable), a select, a textarea, a toggle,
  an icon with no Formic twin, a button whose children are not a label, a
  page's layout on AppShell. formic_check on the file lists it all.

  Examples
    npx formicai migrate src/pages/Billing.tsx
    npx formicai migrate src/pages/*.tsx --write
`;

export async function run(flags) {
  const cwd = process.cwd();
  const files = flags._;
  if (!files.length) die("formicai migrate needs at least one .tsx or .jsx file (formicai migrate src/pages/Billing.tsx)");
  const write = Boolean(flags.write) && !flags["dry-run"];
  const p = detectProject(cwd);
  if (!p.pkg) die("no package.json here; run this in the root of your app");
  if (!p.installed) die(`Formic is not installed in ${p.dir}; run formicai init first`);
  const primitives = path.join(cwd, p.dir, "components", "primitives.tsx");
  const icons = fs.existsSync(primitives) ? iconNames(fs.readFileSync(primitives, "utf8")) : null;
  const hasPython = capture("python3", ["--version"]).status === 0;
  let changed = 0, todoTotal = 0, unchanged = 0;
  const totals = {};
  note("");
  for (const raw of files) {
    const rel = path.relative(cwd, path.resolve(cwd, raw)).split(path.sep).join("/");
    const abs = path.join(cwd, rel);
    if (!fs.existsSync(abs)) { warn(`${rel}: no such file`); continue; }
    if (!/\.(tsx|jsx)$/.test(rel)) { warn(`${rel}: not a .tsx or .jsx file, skipped`); continue; }
    if (rel === p.dir || rel.startsWith(p.dir + "/")) { warn(`${rel}: inside ${p.dir}, Formic's own files are not migrated`); continue; }
    const src = fs.readFileSync(abs, "utf8");
    let components = path.relative(path.dirname(abs), path.join(cwd, p.dir, "components")).split(path.sep).join("/");
    if (!components.startsWith(".")) components = "./" + components;
    const before = hasPython ? issueCount(p, rel, cwd) : null;
    const r = migrateSource(src, { components, icons });
    const parts = CODEMODS.filter((c) => r.counts[c.name]).map((c) => `${c.name} ${r.counts[c.name]}`);
    for (const c of CODEMODS) totals[c.name] = (totals[c.name] ?? 0) + (r.counts[c.name] ?? 0);
    todoTotal += r.todoTotal;
    if (r.text === src) { unchanged++; note(`  ${grey("–")} ${rel}: nothing the codemods rewrite${r.todoTotal ? ` (${r.todoTotal} todo(s) would be added)` : ""}`); continue; }
    changed++;
    if (write) {
      fs.writeFileSync(abs, r.text);
      say(`${bold(rel)}: ${parts.join(", ") || "comments only"}${r.todoTotal ? `; ${r.todoTotal} formic-todo` : ""}`);
    } else {
      const d = render(rel, src, r.text, 2, "migrated");
      note(d.text);
      note(`  ${cyan("~")} ${bold(rel)}: ${parts.join(", ") || "comments only"}${r.todoTotal ? `; ${r.todoTotal} formic-todo` : ""} ${grey(`(+${d.added} -${d.removed})`)}`);
    }
    for (const t of r.todoList) note(`      ${yellow("todo")} ${t}`);
    if (hasPython && write) {
      const after = issueCount(p, rel, cwd);
      note(`      formic_check: ${before ?? "?"} → ${after ?? "?"} issue(s)${after ? "; still to do by hand:" : ""}`);
      if (after) {
        const out = capture("python3", [`${p.dir}/scripts/formic_check.py`, rel], cwd).out.split("\n").filter((l) => l.trim().startsWith("✗"));
        for (const l of out) note(`        ${l.trim()}`);
      }
    } else if (hasPython && before !== null) note(`      formic_check now: ${before} issue(s); --write applies the rewrite and re-runs it`);
  }
  const summary = CODEMODS.filter((c) => totals[c.name]).map((c) => `${c.name} ${totals[c.name]}`).join(", ");
  note(`\n${write ? "Written" : "Dry run"}: ${changed} file(s) ${write ? "rewritten" : "would change"}${unchanged ? `, ${unchanged} untouched` : ""}${summary ? ` (${summary})` : ""}${todoTotal ? `; ${todoTotal} formic-todo comment(s) mark what needs a hand` : ""}.`);
  if (!write && changed) note(grey("  formicai migrate <file…> --write applies it."));
  if (write && changed) note(grey("  Finish each file by hand until formicai gates prints clean; grep formic-todo for the spots."));
  note("");
  return 0;
}

function issueCount(p, rel, cwd) {
  const r = capture("python3", [`${p.dir}/scripts/formic_check.py`, rel], cwd);
  const m = /(\d+) usage issue\(s\)/.exec(r.out);
  if (m) return Number(m[1]);
  if (/built on the system/.test(r.out)) return 0;
  return null;
}
