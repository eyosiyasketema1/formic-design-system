#!/usr/bin/env node
/* Visual-regression harness (Phase 3 of PLAN-adoption.md, the Tester bullet):
   screenshots of an app's routes before and after `formicai migrate`,
   compared pixel by pixel, so a migration is measured, not eyeballed.

     node scripts/visual_check.mjs <app-dir> before  [--routes /,/#/2] [--no-build] [--build "<cmd>"] [--serve "<cmd>"]
     node scripts/visual_check.mjs <app-dir> after   (same flags)
     node scripts/visual_check.mjs <app-dir> compare [--threshold 1.0] [--threshold-dark N]
     node scripts/visual_check.mjs <app-dir> probe   (can a browser launch? exit 0 or 3)

   before / after: build the app (`npx vite build`, or `npx next build`),
   serve `dist/` on a free port (`npx vite preview`), screenshot every route
   at 1280×900 and 390×844, light and dark (`<html data-theme="dark">`), full
   page, animations off, into <app>/.formic-visual/<before|after>/.
   Routes: `/` plus what src/App.tsx declares (react-router `path="/x"`,
   hash links `href="#/x"`), or --routes.

   compare: per image the share of pixels that differ (a pixel differs when
   a channel moves by more than 16/255; pixels outside the smaller image
   count as different), printed as `route  viewport  theme  diff%`; PASS
   when every image is at or under --threshold (default 1.0%; --threshold-dark
   gives the dark images a bar of their own), else FAIL naming the worst. Writes .formic-visual/compare.json and report.html
   (before / after / diff side by side for anything above 0.1%).

   The only dependency is Playwright, resolved from --playwright <dir>,
   $FORMIC_VISUAL_PLAYWRIGHT, or the app's own node_modules — never from
   this repo. PNGs are read and written here (node:zlib), so nothing else is
   installed. Exit: 0 pass, 1 fail, 2 usage, 3 no browser. */
import fs from "node:fs";
import path from "node:path";
import net from "node:net";
import zlib from "node:zlib";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const VIEWPORTS = { desktop: { width: 1280, height: 900 }, mobile: { width: 390, height: 844 } };
const THEMES = ["light", "dark"];
const REPORT_FLOOR = 0.1; // % above which a pair gets its three images in report.html
const CHANNEL_TOLERANCE = 16;

// ── args ────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flags = { _: [] };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith("--")) {
    const k = a.slice(2);
    if (["routes", "threshold", "threshold-dark", "build", "serve", "playwright", "port"].includes(k)) flags[k] = argv[++i];
    else flags[k] = true;
  } else flags._.push(a);
}
const [appArg, mode] = flags._;
if (!appArg || !["before", "after", "compare", "probe"].includes(mode)) {
  console.error("usage: visual_check.mjs <app-dir> <before|after|compare|probe> [--routes r1,r2] [--threshold 1.0] [--no-build] [--playwright <dir>]");
  process.exit(2);
}
const APP = path.resolve(appArg);
const OUT = path.join(APP, ".formic-visual");
if (!fs.existsSync(path.join(APP, "package.json"))) { console.error(`${APP}: no package.json`); process.exit(2); }

// ── playwright, from the app or a throwaway install, never this repo ─
function loadPlaywright() {
  const candidates = [flags.playwright, process.env.FORMIC_VISUAL_PLAYWRIGHT, APP].filter(Boolean);
  for (const dir of candidates) {
    try {
      const req = createRequire(path.join(path.resolve(dir), "package.json"));
      return { chromium: req("playwright").chromium, from: req.resolve("playwright") };
    } catch { /* next */ }
  }
  return null;
}

