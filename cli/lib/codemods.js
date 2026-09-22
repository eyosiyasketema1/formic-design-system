/* The codemods behind `formicai migrate`: the mechanical part of moving a
   page from generic Tailwind (palette classes, rounded-lg, shadow-md, a raw
   <button>, an <input> under a <label>, lucide icons) onto Formic's tokens
   and components. Table-driven, one entry per codemod, each leaving a
   `formic-todo` comment where it could not decide. Written on regexes and a
   small tokenizer in plain Node (no parser, no runtime dependency): it
   handles the shapes a legacy React + Tailwind page actually has and says
   so, with a todo, when it meets one it does not. The codemods run in order
   (icons, button, input, element, then palette, type, shape), so the class
   mapping only sees what the element rewrites left behind. */

/* ── tokenizer: string and template literals, comments ─────── */
/* Positions of every literal, so a class mapping only touches text a
   browser would see as a class list, and every comment, so nothing inside
   one is rewritten. A quote with no closing quote on the same line is JSX
   prose (don't), not a string. */
export function tokenize(src) {
  const lits = [], comments = [];
  const n = src.length;
  const lineEnd = (i) => { const j = src.indexOf("\n", i); return j < 0 ? n : j; };
  const blockEnd = (i) => { const j = src.indexOf("*/", i + 2); return j < 0 ? n : j + 2; };
  function scanString(i) {
    const q = src[i];
    let j = i + 1;
    while (j < n) {
      const c = src[j];
      if (c === "\\") { j += 2; continue; }
      if (c === "\n") return i + 1;
      if (c === q) { lits.push({ kind: "str", start: i + 1, end: j, litStart: i, litEnd: j + 1 }); return j + 1; }
      j++;
    }
    return i + 1;
  }
  function scanTemplate(i) {
    const lit = { litStart: i, litEnd: n };
    let j = i + 1, chunkStart = j;
    while (j < n) {
      const c = src[j];
      if (c === "\\") { j += 2; continue; }
      if (c === "`") { lits.push({ kind: "tpl", start: chunkStart, end: j, lit }); lit.litEnd = j + 1; return j + 1; }
      if (c === "$" && src[j + 1] === "{") {
        lits.push({ kind: "tpl", start: chunkStart, end: j, lit });
        j = scanCode(j + 2, true);
        chunkStart = j;
        continue;
      }
      j++;
    }
    return j;
  }
  /* code until the `}` that closes a template expression (untilBrace), or the end */
  function scanCode(i, untilBrace) {
    let depth = 0;
    while (i < n) {
      const c = src[i];
      /* a quote right after a word character is a contraction in JSX prose (don't, it's), not a string */
      if ((c === '"' || c === "'") && !/\w/.test(src[i - 1] ?? "")) { i = scanString(i); continue; }
      if (c === "`") { i = scanTemplate(i); continue; }
      /* `//` right after `:` is a URL in prose (https://), not a comment */
      if (c === "/" && src[i + 1] === "/" && src[i - 1] !== ":") { const e = lineEnd(i); comments.push({ start: i, end: e }); i = e; continue; }
      if (c === "/" && src[i + 1] === "*") { const e = blockEnd(i); comments.push({ start: i, end: e }); i = e; continue; }
      if (untilBrace) {
        if (c === "{") depth++;
        else if (c === "}") { if (depth === 0) return i + 1; depth--; }
      }
      i++;
    }
    return i;
  }
  scanCode(0, false);
  for (const l of lits) if (l.lit) { l.litStart = l.lit.litStart; l.litEnd = l.lit.litEnd; }
  return { lits, comments };
}

const inRange = (ranges, pos) => ranges.some((r) => pos >= r.start && pos < r.end);

/* does `name` appear as an identifier outside strings and comments */
export function identifierUsed(src, name) {
  const { lits, comments } = tokenize(src);
  let code = src;
  const blank = (a, b) => { code = code.slice(0, a) + " ".repeat(b - a) + code.slice(b); };
  for (const l of lits) blank(l.start, l.end);
  for (const c of comments) blank(c.start, c.end);
  /* JSX prose is not blanked: a word in prose only keeps an import with a todo, while a missed use in code (`n > 0 ? Bell : Star`) would break the build */
  return new RegExp(`(?<![\\w$.])${name}(?![\\w$-])`).test(code);
}

/* ── class tables ──────────────────────────────────────────── */
const NEUTRAL = new Set(["slate", "gray", "zinc", "neutral", "stone"]);
const ACCENT = new Set(["blue", "indigo", "violet", "purple", "fuchsia", "pink", "rose", "sky", "cyan", "teal"]);
const SEMANTIC = { red: "red", green: "green", emerald: "green", lime: "green", amber: "orange", yellow: "orange", orange: "orange" };
const HUES = "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const PALETTE = new RegExp(`^(bg|text|border|divide|ring|outline|fill|stroke|from|to|via|shadow|decoration|accent|caret)-(${HUES})-(\\d{2,3})(/\\d{1,3})?$`);
const PLAIN = { "bg-white": "bg-surface", "bg-black": "bg-ink", "text-white": "text-canvas", "text-black": "text-ink", "border-white": "border-canvas", "border-black": "border-ink", "divide-black": "divide-ink" };
const TEXT_COLOUR = /^(?:[\w-]+:)*text-(?:canvas|ink|ink-2|ink-3|accent|red|green|orange|white|black|(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3})$/;

