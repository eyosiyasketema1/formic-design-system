/* formicai gates / formicai inventory: the two Python gates that ship in
   src/formic/scripts, run on the source folder with --config=package.json,
   so the `scope` and `legacy` folders of package.json's formic section
   decide what is checked (scope wins for its subtree; both empty means the
   whole source folder). */
import { Plan, die, note, grey, detectProject, capture } from "./util.js";

export const helpGates = `formicai gates

  Runs both gates (formic_check.py, then compose_check.py) on the source
  folder, what "npm run formic" runs. package.json's "formic" section
  decides what is gated: files under a "scope" folder always, files under a
  "legacy" folder never (scope wins for its subtree), everything when both
  are empty. Exits with the gates' status; nothing in scope yet is clean.

  Example
    npx formicai gates
`;

export const helpInventory = `formicai inventory

  Lists every UI file with its issue count and whether it imports Formic,
  worst first, so a migration can be planned (formic_check.py --inventory).
  Files in legacy folders are listed too, marked "legacy": they are the plan.

  Example
    npx formicai inventory
`;

function setup() {
  const p = detectProject(process.cwd());
  if (!p.pkg) die("no package.json here; run this in the root of your app");
  if (!p.installed) die(`Formic is not installed in ${p.dir}; run formicai init first`);
  if (capture("python3", ["--version"]).status !== 0) die("python3 is required to run the gates (https://python.org)");
  return { p, roots: [p.srcDir], extra: ["--config=package.json"], legacy: p.legacy, scope: p.scope };
}

export async function gates() {
  const { p, roots, extra, legacy, scope } = setup();
  const plan = new Plan();
  if (scope.length || legacy.length) note(grey(`  package.json → formic: scope ${scope.length ? scope.join(", ") : "(none)"}, legacy ${legacy.length ? legacy.join(", ") : "(none)"}`));
  const a = plan.run("python3", [`${p.dir}/scripts/formic_check.py`, ...roots, ...extra]);
  if (a !== 0) return a;
  return plan.run("python3", [`${p.dir}/scripts/compose_check.py`, ...roots, ...extra]);
}

export async function inventory() {
  const { p, roots, extra } = setup();
  const plan = new Plan();
  return plan.run("python3", [`${p.dir}/scripts/formic_check.py`, "--inventory", ...roots, ...extra]);
}
