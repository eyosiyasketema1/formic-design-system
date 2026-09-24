/* formicai update [--yes] [--force] [--dry-run]

   Refreshes every installed item from the registry. For each file it tells
   an upstream change from a local edit by the hash registry.lock recorded
   when the file was written:

     current                    nothing to do
     new upstream               written (asked first, unless --yes)
     edited by you, no upstream change   kept
     edited by you AND changed upstream  shown as a diff, kept unless you say
                                         y to it, or pass --force

   The registry holds only the current version, so a file whose lock hash is
   missing (installed by hand, or before the lock existed) counts as edited:
   it is shown and asked about, never overwritten silently. Styles and
   config.ts are rewritten by apply_config.py after every install, so they
   are refreshed whenever upstream changed and the config is applied again.
   Pro items in the lock are fetched with the key; when the site refuses the
   key they are left as they are, with a note. */
import fs from "node:fs";
import path from "node:path";
import { Plan, say, skip, warn, note, die, bold, grey, cyan, detectProject, installArgs, askYesNo, installedVersion } from "./util.js";
import { LOCK, resolve, sha, depName, lockFrom, lockText, readLock, configDerived } from "./registry.js";
import { render } from "./diff.js";
import { mask, readKey, reportRefusal } from "./pro.js";

export const help = `formicai update [options]

  Refreshes the installed components and styles from the registry.

  --yes, -y         apply every change to files you have not edited
  --force           also replace files you edited (the diff is shown first)
  --dry-run         show the diffs, write nothing

  A file you edited is never replaced unless you answer y to its diff or
  pass --force. Your formic.config.json is never touched, and it is applied
  again after the styles are refreshed.

  Examples
    npx formicai update --dry-run
    npx formicai update --yes
`;

export async function run(flags) {
  const dryRun = Boolean(flags["dry-run"]);
  const plan = new Plan({ dryRun });
  const project = detectProject(plan.cwd);
  const { dir } = project;
  if (!project.installed) die(`Formic is not installed in ${dir}; run formicai init first`);
  const lock = readLock(plan.cwd, dir);
  if (!lock || !lock.items) die(`${dir}/${LOCK} is missing, so nothing is known to be installed; run formicai init (it records what is there) and then update`);
  const names = Object.keys(lock.items);
  const refused = [];
  const resolved = await resolve(names, { onRefused: (name, e) => { refused.push({ name, e }); return true; } });
  const upstream = resolved.items.get("formic")?.meta?.formic?.version ?? "unknown";
  const local = installedVersion(plan.cwd, dir);
  note(`\n${bold("formicai update")} ${grey(`${local} installed, ${upstream} in the registry, ${names.length} items${dryRun ? ", dry run" : ""}`)}\n`);
  if (refused.length) {
    const creds = readKey(plan.cwd);
    skip(`Formic Pro: ${refused.map((r) => r.name).join(", ")} skipped, ${creds ? `the key ${mask(creds.key)} was refused` : "no key"}`);
    reportRefusal(refused[0].e);
  }

  const rows = [];
  for (const f of resolved.files) {
    if (f.target.endsWith("formic.config.json")) continue;
    const abs = path.join(plan.cwd, f.target);
    const cur = fs.existsSync(abs) ? fs.readFileSync(abs, "utf8") : null;
    const regHash = sha(f.content), locked = lock.files?.[f.target];
    let state;
    if (cur === null) state = "new";
    else if (configDerived(f.target)) state = locked === regHash ? "current" : "upstream";
    else if (cur === f.content) state = "current";
    else if (locked === sha(cur)) state = "upstream";
    else if (locked === regHash) state = "edited";
    else state = "conflict";
    rows.push({ ...f, cur, state, regHash });
  }
  const by = (s) => rows.filter((r) => r.state === s);
  if (rows.every((r) => r.state === "current" || r.state === "edited")) {
    say(`everything is current${by("edited").length ? ` (${by("edited").length} file(s) carry your edits and have no upstream change)` : ""}${refused.length ? ` (${refused.length} Pro item(s) not checked)` : ""}`);
    if (!dryRun) plan.write(`${dir}/${LOCK}`, lockText({ ...lockFrom(lock, resolved, upstream, plan.cwd), files: lock.files }));
    return 0;
  }

  const applied = [];
  for (const r of rows) {
    if (r.state === "current" || r.state === "edited") continue;
    if (r.state === "new") { note(`  ${cyan("+")} ${r.target} ${grey("new upstream")}`); }
    else {
      const d = render(r.target, r.cur, r.content);
      const tag = r.state === "conflict" ? `${grey("changed upstream")} ${bold("and edited by you")}` : grey("changed upstream");
      note(`  ${cyan("~")} ${r.target}  ${tag}  ${grey(`+${d.added} −${d.removed}`)}`);
      if (r.state === "conflict" || !flags.yes || dryRun) note(d.text.split("\n").map((l) => "    " + l).join("\n"));
    }
    if (dryRun) continue;
    let go;
    if (r.state === "conflict") go = flags.force ? true : askYesNo(`    replace ${r.target} and lose your edits?`);
    else go = flags.yes ? true : askYesNo(`    write ${r.target}?`);
    if (!go) { skip(`${r.target} kept`); continue; }
    plan.write(r.target, r.content);
    applied.push(r);
  }

  if (dryRun) {
    note(`\nDry run: nothing was written. formicai update --yes applies what is not edited; --force replaces edited files too.`);
    return 0;
  }

  const missing = resolved.dependencies.filter((d) => !Object.hasOwn(project.deps, depName(d)));
  if (missing.length) {
    const [cmd, args] = installArgs(project.pm, missing);
    if (plan.run(cmd, args, { what: `Installing ${missing.map(depName).join(", ")}` }) !== 0) warn(`${cmd} ${args.join(" ")} failed; run it again by hand`);
  }
  if (applied.some((r) => configDerived(r.target)) && fs.existsSync(path.join(plan.cwd, dir, "formic.config.json"))) {
    const a = plan.run("python3", [`${dir}/scripts/apply_config.py`], { quiet: true });
    if (a === 0) say(`${dir}/formic.config.json applied again on the refreshed styles`);
    else warn(`run python3 ${dir}/scripts/apply_config.py to put your choices back on the refreshed styles`);
  }
  const next = lockFrom(lock, resolved, upstream, plan.cwd);
  for (const r of rows) if (!applied.includes(r) && r.state !== "current" && lock.files?.[r.target]) next.files[r.target] = lock.files[r.target];
  plan.write(`${dir}/${LOCK}`, lockText(next));
  const kept = rows.filter((r) => r.state !== "current" && !applied.includes(r));
  say(`${applied.length} file(s) refreshed to Formic ${upstream}${kept.length ? `, ${kept.length} kept as they were` : ""}; ${LOCK} updated`);
  return 0;
}