async function launch() {
  const pw = loadPlaywright();
  if (!pw) return { error: "playwright is not installed (in the app, --playwright <dir> or $FORMIC_VISUAL_PLAYWRIGHT)" };
  try {
    const browser = await pw.chromium.launch();
    return { browser, from: pw.from };
  } catch (e) {
    const why = String(e.message || e).split("\n").find((l) => /error while loading|Executable doesn't exist|missing dependencies|Host system is missing/i.test(l)) || String(e.message || e).split("\n")[0];
    return { error: `chromium did not launch: ${why.replace(/^\s*\[pid=\d+\]\[err\]\s*/, "").replace(/^\S+\/chrome[^:\s]*: /, "").trim()}` };
  }
}

// ── routes ──────────────────────────────────────────────────
function declaredRoutes() {
  const routes = ["/"];
  for (const rel of ["src/App.tsx", "src/App.jsx", "src/app.tsx", "app/App.tsx"]) {
    const f = path.join(APP, rel);
    if (!fs.existsSync(f)) continue;
    const src = fs.readFileSync(f, "utf8");
    for (const m of src.matchAll(/\bpath=["'](\/[^"'*:]*)["']/g)) routes.push(m[1]);
    for (const m of src.matchAll(/\bhref=["'](#\/[^"']*)["']/g)) routes.push("/" + m[1]);
    break;
  }
  return [...new Set(routes)];
}
const ROUTES = flags.routes ? flags.routes.split(",").map((r) => r.trim()).filter(Boolean) : declaredRoutes();
const slug = (route) => route.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "root";
const fileName = (route, vp, theme) => `${slug(route)}__${vp}__${theme}.png`;

// ── build and serve ─────────────────────────────────────────
const pkg = JSON.parse(fs.readFileSync(path.join(APP, "package.json"), "utf8"));
const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
const isNext = Boolean(deps.next);
const NPX = process.platform === "win32" ? "npx.cmd" : "npx";

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => resolve(p)); });
    s.on("error", reject);
  });
}

function sh(cmd, label) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, { cwd: APP, shell: true, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (out += d));
    p.on("close", (code) => (code === 0 ? resolve(out) : reject(new Error(`${label} exited ${code}\n${out.split("\n").slice(-15).join("\n")}`))));
  });
}

async function serve(port) {
  const cmd = (flags.serve || (isNext ? `${NPX} next start -p {port} -H 127.0.0.1` : `${NPX} vite preview --port {port} --strictPort --host 127.0.0.1`)).replaceAll("{port}", String(port));
  const proc = spawn(cmd, { cwd: APP, shell: true, stdio: "ignore", detached: process.platform !== "win32" });
  const url = `http://127.0.0.1:${port}/`;
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try { const r = await fetch(url); if (r.ok || r.status === 404) return { proc, url }; } catch { /* not up yet */ }
    if (proc.exitCode !== null) break;
    await new Promise((r) => setTimeout(r, 250));
  }
  stop(proc);
  throw new Error(`the preview server did not answer on ${url} within 60s (${cmd})`);
}
function stop(proc) {
  if (!proc || proc.exitCode !== null) return;
  try { process.platform === "win32" ? proc.kill() : process.kill(-proc.pid, "SIGTERM"); } catch { try { proc.kill(); } catch { /* gone */ } }
}

