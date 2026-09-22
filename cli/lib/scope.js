/* formicai scope [add <folder…> | remove <folder…>]: which folders the gates
   and the hook check. `scope` folders are on Formic and always checked;
   `legacy` folders are skipped until they are moved into scope; scope wins
   for its subtree, so legacy ["src"] plus scope ["src/pages"] checks
   src/pages and nothing else. Both live in package.json's "formic" section,
   which the gates read through --config=package.json. */
import fs from "node:fs";
import path from "node:path";
import { say, skip, warn, note, die, grey, bold, detectProject, stringify } from "./util.js";
import { uiFiles } from "./project.js";

export const help = `formicai scope [add <folder…> | remove <folder…>]

  Lists, or changes, the folders the gates and the pre-commit hook check
  (package.json → "formic": { "scope": [...], "legacy": [...] }).

  formicai scope                     what is in scope, what is legacy, how many files each holds
  formicai scope add src/pages       put a folder under the gates (and drop it from legacy)
  formicai scope remove src/pages    take it out again

  A file under a scope folder is always checked; a file under a legacy folder
  that no scope folder claims is skipped with a note, never refused. With
  both lists empty the whole source folder is checked.

  Migrating one route at a time: formicai inventory, formicai scope add
  <folder>, formicai migrate <file> --write, then finish the file by hand
  until formicai gates prints clean.
`;

const norm = (f) => f.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/+$/, "");
const inside = (child, parent) => child === parent || child.startsWith(parent + "/");

export function readSection(cwd) {
  const p = detectProject(cwd);
  if (!p.pkg) die("no package.json here; run this in the root of your app");
  const formic = { dir: p.dir, srcDir: p.srcDir, scope: [], legacy: [], ...(p.pkg.formic ?? {}) };
  return { p, formic };
}

function writeSection(cwd, pkg, formic) {
  fs.writeFileSync(path.join(cwd, "package.json"), stringify({ ...pkg, formic }));
}

function list(cwd, formic, p) {
  const all = uiFiles(cwd, formic.srcDir, formic.dir);
  const gated = all.filter((f) => formic.scope.some((s) => inside(f, s)) || !formic.legacy.some((l) => inside(f, l)));
  note("");
  if (!formic.scope.length && !formic.legacy.length) {
    note(`  ${bold("scope")}: the whole source folder (${formic.srcDir}/, ${all.length} UI file(s)); nothing is legacy`);
  } else {
    note(`  ${bold("scope")}   ${formic.scope.length ? formic.scope.map((s) => `${s} ${grey(`(${all.filter((f) => inside(f, s)).length} file(s))`)}`).join(", ") : grey("(none)")}`);
    note(`  ${bold("legacy")}  ${formic.legacy.length ? formic.legacy.map((l) => `${l} ${grey(`(${all.filter((f) => inside(f, l) && !formic.scope.some((s) => inside(f, s))).length} file(s) not gated)`)}`).join(", ") : grey("(none)")}`);
    note(`  ${gated.length} of ${all.length} UI file(s) are checked by the gates and the hook.`);
  }
  if (!p.installed) warn(`Formic is not installed in ${formic.dir}; formicai init first`);
  note(`\n  formicai scope add <folder> puts a folder under the gates; formicai inventory lists the files to migrate.\n`);
  return 0;
}

export async function run(flags) {
  const cwd = process.cwd();
  const [verb, ...folders] = flags._;
  const { p, formic } = readSection(cwd);
  if (!verb) return list(cwd, formic, p);
  if (verb !== "add" && verb !== "remove") die(`formicai scope ${verb}: use add, remove, or nothing to list`);
  if (!folders.length) die(`formicai scope ${verb} needs at least one folder (formicai scope ${verb} src/pages)`);
  const next = { ...formic, scope: [...formic.scope], legacy: [...formic.legacy] };
  for (const raw of folders) {
    const f = norm(raw);
    if (!f) continue;
    if (verb === "add") {
      if (!fs.existsSync(path.join(cwd, f))) warn(`${f} does not exist yet; added anyway`);
      else if (!fs.statSync(path.join(cwd, f)).isDirectory()) die(`${f} is a file; scope holds folders (the gates check every .tsx/.jsx under them)`);
      if (next.scope.includes(f)) { skip(`${f} is already in scope`); continue; }
      next.scope.push(f);
      const wasLegacy = next.legacy.includes(f);
      next.legacy = next.legacy.filter((l) => l !== f);
      const under = next.legacy.filter((l) => inside(f, l));
      say(`${f} is in scope${wasLegacy ? " (no longer legacy)" : under.length ? ` ${grey(`(inside legacy ${under.join(", ")}: scope wins for ${f}/)`)}` : ""}`);
    } else {
      if (!next.scope.includes(f)) { skip(`${f} was not in scope`); continue; }
      next.scope = next.scope.filter((s) => s !== f);
      const stillLegacy = next.legacy.some((l) => inside(f, l));
      say(`${f} is out of scope${stillLegacy ? " (its legacy folder covers it again)" : next.legacy.length ? "" : " (with both lists empty the whole source folder is checked)"}`);
    }
  }
  if (JSON.stringify(next) !== JSON.stringify(formic)) {
    writeSection(cwd, p.pkg, next);
    say(`package.json: formic.scope ${JSON.stringify(next.scope)}, formic.legacy ${JSON.stringify(next.legacy)}`);
  }
  const gated = uiFiles(cwd, next.srcDir, next.dir).filter((f) => next.scope.some((s) => inside(f, s)) || !next.legacy.some((l) => inside(f, l)));
  note(`    ${gated.length} UI file(s) are now checked by the gates and the hook.${verb === "add" ? ` Next: formicai migrate <file> --write on each file under ${folders.map(norm).join(", ")}, then formicai gates.` : ""}`);
  return 0;
}
