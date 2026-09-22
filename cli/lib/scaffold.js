/* `formicai init --new <dir>`: a Vite + React + Tailwind v4 app with the
   Formic CSS stack wired, a welcome page with three test prompts and the
   customizer nudge. The files are the templates in ../templates, the same
   text install.sh writes; the QA gate keeps the two identical. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { die } from "./util.js";

const TEMPLATES = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "templates");

export const SCAFFOLD_FILES = ["vite.config.ts", "tsconfig.json", "index.html", "src/main.tsx", "src/index.css", "src/App.tsx", "src/pages/Welcome.tsx"];

const template = (name) => fs.readFileSync(path.join(TEMPLATES, name), "utf8");
export const scaffoldPackageJson = (appName) => JSON.parse(template("package.json").replace("$APPNAME", appName));

export function checkNewDir(plan, dir) {
  if (!dir) die("--new needs a folder name: formicai init --new my-app");
  if (dir !== "." && (path.isAbsolute(dir) || dir.includes("..") || dir.includes("/") || dir.includes("\\"))) die(`--new takes a simple folder name, e.g. my-app (got '${dir}')`);
  if (dir !== "." && plan.exists(dir)) die(`${dir} already exists; cd into it and run formicai init there`);
  if (dir === ".") for (const f of SCAFFOLD_FILES) if (plan.exists(f)) die(`${f} already exists but there is no package.json; run formicai init in an empty folder, or in the root of your app`);
}

/* writes the scaffold under plan.cwd (already the app folder) */
export function writeScaffold(plan, appName, title) {
  const files = {
    "package.json": template("package.json").replace("$APPNAME", appName),
    "vite.config.ts": template("vite.config.ts"),
    "tsconfig.json": template("tsconfig.json"),
    "index.html": template("index.html").replace("$APP", title),
    "src/main.tsx": template("main.tsx"),
    "src/index.css": template("index.css"),
    "src/App.tsx": template("App.tsx"),
    "src/CustomizeNudge.tsx": template("CustomizeNudge.tsx").replace("__FORMIC_INSTALL__", String(Math.floor(Date.now() / 1000))),
    "src/pages/Welcome.tsx": template("Welcome.tsx"),
    ".gitignore": "node_modules\ndist\n.DS_Store\n*.log\n",
  };
  for (const [p, content] of Object.entries(files)) plan.write(p, content);
  return Object.keys(files);
}
