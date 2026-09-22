/* formicai gates / formicai inventory: the two Python gates that ship in
   src/formic/scripts, run on the source folder, or on the `scope` folders
   from package.json's formic section when there are any, with the `legacy`
   folders skipped. */
import { Plan, die, note, grey, detectProject, capture } from "./util.js";

export const helpGates = `formicai gates

  Runs both gates (formic_check.py, then compose_check.py) on the source
  folder, what "npm run formic" runs. When package.json's "formic" section
  lists "scope" folders, only those are checked; "legacy" folders are
  skipped. Exits with the gates' status.

  Example
    npx formicai gates
`;

export const helpInventory = `formicai inventory

  Lists every UI file with its issue count and whether it imports Formic,
  worst first, so a migration can be planned (formic_check.py --inventory).

  Example
    npx formicai inventory
`;

function setup() {
  const p = detectProject(process.cwd());
  if (!p.pkg) die("no package.json here; run this in the root of your app");
  if (!p.installed) die(`Formic is not installed in ${p.dir}; run formicai init first`);
  if (capture("python3", ["--version"]).status !== 0) die("python3 is required to run the gates (https://python.org)");
  const scope = p.scope;
  const legacy = p.legacy;
  const roots = scope.length ? scope : [p.srcDir];
  const extra = legacy.length ? ["--legacy", legacy.join(",")] : [];
  return { p, roots, extra, legacy, scope };
}

export async function gates() {
  const { p, roots, extra, legacy, scope } = setup();
  const plan = new Plan();
  if (scope.length || legacy.length) note(grey(`  checking ${roots.join(", ")}${legacy.length ? `, skipping ${legacy.join(", ")}` : ""} (package.json → formic)`));
  const a = plan.run("python3", [`${p.dir}/scripts/formic_check.py`, ...roots, ...extra]);
  if (a !== 0) return a;
  return plan.run("python3", [`${p.dir}/scripts/compose_check.py`, ...roots, ...extra]);
}

export async function inventory() {
  const { p, roots, extra } = setup();
  const plan = new Plan();
  const rc = plan.run("python3", [`${p.dir}/scripts/formic_check.py`, "--inventory", ...roots, ...extra]);
  return rc;
}