// ── screenshots ─────────────────────────────────────────────
async function shoot(stage) {
  const t0 = Date.now();
  const l = await launch();
  if (l.error) { console.error(`visual: ${l.error}`); process.exit(3); }
  const dir = path.join(OUT, stage);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  let server;
  try {
    if (!flags["no-build"]) {
      const cmd = flags.build || (isNext ? `${NPX} next build` : `${NPX} vite build`);
      process.stdout.write(`visual: ${cmd} … `);
      await sh(cmd, cmd);
      console.log("ok");
    }
    server = await serve(flags.port ? Number(flags.port) : await freePort());
    console.log(`visual: ${stage}: ${ROUTES.length} route(s) × ${Object.keys(VIEWPORTS).length} viewport(s) × ${THEMES.length} theme(s) from ${server.url}`);
    for (const [vp, size] of Object.entries(VIEWPORTS)) {
      for (const theme of THEMES) {
        const ctx = await l.browser.newContext({ viewport: size, deviceScaleFactor: 1, reducedMotion: "reduce", colorScheme: "light" });
        // the theme is a data attribute (rule 8: no OS auto-detect), set before the app boots and again after, in case it resets it
        await ctx.addInitScript((t) => { if (t === "dark") document.documentElement.dataset.theme = "dark"; else delete document.documentElement.dataset.theme; }, theme);
        await ctx.addInitScript(() => {
          const style = document.createElement("style");
          style.textContent = "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important;scroll-behavior:auto!important}";
          document.addEventListener("DOMContentLoaded", () => document.head.appendChild(style));
        });
        const page = await ctx.newPage();
        for (const route of ROUTES) {
          // a fresh document per route: two routes that differ only in the hash would otherwise share one
          await page.goto("about:blank");
          await page.goto(server.url.replace(/\/$/, "") + route, { waitUntil: "networkidle" });
          await page.evaluate((t) => { if (t === "dark") document.documentElement.dataset.theme = "dark"; else delete document.documentElement.dataset.theme; return document.fonts.ready; }, theme);
          await page.waitForTimeout(300);
          await page.screenshot({ path: path.join(dir, fileName(route, vp, theme)), fullPage: true, animations: "disabled", caret: "hide" });
        }
        await ctx.close();
      }
    }
  } catch (e) {
    console.error(`visual: ${e.message}`);
    stop(server?.proc);
    await l.browser.close();
    process.exit(1);
  }
  stop(server?.proc);
  await l.browser.close();
  fs.writeFileSync(path.join(dir, "routes.json"), JSON.stringify({ routes: ROUTES, viewports: VIEWPORTS, themes: THEMES, at: new Date().toISOString() }, null, 2));
  console.log(`visual: ${stage}: ${ROUTES.length * Object.keys(VIEWPORTS).length * THEMES.length} screenshot(s) in ${path.relative(process.cwd(), dir)} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
}

// ── png in and out (8-bit RGB / RGBA, non-interlaced: what Chromium writes) ─
function readPng(file) {
  const buf = fs.readFileSync(file);
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error(`${file}: not a PNG`);
  let pos = 8, width = 0, height = 0, colorType = 0, depth = 0, interlace = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos); const type = buf.toString("ascii", pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") { width = data.readUInt32BE(0); height = data.readUInt32BE(4); depth = data[8]; colorType = data[9]; interlace = data[12]; }
    else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    pos += 12 + len;
  }
  if (depth !== 8 || interlace !== 0 || ![2, 6].includes(colorType)) throw new Error(`${file}: unsupported PNG (depth ${depth}, color type ${colorType}, interlace ${interlace})`);
  const bpp = colorType === 6 ? 4 : 3;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * bpp;
  const out = Buffer.alloc(width * height * 4);
  const prev = Buffer.alloc(stride);
  const cur = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    raw.copy(cur, 0, y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      let v = cur[i];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      cur[i] = v & 255;
    }
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4, s = x * bpp;
      out[o] = cur[s]; out[o + 1] = cur[s + 1]; out[o + 2] = cur[s + 2]; out[o + 3] = bpp === 4 ? cur[s + 3] : 255;
    }
    cur.copy(prev);
  }
  return { width, height, data: out };
}

const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
function crc32(buf) { let c = -1; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function writePng(file, { width, height, data }) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) { raw[y * (width * 4 + 1)] = 0; data.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4); }
  fs.writeFileSync(file, Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]));
}

// ── compare ─────────────────────────────────────────────────
function diffPair(a, b, diffFile) {
  const width = Math.max(a.width, b.width), height = Math.max(a.height, b.height);
  const out = Buffer.alloc(width * height * 4);
  let changed = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      const inA = x < a.width && y < a.height, inB = x < b.width && y < b.height;
      let differs;
      if (inA && inB) {
        const i = (y * a.width + x) * 4, j = (y * b.width + x) * 4;
        differs = Math.abs(a.data[i] - b.data[j]) > CHANNEL_TOLERANCE || Math.abs(a.data[i + 1] - b.data[j + 1]) > CHANNEL_TOLERANCE || Math.abs(a.data[i + 2] - b.data[j + 2]) > CHANNEL_TOLERANCE || Math.abs(a.data[i + 3] - b.data[j + 3]) > CHANNEL_TOLERANCE;
      } else differs = true;
      if (differs) { changed++; out[o] = 220; out[o + 1] = 38; out[o + 2] = 38; out[o + 3] = 255; }
      else {
        // the unchanged picture, faded, so the red reads against it
        const i = (y * a.width + x) * 4;
        out[o] = 255 - ((255 - a.data[i]) * 0.25) | 0; out[o + 1] = 255 - ((255 - a.data[i + 1]) * 0.25) | 0; out[o + 2] = 255 - ((255 - a.data[i + 2]) * 0.25) | 0; out[o + 3] = 255;
      }
    }
  }
  if (diffFile) writePng(diffFile, { width, height, data: out });
  return { changed, total: width * height, pct: (changed / (width * height)) * 100, sizeA: `${a.width}×${a.height}`, sizeB: `${b.width}×${b.height}` };
}

function compare() {
  const threshold = flags.threshold !== undefined ? Number(flags.threshold) : 1.0;
  // dark gets its own bar when asked: a half-migrated app flips only its migrated regions to dark tokens, a far larger move than the light-mode grey shift
  const thresholdDark = flags["threshold-dark"] !== undefined ? Number(flags["threshold-dark"]) : threshold;
  const limit = (r) => (r.theme === "dark" ? thresholdDark : threshold);
  const beforeDir = path.join(OUT, "before"), afterDir = path.join(OUT, "after"), diffDir = path.join(OUT, "diff");
  for (const d of [beforeDir, afterDir]) if (!fs.existsSync(path.join(d, "routes.json"))) { console.error(`visual: ${d} has no screenshots; run \`${path.basename(d)}\` first`); process.exit(2); }
  const meta = JSON.parse(fs.readFileSync(path.join(beforeDir, "routes.json"), "utf8"));
  fs.rmSync(diffDir, { recursive: true, force: true }); fs.mkdirSync(diffDir, { recursive: true });
  const rows = [];
  for (const route of meta.routes) for (const vp of Object.keys(meta.viewports)) for (const theme of meta.themes) {
    const name = fileName(route, vp, theme);
    const bf = path.join(beforeDir, name), af = path.join(afterDir, name);
    if (!fs.existsSync(af)) { rows.push({ route, vp, theme, name, pct: 100, missing: true }); continue; }
    const r = diffPair(readPng(bf), readPng(af), path.join(diffDir, name));
    rows.push({ route, vp, theme, name, ...r });
  }
  const w = Math.max(5, ...rows.map((r) => r.route.length));
  console.log(`${"route".padEnd(w)}  viewport  theme  diff%`);
  for (const r of rows) console.log(`${r.route.padEnd(w)}  ${r.vp.padEnd(8)}  ${r.theme.padEnd(5)}  ${r.pct.toFixed(2).padStart(6)}${r.missing ? "  (missing after)" : r.sizeA !== r.sizeB ? `  (${r.sizeA} → ${r.sizeB})` : ""}`);
  const bad = rows.filter((r) => r.pct > limit(r)).sort((x, y) => y.pct - x.pct);
  const worst = [...rows].sort((x, y) => y.pct - x.pct)[0];
  const bar = thresholdDark === threshold ? `${threshold}%` : `${threshold}% light / ${thresholdDark}% dark`;
  fs.writeFileSync(path.join(OUT, "compare.json"), JSON.stringify({ threshold, thresholdDark, pass: bad.length === 0, worst: worst && { route: worst.route, viewport: worst.vp, theme: worst.theme, pct: worst.pct }, rows: rows.map(({ route, vp, theme, name, pct, changed, total, sizeA, sizeB, missing }) => ({ route, viewport: vp, theme, name, pct: Number(pct.toFixed(3)), changed, total, before: sizeA, after: sizeB, missing: Boolean(missing) })), at: new Date().toISOString() }, null, 2));
  writeReport(rows, limit, bar);
  if (bad.length) {
    console.log(`FAIL: ${bad.length} of ${rows.length} image(s) above ${bar} — ${bad.slice(0, 3).map((r) => `${r.name} (${r.pct.toFixed(2)}%)`).join(", ")}${bad.length > 3 ? ", …" : ""}; see ${path.relative(process.cwd(), path.join(OUT, "report.html"))}`);
    process.exit(1);
  }
  console.log(`PASS: ${rows.length} image(s) at or under ${bar} (worst ${worst ? `${worst.pct.toFixed(2)}% on ${worst.name}` : "none"}); report: ${path.relative(process.cwd(), path.join(OUT, "report.html"))}`);
}

