/* formicai init [--new <dir>] [--minimal] [--eslint-ignore] [--yes] [--dry-run]

   Puts Formic into the project you are standing in, or scaffolds a new one
   with --new. Everything install.sh does, in the same order, with --dry-run
   to see it first: the Formic folder from the registry, the three CSS
   imports, the peer packages, components.json, the `formic` script, the
   instruction files for AI tools, the pre-commit hook. */
import fs from "node:fs";
import path from "node:path";
import { Plan, say, skip, warn, note, die, bold, grey, detectProject, installArgs, installAllArgs, stringify, capture } from "./util.js";
import { BASE, BASE_ITEM, ALL_ITEM, LOCK, resolve, depName, lockFrom, lockText, readLock } from "./registry.js";
import { checkNewDir, writeScaffold, scaffoldPackageJson } from "./scaffold.js";
import { writeAgentFiles, writeHook, writePackageJson, wireCss, writeComponentsJson, eslintIgnore, seedConfig, migrationPrompt, uiFiles } from "./project.js";

export const help = `formicai init [--new <dir>] [options]

  Adds Formic to the project you are in, or starts a new one.

  --new <dir>       scaffold a Vite + React + Tailwind v4 app in <dir> first
                    ("." for the folder you are in)
  --minimal         install the base only (tokens, styles, primitives, the
                    gates); add components later with formicai add
  --eslint-ignore   write the src/formic/** ignore into a flat ESLint config
  --yes, -y         no questions
  --dry-run         print every file and command, write nothing

  What it does, in order: writes the Formic folder (src/formic) from the
  registry, wires the three CSS imports, installs the peer packages, writes
  components.json, adds "npm run formic", writes the instruction files for
  Claude Code, Cursor and Copilot, and installs the pre-commit hook.

  Examples
    npx formicai init --new my-app
    npx formicai init                 # inside an existing project
    npx formicai init --dry-run
`;