/* → { to } (a class, or null to drop it), { todo }, or undefined (no opinion) */
function mapPalette(base, variants) {
  const plain = PLAIN[base];
  const m = PALETTE.exec(base);
  if (!plain && !m) return undefined;
  if (variants.includes("dark")) return { to: null, why: "dark: variant dropped, tokens carry dark mode" };
  if (plain) return { to: plain };
  const [, prop, hue, shadeText, alpha] = m;
  const shade = Number(shadeText);
  if (alpha) return { todo: `${base}: a colour with opacity; pick a token (a -tint for a wash) and drop the /${alpha.slice(1)}` };
  const family = NEUTRAL.has(hue) ? "neutral" : ACCENT.has(hue) ? "accent" : SEMANTIC[hue];
  const focus = variants.some((v) => /^focus(-visible|-within)?$/.test(v));
  if (focus && (prop === "border" || prop === "ring" || prop === "outline")) return { to: null, why: "focus colour dropped, the shared focus rule applies" };
  const hover = variants.includes("hover");
  if (hover && prop === "bg") {
    if (family === "neutral" && shade <= 200) return { to: "bg-hover" };
    if ((family === "neutral" && shade >= 700) || (family !== "neutral" && shade >= 500)) return { to: "opacity-90", why: "a darker hover on a flat fill is opacity-90" };
  }
  if (["fill", "stroke", "from", "to", "via", "shadow", "decoration", "accent", "caret", "ring", "outline"].includes(prop)) {
    return { todo: `${base}: no token for ${prop}-; use the token variables (var(--accent), var(--chart-1)) or a chart from charts.tsx` };
  }
  const line = (p) => `${p}-line`;
  if (family === "neutral") {
    if (prop === "bg") {
      if (shade <= 50) return { to: "bg-surface" };
      if (shade <= 200) return { to: "bg-inset" };
      if (shade === 300) return { to: "bg-line-strong" };
      if (shade >= 700) return { to: "bg-ink" };
      return { todo: `${base}: a mid grey fill has no token; bg-inset for a rest, bg-ink for a solid` };
    }
    if (prop === "text") {
      if (shade <= 200) return { to: "text-canvas" };
      if (shade <= 400) return { to: "text-ink-3" };
      if (shade <= 700) return { to: "text-ink-2" };
      return { to: "text-ink" };
    }
    if (shade <= 300) return { to: line(prop) };
    if (shade <= 500) return { to: `${prop}-line-strong` };
    return { to: `${prop}-ink` };
  }
  if (family === "accent") {
    if (prop === "bg") {
      if (shade <= 100) return { to: "bg-accent-tint" };
      if (shade >= 500 && shade <= 700) return { to: "bg-accent" };
      if (shade >= 800) return { to: "bg-ink" };
      return { todo: `${base}: a light accent fill has no token; bg-accent-tint for a wash, bg-accent for the fill` };
    }
    if (prop === "text") {
      if (shade <= 200) return { to: "text-canvas" };
      if (shade >= 500 && shade <= 700) return { to: "text-accent" };
      if (shade >= 800) return { to: "text-ink" };
      return { todo: `${base}: a pale accent text has no token; text-accent, or text-ink-3 for a hint` };
    }
    if (shade >= 500 && shade <= 700) return { to: `${prop}-accent` };
    return { todo: `${base}: a tinted accent ${prop} has no token; ${prop}-line, or ${prop}-accent for emphasis` };
  }
  const s = family;
  if (prop === "bg") {
    if (shade <= 100) return { to: `bg-${s}-tint` };
    if (shade >= 500) return { to: `bg-${s}` };
    return { todo: `${base}: a light ${s} fill has no token; bg-${s}-tint for a wash, bg-${s} for the fill` };
  }
  if (prop === "text") {
    if (shade <= 200) return { to: "text-canvas" };
    if (shade >= 500) return { to: `text-${s}` };
    return { todo: `${base}: a pale ${s} text has no token; text-${s}` };
  }
  if (shade >= 200) return { to: `${prop}-${s}` };
  return { todo: `${base}: a ${s} tint ${prop} has no token; ${prop}-${s}, or ${prop}-line` };
}

const RAMP = [[8, "nano"], [10, "micro"], [11, "tiny"], [12, "small"], [13, "caption"], [14, "body"], [16, "lead"], [18, "title"], [20, "heading"], [24, "display"], [32, "display-lg"], [48, "display-xl"]];
const nearestStep = (px) => RAMP.reduce((best, [p, name]) => (Math.abs(p - px) < Math.abs(best[0] - px) ? [p, name] : best))[1];
const SIZES = { xs: "small", sm: "caption", base: "body", lg: "lead", xl: "title", "2xl": "heading", "3xl": "display", "4xl": "display-lg", "5xl": "display-xl", "6xl": "display-xl", "7xl": "display-xl", "8xl": "display-xl", "9xl": "display-xl" };

