/* formicai add <name…> [--overwrite] [--dry-run]

   Adds components from the registry to src/formic, with the shared modules
   and packages they need, and records them in src/formic/registry.lock so
   `update` knows what is installed. The files are written from the item JSON
   exactly as the registry client would (the items carry explicit targets and
   are never rewritten); the client itself is not spawned because it asks
   "overwrite?" for every style sheet apply_config.py has touched, and it
   refuses a components.json with any key it does not know. */
import fs from "node:fs";
import path from "node:path";
import { Plan, say, skip, warn, note, die, bold, grey, cyan, detectProject, installedVersion, installArgs } from "./util.js";
import { ALL_ITEM, BASE_ITEM, LOCK, catalogue, resolve, nameOf, nearest, depName, lockFrom, lockText, readLock, configDerived } from "./registry.js";
import { KEY_LINE, ProRefused, proCatalogue, proUnreachableNote, readKey, reportRefusal } from "./pro.js";

export const help = `formicai add <name> [<name>…] [options]

  Adds one or more components to src/formic, with whatever they need.

  --overwrite       replace files that already exist and differ
  --dry-run         list the files and packages, write nothing
  --list            print every name in the registry, Formic Pro after the free ones

  Names are the catalogue's: button, data-table, app-shell, charts…
  Pro components need a key (npx formicai key <key>, https://formicai.dev/pro)
  and land in src/formic/pro.

  Examples
    npx formicai add data-table
    npx formicai add button select combobox --dry-run
`;

export async function run(flags) {
  const dryRun = Boolean(flags["dry-run"]);
  const plan = new Plan({ dryRun });
  const project = detectProject(plan.cwd);
  const { dir } = project;
  const idx = await catalogue();
  const pro = await proCatalogue();
  const proItems = (pro?.items ?? []).filter((i) => !idx.items.some((f) => f.name === i.name));
  const known = [...idx.items.map((i) => i.name), ...proItems.map((i) => i.name)];
  if (flags.list) {
    for (const it of idx.items) if (it.name !== ALL_ITEM && it.name !== BASE_ITEM) note(`  ${bold(it.name.padEnd(22))} ${grey(it.description)}`);
    if (proItems.length) {
      note(`\n  ${bold("Formic Pro")}`);
      for (const it of proItems) note(`  ${bold(it.name.padEnd(22))} ${cyan("Pro")}  ${grey(it.description)}`);
      if (!readKey(plan.cwd)) note(`\n  ${KEY_LINE}`);
    } else if (proUnreachableNote()) note(`\n  ${grey(proUnreachableNote())}`);
    return 0;
  }
  const names = flags._.map(nameOf);
  if (names.length === 0) die("say which components to add: formicai add data-table (formicai add --list shows the names)");
  if (!project.pkg) die("no package.json here; run formicai add in the root of your app");
  if (!project.installed) die(`Formic is not installed in ${dir}; run formicai init first`);
  for (const n of names) {
    if (known.includes(n)) continue;
    const near = nearest(n, known);
    const down = proUnreachableNote();
    die(`no component named "${n}" in the registry${near.length ? `; did you mean ${near.join(", ")}?` : ""} (formicai add --list shows every name)${down ? `; ${down}` : ""}`);
  }

  let resolved;
  try { resolved = await resolve(names); }
  catch (e) { if (e instanceof ProRefused) { reportRefusal(e); return 1; } throw e; }
  const version = installedVersion(plan.cwd, dir) ?? "unknown";
  note(`\n${bold("formicai add")} ${names.join(" ")}${dryRun ? grey(" (dry run)") : ""}\n`);

  /* what each file gets: create, same, keep or overwrite */
  const rows = resolved.files.map((f) => {
    const abs = path.join(plan.cwd, f.target);
    const cur = fs.existsSync(abs) ? fs.readFileSync(abs, "utf8") : null;
    let state;
    if (cur === null) state = "create";
    else if (cur === f.content) state = "same";
    else if (configDerived(f.target) || f.target.endsWith("formic.config.json") || f.target === "AGENTS.md") state = "managed"; /* update's job, never add's */
    else state = flags.overwrite ? "overwrite" : "keep";
    return { ...f, state };
  });
  const missing = resolved.dependencies.filter((d) => !Object.hasOwn(project.deps, depName(d)));

  if (dryRun) {
    for (const r of rows) {
      if (r.state === "same" || r.state === "managed") continue;
      const label = { create: cyan("create"), overwrite: cyan("overwrite"), keep: grey("keep (differs; --overwrite replaces it)") }[r.state];
      note(`  ${r.target.padEnd(56)} ${label}`);
    }
    if (rows.every((r) => r.state === "same" || r.state === "managed")) note(`  every file is already in place`);
    if (missing.length) note(`\n  packages to install: ${missing.join(", ")}`);
    note(`\nDry run: nothing was written.`);
    return 0;
  }

  let created = 0, replaced = 0, kept = 0;
  for (const r of rows) {
    if (r.state === "create") { plan.write(r.target, r.content); created++; }
    else if (r.state === "overwrite") { plan.write(r.target, r.content); replaced++; }
    else if (r.state === "keep") kept++;
  }
  const done = rows.filter((r) => r.state === "create" || r.state === "overwrite").map((r) => r.target.replace(`${dir}/`, ""));
  if (done.length) say(`${done.length <= 6 ? done.join(", ") : `${done.slice(0, 5).join(", ")} and ${done.length - 5} more`} in ${dir}`);
  const proNamesHere = [...resolved.items.values()].filter((it) => it.pro).map((it) => it.name);
  if (proNamesHere.length) say(`Formic Pro: ${proNamesHere.join(", ")} in ${dir}/pro`);
  if (kept) skip(`${kept} file(s) already there with local changes were kept; formicai add --overwrite replaces them, formicai update shows the difference`);

  if (missing.length) {
    const [cmd, args] = installArgs(project.pm, missing);
    const rc = plan.run(cmd, args, { what: `Installing ${missing.map(depName).join(", ")}` });
    if (rc !== 0) warn(`${cmd} ${args.join(" ")} failed; run it again by hand`);
    else say(`${missing.map(depName).join(", ")} installed with ${project.pm}`);
  }

  const previous = readLock(plan.cwd, dir);
  const lock = lockFrom(previous, resolved, version, plan.cwd);
  plan.write(`${dir}/${LOCK}`, lockText(lock));
  say(`${names.join(", ")} recorded in ${dir}/${LOCK}${created || replaced ? "" : " (every file was already in place)"}`);
  return 0;
}