export async function run(flags) {
  const dryRun = Boolean(flags["dry-run"]);
  const plan = new Plan({ dryRun });
  let isNew = false, appDir = null, appName = null;

  /* no package.json here: not a project yet, so scaffold in place */
  if (flags.new !== undefined) { isNew = true; appDir = flags.new === true ? "" : String(flags.new); }
  else if (!plan.exists("package.json")) { isNew = true; appDir = "."; }

  if (isNew) {
    checkNewDir(plan, appDir);
    if (capture("npm", ["--version"]).status !== 0) die("npm is required to scaffold an app (https://nodejs.org)");
    appName = appDir === "." ? path.basename(process.cwd()).toLowerCase().replace(/ /g, "-") : appDir;
    note(`\n${bold("Formic")} → new app in ${appDir === "." ? "this folder" : appDir + "/"}\n`);
    if (appDir !== ".") { if (!dryRun) fs.mkdirSync(appDir, { recursive: true }); plan.cwd = path.join(process.cwd(), appDir); }
    writeScaffold(plan, appName, appDir === "." ? appName : appDir);
    if (!dryRun) { process.chdir(plan.cwd); say(`Vite + React + Tailwind v4 app (vite.config.ts, tsconfig.json, index.html, src/)`); }
  }

  const dir = "src/formic";
  const project = isNew
    ? { framework: "vite", srcDir: "src", dir, pkg: scaffoldPackageJson(appName), deps: {}, cssFiles: ["src/index.css"], cssFile: "src/index.css", pm: "npm", installed: false, eslintConfig: null, components: null, git: plan.exists(".git") }
    : detectProject(plan.cwd, dir);
  const { srcDir } = project;
  if (!isNew) note(`\n${bold("Formic")} → ${dir} (${project.framework === "next" ? "Next.js" : project.framework === "vite" ? "Vite" : "React"} project, source in ${srcDir}/)\n`);

  if (plan.exists(`${dir}/styles`) && !plan.exists(`${dir}/VERSION`)) die(`${dir}/styles already exists and is not a Formic install; move it aside first`);

  /* ── 1. the system itself, from the registry ─────────────── */
  const want = flags.minimal ? BASE_ITEM : ALL_ITEM;
  const resolved = await resolve([want]);
  const version = resolved.items.get(BASE_ITEM)?.meta?.formic?.version ?? "unknown";
  const previous = readLock(plan.cwd, dir);
  if (project.installed && !dryRun) {
    skip(`${dir} already holds Formic ${grey(`(${(plan.read(`${dir}/VERSION`) ?? "").split("\n")[0]})`)}; formicai update refreshes it`);
  } else {
    let n = 0;
    for (const f of resolved.files) {
      if (f.target === "AGENTS.md") {
        const cur = plan.read("AGENTS.md");
        if (cur === null) plan.write("AGENTS.md", f.content);
        else if (!cur.includes("Formic")) plan.write("AGENTS.md", cur + "\n\n" + f.content);
        else { plan.write("AGENTS.md.formic", f.content); if (!dryRun) skip("AGENTS.md already mentions Formic; fresh copy left at AGENTS.md.formic for you to merge"); continue; }
        if (!dryRun) say(cur === null ? "AGENTS.md" : "AGENTS.md (Formic section appended to your existing file)");
        continue;
      }
      if (f.target.endsWith("formic.config.json") && plan.exists(f.target)) continue; /* the app's choices survive */
      if (f.target.endsWith("formic.config.json")) { plan.write(f.target, seedConfig(plan.cwd, f.content)); n++; continue; }
      plan.write(f.target, f.content); n++;
    }
    if (!dryRun) say(`${dir}/styles, ${dir}/components and ${dir}/scripts (Formic ${version}, ${n} files)`);
    const skill = resolved.files.find((f) => f.target.endsWith("SKILL.md"));
    if (skill && !dryRun) say(skill.target);
    if (!dryRun) {
      const lock = lockFrom(previous, resolved, version, plan.cwd);
      plan.write(`${dir}/${LOCK}`, lockText(lock));
    } else plan.write(`${dir}/${LOCK}`, "{}", "what is installed, for formicai update");
  }

  /* ── 1b. formic.config.json applied (accent, html attributes, component defaults) ── */
  if (capture("python3", ["--version"]).status === 0) {
    const rc = plan.run("python3", [`${dir}/scripts/apply_config.py`], { quiet: true });
    if (rc === 0 && !dryRun) say(`${dir}/formic.config.json applied (accent, html attributes, component defaults; change them at https://formicai.dev/customize)`);
    else if (!dryRun) warn(`${dir}/formic.config.json could not be applied; run python3 ${dir}/scripts/apply_config.py`);
  } else warn(`python3 not found; run python3 ${dir}/scripts/apply_config.py once it is`);

  /* ── 2. CSS: fonts.css, tailwindcss, formic.css ───────────── */
  const cssWired = isNew ? true : wireCss(plan, project.cssFiles, dir);

  /* ── 3. peer packages ─────────────────────────────────────── */
  let depsWired = true;
  if (!isNew) {
    const missing = resolved.dependencies.filter((d) => !Object.hasOwn(project.deps, depName(d)));
    if (missing.length === 0) { if (!dryRun) skip("peer packages already in package.json"); }
    else {
      const [cmd, args] = installArgs(project.pm, missing);
      const rc = plan.run(cmd, args, { what: `Installing ${missing.map(depName).join(", ")}` });
      if (rc !== 0 && !dryRun) { depsWired = false; warn(`${cmd} ${args.join(" ")} failed; run it again by hand`); }
      else if (!dryRun) say(`${missing.map(depName).join(", ")} installed with ${project.pm}`);
    }
  }

  /* ── 4. components.json, the formic script, the instruction files, the hook ── */
  writeComponentsJson(plan, project.components, { cssFile: isNew ? "src/index.css" : project.cssFile, srcDir, registryUrl: BASE });
  /* re-read: the package manager just rewrote package.json. A project that
     already has pages of its own gets its source folder marked legacy, so the
     gates and the hook leave the old pages alone until a folder is moved into
     scope; a project without any is checked whole, as before. */
  const existingUi = isNew || project.pkg?.formic ? [] : uiFiles(plan.cwd, srcDir, dir, 1);
  const legacy = existingUi.length ? [srcDir] : [];
  writePackageJson(plan, dryRun && isNew ? project.pkg : JSON.parse(fs.readFileSync(path.join(plan.cwd, "package.json"), "utf8")), dir, srcDir, { legacy });
  if (legacy.length && !dryRun) note(`    your existing pages are marked legacy (package.json → formic.legacy: ["${srcDir}"]): the gates and the hook leave them alone until you move a folder into scope with formicai scope add <folder>`);
  writeAgentFiles(plan, dir, srcDir);
  if (!isNew) writeHook(plan, dir);

  /* ── 5. finish ────────────────────────────────────────────── */
  if (isNew) {
    const [cmd, args] = installAllArgs("npm");
    const rc = plan.run(cmd, args, { what: "Installing dependencies" });
    if (rc !== 0 && !dryRun) die(`npm install failed; run it again inside ${appDir === "." ? "this folder" : appDir}`);
    if (!dryRun) say("dependencies installed");
    if (!plan.exists(".git")) {
      const g = plan.run("git", ["init", "-q"], { quiet: true });
      if (g === 0) {
        plan.run("git", ["add", "-A"], { quiet: true });
        plan.run("git", ["-c", "user.name=formic", "-c", "user.email=formic@formicai.dev", "commit", "-qm", "Formic starter"], { quiet: true });
        if (!dryRun) say("git repository initialised");
      }
    }
    writeHook(plan, dir, { soon: true });
    if (dryRun) { note(`\nDry run: nothing was written.`); return 0; }
    note(`\nDone. Run it:`);
    note(appDir === "." ? "  npm run dev        # the browser opens a page that says Formic is working\n" : `  cd ${appDir} && npm run dev        # the browser opens a page that says Formic is working\n`);
    note("Then open your AI tool (Claude Code, Cursor, Antigravity, Copilot, any of them) in this folder and paste one of the three test prompts on that page (a dashboard, a course registration form, a settings page).\n");
    note(`After that, start every prompt with:  Use Formic (src/formic), read AGENTS.md, then  and say what you want.\n`);
    note("Info: your own colours, font and rail come from https://formicai.dev/customize (copy, paste into the same chat).");
    note("      The Formic gates run on every commit; `npm run formic` runs them any time.\n");
    return 0;
  }

  eslintIgnore(plan, project.eslintConfig, dir, Boolean(flags["eslint-ignore"]));
  if (dryRun) { note(`\nDry run: nothing was written.`); return 0; }
  if (cssWired && depsWired) note("\nDone. Open your AI tool in this folder and paste:");
  else {
    note("\nDone, with one thing left by hand:");
    if (!depsWired) note(`  • ${installArgs(project.pm, resolved.dependencies).flat(2).join(" ")}`);
    if (!cssWired) note(`  • In your global CSS (Tailwind v4), in this order:\n       @import "<path to>/${dir}/styles/fonts.css";\n       @import "tailwindcss";\n       @import "<path to>/${dir}/styles/formic.css";`);
    note("Then open your AI tool in this folder and paste:");
  }
  note(`  ${migrationPrompt(dir, srcDir)}\n`);
  if (plan.exists(srcDir)) {
    const inv = capture("python3", [`${dir}/scripts/formic_check.py`, "--inventory", srcDir], plan.cwd).out.trim().split("\n").pop();
    if (inv) note(`Inventory: ${inv}\n`);
  }
  note("Info: your own colours, font and rail come from https://formicai.dev/customize (copy, paste into the same chat).");
  note("      The Formic gates run on every commit; `npm run formic` runs them any time.");
  note(`      formicai doctor checks the setup; formicai add <name> adds a component; formicai update refreshes Formic.`);
  note(`      Migrating: formicai scope add <folder> puts a folder under the gates, formicai migrate <file> rewrites what is mechanical (AGENTS.md → Migrating an existing app).\n`);
  return 0;
}