function mapType(base) {
  let m;
  if ((m = /^text-(xs|sm|base|lg|xl|[2-9]xl)$/.exec(base))) return { to: `text-${SIZES[m[1]]}` };
  if ((m = /^text-\[(\d+(?:\.\d+)?)px\]$/.exec(base))) return { to: `text-${nearestStep(Number(m[1]))}` };
  if ((m = /^text-\[(\d*\.?\d+)rem\]$/.exec(base))) return { to: `text-${nearestStep(Number(m[1]) * 16)}` };
  if (/^text-\[/.test(base)) return { todo: `${base}: an arbitrary size; pick the nearest ramp step (text-body, text-caption, ...)` };
  if (/^font-(bold|extrabold|black)$/.test(base)) return { to: "font-semibold" };
  if (base === "tracking-tighter") return { to: "tracking-tight" };
  if (base === "tracking-wider" || base === "tracking-widest") return { to: "tracking-wide" };
  if (/^tracking-\[/.test(base)) return { todo: `${base}: an arbitrary tracking; only tracking-tight and tracking-wide exist` };
  return undefined;
}

const RADII = { none: "none", xs: "sm", sm: "sm", "": "control", md: "control", lg: "md", xl: "card", "2xl": "card", "3xl": "card", "4xl": "card", full: "full" };
const radiusPx = (px) => (px <= 5 ? null : px <= 6 ? "sm" : px <= 7 ? "chip" : px <= 8 ? "control" : px <= 11 ? "md" : px <= 18 ? "card" : "capsule");

function mapShape(base) {
  let m;
  if ((m = /^rounded((?:-(?:t|r|b|l|tl|tr|bl|br|ss|se|es|ee|s|e))?)(?:-(none|xs|sm|md|lg|xl|2xl|3xl|4xl|full))?$/.exec(base))) {
    const to = RADII[m[2] ?? ""];
    const next = `rounded${m[1]}-${to}`;
    return next === base ? undefined : { to: next };
  }
  if ((m = /^rounded((?:-(?:t|r|b|l|tl|tr|bl|br))?)-\[(\d+)px\]$/.exec(base))) {
    const to = radiusPx(Number(m[2]));
    return to ? { to: `rounded${m[1]}-${to}` } : undefined;
  }
  if (/^rounded(-[trbl]{1,2})?-\[/.test(base)) return { todo: `${base}: an arbitrary radius; the scale is rounded-sm / control / md / card` };
  if (/^shadow(-(sm|md|lg|xl|2xl))?$/.test(base)) return { to: "shadow-card" };
  if (base === "shadow-inner") return { to: null, why: "inner shadows are not in the system" };
  if (/^shadow-\[/.test(base)) return { todo: `${base}: an arbitrary shadow; elevation is a hairline (shadow-card, shadow-hairline)` };
  if (/^drop-shadow(-\w+)?$/.test(base)) return { to: null, why: "drop shadows are not in the system" };
  if (base === "h-screen") return { to: "h-dvh" };
  if (base === "min-h-screen") return { to: "min-h-dvh" };
  return undefined;
}

const CLASS_MODS = [["palette", mapPalette], ["type", mapType], ["shape", mapShape]];
const CLASS_TOKEN = /^(!?)((?:[\w-]+:)*)([\w\[\]\-./%]+)$/;

/* one class list (the text of a literal) through the three class codemods */
export function mapClassList(text, counts, todos) {
  const fills = [];
  let touched = false;
  let out = text.replace(/\S+/g, (tok) => {
    const m = CLASS_TOKEN.exec(tok);
    if (!m) return tok;
    const [, bang, prefix, base] = m;
    const variants = prefix ? prefix.slice(0, -1).split(":") : [];
    for (const [name, fn] of CLASS_MODS) {
      const r = fn(base, variants);
      if (!r) continue;
      if (r.todo) { todos.push(r.todo); counts[name] = (counts[name] ?? 0) + 0; return tok; }
      counts[name] = (counts[name] ?? 0) + 1;
      touched = true;
      if (r.to === null) return "";
      if (!variants.length && /^bg-(accent|ink|red|green|orange)$/.test(r.to)) fills.push(r.to);
      return `${bang}${prefix}${r.to}`;
    }
    return tok;
  });
  /* a solid fill gets text-canvas when the list names no text colour of its own (CLAUDE.md rule 2) */
  if (fills.length && !out.split(/\s+/).some((t) => TEXT_COLOUR.test(t))) {
    const trail = /\s*$/.exec(out)[0];
    out = out.slice(0, out.length - trail.length) + " text-canvas" + trail;
    counts.palette = (counts.palette ?? 0) + 1;
  }
  if (touched) {
    out = out.replace(/[ \t]{2,}/g, " ");
    if (!/^\s/.test(text)) out = out.replace(/^\s+/, "");
    if (!/\s$/.test(text)) out = out.replace(/\s+$/, "");
  }
  return out;
}

/* ── JSX tag parsing ───────────────────────────────────────── */
/* the opening tag at `at` (src[at] === "<"): name, attributes with positions,
   whether it self-closes, where it ends. Attribute values: "…", '…', {…}. */
export function parseTag(src, at) {
  const m = /^<([A-Za-z][\w.:-]*)/.exec(src.slice(at, at + 80));
  if (!m) return null;
  const name = m[1];
  let i = at + m[0].length;
  const attrs = [];
  const n = src.length;
  const skipBraces = (j) => {
    let depth = 0;
    while (j < n) {
      const c = src[j];
      if (c === '"' || c === "'") { const q = c; j++; while (j < n && src[j] !== q) { if (src[j] === "\\") j++; j++; } j++; continue; }
      if (c === "`") { j++; while (j < n && src[j] !== "`") { if (src[j] === "\\") j++; j++; } j++; continue; }
      if (c === "{") depth++;
      else if (c === "}") { depth--; if (depth === 0) return j + 1; }
      j++;
    }
    return j;
  };
  while (i < n) {
    while (i < n && /\s/.test(src[i])) i++;
    if (src.startsWith("/>", i)) return { name, attrs, selfClosing: true, start: at, end: i + 2, open: i + 2 };
    if (src[i] === ">") return { name, attrs, selfClosing: false, start: at, end: i + 1, open: i + 1 };
    if (src.startsWith("/*", i)) { const e = src.indexOf("*/", i); i = e < 0 ? n : e + 2; continue; }
    if (src.startsWith("//", i)) { const e = src.indexOf("\n", i); i = e < 0 ? n : e + 1; continue; }
    if (src[i] === "{") { const s = i; i = skipBraces(i); attrs.push({ name: "...", raw: src.slice(s, i), start: s, end: i, spread: true }); continue; }
    const a = /^[A-Za-z_:][\w:.-]*/.exec(src.slice(i, i + 200));
    if (!a) return null;
    const s = i;
    i += a[0].length;
    let value = null, expr = null;
    if (src[i] === "=") {
      i++;
      if (src[i] === '"' || src[i] === "'") { const q = src[i]; const e = src.indexOf(q, i + 1); if (e < 0) return null; value = src.slice(i + 1, e); i = e + 1; }
      else if (src[i] === "{") { const s2 = i; i = skipBraces(i); expr = src.slice(s2 + 1, i - 1); }
      else return null;
    }
    attrs.push({ name: a[0], value, expr, raw: src.slice(s, i), start: s, end: i });
  }
  return null;
}

/* the index of the `</name>` that closes the tag opened at `tag` (nesting aware) */
export function closeOf(src, tag) {
  const open = new RegExp(`<${tag.name}\\b`, "g"), close = `</${tag.name}>`;
  let depth = 1, i = tag.open;
  while (i < src.length) {
    const c = src.indexOf(close, i);
    if (c < 0) return null;
    open.lastIndex = i;
    let o = open.exec(src);
    while (o && o.index < c) {
      const t = parseTag(src, o.index);
      if (t && !t.selfClosing) depth++;
      open.lastIndex = o.index + 1;
      o = open.exec(src);
    }
    depth--;
    if (depth === 0) return { start: c, end: c + close.length };
    i = c + close.length;
  }
  return null;
}

/* attributes as they were written, minus the ones removed, plus new ones */
function rebuildAttrs(tag, { drop = [], add = [] } = {}) {
  const kept = tag.attrs.filter((a) => !drop.includes(a.name)).map((a) => a.raw);
  return [...add, ...kept].join(" ");
}

const LAYOUT = /^(?:[\w-]+:)*(?:-?m[trblxyse]?-|self-|col-|row-|order-|flex-1|flex-none|grow|shrink|hidden|block|inline|inline-flex|inline-block|absolute|relative|fixed|sticky|top-|left-|right-|bottom-|inset-|z-|w-|min-w-|max-w-|justify-self|place-self|align-|float-|sr-only|not-sr-only)/;
const layoutOnly = (cls) => (cls ?? "").split(/\s+/).filter((t) => t && LAYOUT.test(t));

/* ── imports ───────────────────────────────────────────────── */
const IMPORT = /^import\s[\s\S]*?from\s*["'][^"']+["'];?[ \t]*(?:\/\/[^\n]*)?$|^import\s*["'][^"']+["'];?[ \t]*(?:\/\/[^\n]*)?$/gm;

export function ensureImport(src, { def, named = [], from }) {
  const rx = new RegExp(`^import\\s+([^;]*?)\\s*from\\s*["']${from.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}["'];?[ \\t]*$`, "m");
  const m = rx.exec(src);
  if (m) {
    let clause = m[1].trim();
    let d = null, names = [];
    const nm = /\{([^}]*)\}/.exec(clause);
    if (nm) names = nm[1].split(",").map((s) => s.trim()).filter(Boolean);
    const dm = /^([A-Za-z_$][\w$]*)\s*(?:,|$)/.exec(clause);
    if (dm) d = dm[1];
    if (def && !d) d = def;
    for (const nme of named) if (!names.includes(nme)) names.push(nme);
    const parts = [];
    if (d) parts.push(d);
    if (names.length) parts.push(`{ ${names.join(", ")} }`);
    const line = `import ${parts.join(", ")} from "${from}";`;
    return src.slice(0, m.index) + line + src.slice(m.index + m[0].length);
  }
  const parts = [];
  if (def) parts.push(def);
  if (named.length) parts.push(`{ ${named.join(", ")} }`);
  const line = `import ${parts.join(", ")} from "${from}";`;
  let last = null;
  for (const im of src.matchAll(IMPORT)) last = im;
  if (last) return src.slice(0, last.index + last[0].length) + "\n" + line + src.slice(last.index + last[0].length);
  const directive = /^(["']use client["'];?\s*\n)/.exec(src);
  if (directive) return directive[1] + line + "\n" + src.slice(directive[1].length);
  return line + "\n" + src;
}

/* is `name` already bound by an import from somewhere else, or declared here? */
function bound(src, name, exceptFrom) {
  for (const im of src.matchAll(IMPORT)) {
    if (exceptFrom && im[0].includes(`"${exceptFrom}"`)) continue;
    if (new RegExp(`\\b${name}\\b`).test(im[0].replace(/from\s*["'][^"']+["']/, ""))) return true;
  }
  return new RegExp(`\\b(?:function|const|let|var|class|type|interface)\\s+${name}\\b`).test(src);
}

/* ── the codemods ──────────────────────────────────────────── */
/* Each: run(src, ctx) → { src, count, todos } ; ctx carries the relative
   path to src/formic/components (`components`) and the icon names the
   installed primitives.tsx exports (`icons`). */

export const LUCIDE = {
  Plus: "plus", Search: "search", Trash: "trash", Trash2: "trash", Pencil: "edit", Edit: "edit", Edit2: "edit", Edit3: "edit", Check: "check", X: "close",
  ChevronDown: "chevron", ChevronLeft: "chevron-left", ChevronRight: "chevron-right", ArrowLeft: "arrow-left", ArrowRight: "arrow-right", ArrowUp: "arrow-up",
  Settings: "gear", Settings2: "adjustments", User: "user", Users: "users", Calendar: "calendar", CalendarDays: "calendar", Clock: "clock", Download: "download", Upload: "upload",
  Filter: "filter", FilterX: "filter-off", RefreshCw: "retry", RotateCw: "retry", Copy: "copy", ExternalLink: "external", Mail: "mail", Bell: "bell", Home: "home", Menu: "list",
  MoreHorizontal: "ellipsis", Ellipsis: "ellipsis", MoreVertical: "dots-vertical", EllipsisVertical: "dots-vertical", Eye: "eye", EyeOff: "eye-off", Lock: "lock", Star: "star",
  Info: "info", AlertTriangle: "warning", TriangleAlert: "warning", AlertCircle: "alert", CircleAlert: "alert", HelpCircle: "help", CircleHelp: "help",
  Share: "share", Share2: "share", Printer: "print", Phone: "phone", MapPin: "map-pin", Link: "link", Link2: "link", Archive: "archive", Tag: "tag", Building: "building", Building2: "building",
  CreditCard: "credit-card", ShoppingCart: "cart", Package: "package", Truck: "truck", Receipt: "receipt", Wallet: "wallet", LineChart: "chart-line", ChartLine: "chart-line",
  PieChart: "chart-pie", ChartPie: "chart-pie", BarChart: "chart", BarChart3: "chart", ChartBar: "chart", Database: "database", Cloud: "cloud", Key: "key", Shield: "shield",
  Clipboard: "clipboard", Folder: "folder", Image: "image", Video: "video", Play: "play", Pause: "pause", ZoomIn: "zoom-in", ZoomOut: "zoom-out", Maximize: "maximize", Maximize2: "maximize",
  Minimize: "minimize", Minimize2: "minimize", Flag: "flag", Bookmark: "bookmark", History: "history", Code: "code", Terminal: "terminal", Bug: "bug", Rocket: "rocket", Zap: "bolt",
  Target: "target", Trophy: "trophy", Gift: "gift", LogOut: "logout", LogIn: "login", Languages: "language", SlidersHorizontal: "adjustments", Table: "table", List: "list",
  LayoutDashboard: "dashboard", LayoutGrid: "grid", Grid: "grid", Inbox: "inbox", Send: "send", Reply: "reply", Forward: "forward", Paperclip: "attachment", Pin: "pin", QrCode: "qr",
  Wifi: "wifi", Battery: "battery", CheckCheck: "check-all", Ban: "ban", XCircle: "circle-x", CircleX: "circle-x", CheckCircle: "circle-check", CheckCircle2: "circle-check", CircleCheck: "circle-check",
  Sparkles: "sparkles", Mic: "mic", File: "file", FileText: "file", Globe: "globe", Layers: "layers", Moon: "moon", Sun: "sun", Minus: "minus", Scissors: "scissors", Smile: "mood-smile",
  Type: "typography", UserPlus: "user-add", PanelLeft: "sidebar", ArrowUpDown: "sort", GripVertical: "grip-vertical", Columns: "layout", AlignLeft: "lines",
};
/* the ones a person asks about that have no glyph: say what to use instead */
const LUCIDE_NOTE = { Loader2: "use Spinner from primitives", LoaderCircle: "use Spinner from primitives", Heart: "no heart in the set; star or bookmark", ChevronUp: "no chevron-up; rotate chevron with a class, or use arrow-up" };

/* the icon names the installed primitives.tsx exports */
export function iconNames(primitivesSrc) {
  const m = /export type IconName\s*=([\s\S]*?);/.exec(primitivesSrc ?? "");
  if (!m) return null;
  return new Set([...m[1].matchAll(/"([\w-]+)"/g)].map((x) => x[1]));
}

function icons(src, ctx) {
  const todos = [];
  let count = 0;
  const rx = /^[ \t]*import\s*\{([^}]*)\}\s*from\s*["']lucide-react["'];?[ \t]*(?:\/\/[^\n]*)?\n?/gm;
  const imports = [...src.matchAll(rx)];
  if (!imports.length) {
    const other = /^[ \t]*import[^\n]*from\s*["'](?:@heroicons\/|react-icons|@tabler\/icons)[^\n]*$/m.exec(src);
    if (other && !other[0].includes("formic-todo")) {
      src = src.slice(0, other.index + other[0].length) + " // formic-todo: a second icon set; replace each icon with <Icon name=…/> from primitives (IconName lists the names)" + src.slice(other.index + other[0].length);
      todos.push("a second icon set (not lucide): map each icon to an Icon name by hand");
    }
    return { src, count, todos };
  }
  const known = ctx.icons ?? new Set(Object.values(LUCIDE));
  const mapped = [], keep = [];
  for (const im of imports) {
    for (const spec of im[1].split(",").map((s) => s.trim()).filter(Boolean)) {
      const t = /^(type\s+)?([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?$/.exec(spec);
      if (!t) { keep.push({ spec, why: "unreadable import" }); continue; }
      const [, isType, name, alias] = t;
      const local = alias ?? name;
      const to = LUCIDE[name];
      if (isType) keep.push({ spec, why: `the ${name} type has no Formic twin; type IconName from primitives names an icon` });
      else if (to && known.has(to)) mapped.push({ local, name, to });
      else keep.push({ spec, local, why: LUCIDE_NOTE[name] ?? `no Formic icon for ${name}; pick one from IconName in primitives.tsx` });
    }
  }
  /* the lucide import lines go first (a marker holds the first one's place
     until we know what still has to stay), so nothing rewritten above them
     can shift their positions */
  const MARK = "\u0000FORMIC_LUCIDE_IMPORT\u0000\n";
  const indent = /^[ \t]*/.exec(imports[0][0])[0];
  {
    let out = "", last = 0;
    imports.forEach((im, i) => { out += src.slice(last, im.index) + (i === 0 ? MARK : ""); last = im.index + im[0].length; });
    src = out + src.slice(last);
  }
  /* <Local … /> → <Icon name="to" … />, outside comments and strings */
  for (const m of mapped) {
    const { comments, lits } = tokenize(src);
    const tagRx = new RegExp(`<${m.local}(?=[\\s/>])`, "g");
    let out = "", last = 0, hit;
    while ((hit = tagRx.exec(src))) {
      if (inRange(comments, hit.index) || inRange(lits, hit.index)) continue;
      const tag = parseTag(src, hit.index);
      if (!tag) continue;
      if (!tag.selfClosing) {
        out += src.slice(last, tag.start + 1 + m.local.length) + ` /* formic-todo: <Icon name="${m.to}"/> is self-closing; move the children out */`;
        last = tag.start + 1 + m.local.length;
        todos.push(`${m.local} had children; Icon takes none`);
        continue;
      }
      const cls = tag.attrs.find((a) => a.name === "className");
      /* layout classes and the colour stay (the palette codemod maps the colour next); h-/w- become size */
      const keepCls = cls?.value != null ? cls.value.split(/\s+/).filter((t) => t && (LAYOUT.test(t) || /^(?:[\w-]+:)*text-/.test(t)) && !/^(?:[\w-]+:)*[wh]-/.test(t)) : [];
      const h = cls?.value != null ? /(?:^|\s)h-(\d+(?:\.\d+)?)(?:\s|$)/.exec(cls.value) : null;
      const add = [`name="${m.to}"`];
      const sizeAttr = tag.attrs.find((a) => a.name === "size");
      if (sizeAttr) add.push(sizeAttr.expr != null ? `size={${sizeAttr.expr}}` : `size={${Number(sizeAttr.value)}}`);
      else if (h && Number(h[1]) * 4 !== 14) add.push(`size={${Number(h[1]) * 4}}`);
      if (keepCls.length) add.push(`className="${keepCls.join(" ")}"`);
      const sw = tag.attrs.find((a) => a.name === "strokeWidth");
      if (sw) add.push(sw.raw);
      const rest = tag.attrs.filter((a) => a.spread).map((a) => a.raw);
      const cmt = cls?.expr != null ? " /* formic-todo: the icon's className was an expression; Icon takes size={n} and a className of layout classes */" : "";
      if (cls?.expr != null) todos.push(`${m.local}: className was an expression, left for you`);
      out += src.slice(last, tag.start) + `<Icon ${[...add, ...rest].join(" ")}${cmt} />`;
      last = tag.end;
      count++;
    }
    src = out + src.slice(last);
    /* still referenced by name (icon={Bell}, or a word in prose the tokenizer cannot tell apart)? the lucide import stays for it, with a todo */
    if (identifierUsed(src.replace(MARK, ""), m.local)) {
      keep.push({ spec: m.name === m.local ? m.name : `${m.name} as ${m.local}`, local: m.local, why: `${m.local} is still referenced by name (as a value, or in prose); Formic components take an icon name ("${m.to}") or <Icon name="${m.to}"/>` });
    }
  }
  /* the import lines: Icon from primitives, the rest of lucide only if something still needs it */
  let replacement = "";
  if (keep.length) {
    replacement = `${indent}import { ${keep.map((k) => k.spec).join(", ")} } from "lucide-react"; // formic-todo: ${keep.map((k) => k.why).join("; ")}\n`;
    todos.push(...keep.map((k) => k.why));
  }
  src = src.replace(MARK, replacement);
  if (mapped.length) src = ensureImport(src, { named: ["Icon"], from: `${ctx.components}/primitives` });
  return { src, count, todos };
}

function button(src, ctx) {
  const todos = [];
  let count = 0, used = false, todoCount = 0;
  const alias = bound(src, "Button", `${ctx.components}/Button`) ? "FormicButton" : "Button";
  const { comments, lits } = tokenize(src);
  const rx = /<button(?=[\s/>])/g;
  let out = "", last = 0, hit;
  const todo = (tag, why) => { todos.push(why); todoCount++; out += src.slice(last, tag.start + 7) + ` /* formic-todo: ${why} */`; last = tag.start + 7; };
  while ((hit = rx.exec(src))) {
    if (inRange(comments, hit.index) || inRange(lits, hit.index)) continue;
    const tag = parseTag(src, hit.index);
    if (!tag) continue;
    if (tag.attrs.some((a) => a.raw.includes("formic-todo")) || src.slice(tag.start, tag.start + 40).includes("formic-todo")) continue;
    if (tag.selfClosing) { todo(tag, "a <button/> with no label; use IconButton from primitives or Button with children"); continue; }
    const close = closeOf(src, tag);
    if (!close) continue;
    const inner = src.slice(tag.open, close.start);
    /* children: text, {simple}, and at most a leading / trailing <Icon name=…/> */
    let body = inner;
    let icon = null, iconEnd = null;
    const lead = /^\s*<Icon\s+name="([\w-]+)"[^>]*\/>/.exec(body);
    if (lead) { icon = lead[1]; body = body.slice(lead[0].length); }
    const trail = /<Icon\s+name="([\w-]+)"[^>]*\/>\s*$/.exec(body);
    if (trail) { iconEnd = trail[1]; body = body.slice(0, trail.index); }
    const exprs = [...body.matchAll(/\{[^}]*\}/g)];
    if (/</.test(body) || exprs.some((e) => /</.test(e[0]))) { todo(tag, "children are not plain text; Button takes a label, an icon and iconEnd, so rebuild this one by hand (IconButton for icon-only)"); continue; }
    const onClick = tag.attrs.find((a) => a.name === "onClick");
    if (onClick?.expr != null && /^\s*(?:async\s*)?(?:\(\s*[A-Za-z_$][^)]*\)|[A-Za-z_$][\w$]*)\s*=>/.test(onClick.expr) && !/^\s*(?:async\s*)?\(\s*\)\s*=>/.test(onClick.expr)) {
      todo(tag, "the onClick handler takes an event; Button's onClick takes none, so read what it needs from state or a ref");
      continue;
    }
    if (tag.attrs.some((a) => a.name === "ref")) { todo(tag, "a ref on the button; Button does not forward refs, so measure or focus through a wrapper"); continue; }
    if (tag.attrs.some((a) => a.name === "className" && a.expr != null && !(/^\s*(?:"[^"]*"|'[^']*'|`[^`$]*`)\s*$/.test(a.expr)))) { todo(tag, "className is computed; decide the variant (accent, secondary, ghost, ...) and keep what the expression adds by hand"); continue; }
    const cls = tag.attrs.find((a) => a.name === "className");
    const clsText = cls ? (cls.value ?? cls.expr.replace(/^\s*[`"']|[`"']\s*$/g, "").replace(/\$\{[^}]*\}/g, " ")) : "";
    const toks = clsText.split(/\s+/).filter(Boolean);
    const has = (re) => toks.some((t) => re.test(t));
    let variant = "secondary";
    if (has(/^bg-(blue|indigo|violet|purple|fuchsia|pink|rose|sky|cyan|teal)-\d+$/)) variant = "accent";
    else if (has(/^bg-red-\d+$/)) variant = "destructive";
    else if (has(/^bg-(green|emerald)-\d+$/)) variant = "success";
    else if (has(/^bg-(slate|gray|zinc|neutral|stone)-(7|8|9)\d\d$/) || has(/^bg-black$/)) variant = "primary";
    else if (has(/^underline$/)) variant = "link";
    else if (has(/^border(-\d)?$/) && !has(/^bg-(?!white|transparent)/)) variant = "outline";
    else if (!has(/^bg-(?!transparent)/) && !has(/^border$/)) variant = "ghost";
    let size = "";
    if (has(/^(text-xs|h-7|h-8|py-1|py-1\.5)$/)) size = "sm";
    else if (has(/^(text-lg|h-12|h-11|py-3|px-6)$/)) size = "lg";
    else if (has(/^h-6$/)) size = "xs";
    const fullWidth = has(/^w-full$/);
    const layout = layoutOnly(clsText).filter((t) => t !== "w-full" && !/^(?:[\w-]+:)*(?:inline|inline-flex|block)$/.test(t));
    const add = [`variant="${variant}"`];
    if (size) add.push(`size="${size}"`);
    if (fullWidth) add.push("fullWidth");
    if (icon) add.push(`icon="${icon}"`);
    if (iconEnd) add.push(`iconEnd="${iconEnd}"`);
    if (layout.length) add.push(`className="${layout.join(" ")}"`);
    const kept = tag.attrs.filter((a) => a.spread || (a.name !== "className" && !(a.name === "type" && a.value === "button")));
    const opening = `<${alias} ${[...add, ...kept.map((a) => a.raw)].join(" ")}>`;
    const label = body.replace(/^\s+|\s+$/g, "");
    const multi = inner.includes("\n");
    const indent = multi ? /[ \t]*$/.exec(src.slice(0, tag.start))[0] : "";
    const children = multi ? `\n${indent}  ${label}\n${indent}` : label;
    out += src.slice(last, tag.start) + opening + children + `</${alias}>`;
    last = close.end;
    count++;
    used = true;
  }
  out += src.slice(last);
  src = out;
  if (used) src = ensureImport(src, { def: alias, from: `${ctx.components}/Button` });
  return { src, count, todos, todoCount };
}

const INPUT_TYPES = new Set(["text", "email", "password", "search", "tel", "url", "number"]);
const INPUT_NOTE = { checkbox: "Checkbox", radio: "RadioGroup", range: "Slider", date: "DatePicker", "datetime-local": "DatePicker", time: "Input with a time mask", color: "a colour picker built from primitives", submit: "Button type=\"submit\"", button: "Button", reset: "Button" };

function input(src, ctx) {
  const todos = [];
  let count = 0, usedInput = false, usedField = false, todoCount = 0;
  const inputAlias = bound(src, "Input", `${ctx.components}/Input`) ? "FormicInput" : "Input";
  const fieldAlias = bound(src, "Field", `${ctx.components}/Input`) ? "FormicField" : "Field";
  const { comments, lits } = tokenize(src);
  const rx = /<input(?=[\s/>])/g;
  let out = "", last = 0, hit;
  while ((hit = rx.exec(src))) {
    if (inRange(comments, hit.index) || inRange(lits, hit.index)) continue;
    const tag = parseTag(src, hit.index);
    if (!tag || !tag.selfClosing) continue;
    if (src.slice(tag.start, tag.end).includes("formic-todo")) continue;
    const type = tag.attrs.find((a) => a.name === "type");
    const typeName = type ? (type.value ?? "?") : "text";
    if (typeName === "hidden" || typeName === "file") continue;
    const note = (why) => { todos.push(why); todoCount++; out += src.slice(last, tag.start + 6) + ` /* formic-todo: ${why} */`; last = tag.start + 6; };
    if (!INPUT_TYPES.has(typeName)) { note(`an <input type="${typeName}">; use ${INPUT_NOTE[typeName] ?? "the matching Formic control"} from src/formic/components`); continue; }
    if (tag.attrs.some((a) => a.name === "ref")) { note("a ref on the input; Input has no ref prop, so focus it through its wrapper or a Field"); continue; }
    const cls = tag.attrs.find((a) => a.name === "className");
    if (cls?.expr != null) { note("className is an expression; Input styles itself, keep only layout classes"); continue; }
    const layout = layoutOnly(cls?.value ?? "");
    const width = layout.find((t) => /^w-/.test(t) && t !== "w-full");
    const add = [];
    if (width) add.push(`width="${width}"`);
    const rest = layout.filter((t) => !/^w-/.test(t));
    if (rest.length) add.push(`className="${rest.join(" ")}"`);
    const kept = tag.attrs.filter((a) => a.spread || (a.name !== "className" && !(a.name === "type" && a.value === "text")));
    /* a label around it, or just before it with a matching htmlFor → Field */
    const before = src.slice(last, tag.start), after = src.slice(tag.end);
    const wrap = /<label\b([^>]*)>\s*([^<>{}]+?)\s*$/.exec(before);
    const wrapClose = /^\s*<\/label>/.exec(after);
    const sib = /<label\b([^>]*)>\s*([^<>{}]+?)\s*<\/label>\s*$/.exec(before);
    const idAttr = tag.attrs.find((a) => a.name === "id");
    const forOf = (attrsText) => /htmlFor=["']([^"']+)["']/.exec(attrsText)?.[1];
    let field = null;
    if (wrap && wrapClose && !/formic-todo/.test(wrap[1])) field = { label: wrap[2].trim(), from: last + wrap.index, to: tag.end + wrapClose[0].length, attrs: wrap[1] };
    else if (sib && !/formic-todo/.test(sib[1]) && (!forOf(sib[1]) || (idAttr && forOf(sib[1]) === idAttr.value))) field = { label: sib[2].trim(), from: last + sib.index, to: tag.end, attrs: sib[1] };
    const inputAttrs = kept.filter((a) => !(field && a.name === "id")).map((a) => a.raw);
    const element = `<${inputAlias} ${[...add, ...inputAttrs].join(" ")} />`.replace(/\s+\/>$/, " />");
    if (field) {
      const indent = /[ \t]*$/.exec(src.slice(0, field.from))[0];
      const req = /\brequired\b/.test(field.attrs) || tag.attrs.some((a) => a.name === "required");
      out += src.slice(last, field.from) + `<${fieldAlias} label="${field.label.replace(/"/g, "&quot;")}"${req ? " required" : ""}>\n${indent}  ${element}\n${indent}</${fieldAlias}>`;
      last = field.to;
      usedField = true;
    } else {
      const nearLabel = /<label\b/.test(before.slice(-400));
      out += src.slice(last, tag.start) + (nearLabel ? element.replace(`<${inputAlias} `, `<${inputAlias} /* formic-todo: the label near this input is not a plain one; wrap both in Field (label=…) and drop the label */ `) : element);
      if (nearLabel) { todos.push("a label near an input was not plain text; wrap the input in Field by hand"); todoCount++; }
      last = tag.end;
    }
    usedInput = true;
    count++;
  }
  out += src.slice(last);
  src = out;
  if (usedInput) src = ensureImport(src, { def: inputAlias, named: usedField ? [fieldAlias] : [], from: `${ctx.components}/Input` });
  return { src, count, todos, todoCount };
}

const ELEMENTS = { table: "use DataTable from src/formic/components (columns, rows, selection, paging, empty state)", select: "use Select from src/formic/components", textarea: "use Textarea from src/formic/components/Input", svg: "icons are <Icon name=…/> from primitives, charts come from charts.tsx" };

function element(src) {
  const todos = [];
  let todoCount = 0;
  const { comments, lits } = tokenize(src);
  const rx = /<(table|select|textarea|svg)(?=[\s/>])/g;
  let out = "", last = 0, hit;
  while ((hit = rx.exec(src))) {
    if (inRange(comments, hit.index) || inRange(lits, hit.index)) continue;
    const tag = parseTag(src, hit.index);
    if (!tag || src.slice(tag.start, tag.end).includes("formic-todo")) continue;
    const why = ELEMENTS[hit[1]];
    out += src.slice(last, tag.start + hit[0].length) + ` /* formic-todo: a raw <${hit[1]}>; ${why} */`;
    last = tag.start + hit[0].length;
    todos.push(`a raw <${hit[1]}> left in place: ${why}`);
    todoCount++;
  }
  out += src.slice(last);
  return { src: out, count: 0, todos, todoCount };
}

/* A class list is words made of class characters, none of them an English
   function word and none capitalised; "bg-gray-100 in a plain string" is a
   sentence and stays as written. */
const PROSE_WORDS = new Set(["a", "an", "the", "in", "on", "of", "to", "is", "are", "was", "and", "or", "for", "with", "this", "that", "it", "at", "by", "as", "be", "not", "no", "we", "you", "your", "our", "from", "into", "if", "then"]);
function isProse(text) {
  const t = text.trim();
  if (/[.,!?;:]$/.test(t)) return true;
  const words = t.split(/\s+/);
  return words.some((w) => PROSE_WORDS.has(w) || /^[A-Z][a-z]+$/.test(w) || /[^\w:./\[\]()%#!,-]/.test(w));
}

/* palette, type and shape: every literal that reads as a class list */
function classes(src) {
  const counts = {};
  const todos = [];
  const { lits } = tokenize(src);
  const notes = new Map(); /* litEnd → messages */
  const edits = [];
  for (const l of lits) {
    const text = src.slice(l.start, l.end);
    if (!/[a-z]/.test(text) || /^[./@~]/.test(text.trim())) continue; /* a path, not a class list */
    if (!/\s\S/.test(text.trim()) && !text.includes("-")) continue; /* one bare word ("rounded", "shadow") is a value, not a class list */
    if (/(?:\b(?:shape|variant|size|type|name|id|key|href|src|alt|title|label|value|placeholder|role|kind|tone|status|icon|iconEnd|width)|aria-[\w-]+|data-[\w-]+)\s*[=:]\s*$/.test(src.slice(Math.max(0, l.litStart - 24), l.litStart))) continue; /* a prop or key that takes a value, not classes */
    if (isProse(text)) continue; /* a sentence that happens to contain a class name is copy, not classes */
    const local = [];
    const next = mapClassList(text, counts, local);
    if (local.length) notes.set(l.litEnd, [...(notes.get(l.litEnd) ?? []), ...local]);
    if (next !== text) edits.push({ start: l.start, end: l.end, text: next });
  }
  for (const [at, msgs] of notes) { edits.push({ start: at, end: at, text: ` /* formic-todo: ${[...new Set(msgs)].join("; ")} */` }); todos.push(...msgs); }
  edits.sort((a, b) => b.start - a.start || b.end - a.end);
  let out = src;
  for (const e of edits) out = out.slice(0, e.start) + e.text + out.slice(e.end);
  return { src: out, counts, todos, todoCount: notes.size };
}

export const CODEMODS = [
  { name: "icons", what: "lucide-react icons → <Icon name=…/> from primitives", run: icons },
  { name: "button", what: "<button className=…> with a plain label → <Button variant=…>", run: button },
  { name: "input", what: "<input …/> → <Input/>, with its <label> → <Field label=…>", run: input },
  { name: "element", what: "a raw <table>, <select>, <textarea> or <svg> gets a todo naming the component", run: element },
  { name: "palette", what: "Tailwind palette classes → tokens (bg-gray-100 → bg-inset, text-blue-600 → text-accent, …)", run: null },
  { name: "type", what: "text-sm → text-caption, font-bold → font-semibold, tracking-wider → tracking-wide, …", run: null },
  { name: "shape", what: "rounded-lg → rounded-md, shadow-md → shadow-card, drop-shadow dropped, h-screen → h-dvh", run: null },
];

/* the whole pipeline on one file's text */
export function migrateSource(src, ctx) {
  const counts = {}, todos = {}, todoList = [];
  let text = src;
  for (const mod of CODEMODS) {
    if (!mod.run) continue;
    const r = mod.run(text, ctx);
    text = r.src;
    counts[mod.name] = (counts[mod.name] ?? 0) + (r.count ?? 0);
    todos[mod.name] = (todos[mod.name] ?? 0) + (r.todoCount ?? r.todos.length);
    todoList.push(...r.todos.map((t) => `${mod.name}: ${t}`));
  }
  const c = classes(text);
  text = c.src;
  for (const k of ["palette", "type", "shape"]) counts[k] = (counts[k] ?? 0) + (c.counts[k] ?? 0);
  todos.classes = c.todoCount;
  todoList.push(...c.todos.map((t) => `classes: ${t}`));
  return { text, counts, todos, todoTotal: Object.values(todos).reduce((a, b) => a + b, 0), todoList: [...new Set(todoList)] };
}