function writeReport(rows, limit, bar) {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const shown = rows.filter((r) => r.pct > REPORT_FLOOR);
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Visual check</title>
<style>
:root{color-scheme:light dark;font:14px/1.5 system-ui,sans-serif}body{margin:0;padding:24px;max-width:1600px}h1{font-size:20px;margin:0 0 4px}p{margin:0 0 16px;opacity:.7}
table{border-collapse:collapse;margin-bottom:24px}td,th{padding:4px 12px 4px 0;text-align:left;border-bottom:1px solid color-mix(in srgb,currentColor 15%,transparent)}td.n{text-align:right;font-variant-numeric:tabular-nums}tr.bad td{color:#b91c1c}
section{margin-bottom:32px}h2{font-size:15px;margin:0 0 8px}.trio{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.trio figure{margin:0;min-width:0}.trio figcaption{font-size:12px;opacity:.7;margin-bottom:4px}.trio img{width:100%;height:auto;border:1px solid color-mix(in srgb,currentColor 15%,transparent);display:block}
</style></head><body>
<h1>Visual check</h1><p>${rows.length} image(s), threshold ${bar}, ${rows.filter((r) => r.pct > limit(r)).length} above it. Pairs above ${REPORT_FLOOR}% are shown below; red marks what moved.</p>
<table><thead><tr><th>route</th><th>viewport</th><th>theme</th><th>diff%</th><th>before</th><th>after</th></tr></thead><tbody>
${rows.map((r) => `<tr${r.pct > limit(r) ? ' class="bad"' : ""}><td>${esc(r.route)}</td><td>${r.vp}</td><td>${r.theme}</td><td class="n">${r.pct.toFixed(2)}</td><td>${r.sizeA || ""}</td><td>${r.missing ? "missing" : r.sizeB}</td></tr>`).join("\n")}
</tbody></table>
${shown.map((r) => `<section><h2>${esc(r.route)} · ${r.vp} · ${r.theme} · ${r.pct.toFixed(2)}%</h2><div class="trio">
<figure><figcaption>before</figcaption><img src="before/${r.name}" alt="before"></figure>
<figure><figcaption>after</figcaption><img src="after/${r.name}" alt="after"></figure>
<figure><figcaption>diff</figcaption>${r.missing ? "<em>no after image</em>" : `<img src="diff/${r.name}" alt="diff">`}</figure>
</div></section>`).join("\n")}
</body></html>
`;
  fs.writeFileSync(path.join(OUT, "report.html"), html);
}

// ── main ────────────────────────────────────────────────────
if (mode === "probe") {
  const l = await launch();
  if (l.error) { console.error(`visual: ${l.error}`); process.exit(3); }
  await l.browser.close();
  console.log(`visual: browser ok (playwright from ${l.from})`);
} else if (mode === "compare") compare();
else await shoot(mode);
