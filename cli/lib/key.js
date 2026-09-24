/* formicai key [<key>] [--remove]

   The Formic Pro key for this project. With a key: activates it on the site
   (one seat, labelled <hostname>:<project folder>), writes FORMIC_KEY and
   FORMIC_KEY_ACTIVATION to .env.local, makes sure .env.local is ignored by
   git, and adds the @formic-pro registry to components.json. Without one:
   the status. --remove deletes the lines. The key itself is never printed;
   what shows is ****- and its last six characters. */
import { Plan, say, skip, warn, bad, note, die, grey, yellow, detectProject } from "./util.js";
import { BASE } from "./registry.js";
import { writeComponentsJson } from "./project.js";
import { ENV_FILE, PRO_PAGE, ProRefused, activate, checkKey, ignoreEnv, mask, readKey, removeKey, reportRefusal, seatLabel, writeKey } from "./pro.js";

export const help = `formicai key [<key>] [--remove]

  Adds a Formic Pro key to this project, or shows its status.

  formicai key <key>    activates the key on formicai.dev (one seat, labelled
                        with this machine and folder) and writes FORMIC_KEY
                        and FORMIC_KEY_ACTIVATION to ${ENV_FILE} (git-ignored);
                        Pro components are then one npx formicai add away
  formicai key          the status: the key (masked), its expiry, whether the
                        site still accepts it
  formicai key --remove deletes the two lines from ${ENV_FILE}

  The key is never printed in full. Get one at ${PRO_PAGE}.

  Examples
    npx formicai key FORM-XXXX-XXXX-XXXX
    npx formicai key
    npx formicai key --remove
`;

/* activate + write; shared with init --key. Returns 0 or 1. */
export async function addKey(key, cwd = process.cwd()) {
  key = String(key).trim();
  if (!key) die("say which key: formicai key <key> (get one at " + PRO_PAGE + ")");
  let r;
  try { r = await activate(key, seatLabel(cwd)); }
  catch (e) { if (e instanceof ProRefused) { reportRefusal(e); return 1; } throw e; }
  const verb = writeKey(cwd, { key, activation: r.activation, expires: r.expires });
  say(`Formic Pro key ${mask(key)} ${verb === "write" ? "written to" : "updated in"} ${ENV_FILE}${r.expires ? `, valid until ${r.expires}` : ", no expiry"}${r.activation ? "" : grey(" (the key has no seat limit; no activation id)")}`);
  const ig = ignoreEnv(cwd);
  if (ig === "appended" || ig === "written") say(`.gitignore: ${ENV_FILE} added, so the key is never committed`);
  else skip(`.gitignore already covers ${ENV_FILE}`);
  const project = detectProject(cwd);
  if (project.components) writeComponentsJson(new Plan({ cwd }), project.components, { cssFile: project.cssFile, srcDir: project.srcDir, registryUrl: BASE, pro: true });
  note(`    Pro components: npx formicai add --list`);
  return 0;
}

export async function run(flags) {
  const cwd = process.cwd();
  if (flags.remove) {
    const had = readKey(cwd);
    if (removeKey(cwd)) say(`Formic Pro key${had ? ` ${mask(had.key)}` : ""} removed from ${ENV_FILE}`);
    else skip(`no Formic Pro key in ${ENV_FILE}`);
    if (process.env.FORMIC_KEY) warn("FORMIC_KEY is also set in the environment; unset it there too");
    return 0;
  }
  const key = flags._[0];
  if (key !== undefined) return addKey(key, cwd);

  const creds = readKey(cwd);
  if (!creds) { note(`  ${grey("–")} no Formic Pro key; npx formicai key <key> adds one (${PRO_PAGE})`); return 0; }
  const where = creds.source === ENV_FILE ? ENV_FILE : "the environment";
  const until = creds.expires ? `valid until ${creds.expires}` : "no expiry recorded";
  const c = await checkKey(creds);
  if (c.ok === true) say(`Formic Pro key ${mask(creds.key)} from ${where}, ${until}; the site accepts it`);
  else if (c.ok === false) { bad(`Formic Pro key ${mask(creds.key)} from ${where}: ${c.message}`); note(`      ${yellow("fix:")} npx formicai key <new key>  ${grey(`(${PRO_PAGE})`)}`); return 1; }
  else warn(`Formic Pro key ${mask(creds.key)} from ${where}, ${until}; not checked (${c.message})`);
  return 0;
}
