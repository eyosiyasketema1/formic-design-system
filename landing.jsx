/* ─────────────────────────────────────────────────────────
 * FORMIC LANDING — live hero runtime.
 * Component code mirrored from preview.html (same names,
 * same markup) + a small app layer: accent picker and the
 * hero/playground mounts. Loaded by index.html via
 * babel-standalone, exactly like the gallery.
 * ───────────────────────────────────────────────────────── */
const { useState, useEffect, useRef, useLayoutEffect, useMemo, useCallback, useId, cloneElement, isValidElement, createContext, useContext, Fragment } = React;

/* ══ primitives (mirrored from preview.html) ══ */
const inertWhen = (hidden) => ({ ref: (el) => { if (el) el.inert = hidden; } });
const ICON_PATHS = {  /* authentic Tabler outline path data (@tabler/icons, MIT) */
  chevron: <path d="M6 9l6 6l6 -6" />,
  bell: (<><path d="M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3h-16a4 4 0 0 0 2 -3v-3a7 7 0 0 1 4 -6" /><path d="M9 17v1a3 3 0 0 0 6 0v-1" /></>),
  grid: (<><path d="M4 6a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v2a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2z" /><path d="M14 6a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v2a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2z" /><path d="M4 16a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v2a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2z" /><path d="M14 16a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v2a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2z" /></>),
  moon: <path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z" />,
  sun: (<><path d="M8 12a4 4 0 1 0 8 0a4 4 0 0 0 -8 0" /><path d="M3 12h1m8 -9v1m8 8h1m-9 8v1m-6.4 -15.4l.7 .7m12.1 -.7l-.7 .7m0 11.4l.7 .7m-12.1 -.7l-.7 .7" /></>),
  eye: (<><path d="M10 12a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" /><path d="M21 12c-2.4 4 -5.4 6 -9 6c-3.6 0 -6.6 -2 -9 -6c2.4 -4 5.4 -6 9 -6c3.6 0 6.6 2 9 6" /></>),
  trash: (<><path d="M4 7l16 0" /><path d="M10 11l0 6" /><path d="M14 11l0 6" /><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" /><path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3" /></>),
  check: <path d="M5 12l5 5l10 -10" />,
  close: (<><path d="M18 6l-12 12" /><path d="M6 6l12 12" /></>),
  search: (<><path d="M3 10a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" /><path d="M21 21l-6 -6" /></>),
  retry: (<><path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4" /><path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" /></>),
  "arrow-up": (<><path d="M12 5l0 14" /><path d="M18 11l-6 -6" /><path d="M6 11l6 -6" /></>),
  plus: (<><path d="M12 5l0 14" /><path d="M5 12l14 0" /></>),
  clock: (<><path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0" /><path d="M12 7v5l3 3" /></>),
  ellipsis: (<><path d="M4 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /><path d="M11 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /><path d="M18 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /></>),
  mic: (<><path d="M9 5a3 3 0 0 1 3 -3a3 3 0 0 1 3 3v5a3 3 0 0 1 -3 3a3 3 0 0 1 -3 -3l0 -5" /><path d="M5 10a7 7 0 0 0 14 0" /><path d="M8 21l8 0" /><path d="M12 17l0 4" /></>),
  file: (<><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2" /><path d="M9 9l1 0" /><path d="M9 13l6 0" /><path d="M9 17l6 0" /></>),
  clip: <path d="M15 7l-6.5 6.5a1.5 1.5 0 0 0 3 3l6.5 -6.5a3 3 0 0 0 -6 -6l-6.5 6.5a4.5 4.5 0 0 0 9 9l6.5 -6.5" />,
  chart: (<><path d="M3 13a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -6" /><path d="M15 9a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v10a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -10" /><path d="M9 5a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v14a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -14" /><path d="M4 20h14" /></>),
  layers: (<><path d="M12 4l-8 4l8 4l8 -4l-8 -4" /><path d="M4 12l8 4l8 -4" /><path d="M4 16l8 4l8 -4" /></>),
  globe: (<><path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0" /><path d="M3.6 9h16.8" /><path d="M3.6 15h16.8" /><path d="M11.5 3a17 17 0 0 0 0 18" /><path d="M12.5 3a17 17 0 0 1 0 18" /></>),
  lines: (<><path d="M4 6l16 0" /><path d="M4 12l10 0" /><path d="M4 18l14 0" /></>),
  external: (<><path d="M17 7l-10 10" /><path d="M8 7l9 0l0 9" /></>),
  edit: (<><path d="M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4" /><path d="M13.5 6.5l4 4" /></>),
  home: (<><path d="M5 12l-2 0l9 -9l9 9l-2 0" /><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-7" /><path d="M9 21v-6a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v6" /></>),
  gear: (<><path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065" /><path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" /></>),
  "user-add": (<><path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0" /><path d="M16 19h6" /><path d="M19 16v6" /><path d="M6 21v-2a4 4 0 0 1 4 -4h4" /></>),
  "sign-out": (<><path d="M14 8v-2a2 2 0 0 0 -2 -2h-7a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2 -2v-2" /><path d="M9 12h12l-3 -3" /><path d="M18 15l3 -3" /></>),
  sidebar: (<><path d="M4 6a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2l0 -12" /><path d="M9 4v16" /><path d="M15 10l-2 2l2 2" /></>),
  "message-question": (<><path d="M8 9h8" /><path d="M8 13h6" /><path d="M14 18h-1l-5 3v-3h-2a3 3 0 0 1 -3 -3v-8a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v4.5" /><path d="M19 22v.01" /><path d="M19 19a2.003 2.003 0 0 0 .914 -3.782a1.98 1.98 0 0 0 -2.414 .483" /></>),
  sparkles: <path d="M16 18a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2m0 -12a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2m-7 12a6 6 0 0 1 6 -6a6 6 0 0 1 -6 -6a6 6 0 0 1 -6 6a6 6 0 0 1 6 6" />,
  scissors: (<><path d="M3 7a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" /><path d="M3 17a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" /><path d="M8.6 8.6l10.4 10.4" /><path d="M8.6 15.4l10.4 -10.4" /></>),
  "mood-smile": (<><path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" /><path d="M9 10l.01 0" /><path d="M15 10l.01 0" /><path d="M9.5 15a3.5 3.5 0 0 0 5 0" /></>),
  typography: (<><path d="M4 20l3 0" /><path d="M14 20l7 0" /><path d="M6.9 15l6.9 0" /><path d="M10.2 6.3l5.8 13.7" /><path d="M5 20l6 -16l2 0l7 16" /></>),
  "chevron-right": <path d="M9 6l6 6l-6 6" />,
  copy: (<><path d="M7 9.667a2.667 2.667 0 0 1 2.667 -2.667h8.666a2.667 2.667 0 0 1 2.667 2.667v8.666a2.667 2.667 0 0 1 -2.667 2.667h-8.666a2.667 2.667 0 0 1 -2.667 -2.667l0 -8.666" /><path d="M4.012 16.737a2.005 2.005 0 0 1 -1.012 -1.737v-10c0 -1.1 .9 -2 2 -2h10c.75 0 1.158 .385 1.5 1" /></>),
  "circle-check": (<><path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" /><path d="M9 12l2 2l4 -4" /></>),
  alert: (<><path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0" /><path d="M12 8v4" /><path d="M12 16h.01" /></>),
  info: (<><path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0" /><path d="M12 9h.01" /><path d="M11 12h1v4h1" /></>),
  "chevron-left": <path d="M15 6l-6 6l6 6" />,
  upload: (<><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2" /><path d="M7 9l5 -5l5 5" /><path d="M12 4l0 12" /></>),
  calendar: (<><path d="M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12" /><path d="M16 3v4" /><path d="M8 3v4" /><path d="M4 11h16" /><path d="M11 15h1" /><path d="M12 15v3" /></>),
};
function Icon({ name, size = 14, strokeWidth = 2.2, className, style }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      {ICON_PATHS[name]}
    </svg>
  );
}
function Spinner({ size = 12, className = "" }) {
  return (
    <span aria-hidden className={`inline-block shrink-0 rounded-full border-[1.5px] ${className}`}
      style={{ width: size, height: size, animation: "spin 700ms linear infinite",
        borderColor: "color-mix(in srgb, currentColor 30%, transparent)", borderTopColor: "currentColor" }} />
  );
}
function ShimmerLabel({ children, className = "" }) {
  return (
    <span className={`bg-clip-text text-body font-medium text-transparent ${className}`}
      style={{ backgroundImage: "linear-gradient(90deg, var(--ink-3) 35%, var(--ink) 50%, var(--ink-3) 65%)",
        backgroundSize: "200% 100%", animation: "shimmer-text 1.4s linear infinite" }}>
      {children}
    </span>
  );
}
const CHIP_TONES = {
  field: "bg-field text-ink-2 shadow-hairline",
  surface: "bg-surface text-ink shadow-btn",
  inset: "bg-inset text-ink-2 shadow-hairline",
};
const CHIP_SIZES = {
  xs: "h-4.5 gap-1 rounded-[5px] px-[3px] text-micro",
  sm: "h-5.5 rounded-chip px-1.5 text-tiny",
  md: "h-7 gap-1.5 rounded-chip px-2 text-tiny",
};
function Chip({ as: As = "span", tone = "field", size = "sm", mono = false, className = "", children, ...rest }) {
  return (
    <As className={`inline-flex items-center transition-colors duration-150 ${CHIP_SIZES[size]} ${CHIP_TONES[tone]} ${mono ? "font-mono" : ""} ${className}`} {...rest}>
      {children}
    </As>
  );
}
function DiffStat({ add, del = 0, className = "" }) {
  return (
    <span className={`shrink-0 font-mono text-tiny tabular-nums ${className}`}>
      <span className="text-green">+{add}</span>
      {del > 0 && <span className="text-red"> −{del}</span>}
    </span>
  );
}
function StreamCaret({ className = "" }) {
  return <span aria-hidden className={`ml-0.5 inline-block h-3 w-0.5 translate-y-0.5 rounded-full bg-ink ${className}`} style={{ animation: "fade-in 150ms ease-out both" }} />;
}
function StreamText({ text, intervalMs = 45, className = "", onProgress, onDone }) {
  const words = text.split(" ");
  const { count } = useStream(words.length, { intervalMs, onDone });
  useLayoutEffect(() => { if (onProgress) onProgress(); }, [count]);
  return (
    <>
      {words.slice(0, count).map((word, i) => (
        <span key={i} className={`inline [will-change:filter,opacity] ${className}`} style={{ animation: "stream-in 420ms var(--ease-out-quint) both" }}>
          {word}{" "}
        </span>
      ))}
    </>
  );
}
function IconButton({ label, onClick, className = "", children, ...rest }) {
  return (
    <button type="button" aria-label={label} onClick={onClick}
      className={`flex size-6 shrink-0 items-center justify-center rounded-sm transition-colors duration-150 ${className}`} {...rest}>
      {children}
    </button>
  );
}
function Disclosure({ open, duration = 300, live = false, className = "", innerClassName = "min-h-0 overflow-hidden", children }) {
  return (
    <div className={`grid transition-[grid-template-rows,opacity] ${className}`}
      style={{ gridTemplateRows: open ? "1fr" : "0fr", opacity: open ? 1 : 0,
        transitionDuration: `${duration}ms`, transitionTimingFunction: "var(--ease-out-quint)" }}>
      <div className={innerClassName} aria-live={live ? "polite" : undefined} {...inertWhen(!open)}>{children}</div>
    </div>
  );
}
const entrance = (name, index, { duration = 300, stagger = 80, delay = 0 } = {}) => ({
  animation: `${name} ${duration}ms var(--ease-out-quint) ${delay + index * stagger}ms both`,
});
const fadeUp = (index = 0, opts) => entrance("fade-up", index, opts);
const popIn = (index = 0, opts) => entrance("pop-in", index, opts);
function Card({ className = "", children, ...rest }) {
  return <div className={`overflow-hidden rounded-card bg-surface shadow-card ${className}`} {...rest}>{children}</div>;
}
const BADGE_TONES = { green: "bg-green-tint text-green", red: "bg-red-tint text-red", neutral: "bg-inset text-ink-2" };
function Badge({ tone = "neutral", free = false, className = "", style, children }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${free ? "" : "h-5.5 px-2 text-tiny"} ${BADGE_TONES[tone]} ${className}`} style={style}>
      {children}
    </span>
  );
}
function RadioCheck({ type, on }) {
  return (
    <span className={`flex size-4 shrink-0 items-center justify-center transition-colors duration-200 ${type === "radio" ? "rounded-full" : "rounded-[5px]"} ${on ? "bg-ink text-canvas" : "shadow-[inset_0_0_0_1.5px_var(--line-strong)] text-transparent"}`}>
      {type === "radio" ? (
        <span className="size-1.5 rounded-full bg-canvas transition-transform duration-200" style={{ transform: on ? "scale(1)" : "scale(0)" }} />
      ) : (
        <Icon name="check" size={12} strokeWidth={3} />
      )}
    </span>
  );
}
function Skeleton({ className = "h-4 w-full" }) {
  return (
    <span aria-hidden className={`block rounded-sm ${className}`}
      style={{ backgroundImage: "linear-gradient(90deg, var(--inset) 35%, var(--hover) 50%, var(--inset) 65%)", backgroundSize: "200% 100%", animation: "shimmer-text 1.4s linear infinite" }} />
  );
}
const SWITCH_SIZES = {
  sm: { track: "h-4.5 w-7.5", thumb: "size-3.5", travel: 12 },
  md: { track: "h-6 w-10", thumb: "size-5", travel: 16 },
};
function Switch({ on, onToggle, label, size = "md", disabled = false, className = "", id, "aria-describedby": describedBy }) {
  const spec = SWITCH_SIZES[size];
  return (
    <button type="button" role="switch" id={id} aria-checked={on} aria-label={label} aria-describedby={describedBy} disabled={disabled} onClick={onToggle}
      className={`relative shrink-0 rounded-full transition-colors duration-150 disabled:opacity-60 ${spec.track} ${className}`}
      style={{ background: on ? "var(--accent)" : "var(--line-strong)" }}>
      <span className={`absolute top-0.5 left-0.5 rounded-full bg-canvas shadow-btn transition-transform duration-150 ${spec.thumb}`}
        style={{ transform: on ? `translateX(${spec.travel}px)` : "translateX(0)", transitionTimingFunction: "var(--ease-out-quint)" }} />
    </button>
  );
}
function Separator({ vertical = false, className = "" }) {
  return <div role="separator" aria-orientation={vertical ? "vertical" : undefined} className={`shrink-0 bg-line ${vertical ? "w-px" : "h-px w-full"} ${className}`} />;
}
function Progress({ value = 0, max = 100, label, tone = "accent", indeterminate = false, className = "" }) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={indeterminate ? undefined : Math.round(Math.min(max, Math.max(0, value)))}
      className={`h-1.5 w-full overflow-hidden rounded-full bg-inset shadow-hairline ${className}`}>
      <div className={`h-full rounded-full ${tone === "green" ? "bg-green" : "bg-accent"} ${indeterminate ? "progress-indeterminate-bar" : ""}`}
        style={indeterminate
          ? { width: "30%", animation: "progress-slide 1.2s var(--ease-out-quint) infinite" }
          : { width: `${percent}%`, transition: "width 300ms var(--ease-out-quint)" }} />
    </div>
  );
}
const AVATAR_SIZES = { sm: "size-6 text-micro", md: "size-7 text-tiny", lg: "size-10 text-caption", xl: "size-12 text-body" };
const AVATAR_TONES = ["bg-accent-tint text-accent", "bg-green-tint text-green", "bg-orange-tint text-orange", "bg-field text-ink-2"];
const avatarInitials = (name) => { const words = name.split(/\s+/).filter(Boolean); if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase(); return (words[0] || "").slice(0, 2).toUpperCase(); };
const avatarTone = (name) => { let hash = 0; for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) % 997; return AVATAR_TONES[hash % AVATAR_TONES.length]; };
function Avatar({ name, src, size = "md", tone, className = "" }) {
  if (src) return <img src={src} alt={name} className={`source-avatar shrink-0 rounded-full bg-surface shadow-hairline ${AVATAR_SIZES[size]} ${className}`} />;
  return (
    <span role="img" aria-label={name}
      className={`flex shrink-0 items-center justify-center rounded-full font-medium shadow-hairline ${tone !== undefined ? AVATAR_TONES[tone] : avatarTone(name)} ${AVATAR_SIZES[size]} ${className}`}>
      {avatarInitials(name)}
    </span>
  );
}
function Tooltip({ label, delay = 250, children }) {
  const id = useId();
  const anchorRef = useRef(null);
  const timerRef = useRef(null);
  const [position, setPosition] = useState(null);
  const show = () => {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(40, Math.min(rect.left + rect.width / 2, window.innerWidth - 40));
    setPosition(rect.top > 44 ? { x, bottom: window.innerHeight - rect.top + 6 } : { x, top: rect.bottom + 6 });
  };
  const schedule = () => { timerRef.current = window.setTimeout(show, delay); };
  const hide = () => { if (timerRef.current) window.clearTimeout(timerRef.current); timerRef.current = null; setPosition(null); };
  useEffect(() => {
    if (!position) return;
    const onKey = (event) => { if (event.key === "Escape") hide(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [position]);
  useEffect(() => hide, []);
  const existingDescribedBy = isValidElement(children) ? children.props["aria-describedby"] : undefined;
  const child = isValidElement(children) ? cloneElement(children, { "aria-describedby": position ? [existingDescribedBy, id].filter(Boolean).join(" ") : existingDescribedBy }) : children;
  return (
    <>
      <span ref={anchorRef} className="inline-flex" onMouseEnter={schedule} onMouseLeave={hide} onFocus={show} onBlur={hide}>{child}</span>
      {position && ReactDOM.createPortal(
        <span id={id} role="tooltip" className="pointer-events-none fixed z-50 rounded-chip px-2 py-1 text-tiny font-medium whitespace-nowrap"
          style={{ left: position.x, top: position.top, bottom: position.bottom, transform: "translateX(-50%)", background: "var(--tooltip-bg)", color: "var(--tooltip-fg)", animation: "pop-in 150ms var(--ease-out-quint) both" }}>
          {label}
        </span>, document.body)}
    </>
  );
}
function AvatarStack({ srcs, className = "" }) {
  return (
    <span className={`flex -space-x-1 ${className}`}>
      {srcs.map((src, i) => (
        <img key={i} src={src} alt="" className="source-avatar size-3.5 rounded-full bg-surface shadow-[0_0_0_1.5px_var(--canvas)]" />
      ))}
    </span>
  );
}
function Popover({ x, top, bottom, width, id, role = "tooltip", className = "w-72", onClose, onMouseEnter, onMouseLeave, children }) {
  useEffect(() => {
    if (!onClose) return;
    const onKey = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return ReactDOM.createPortal(
    <div id={id} role={role} data-popover-layer="" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}
      className={`fixed z-50 overflow-hidden rounded-md bg-surface shadow-overlay ${className}`}
      style={{ left: x, top, bottom, width, animation: "pop-in 160ms var(--ease-out-quint) both", transformOrigin: top === undefined ? "bottom left" : "top left" }}>
      {children}
    </div>,
    document.body,
  );
}
function SendButton({ enabled = true, label = "Send", round = false, className = "", onClick }) {
  return (
    <button type="button" aria-label={label} disabled={!enabled} onClick={onClick}
      className={`flex size-7 shrink-0 items-center justify-center ${round ? "rounded-full" : "rounded-control"} transition-[background-color,color,transform] duration-200 enabled:active:scale-[0.96] ${className}`}
      style={{
        background: enabled ? "var(--ink)" : "var(--field)",
        color: enabled ? "var(--surface)" : "var(--ink-3)",
        boxShadow: "var(--shadow-btn)",
      }}>
      <Icon name="arrow-up" strokeWidth={2.5} />
    </button>
  );
}
function GlideMenu({ className = "", highlightClassName = "inset-x-0 rounded-control bg-hover", rowSelector = "[data-menu-row]", children }) {
  const ref = useRef(null);
  const [box, setBox] = useState(null);
  const [engaged, setEngaged] = useState(false);
  return (
    <div ref={ref} className={`relative ${className}`}
      onMouseLeave={() => setEngaged(false)}
      onMouseOver={(event) => {
        const row = event.target.closest(rowSelector);
        if (row && ref.current?.contains(row)) {
          setBox({ top: row.offsetTop, height: row.offsetHeight });
          setEngaged(true);
        }
      }}>
      <span aria-hidden className={`pointer-events-none absolute ${highlightClassName}`}
        style={{ top: box?.top ?? 0, height: box?.height ?? 0, opacity: box && engaged ? 1 : 0,
          transition: "top 220ms var(--ease-out-quint), height 220ms var(--ease-out-quint), opacity 150ms ease" }} />
      {children}
    </div>
  );
}

/* ══ hooks (mirrored from preview.html) ══ */
function useSequence(steps) {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    if (stage >= steps.length - 1) return;
    const t = setTimeout(() => setStage((s) => s + 1), steps[stage]);
    return () => clearTimeout(t);
  }, [stage, steps]);
  return stage;
}
/* reveal N items one every intervalMs — the engine behind streamed text */
function useStream(length, { intervalMs = 55, holdMs = 3400, loop = false, onDone } = {}) {
  const [count, setCount] = useState(0);
  const done = count >= length;
  useEffect(() => {
    if (done && !loop) { if (onDone) onDone(); return; }
    const t = setTimeout(() => setCount((c) => (c >= length ? 0 : c + 1)), done ? holdMs : intervalMs);
    return () => clearTimeout(t);
  }, [count, done, loop, length]);
  return { count, done };
}
function useAnchoredLayer(layerId) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const anchorRef = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  const openAt = useCallback(
    ({
      estimatedHeight,
      width,
      matchWidth = false,
      align = "start"
    }) => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return false;
      const layerWidth = matchWidth ? rect.width : width;
      const rawX = align === "end" && layerWidth !== void 0 ? rect.right - layerWidth : rect.left;
      const fitsBelow = rect.bottom + 4 + estimatedHeight < window.innerHeight - 8;
      setPosition({
        x: Math.max(8, Math.min(rawX, window.innerWidth - (layerWidth ?? rect.width) - 8)),
        width: layerWidth,
        ...fitsBelow ? { top: rect.bottom + 4 } : { bottom: window.innerHeight - rect.top + 4 }
      });
      setOpen(true);
      return true;
    },
    []
  );
  useEffect(() => {
    if (!open) return;
    const layer = () => document.getElementById(layerId);
    const onScroll = (event) => {
      if (layer()?.contains(event.target)) return;
      setOpen(false);
    };
    const onResize = () => setOpen(false);
    const onDown = (event) => {
      const target = event.target;
      if (anchorRef.current?.contains(target) || layer()?.contains(target)) return;
      setOpen(false);
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousedown", onDown);
    };
  }, [open, layerId]);
  return { open, setOpen, position, anchorRef, openAt, close };
}
const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
let scrollLocks = 0;
let previousOverflow = "";
const lockScroll = () => {
  if (scrollLocks === 0) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  scrollLocks += 1;
};
const unlockScroll = () => {
  scrollLocks = Math.max(0, scrollLocks - 1);
  if (scrollLocks === 0) document.body.style.overflow = previousOverflow;
};
function useModalLayer(ref, open, { onClose, closeOnEscape = true }) {
  useEffect(() => {
    if (!open) return;
    const container = ref.current;
    const restore = document.activeElement;
    const focusables = () => Array.from(container?.querySelectorAll(FOCUSABLE) ?? []);
    (focusables()[0] ?? container)?.focus();
    const onKey = (event) => {
      if (event.key === "Escape" && closeOnEscape) {
        if (event.defaultPrevented || document.querySelector("[data-popover-layer]")) return;
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const list = focusables();
      if (list.length === 0) {
        event.preventDefault();
        return;
      }
      const first = list[0];
      const last = list[list.length - 1];
      const activeElement = document.activeElement;
      if (!container?.contains(activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && (activeElement === first || activeElement === container)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    lockScroll();
    return () => {
      document.removeEventListener("keydown", onKey);
      unlockScroll();
      restore?.focus();
    };
  }, [open, closeOnEscape]);
}
function useElapsed() {
  const [ds, setDs] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setDs((d) => d + 1), 100);
    return () => clearInterval(t);
  }, []);
  const total = ds / 10;
  if (total < 60) return `${total.toFixed(1)}s`;
  return `${Math.floor(total / 60)}m ${(total % 60).toFixed(1)}s`;
}

/* ═══════════ LoadingState ═══════════ */
const chevron = Array.from({ length: 9 }, (_, i) => {
  const r = Math.floor(i / 3), c = i % 3;
  return (c + Math.abs(r - 1)) * 90;
});

/* ══ loading (mirrored from preview.html) ══ */
const ORBIT_ORDER = [0, 1, 2, 5, 8, 7, 6, 3];
const orbit = Array.from({ length: 9 }, (_, i) => {
  const k = ORBIT_ORDER.indexOf(i);
  return k === -1 ? null : k * 110;
});
const PATTERNS = {
  Drive: { delays: chevron, dur: 650, round: false },
  Dots: { delays: chevron, dur: 650, round: true },
  Orbit: { delays: orbit, dur: 950, round: false },
};
function LoaderGrid({ delays, dur, round }) {
  return (
    <span aria-hidden className="grid shrink-0 grid-cols-[repeat(3,4px)] gap-[1.5px]">
      {delays.map((delay, index) => (
        <span key={index}
          className={`size-[4px] bg-ink ${round ? "rounded-full" : "rounded-[1px]"}`}
          style={{
            opacity: delay === null ? 0.07 : 0.15,
            animation: delay === null ? "none" : `pixel-on ${dur}ms ease-in-out ${delay}ms infinite`,
          }} />
      ))}
    </span>
  );
}
function LoadingState({ label, variant = "Drive" }) {
  const elapsed = useElapsed();
  const resolvedLabel = label ?? "Churning";
  const { delays, dur, round } = PATTERNS[variant] ?? PATTERNS.Drive;
  return (
    <div role="status" className="flex w-fit items-center gap-2.5">
      <LoaderGrid delays={delays} dur={dur} round={round} />
      <ShimmerLabel>{resolvedLabel}</ShimmerLabel>
      <span className="font-mono text-small text-ink-3 tabular-nums">{elapsed}</span>
    </div>
  );
}

/* ═══════════ ThinkingState ═══════════ */

/* ══ approval (mirrored from preview.html) ══ */
const QUESTIONS = [
  { q: "How many flavors should we launch?", type: "radio", options: ["Three (core line)", "Five (full case)", "Just one hero"] },
  { q: "Which mix-ins should we stock?", type: "check", options: ["Chocolate chips", "Waffle bits", "Sprinkles"] },
  { q: "Which market do we enter first?", type: "radio", options: ["Food trucks", "Grocery freezers", "Scoop shops"] },
];
function ApprovalCard({ resettable = true }) {
  const [qi, setQi] = useState(0);
  const [answers, setAnswers] = useState({});
  const [custom, setCustom] = useState({});
  const [sent, setSent] = useState(false);
  const [open, setOpen] = useState(true);
  const question = QUESTIONS[qi];
  const last = qi === QUESTIONS.length - 1;
  const selected = answers[qi] ?? [];
  const hasAnswer = selected.length > 0 || Boolean((custom[qi] || "").trim());
  const toggle = (index) => {
    setAnswers((current) => {
      const picked = current[qi] ?? [];
      const next = question.type === "radio" ? [index]
        : picked.includes(index) ? picked.filter((item) => item !== index) : [...picked, index];
      return { ...current, [qi]: next };
    });
    if (question.type === "radio") {
      setCustom((current) => ({ ...current, [qi]: "" }));
      window.setTimeout(() => {
        if (qi === QUESTIONS.length - 1) setSent(true);
        else setQi((current) => Math.min(QUESTIONS.length - 1, current + 1));
      }, 480);
    }
  };
  const reset = () => { setQi(0); setAnswers({}); setCustom({}); setSent(false); setOpen(true); };
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="rounded-control bg-surface px-3 py-2 text-caption font-medium text-ink shadow-btn transition-colors duration-150 hover:bg-hover">
        Open approval
      </button>
    );
  }
  if (sent) {
    return (
      <div className="flex w-full max-w-80 items-center gap-3" style={{ animation: "pop-in 260ms var(--ease-out-quint) both" }}>
        <Badge tone="green" free className="py-1 pr-2.5 pl-1 text-caption">
          <span className="flex size-4.5 items-center justify-center rounded-full bg-green text-canvas">
            <Icon name="check" size={11} strokeWidth={3} />
          </span>
          Answers sent
        </Badge>
        {resettable && (
          <button type="button" onClick={reset} className="text-small font-medium text-ink-3 transition-colors duration-150 hover:text-ink">Start over</button>
        )}
      </div>
    );
  }
  return (
    <div className="flex min-h-[196px] w-full max-w-80 flex-col items-stretch">
      <Card className="w-full self-start">
        <div key={qi} className="primitive-card-pad" style={{ animation: "fade-up 350ms var(--ease-out-quint) both" }}>
          <div className="flex items-start justify-between gap-3">
            <span className="text-body font-medium text-ink">{question.q}</span>
            <IconButton label="Dismiss" onClick={() => setOpen(false)} className="text-ink-3 hover:bg-hover hover:text-ink">
              <Icon name="close" />
            </IconButton>
          </div>
          <div className="mt-2 flex flex-col gap-0.5">
            {question.options.map((option, i) => {
              const on = selected.includes(i);
              return (
                <button key={option} type="button" aria-pressed={on} onClick={() => toggle(i)}
                  className="-mx-1.5 flex items-center gap-2 rounded-control px-1.5 py-1 text-left transition-colors duration-150 hover:bg-hover">
                  <RadioCheck type={question.type} on={on} />
                  <span className={`text-body transition-colors duration-200 ${on ? "text-ink" : "text-ink-2"}`}>{option}</span>
                </button>
              );
            })}
            <label className="-mx-1.5 flex items-center gap-2 rounded-control px-1.5 py-1 transition-colors duration-150 focus-within:bg-hover hover:bg-hover">
              <span aria-hidden="true" className="size-4 shrink-0" />
              <input value={custom[qi] ?? ""}
                onChange={(event) => {
                  setCustom((current) => ({ ...current, [qi]: event.target.value }));
                  if (question.type === "radio") setAnswers((current) => ({ ...current, [qi]: [] }));
                }}
                placeholder="Type something…" aria-label="Custom answer"
                className="min-w-0 flex-1 bg-transparent text-body text-ink outline-none placeholder:text-ink-3" />
            </label>
          </div>
        </div>
        <div className="primitive-card-footer flex items-center justify-between">
          <span className="flex items-center gap-2">
            <button type="button" aria-label="Previous" disabled={qi === 0 || sent}
              onClick={() => setQi((current) => Math.max(0, current - 1))}
              className="flex size-6 items-center justify-center rounded-[5px] text-ink-3 transition-colors duration-150 enabled:hover:bg-hover enabled:hover:text-ink-2 disabled:opacity-35">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <span className="flex items-center gap-1">
              {QUESTIONS.map((_, i) => (
                <button key={i} type="button" aria-label={`Go to question ${i + 1}`}
                  aria-current={i === qi && !sent ? "step" : undefined} disabled={sent} onClick={() => setQi(i)}
                  className="rounded-full transition-[width,height,background-color,border-color,border-width] duration-300 disabled:cursor-default"
                  style={
                    i === qi && !sent ? { width: 9, height: 9, border: "2.5px solid var(--ink)" }
                    : sent || i < qi ? { width: 7, height: 7, background: "var(--ink-3)" }
                    : { width: 7, height: 7, border: "1.5px solid var(--ink-3)" }
                  } />
              ))}
            </span>
            <button type="button" aria-label="Next" disabled={last || sent}
              onClick={() => setQi((current) => Math.min(QUESTIONS.length - 1, current + 1))}
              className="flex size-6 items-center justify-center rounded-[5px] text-ink-3 transition-colors duration-150 enabled:hover:bg-hover enabled:hover:text-ink-2 disabled:opacity-35">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
            </button>
          </span>
          {!sent && (
            <SendButton className="-mr-0.5" enabled={hasAnswer} label={last ? "Send answers" : "Next question"}
              onClick={() => { if (last) setSent(true); else setQi((current) => current + 1); }} />
          )}
        </div>
      </Card>
    </div>
  );
}

/* ═══════════ StreamingText ═══════════ */

/* ══ taskrows (mirrored from preview.html) ══ */
const TR_TICKS = [600, 900, 2400, 1400, 2400, 600];
function SpinnerRing({ active, children }) {
  const size = 24, stroke = 2;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0" style={active ? { animation: "spin 1.1s linear infinite" } : undefined}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
        {active && (
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ink-3)" strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={`${c * 0.28} ${c * 0.72}`} />
        )}
      </svg>
      <span className="relative text-micro font-semibold tabular-nums text-ink">{children}</span>
    </span>
  );
}
function StatusDot({ tone, children }) {
  return (
    <span className={`flex size-5.5 shrink-0 items-center justify-center rounded-full text-canvas ${tone === "red" ? "bg-red" : "bg-green"}`}
      style={{ animation: "pop-in 300ms var(--ease-out-quint) both" }}>
      {children}
    </span>
  );
}
const pillEnter = { animation: "fade-in 200ms ease-out both" };
function TaskRows({ variant = "Capsules", rows: rowsProp }) {
  const tick = useSequence(TR_TICKS);
  const [manualOpen, setManualOpen] = useState({});
  const demo = rowsProp === undefined;
  const draftStatus = tick < 3 ? "pending" : tick === 3 ? "failed" : "completed";
  const rows = rowsProp ?? [
    { key: "verify", label: "Verified vendor records", amount: "12 suppliers", status: "completed",
      details: [{ label: "Matched tax and contact IDs", meta: "12/12" }, { label: "Flagged stale records", meta: "0" }] },
    { key: "index", label: "Build reorder task list", amount: "7 SKUs", status: "active", step: 2,
      details: [{ label: "Reading POS export", meta: "3 files" }, { label: "Scoring stockout risk", meta: "68%" }] },
    { key: "draft", label: "Draft supplier emails", amount: "2 messages", status: draftStatus, step: 3,
      details: [{ label: "Cone supplier follow-up", meta: "draft" }, { label: "Pistachio reorder note", meta: "draft" }] },
  ];
  const badgeFor = (row) =>
    row.status === "completed" ? (
      <StatusDot tone="green"><Icon name="check" size={13} strokeWidth={3.5} /></StatusDot>
    ) : row.status === "failed" ? (
      <StatusDot tone="red"><Icon name="close" size={12} strokeWidth={3.5} /></StatusDot>
    ) : (
      <SpinnerRing active={row.status === "active"}>{row.step}</SpinnerRing>
    );
  const pillFor = (row) =>
    row.status === "completed" ? (
      <Badge tone="green" style={pillEnter}>Completed</Badge>
    ) : row.status === "failed" ? (
      <Badge tone="red" style={pillEnter}>
        Failed
        <span className="flex" style={{ animation: "spin 1.2s linear infinite" }}><Icon name="retry" size={12} strokeWidth={3} /></span>
      </Badge>
    ) : null;
  const list = variant === "List";
  return (
    <div className={`flex w-full max-w-110 flex-col ${list ? "gap-0 self-start overflow-hidden rounded-card bg-surface shadow-card" : "min-h-[196px] gap-2"}`}>
      {rows.map((row, i) => {
        const open = manualOpen[row.key] ?? (demo && row.key === "index" && tick === 2);
        return (
          <div key={row.key}
            className={`self-stretch overflow-hidden transition-[border-radius,background-color] duration-300 hover:bg-inset ${list ? "border-b border-line last:border-0" : "bg-surface shadow-card"}`}
            style={{ borderRadius: list ? 0 : open ? "var(--radius-card)" : "var(--radius-capsule)", ...fadeUp(i, { duration: 450 }) }}>
            <button type="button" aria-expanded={open}
              onClick={() => setManualOpen((current) => ({ ...current, [row.key]: !open }))}
              className="flex h-11 w-full items-center gap-2.5 px-2.5 text-left">
              <span className="flex size-6 shrink-0 items-center justify-center">{badgeFor(row)}</span>
              <span className="min-w-0 flex-1 truncate text-body font-medium text-ink">{row.label}</span>
              <span className="text-caption text-ink-2 tabular-nums">{row.amount}</span>
              <span aria-live="polite" className="contents">{pillFor(row)}</span>
              <span aria-hidden="true" className="-ml-2 flex size-7 shrink-0 items-center justify-center rounded-full text-ink-3">
                <Icon name="chevron" size={15} className="transition-transform duration-300" style={{ transform: open ? "rotate(180deg)" : "rotate(0)" }} />
              </span>
            </button>
            <Disclosure open={open} live={demo}>
              <div className="mb-2.5 grid grid-cols-[24px_1fr] gap-2.5 px-2.5">
                <span aria-hidden className="mx-auto h-full w-px bg-line" />
                <div className="flex flex-col gap-1.5">
                  {row.details.map((d, j) => (
                    <div key={j} className="flex items-center justify-between"
                      style={open ? fadeUp(j, { stagger: 100, delay: 120 }) : undefined}>
                      <span className="text-small text-ink-2">{d.label}</span>
                      <span className="font-mono text-tiny text-ink-3 tabular-nums">{d.meta}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Disclosure>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════ ChatComposer ═══════════ */

/* ══ promptbar (mirrored from preview.html) ══ */
const PB_BRANDS = {
  figma: <svg width="11" height="16" viewBox="0 0 38 57" aria-hidden="true">
      <path d="M9.5 57A9.5 9.5 0 0 0 19 47.5V38H9.5a9.5 9.5 0 0 0 0 19z" fill="#0ACF83" />
      <path d="M0 28.5A9.5 9.5 0 0 1 9.5 19H19v19H9.5A9.5 9.5 0 0 1 0 28.5z" fill="#A259FF" />
      <path d="M0 9.5A9.5 9.5 0 0 1 9.5 0H19v19H9.5A9.5 9.5 0 0 1 0 9.5z" fill="#F24E1E" />
      <path d="M19 0h9.5a9.5 9.5 0 1 1 0 19H19V0z" fill="#FF7262" />
      <path d="M38 28.5a9.5 9.5 0 1 1-19 0 9.5 9.5 0 0 1 19 0z" fill="#1ABCFE" />
    </svg>,
  slack: <svg width="15" height="15" viewBox="0 0 127 127" aria-hidden="true">
      <path d="M27.2 80c0 7.3-5.9 13.2-13.2 13.2C6.7 93.2.8 87.3.8 80c0-7.3 5.9-13.2 13.2-13.2h13.2V80zm6.6 0c0-7.3 5.9-13.2 13.2-13.2 7.3 0 13.2 5.9 13.2 13.2v33c0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V80z" fill="#E01E5A" />
      <path d="M47 27.2c-7.3 0-13.2-5.9-13.2-13.2C33.8 6.7 39.7.8 47 .8c7.3 0 13.2 5.9 13.2 13.2v13.2H47zm0 6.7c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H13.9C6.6 60.3.7 54.4.7 47.1c0-7.3 5.9-13.2 13.2-13.2H47z" fill="#36C5F0" />
      <path d="M99.9 47.1c0-7.3 5.9-13.2 13.2-13.2 7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H99.9V47.1zm-6.6 0c0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V13.9C66.9 6.6 72.8.7 80.1.7c7.3 0 13.2 5.9 13.2 13.2v33.2z" fill="#2EB67D" />
      <path d="M80.1 99.8c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V99.8h13.2zm0-6.6c-7.3 0-13.2-5.9-13.2-13.2 0-7.3 5.9-13.2 13.2-13.2h33.1c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H80.1z" fill="#ECB22E" />
    </svg>,
  gmail: <svg width="15" height="12" viewBox="0 0 256 193" aria-hidden="true">
      <path d="M58.182 192.05V93.14L27.507 65.077 0 49.504v125.091c0 9.658 7.825 17.455 17.455 17.455h40.727Z" fill="#4285F4" />
      <path d="M197.818 192.05h40.727c9.659 0 17.455-7.826 17.455-17.455V49.505l-31.156 17.837-27.026 25.798v98.91Z" fill="#34A853" />
      <path d="m58.182 93.14-4.174-38.647 4.174-36.989L128 69.868l69.818-52.364 4.669 34.992-4.669 40.644L128 145.504 58.182 93.14Z" fill="#EA4335" />
      <path d="M197.818 17.504V93.14L256 49.504V26.231c0-21.585-24.64-33.89-41.89-20.945l-16.292 12.218Z" fill="#FBBC04" />
      <path d="m0 49.504 26.759 20.07L58.182 93.14V17.504L41.89 5.286C24.61-7.66 0 4.646 0 26.23v23.273Z" fill="#C5221F" />
    </svg>
};
const PB_SOURCES = [
  { key: "attach", name: "Add photos & files", desc: "Upload from your computer", glyph: "clip", attach: true },
  { key: "scoop", name: "Scoop Data", desc: "Sales & churn metrics", glyph: "chart" },
  { key: "flavors", name: "Flavor records", desc: "26 makers, tags, links", glyph: "layers" },
  { key: "web", name: "Web search", desc: "Real-time news and info", glyph: "globe" },
  { key: "figma", name: "Figma", desc: "Design-to-code workflows", brand: "figma" },
  { key: "slack", name: "Slack", desc: "Read and manage Slack", brand: "slack" },
  { key: "gmail", name: "Gmail", desc: "Read and manage Gmail", brand: "gmail", connect: true }
];
const PB_COMMANDS = [
  { key: "compare", name: "/compare", desc: "Flavor vs. last summer" },
  { key: "churn-plan", name: "/churn-plan", desc: "Draft a churn schedule" },
  { key: "restock", name: "/restock", desc: "Build a reorder list" },
  { key: "draft-email", name: "/draft-email", desc: "Write a supplier email" },
  { key: "summarize", name: "/summarize", desc: "Digest the thread so far" }
];
const PB_MODELS = [
  { key: "sprinkles-5", name: "Sprinkles 5", tag: "Flagship" },
  { key: "vanilla-1", name: "Vanilla 1", tag: "Basic" },
  { key: "freezer-burn", name: "Freezer Burn 0.4", tag: "Stale" }
];
const PB_FILES = ["flavor-chart.png", "summer-menu.pdf", "pos-export.csv"];
const PB_DICTATION = "Compare pistachio weekends to last summer";
const PB_AUTO_STEPS = [
  { draft: "", connect: false, model: "vanilla-1", hold: 1100 },
  { draft: "@", active: 0, hold: 900 },
  { draft: "@", active: 1, hold: 620 },
  { draft: "@", active: 4, hold: 620 },
  { draft: "@", active: 6, hold: 700 },
  { draft: "@", active: 6, connect: true, hold: 1e3 },
  { draft: "", hold: 700 },
  { draft: "/", active: 0, hold: 900 },
  { draft: "/", active: 1, hold: 620 },
  { draft: "/", active: 3, hold: 1e3 },
  { draft: "", hold: 800 },
  // open the model picker and upgrade to the flagship → rainbow sweep
  { draft: "", modelOpen: true, hold: 1200 },
  { draft: "", model: "sprinkles-5", hold: 2400 },
  { draft: "", hold: 900 }
];
function pbParseToken(draft) {
  const match = /(^|\s)([@/])([\w-]*)$/.exec(draft);
  if (!match) return null;
  return {
    kind: match[2] === "@" ? "at" : "slash",
    query: match[3].toLowerCase(),
    start: match.index + match[1].length
  };
}
function PromptBar({
  variant = "Rounded",
  demo = true,
  tall = false,
  placeholder,
  sources = PB_SOURCES,
  commands = PB_COMMANDS,
  models = PB_MODELS,
  onSend
}) {
  const pill = variant === "Pill";
  const [draft, setDraft] = useState("");
  const [dismissed, setDismissed] = useState(false);
  const [plusOpen, setPlusOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [model, setModel] = useState(models[1] ?? models[0]);
  const [attachments, setAttachments] = useState([]);
  const [connected, setConnected] = useState(false);
  const [active, setActive] = useState(0);
  const [listening, setListening] = useState(false);
  const [auto, setAuto] = useState(demo);
  const [autoStep, setAutoStep] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [sweep, setSweep] = useState(0);
  const wide = expanded || tall;
  const [rowBox, setRowBox] = useState(null);
  const [engaged, setEngaged] = useState(false);
  const [modelBox, setModelBox] = useState(null);
  const [modelHovered, setModelHovered] = useState(null);
  const [modelMenuLeft, setModelMenuLeft] = useState(0);
  const [modelMenuBottom, setModelMenuBottom] = useState(0);
  const rootRef = useRef(null);
  const composerAnchorRef = useRef(null);
  const controlsRef = useRef(null);
  const inputRef = useRef(null);
  const measureRef = useRef(null);
  const modelRef = useRef(null);
  const rowRefs = useRef([]);
  const modelRowRefs = useRef([]);
  const takeOver = (event) => {
    setAuto(false);
    if (auto && event.target === inputRef.current) setDraft("");
  };
  const token = dismissed ? null : pbParseToken(draft);
  const menu = plusOpen ? "at" : token?.kind ?? null;
  const query = plusOpen ? "" : token?.query ?? "";
  const rows = menu === "at" ? sources.filter((s) => s.name.toLowerCase().includes(query)) : menu === "slash" ? commands.filter((c) => c.name.slice(1).startsWith(query)) : [];
  useEffect(() => {
    setActive(0);
    setEngaged(false);
  }, [menu, query]);
  useLayoutEffect(() => {
    const target = rowRefs.current[active];
    if (target) setRowBox({ top: target.offsetTop, height: target.offsetHeight });
  }, [menu, query, active, connected, rows.length]);
  const modelIndex = models.findIndex((m) => m.key === model.key);
  useLayoutEffect(() => {
    if (!modelOpen) return;
    const target = modelRowRefs.current[modelHovered ?? modelIndex];
    if (target) setModelBox({ top: target.offsetTop, height: target.offsetHeight });
  }, [modelOpen, modelHovered, modelIndex]);
  useLayoutEffect(() => {
    if (!modelOpen || !composerAnchorRef.current || !modelRef.current) return;
    const anchorRect = composerAnchorRef.current.getBoundingClientRect();
    const triggerRect = modelRef.current.getBoundingClientRect();
    setModelMenuLeft(Math.max(0, Math.min(triggerRect.left - anchorRect.left, anchorRect.width - 176)));
    setModelMenuBottom(anchorRect.bottom - triggerRect.top + 8);
  }, [modelOpen, wide, model.name]);
  useEffect(() => {
    if (!modelOpen) setModelHovered(null);
  }, [modelOpen]);
  const celebrate = () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setSweep((s) => s + 1);
  };
  const selectModel = (next) => {
    setModel(next);
    setModelOpen(false);
    if (next.key === "sprinkles-5") celebrate();
  };
  useEffect(() => {
    if (!auto) return;
    const step = PB_AUTO_STEPS[autoStep % PB_AUTO_STEPS.length];
    setDraft(step.draft);
    if (step.active !== void 0) setActive(step.active);
    if (step.connect !== void 0) setConnected(step.connect);
    if (step.modelOpen !== void 0) setModelOpen(step.modelOpen);
    if (step.model) {
      const next = models.find((m) => m.key === step.model);
      if (next) selectModel(next);
    }
    const t = setTimeout(() => setAutoStep((s) => s + 1), step.hold);
    return () => clearTimeout(t);
  }, [auto, autoStep]);
  useEffect(() => {
    if (!listening) return;
    const t = setTimeout(() => {
      setDraft((current) => current ? `${current.trimEnd()} ${PB_DICTATION}` : PB_DICTATION);
      setListening(false);
      inputRef.current?.focus();
    }, 2200);
    return () => clearTimeout(t);
  }, [listening]);
  useLayoutEffect(() => {
    const input = inputRef.current;
    const controls = controlsRef.current;
    const measure = measureRef.current;
    const modelButton = modelRef.current;
    if (!input || !controls || !measure || !modelButton) return;
    const fixedControlsWidth = 28 * 3 + modelButton.offsetWidth;
    const inlineGaps = 4 * 4;
    const inlineInputWidth = controls.clientWidth - fixedControlsWidth - inlineGaps;
    const needsFullWidth = draft.includes("\n") || measure.offsetWidth + 8 > inlineInputWidth;
    if (needsFullWidth !== expanded) {
      setExpanded(needsFullWidth);
    }
    const minHeight = 28;
    const maxHeight = 100;
    input.style.height = "0px";
    const contentHeight = input.scrollHeight;
    input.style.height = `${Math.min(Math.max(contentHeight, minHeight), maxHeight)}px`;
    input.style.overflowY = contentHeight > maxHeight ? "auto" : "hidden";
  }, [draft, expanded]);
  useEffect(() => {
    if (!modelOpen && !plusOpen) return;
    const close = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setModelOpen(false);
        setPlusOpen(false);
      }
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [modelOpen, plusOpen]);
  const closeMenus = () => {
    setPlusOpen(false);
    setModelOpen(false);
  };
  const pick = (row) => {
    const source = sources.find((s) => s.key === row.key);
    if (source?.attach) {
      setAttachments((current) => [...current, PB_FILES[current.length % PB_FILES.length]]);
      if (token) setDraft(draft.slice(0, token.start));
    } else if (menu === "at") {
      setDraft(`${token ? draft.slice(0, token.start) : draft}@${row.name} `);
    } else {
      setDraft(`${token ? draft.slice(0, token.start) : draft}${row.name} `);
    }
    setPlusOpen(false);
    setDismissed(false);
    inputRef.current?.focus();
  };
  const canSend = draft.trim().length > 0 || attachments.length > 0;
  const send = () => {
    if (!canSend) return;
    onSend?.(draft.trim());
    setDraft("");
    setAttachments([]);
    closeMenus();
  };
  return <div
    data-promptbar
    ref={rootRef}
    className={demo ? "flex min-h-[384px] w-full max-w-105 flex-col justify-end pb-8" : "w-full"}
    onPointerDownCapture={takeOver}
    onKeyDownCapture={takeOver}
  >
      {
    /* composer is the anchor — menus grow up from its top edge */
  }
      <div ref={composerAnchorRef} className="relative">
      {
    /* ── @ / slash menu ─────────────────────────────── */
  }
      {menu && <div
    onMouseLeave={() => setEngaged(false)}
    className="absolute inset-x-0 bottom-full z-10 mb-2 rounded-md bg-surface p-1 shadow-overlay"
    style={{ animation: "pop-in 180ms var(--ease-out-quint) both", transformOrigin: "bottom center" }}
  >
          {
    /* single gliding highlight — appears once a row is hovered */
  }
          <span
    aria-hidden
    className="pointer-events-none absolute inset-x-1 rounded-sm bg-hover"
    style={{
      top: rowBox?.top ?? 0,
      height: rowBox?.height ?? 0,
      opacity: rowBox && engaged && rows.length > 0 ? 1 : 0,
      transition: "top 220ms var(--ease-out-quint), height 220ms var(--ease-out-quint), opacity 150ms ease"
    }}
  />
          {rows.map((row, i) => {
    const source = menu === "at" ? sources.find((s) => s.key === row.key) : void 0;
    return <div
      key={row.key}
      ref={(el) => {
        rowRefs.current[i] = el;
      }}
      onMouseEnter={() => {
        setActive(i);
        setEngaged(true);
      }}
      className="relative z-10 flex h-9 w-full items-center rounded-sm"
    >
                <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => pick(row)}
      className="flex h-full min-w-0 flex-1 items-center gap-2.5 px-2 text-left"
    >
                  {source && <span className="flex size-5.5 shrink-0 items-center justify-center text-ink-2">
                      {source.brand ? PB_BRANDS[source.brand] : <Icon name={source.glyph ?? "clip"} size={15} strokeWidth={1.8} />}
                    </span>}
                  <span className="shrink-0 text-caption font-medium text-ink">
                    {row.name}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-small text-ink-3">{row.desc}</span>
                </button>
                {source?.connect && <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => setConnected((current) => !current)}
      className={`shrink-0 pr-2 pl-1 text-small font-medium transition-colors duration-150 ${connected ? "text-green" : "text-accent hover:underline"}`}
    >
                    {connected ? "Connected" : "Connect"}
                  </button>}
              </div>;
  })}
          {rows.length === 0 && <div className="flex h-9 items-center px-2 text-small text-ink-3">
              No matches for “{query}”
            </div>}
          <div className="mt-1 border-t border-line px-2 pt-1.5 pb-1 text-tiny text-ink-3">
            {menu === "at" ? "Type to search sources & files" : "Type to search commands"}
          </div>
        </div>}
      {
    /* ── model menu ─────────────────────────────────── */
  }
      {modelOpen && <div
    onMouseLeave={() => setModelHovered(null)}
    className="absolute z-10 w-44 rounded-md bg-surface p-1 shadow-overlay"
    style={{ left: modelMenuLeft, bottom: modelMenuBottom, animation: "pop-in 180ms var(--ease-out-quint) both", transformOrigin: "bottom left" }}
  >
          {
    /* single gliding highlight — floats to the hovered / selected row */
  }
          <span
    aria-hidden
    className="pointer-events-none absolute inset-x-1 rounded-sm bg-hover"
    style={{
      top: modelBox?.top ?? 0,
      height: modelBox?.height ?? 0,
      opacity: modelBox && modelHovered !== null ? 1 : 0,
      transition: "top 220ms var(--ease-out-quint), height 220ms var(--ease-out-quint), opacity 150ms ease"
    }}
  />
          {models.map((m, i) => <button
    key={m.key}
    type="button"
    ref={(el) => {
      modelRowRefs.current[i] = el;
    }}
    onMouseDown={(event) => event.preventDefault()}
    onMouseEnter={() => setModelHovered(i)}
    onClick={() => {
      selectModel(m);
      inputRef.current?.focus();
    }}
    className="relative z-10 flex h-7.5 w-full items-center gap-2 rounded-sm px-2 text-left"
  >
              <span className="min-w-0 flex-1 truncate text-caption font-medium text-ink">{m.name}</span>
              <span className="shrink-0 text-tiny text-ink-3">{m.tag}</span>
              <span className={`shrink-0 text-ink ${m.key === model.key ? "" : "invisible"}`}>
                <Icon name="check" size={13} strokeWidth={2.5} />
              </span>
            </button>)}
        </div>}
      {
    /* ── composer ───────────────────────────────────── */
  }
      <div
    className={`relative isolate flex flex-col overflow-hidden border border-line bg-surface shadow-card transition-[border-color,border-radius] duration-150 focus-within:border-line-strong ${tall ? "gap-2.5 p-3.5" : "gap-1.5 p-1.5"} ${pill ? attachments.length > 0 || wide ? "rounded-capsule" : "rounded-full" : tall ? "rounded-capsule" : "rounded-card"}`}
  >
        {
    /* rainbow sweep — remounts per trigger, fades itself out */
  }
        {sweep > 0 && <div key={sweep} aria-hidden className="rainbow-sweep -z-10" style={{ borderRadius: "inherit" }} />}
        <span
    ref={measureRef}
    aria-hidden="true"
    className="pointer-events-none absolute invisible whitespace-pre text-body leading-[18px]"
  >
          {draft}
        </span>
        {attachments.length > 0 && <div className={`flex flex-wrap gap-1.5 pt-0.5 ${pill ? "px-1" : "px-0.5"}`}>
            {attachments.map((file, i) => <span
    key={`${file}-${i}`}
    className={`flex h-6.5 items-center gap-1.5 bg-field py-1 pr-1 pl-1.5 text-tiny text-ink-2 shadow-hairline ${pill ? "rounded-full" : "rounded-chip"}`}
    style={{ animation: "pop-in 200ms var(--ease-out-quint) both" }}
  >
                <Icon name="file" size={12} />
                <span className="max-w-36 truncate">{file}</span>
                <button
    type="button"
    aria-label={`Remove ${file}`}
    onClick={() => setAttachments((current) => current.filter((_, j) => j !== i))}
    className={`-my-1 flex size-6 items-center justify-center text-ink-3 transition-colors duration-150 hover:bg-line/70 hover:text-ink ${pill ? "rounded-full" : "rounded-[5px]"}`}
  >
                  <Icon name="close" size={10} strokeWidth={2.5} />
                </button>
              </span>)}
          </div>}
        <div
    ref={controlsRef}
    className={`grid items-end gap-x-1 gap-y-1.5 ${wide ? "grid-cols-[28px_auto_minmax(0,1fr)_28px_28px]" : "grid-cols-[28px_minmax(0,1fr)_auto_28px_28px]"}`}
  >
          <button
    type="button"
    aria-label="Add attachments and sources"
    aria-expanded={plusOpen}
    onClick={() => {
      setModelOpen(false);
      setPlusOpen((current) => !current);
      inputRef.current?.focus();
    }}
    className={`flex size-7 shrink-0 items-center justify-center justify-self-start text-ink-3 transition-[background-color,color,transform] duration-150 hover:bg-hover hover:text-ink active:scale-[0.94] ${pill ? "rounded-full" : "rounded-control"} ${plusOpen ? "bg-hover text-ink" : ""} ${wide ? "col-start-1 row-start-2" : "col-start-1 row-start-1"}`}
  >
            <Icon name="plus" size={16} strokeWidth={2} />
          </button>
          <textarea
    ref={inputRef}
    rows={1}
    value={draft}
    onChange={(event) => {
      setDraft(event.target.value);
      setDismissed(false);
      setPlusOpen(false);
    }}
    onKeyDown={(event) => {
      if (menu && rows.length > 0) {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          setEngaged(true);
          setActive((current) => (current + (event.key === "ArrowDown" ? 1 : rows.length - 1)) % rows.length);
          return;
        }
        if (event.key === "Enter" && !event.shiftKey || event.key === "Tab") {
          event.preventDefault();
          pick(rows[active]);
          return;
        }
      }
      if (event.key === "Escape") {
        setDismissed(true);
        closeMenus();
        return;
      }
      if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
        event.preventDefault();
        send();
      }
    }}
    placeholder={listening ? "Listening\u2026" : placeholder ?? "Write a message\u2026"}
    aria-label="Prompt"
    className={`${tall ? "min-h-[68px] px-2 py-2 text-lead leading-5" : "min-h-7 px-1 py-[5px] text-body leading-[18px]"} min-w-0 w-full resize-none bg-transparent text-ink outline-none [overflow-wrap:anywhere] placeholder:text-ink-3 ${wide ? "col-span-full col-start-1 row-start-1" : "col-start-2 row-start-1"}`}
  />
          {
    /* model picker */
  }
          <button
    ref={modelRef}
    type="button"
    aria-expanded={modelOpen}
    aria-label="Choose model"
    onClick={() => {
      setPlusOpen(false);
      setModelOpen((current) => !current);
    }}
    className={`flex h-7 shrink-0 items-center gap-1 px-1.5 text-small font-medium text-ink-2 transition-colors duration-150 hover:bg-hover hover:text-ink ${pill ? "rounded-full" : "rounded-control"} ${wide ? "col-start-2 row-start-2 justify-self-start" : "col-start-3 row-start-1"}`}
  >
            {model.name}
            <span className="text-ink-3">
              <Icon name="chevron" size={11} strokeWidth={2.4} />
            </span>
          </button>
          {
    /* dictation */
  }
          <button
    type="button"
    aria-label={listening ? "Stop dictation" : "Start dictation"}
    aria-pressed={listening}
    onClick={() => setListening((current) => !current)}
    className={`flex size-7 shrink-0 items-center justify-center transition-[background-color,color,transform] duration-150 active:scale-[0.94] ${pill ? "rounded-full" : "rounded-control"} ${listening ? "bg-accent-tint text-accent" : "text-ink-3 hover:bg-hover hover:text-ink"} ${wide ? "col-start-4 row-start-2" : "col-start-4 row-start-1"}`}
  >
            {listening ? <span className="flex h-3.5 items-center gap-[2.5px]">
                {[0, 1, 2].map((i) => <span
    key={i}
    className="w-[2.5px] rounded-full bg-current"
    style={{ height: "100%", animation: `eq-bounce 900ms ease-in-out ${i * 150}ms infinite` }}
  />)}
              </span> : <Icon name="mic" size={15} strokeWidth={2} />}
          </button>
          {
    /* send — tactile square (round in the pill variant) */
  }
          <SendButton
    enabled={canSend}
    round={pill}
    onClick={send}
    className={wide ? "col-start-5 row-start-2" : "col-start-5 row-start-1"}
  />
        </div>
      </div>
      </div>
    </div>;
}

/* ═══════════ RecommendationCard ═══════════ */
const rcCodeChip = (text, tone) => <code
  className={`rounded-md px-1.5 py-0.5 font-mono text-small ${tone === "accent" ? "bg-accent-tint text-accent" : "bg-orange-tint text-orange"}`}
>
    {text}
  </code>;

/* ══ selection (mirrored from preview.html) ══ */
const SA_DEFAULT_LEAD = "Pistachio holds the top slot all weekend. ";
const SA_DEFAULT_SELECTED = "Churn it first thing Saturday so the batch has time to firm up before the afternoon rush.";
const SA_DEFAULT_REWRITE = "Churn pistachio first thing Saturday so the batch has time to fully firm before the afternoon rush.";
const SA_QUICK_ACTIONS = [
  { label: "Shorten", icon: "scissors", busy: "Shortening" },
  { label: "Change tone", short: "Tone", icon: "mood-smile", busy: "Changing tone" },
  { label: "Fix grammar", short: "Grammar", icon: "typography", busy: "Fixing grammar" }
];
const SA_BUSY_LABELS = {
  Explain: "Explaining",
  Improve: "Improving",
  ...Object.fromEntries(SA_QUICK_ACTIONS.map((a) => [a.label, a.busy]))
};
const SA_resolveEasing = () => (typeof window !== "undefined" ? getComputedStyle(document.documentElement).getPropertyValue("--ease-out-quint").trim() : "") || "ease-out";
const SA_control = "inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-small text-ink transition-[background-color,color,transform] duration-150 hover:bg-hover active:scale-[0.96]";
const SA_primary = "inline-flex h-7 shrink-0 items-center gap-1 rounded-full bg-ink px-2.5 text-caption text-canvas shadow-hairline transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-[0.96]";
function SelectionActions({
  lead = SA_DEFAULT_LEAD,
  selected = SA_DEFAULT_SELECTED,
  rewrite = SA_DEFAULT_REWRITE,
  onKeep,
  onDiscard
} = {}) {
  const [shown, setShown] = useState(false);
  const [mode, setMode] = useState("idle");
  const [action, setAction] = useState("Improve");
  const [prompt, setPrompt] = useState("");
  const [typingWidth, setTypingWidth] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [anchor, setAnchor] = useState({ x: 0, y: 0 });
  const [positioned, setPositioned] = useState(false);
  const hostRef = useRef(null);
  const selectionRef = useRef(null);
  const barRef = useRef(null);
  const contentRef = useRef(null);
  const frameRef = useRef(null);
  const previousModeRef = useRef("idle");
  const lastWidthRef = useRef(0);
  const widthAnimationRef = useRef(null);
  useEffect(() => {
    const timer = window.setTimeout(() => setShown(true), 280);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (mode !== "thinking") return;
    const timer = window.setTimeout(() => setMode("streaming"), 700);
    return () => window.clearTimeout(timer);
  }, [mode]);
  const place = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      const host = hostRef.current;
      const selection = selectionRef.current;
      if (!host || !selection) return;
      const bounds = selection.getBoundingClientRect();
      const lines = Array.from(selection.getClientRects());
      const lastLine = lines.at(-1);
      if (!lastLine) return;
      const hostBounds = host.getBoundingClientRect();
      const next = {
        x: Math.round(bounds.left - hostBounds.left + bounds.width / 2),
        y: Math.round(lastLine.bottom - hostBounds.top + 8)
      };
      const barHalf = (barRef.current?.getBoundingClientRect().width ?? 0) / 2;
      const minX = 24 + barHalf - hostBounds.left;
      const maxX = window.innerWidth - 24 - barHalf - hostBounds.left;
      next.x = Math.round(minX > maxX ? (minX + maxX) / 2 : Math.min(Math.max(next.x, minX), maxX));
      setAnchor(
        (current) => current.x === next.x && current.y === next.y ? current : next
      );
      setPositioned(true);
    });
  }, []);
  useLayoutEffect(() => {
    place();
  }, [mode, place]);
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const observer = new ResizeObserver(place);
    observer.observe(host);
    if (barRef.current) observer.observe(barRef.current);
    window.addEventListener("resize", place);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", place);
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [place]);
  useLayoutEffect(() => {
    const bar = barRef.current;
    const content = contentRef.current;
    if (!bar || !content) return;
    const nextWidth = Math.ceil(content.getBoundingClientRect().width) + 8;
    const running = widthAnimationRef.current?.playState === "running";
    const previousWidth = !running && lastWidthRef.current ? lastWidthRef.current : Math.ceil(bar.getBoundingClientRect().width);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduced && previousModeRef.current !== mode && Math.abs(nextWidth - previousWidth) > 1) {
      widthAnimationRef.current?.cancel();
      const animation = bar.animate(
        [{ width: `${previousWidth}px` }, { width: `${nextWidth}px` }],
        { duration: 320, easing: SA_resolveEasing() }
      );
      widthAnimationRef.current = animation;
      animation.onfinish = () => {
        lastWidthRef.current = nextWidth;
        widthAnimationRef.current = null;
      };
      animation.oncancel = () => {
        widthAnimationRef.current = null;
      };
    } else {
      lastWidthRef.current = nextWidth;
    }
    previousModeRef.current = mode;
  }, [mode]);
  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const observer = new ResizeObserver(() => {
      if (widthAnimationRef.current?.playState === "running") return;
      lastWidthRef.current = Math.ceil(content.getBoundingClientRect().width) + 8;
    });
    observer.observe(content);
    return () => {
      observer.disconnect();
      widthAnimationRef.current?.cancel();
    };
  }, []);
  const run = (nextAction) => {
    setAction(nextAction);
    setExpanded(false);
    setMode("thinking");
  };
  const reset = () => {
    setExpanded(false);
    setPrompt("");
    setTypingWidth(null);
    setAction("Improve");
    setMode("idle");
  };
  const busy = mode === "thinking" || mode === "streaming";
  const visible = shown && positioned;
  const hasPrompt = prompt.trim().length > 0;
  const busyLabel = SA_BUSY_LABELS[action] ?? "Editing";
  return <div className="w-full max-w-105">
      <div ref={hostRef} className="relative select-none pb-12">
        <p className="text-body leading-relaxed text-ink" aria-live="polite" aria-busy={busy}>
          {lead}
          <span
    ref={selectionRef}
    className="box-decoration-clone rounded-[3px] bg-accent-tint text-ink"
  >
            {mode === "idle" || mode === "thinking" ? selected : mode === "streaming" ? <StreamText
    text={rewrite}
    onProgress={place}
    onDone={() => setMode("result")}
  /> : rewrite}
          </span>
        </p>
        <div
    className="absolute top-0 left-0 z-10"
    style={{
      transform: `translate3d(${anchor.x}px, ${anchor.y}px, 0) translateX(-50%)`,
      transition: "transform 320ms var(--ease-out-quint), opacity 180ms ease-out",
      opacity: visible ? 1 : 0,
      pointerEvents: visible ? "auto" : "none",
      willChange: "transform"
    }}
  >
          {
    /* A 36px pill wraps 28px controls at a 4px inset. The controls
       resolve to a 14px radius, preserving the concentric curve. */
  }
          <div
    ref={barRef}
    className="flex h-9 w-fit max-w-[calc(100vw-48px)] items-center gap-0.5 overflow-x-auto overflow-y-hidden rounded-full bg-surface p-1 text-ink shadow-overlay [scrollbar-width:none]"
    style={{
      width: mode === "idle" && hasPrompt && typingWidth ? typingWidth : void 0,
      ...visible ? { animation: "pop-in 220ms var(--ease-out-quint) both" } : {}
    }}
  >
            <div
    ref={contentRef}
    className="mx-auto flex w-fit shrink-0 items-center justify-center gap-0.5"
    style={{
      width: mode === "idle" && hasPrompt && typingWidth ? typingWidth - 8 : void 0
    }}
  >
            {busy && <span role="status" className="inline-flex h-7 items-center gap-1.5 whitespace-nowrap px-2.5 text-body text-ink-2">
                <Spinner size={12} className="text-ink-2" />
                {mode === "thinking" ? <ShimmerLabel>{busyLabel}…</ShimmerLabel> : <span>{busyLabel}…</span>}
              </span>}
            {mode === "result" && <>
                <button
    type="button"
    onClick={() => {
      onKeep?.(rewrite);
      reset();
    }}
    className={SA_primary}
  >
                  <Icon name="check" strokeWidth={1.8} />
                  Keep
                </button>
                <button
    type="button"
    onClick={() => {
      onDiscard?.();
      reset();
    }}
    className={SA_control}
  >
                  <Icon name="close" strokeWidth={1.8} />
                  Discard
                </button>
                <span className="mx-0.5 h-4 w-px shrink-0 bg-line" />
                <button
    type="button"
    aria-label="Try again"
    onClick={() => run(action)}
    className="flex size-7 shrink-0 items-center justify-center rounded-full text-ink-3 transition-[background-color,color,transform] duration-150 hover:bg-hover-2 hover:text-ink-2 active:scale-[0.96]"
  >
                  <Icon name="retry" strokeWidth={1.8} />
                </button>
              </>}
            {mode === "idle" && <>
                <div
    className="flex min-w-0 items-center overflow-hidden transition-[max-width,opacity,transform] duration-400"
    style={{
      maxWidth: expanded ? 0 : hasPrompt && typingWidth ? typingWidth - 40 : 145,
      opacity: expanded ? 0 : 1,
      transform: expanded ? "translateX(-8px)" : "translateX(0)",
      transitionTimingFunction: "var(--ease-out-quint)"
    }}
    {...inertWhen(expanded)}
  >
                  <form
    className="flex h-7 shrink-0 items-center transition-[width] duration-400"
    style={{
      width: hasPrompt && typingWidth ? typingWidth - 40 : 145,
      transitionTimingFunction: "var(--ease-out-quint)"
    }}
    onSubmit={(event) => {
      event.preventDefault();
      run(prompt.trim() || "Improve");
    }}
  >
                    <input
    value={prompt}
    onChange={(event) => {
      const next = event.target.value;
      if (!prompt.trim() && next.trim()) {
        setTypingWidth(
          Math.ceil(
            barRef.current?.getBoundingClientRect().width ?? 0
          )
        );
      } else if (!next.trim()) {
        setTypingWidth(null);
      }
      setPrompt(next);
    }}
    aria-label="Describe edits"
    placeholder="Describe edits"
    className="h-7 w-full bg-transparent pr-2.5 pl-3 text-caption text-ink outline-none placeholder:text-ink-3"
  />
                  </form>
                </div>
                <div
    className="flex min-w-0 items-center gap-0.5 overflow-hidden transition-[max-width,opacity,transform] duration-400"
    style={{
      maxWidth: hasPrompt ? 0 : expanded ? 462 : 224,
      opacity: hasPrompt ? 0 : 1,
      transform: hasPrompt ? "translateX(-8px)" : "translateX(0)",
      transitionTimingFunction: "var(--ease-out-quint)"
    }}
    {...inertWhen(hasPrompt)}
  >
                  {!expanded && <span className="mx-1 h-4 w-px shrink-0 bg-line-strong" />}
                  <button
    type="button"
    onClick={() => run("Explain")}
    className={SA_control}
  >
                    <Icon name="message-question" strokeWidth={1.8} />
                    Explain
                  </button>
                  <button
    type="button"
    onClick={() => run("Improve")}
    className={SA_control}
  >
                    <Icon name="sparkles" strokeWidth={1.8} />
                    Improve
                  </button>
                  <div
    className="flex min-w-0 items-center gap-0.5 overflow-hidden transition-[max-width,opacity,margin] duration-400"
    style={{
      maxWidth: expanded ? 262 : 0,
      opacity: expanded ? 1 : 0,
      marginLeft: expanded ? 2 : 0,
      transitionTimingFunction: "var(--ease-out-quint)"
    }}
    {...inertWhen(!expanded)}
  >
                    {SA_QUICK_ACTIONS.map((quick) => <button
    key={quick.label}
    type="button"
    onClick={() => run(quick.label)}
    className={SA_control}
  >
                        <Icon name={quick.icon} strokeWidth={1.8} />
                        {"short" in quick ? quick.short : quick.label}
                      </button>)}
                  </div>
                  <span className="mx-0.5 h-4 w-px shrink-0 bg-line" />
                  <button
    type="button"
    aria-label={expanded ? "Show fewer actions" : "Show more actions"}
    aria-expanded={expanded}
    onClick={() => setExpanded((value) => !value)}
    className="flex size-7 shrink-0 items-center justify-center rounded-full text-ink transition-[background-color,transform] duration-150 hover:bg-hover active:scale-[0.96]"
  >
                    <span
    className="flex transition-transform duration-400"
    style={{
      transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
      transitionTimingFunction: "var(--ease-out-quint)"
    }}
  >
                      <Icon name="chevron-right" strokeWidth={1.8} />
                    </span>
                  </button>
                </div>
                <div
    className="flex min-w-0 items-center overflow-hidden transition-[max-width,opacity,transform] duration-400"
    style={{
      maxWidth: hasPrompt ? 30 : 0,
      opacity: hasPrompt ? 1 : 0,
      transform: hasPrompt ? "scale(1)" : "scale(0.88)",
      transitionTimingFunction: "var(--ease-out-quint)"
    }}
    {...inertWhen(!hasPrompt)}
  >
                  <SendButton
    round
    label="Send edit instruction"
    onClick={() => run(prompt.trim() || "Improve")}
  />
                </div>
              </>}
            </div>
          </div>
        </div>
      </div>
    </div>;
}

/* ═══════════ ChatThread ═══════════ */

/* ══ accent (mirrored from preview.html) ══ */
const TH_OVERRIDE_ID = "ds-accent-override";
const TH_LIGHT_ANCHOR = "#ffffff";
const TH_DARK_ANCHOR = "#262626";
const TH_MIN_CONTRAST = 4.5;
function TH_hexToRgb(hex) {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const value = parseInt(match[1], 16);
  return { r: value >> 16 & 255, g: value >> 8 & 255, b: value & 255 };
}
const TH_toHex = ({ r, g, b }) => `#${[r, g, b].map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("")}`;
function TH_luminance({ r, g, b }) {
  const channel = (value) => {
    const scaled = value / 255;
    return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}
function TH_contrast(a, b) {
  const la = TH_luminance(a);
  const lb = TH_luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
function TH_rgbToHsl({ r, g, b }) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === rn ? ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6 : max === gn ? ((bn - rn) / d + 2) / 6 : ((rn - gn) / d + 4) / 6;
  return { h, s, l };
}
function TH_hslToRgb({ h, s, l }) {
  if (s === 0) return { r: l * 255, g: l * 255, b: l * 255 };
  const hue = (p2, q2, t) => {
    let tn = t;
    if (tn < 0) tn += 1;
    if (tn > 1) tn -= 1;
    if (tn < 1 / 6) return p2 + (q2 - p2) * 6 * tn;
    if (tn < 1 / 2) return q2;
    if (tn < 2 / 3) return p2 + (q2 - p2) * (2 / 3 - tn) * 6;
    return p2;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: hue(p, q, h + 1 / 3) * 255,
    g: hue(p, q, h) * 255,
    b: hue(p, q, h - 1 / 3) * 255
  };
}
function TH_fitContrast(color, anchor, direction) {
  const hsl = TH_rgbToHsl(color);
  let rounded = color;
  for (let step = 0; step <= 100; step += 1) {
    const candidate = TH_hslToRgb({
      ...hsl,
      l: Math.min(1, Math.max(0, hsl.l + direction * step * 0.01))
    });
    rounded = {
      r: Math.round(candidate.r),
      g: Math.round(candidate.g),
      b: Math.round(candidate.b)
    };
    if (TH_contrast(rounded, anchor) >= TH_MIN_CONTRAST) return rounded;
  }
  return rounded;
}
function deriveAccentVariants(color) {
  const rgb = TH_hexToRgb(color);
  if (!rgb) return null;
  const lightAnchor = TH_hexToRgb(TH_LIGHT_ANCHOR);
  const darkAnchor = TH_hexToRgb(TH_DARK_ANCHOR);
  return {
    light: TH_toHex(TH_fitContrast(rgb, lightAnchor, -1)),
    dark: TH_toHex(TH_fitContrast(rgb, darkAnchor, 1))
  };
}
function setAccent(color) {
  if (typeof document === "undefined") return null;
  const existing = document.getElementById(TH_OVERRIDE_ID);
  if (!color) {
    existing?.remove();
    return null;
  }
  const variants = deriveAccentVariants(color);
  if (!variants) return null;
  const element = existing ?? document.createElement("style");
  element.id = TH_OVERRIDE_ID;
  element.textContent = `:root:root:root:root { --accent: ${variants.light}; }
:root:root:root:root[data-theme="dark"] { --accent: ${variants.dark}; }`;
  if (!existing) document.head.appendChild(element);
  return variants;
}
function useAccent() {
  const [accent, setAccentState] = useState(() => { try { return localStorage.getItem("ds-accent") || ""; } catch { return ""; } });
  useEffect(() => {
    setAccent(accent || null);
    try { accent ? localStorage.setItem("ds-accent", accent) : localStorage.removeItem("ds-accent"); } catch {}
  }, [accent]);
  return [accent, setAccentState];
}

/* ═══════════ Calendar ═══════════ */
const CAL_atMidnight = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const CAL_sameDay = (a, b) => !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
function Calendar({
  mode = "single",
  value,
  defaultValue,
  onChange,
  rangeValue,
  defaultRange,
  onRangeChange,
  min,
  max,
  weekStartsOn = 1,
  autoFocus = false,
  className = ""
} = {}) {
  const id = useId();
  const [internal, setInternal] = useState(defaultValue ?? null);
  const selected = value !== void 0 ? value : internal;
  const [internalRange, setInternalRange] = useState(
    defaultRange ?? { from: null, to: null }
  );
  const range = rangeValue !== void 0 ? rangeValue : internalRange;
  const [hovered, setHovered] = useState(null);
  const [focusDate, setFocusDate] = useState(
    () => CAL_atMidnight((mode === "range" ? range.from : selected) ?? /* @__PURE__ */ new Date())
  );
  const shouldFocus = useRef(autoFocus);
  const year = focusDate.getFullYear();
  const month = focusDate.getMonth();
  const dayId = (date) => `${id}-${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  useEffect(() => {
    if (!shouldFocus.current) return;
    document.getElementById(dayId(focusDate))?.focus();
  }, [focusDate]);
  const isDisabled = (date) => min !== void 0 && date < CAL_atMidnight(min) || max !== void 0 && date > CAL_atMidnight(max);
  const moveDays = (days) => {
    shouldFocus.current = true;
    setFocusDate((current) => new Date(current.getFullYear(), current.getMonth(), current.getDate() + days));
  };
  const moveMonth = (delta, focusGrid) => {
    shouldFocus.current = focusGrid;
    setFocusDate((current) => {
      const lastOfTarget = new Date(current.getFullYear(), current.getMonth() + delta + 1, 0).getDate();
      return new Date(current.getFullYear(), current.getMonth() + delta, Math.min(current.getDate(), lastOfTarget));
    });
  };
  const commitRange = (next) => {
    if (rangeValue === void 0) setInternalRange(next);
    onRangeChange?.(next);
  };
  const select = (date) => {
    if (isDisabled(date)) return;
    if (mode === "range") {
      if (!range.from || range.to) commitRange({ from: date, to: null });
      else if (date < range.from) commitRange({ from: date, to: range.from });
      else commitRange({ from: range.from, to: date });
      return;
    }
    if (value === void 0) setInternal(date);
    onChange?.(date);
  };
  const previewCandidate = hovered ?? focusDate;
  const previewEnd = mode === "range" && range.from && !range.to && previewCandidate > range.from && !isDisabled(previewCandidate) ? previewCandidate : null;
  const bandEnd = range.to ?? previewEnd;
  const onKeyDown = (event) => {
    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault();
        moveDays(-1);
        break;
      case "ArrowRight":
        event.preventDefault();
        moveDays(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        moveDays(-7);
        break;
      case "ArrowDown":
        event.preventDefault();
        moveDays(7);
        break;
      case "PageUp":
        event.preventDefault();
        moveMonth(-1, true);
        break;
      case "PageDown":
        event.preventDefault();
        moveMonth(1, true);
        break;
      case "Home": {
        event.preventDefault();
        const column = (focusDate.getDay() - weekStartsOn + 7) % 7;
        moveDays(-column);
        break;
      }
      case "End": {
        event.preventDefault();
        const column = (focusDate.getDay() - weekStartsOn + 7) % 7;
        moveDays(6 - column);
        break;
      }
      case "Enter":
      case " ":
        event.preventDefault();
        select(focusDate);
        break;
    }
  };
  const firstColumn = (new Date(year, month, 1).getDay() - weekStartsOn + 7) % 7;
  const total = new Date(year, month + 1, 0).getDate();
  const cells = [
    ...Array.from({ length: firstColumn }, () => null),
    ...Array.from({ length: total }, (_, index) => new Date(year, month, index + 1))
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = [];
  for (let index = 0; index < cells.length; index += 7) weeks.push(cells.slice(index, index + 7));
  const monthLabel = new Intl.DateTimeFormat(void 0, { month: "long", year: "numeric" }).format(focusDate);
  const narrow = new Intl.DateTimeFormat(void 0, { weekday: "narrow" });
  const long = new Intl.DateTimeFormat(void 0, { weekday: "long" });
  const weekdays = Array.from({ length: 7 }, (_, index) => {
    const reference = new Date(2024, 0, 7 + weekStartsOn + index);
    return { short: narrow.format(reference), full: long.format(reference) };
  });
  const today = CAL_atMidnight(/* @__PURE__ */ new Date());
  return <div className={`w-fit select-none ${className}`}>
      <div className="flex items-center justify-between gap-2 pb-2">
        <IconButton label="Previous month" onClick={() => moveMonth(-1, false)} className="text-ink-3 hover:bg-hover hover:text-ink">
          <Icon name="chevron-left" size={14} strokeWidth={2} />
        </IconButton>
        <span aria-live="polite" className="text-caption font-medium text-ink">
          {monthLabel}
        </span>
        <IconButton label="Next month" onClick={() => moveMonth(1, false)} className="text-ink-3 hover:bg-hover hover:text-ink">
          <Icon name="chevron-right" size={14} strokeWidth={2} />
        </IconButton>
      </div>
      <div
    role="grid"
    aria-label={monthLabel}
    onKeyDown={onKeyDown}
    onMouseLeave={mode === "range" ? () => setHovered(null) : void 0}
    className="mx-auto w-max"
  >
        {
    /* range mode drops the gaps so the band reads as one piece */
  }
        <div role="row" className={`grid grid-cols-7 pb-1 ${mode === "range" ? "gap-0" : "gap-1"}`}>
          {weekdays.map((weekday, index) => <span key={index} role="columnheader" aria-label={weekday.full} className="flex size-8 items-center justify-center text-micro font-medium text-ink-3 uppercase">
              <span aria-hidden>{weekday.short}</span>
            </span>)}
        </div>
        {weeks.map((week, weekIndex) => <div key={weekIndex} role="row" className={`grid grid-cols-7 ${mode === "range" ? "gap-0" : "gap-1"}`}>
            {week.map((day, dayIndex) => {
    if (!day) return <span key={dayIndex} className="size-8" />;
    const isToday = CAL_sameDay(day, today);
    const dayDisabled = isDisabled(day);
    const isStart = mode === "range" && CAL_sameDay(day, range.from);
    const isEnd = mode === "range" && CAL_sameDay(day, range.to);
    const inBand = mode === "range" && !!range.from && !!bandEnd && day > range.from && day < bandEnd;
    const isPreviewEnd = mode === "range" && !range.to && CAL_sameDay(day, previewEnd);
    const isSelected = mode === "range" ? isStart || isEnd : CAL_sameDay(day, selected);
    const shape = mode === "range" ? isStart && isEnd || isStart && !range.to && !previewEnd ? "rounded-control" : isStart ? "rounded-l-control rounded-r-none" : isEnd ? "rounded-r-control rounded-l-none" : inBand || isPreviewEnd ? "rounded-none" : "rounded-control" : "rounded-control";
    return <button
      key={dayIndex}
      type="button"
      role="gridcell"
      id={dayId(day)}
      aria-selected={isSelected || inBand && range.to !== null}
      aria-disabled={dayDisabled || void 0}
      tabIndex={CAL_sameDay(day, focusDate) ? 0 : -1}
      onMouseEnter={mode === "range" && !dayDisabled ? () => setHovered(day) : void 0}
      onClick={() => {
        shouldFocus.current = true;
        setFocusDate(day);
        select(day);
      }}
      className={`flex size-8 items-center justify-center text-caption tabular-nums transition-colors duration-150 ${shape} ${isSelected ? "bg-ink font-medium text-canvas" : dayDisabled ? "cursor-default text-ink-3 opacity-40" : inBand || isPreviewEnd ? "bg-accent-tint text-ink" : "text-ink hover:bg-hover"} ${isToday && !isSelected ? "font-medium shadow-hairline" : ""}`}
    >
                  {day.getDate()}
                </button>;
  })}
          </div>)}
      </div>
    </div>;
}


/* ═══════════ StreamingText ═══════════ */
const WORD_MS = 55;
const HOLD_MS = 3400;
const STREAM_TOKENS = [
  ..."Pistachio is your fastest-growing flavor — sales are up 23% this month and margins beat vanilla by 8 points.".split(" ").map((text) => ({ text })),
  { text: "", cite: true },
  ..."Stone-fruit flavors are trending in the same range.".split(" ").map((text) => ({ text })),
];
const FOLLOW_UPS = ["Which flavors sell best in winter", "Compare gelato and soft serve margins"];
const SOURCE_IMAGES = {
  scoop: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='16' fill='%231f7a5f'/%3E%3Cpath d='M20 36c0 7 5.4 12 12 12s12-5 12-12H20Z' fill='%23fff'/%3E%3Ccircle cx='32' cy='25' r='11' fill='%23bff3dd'/%3E%3Cpath d='M24 24c4-7 13-7 17 0' fill='none' stroke='%231f7a5f' stroke-width='4' stroke-linecap='round'/%3E%3C/svg%3E",
  trends: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='16' fill='%232f6fec'/%3E%3Cpath d='M15 43 27 31l8 7 14-18' fill='none' stroke='%23fff' stroke-width='7' stroke-linecap='round' stroke-linejoin='round'/%3E%3Ccircle cx='49' cy='20' r='5' fill='%23bfe0ff'/%3E%3C/svg%3E",
  market: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='16' fill='%23e56d24'/%3E%3Cpath d='M17 45V25h8v20h-8Zm11 0V16h8v29h-8Zm11 0V30h8v15h-8Z' fill='%23fff'/%3E%3Cpath d='M16 49h32' stroke='%23ffd6b8' stroke-width='4' stroke-linecap='round'/%3E%3C/svg%3E",
};
const SOURCES = [
  { name: "Scoop Data", domain: "scoopdata.io", href: "https://scoopdata.io/", image: SOURCE_IMAGES.scoop },
  { name: "Trends Index", domain: "trends.google.com", href: "https://trends.google.com/trends/", image: SOURCE_IMAGES.trends },
  { name: "Market Basket", domain: "marketbasket.io", href: "https://marketbasket.io/", image: SOURCE_IMAGES.market },
];
function SourceChip() {
  const source = SOURCES[0];
  return (
    <Chip as="a" tone="inset" size="xs" mono href={source.href} target="_blank" rel="noreferrer"
      className="ml-0 mr-1 translate-y-[-1px] align-middle hover:bg-hover hover:text-ink"
      style={{ animation: "pop-in 250ms var(--ease-out-quint) both" }}>
      <img src={source.image} alt="" className="source-avatar size-3 rounded-[3px]" />
      <span>{source.domain}</span>
    </Chip>
  );
}
const ACTION_ICONS = [
  <g key="copy"><rect x="9" y="9" width="12" height="12" rx="2.5" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></g>,
  <path key="retry" d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" />,
  <path key="up" d="M7 10v12M15 5.88L14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88z" />,
  <path key="down" d="M17 14V2M9 18.12L10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88z" />,
];
function StreamingText({ loop = true, fill = false }) {
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const { count, done } = useStream(STREAM_TOKENS.length, { intervalMs: WORD_MS, holdMs: HOLD_MS, loop });
  return (
    <div className={fill ? "w-full" : "min-h-[15.5rem] w-full max-w-95"}>
      <p className="text-body leading-relaxed text-ink" aria-live="polite" aria-busy={!done}>
        {STREAM_TOKENS.slice(0, count).map((token, i) =>
          token.cite ? (
            <SourceChip key={i} />
          ) : (
            <span key={i} className="inline [will-change:filter,opacity]"
              style={{ animation: "stream-in 420ms var(--ease-out-quint) both" }}>
              {token.text}{" "}
            </span>
          ),
        )}
        {!done && <StreamCaret />}
      </p>
      <div className="mt-2 flex items-center gap-0.5 transition-opacity duration-400"
        style={{ opacity: done ? 1 : 0, pointerEvents: done ? "auto" : "none" }}>
        {ACTION_ICONS.map((icon, i) => (
          <IconButton key={i} label="Action" className="text-ink-3 hover:bg-hover-2 hover:text-ink-2">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
          </IconButton>
        ))}
        <button type="button" aria-expanded={sourcesOpen} onClick={() => setSourcesOpen((current) => !current)}
          className="ml-1.5 flex items-center gap-1.5 rounded-sm px-1 py-0.5 text-left transition-colors duration-150 hover:bg-hover">
          <AvatarStack srcs={SOURCES.map((source) => source.image)} />
          <span className="text-small text-ink-2">10 sources</span>
        </button>
      </div>
      <Disclosure open={done && sourcesOpen} innerClassName="overflow-hidden">
          <div className="mt-1.5 flex flex-col rounded-md bg-inset p-1 shadow-hairline">
            {SOURCES.map((source) => (
              <a key={source.domain} href={source.href} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 rounded-sm px-1.5 py-1 text-small text-ink-2 transition-colors duration-150 hover:bg-hover hover:text-ink">
                <img src={source.image} alt="" className="source-avatar size-4 rounded-[4px]" />
                <span className="animated-underline">{source.name}</span>
                <span className="ml-auto font-mono text-micro text-ink-3">{source.domain}</span>
              </a>
            ))}
          </div>
      </Disclosure>
      <div className="mt-2.5 transition-opacity duration-400" style={{ opacity: done ? 1 : 0, pointerEvents: done ? "auto" : "none" }}>
        <p className="text-small font-medium text-ink-2">Follow-ups</p>
        <div className="mt-0.5 flex flex-col">
          {FOLLOW_UPS.map((text, i) => (
            <button key={text}
              className="-mx-1.5 flex items-center gap-2 rounded-sm border-b border-line px-1.5 py-1.5 text-left text-caption text-ink transition-colors duration-150 hover:bg-hover-2"
              style={done ? fadeUp(i, { duration: 350, stagger: 90 }) : { opacity: 0 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <path d="M9 10l-5 5 5 5" /><path d="M20 4v7a4 4 0 0 1-4 4H4" />
              </svg>
              {text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════ Button ═══════════ */
const BTN_VARIANTS = {
  primary: "bg-ink text-canvas enabled:hover:opacity-90",
  secondary: "bg-surface text-ink shadow-btn enabled:hover:bg-hover",
  outline: "border border-line-strong text-ink enabled:hover:bg-hover",
  ghost: "text-ink-2 enabled:hover:bg-hover-2 enabled:hover:text-ink",
  link: "animated-underline !px-1 text-accent enabled:hover:opacity-90 disabled:pointer-events-none",
  destructive: "bg-red text-canvas enabled:hover:opacity-90",
  "destructive-soft": "bg-red-tint text-red enabled:hover:opacity-85",
  accent: "bg-accent text-canvas enabled:hover:opacity-90",
  "accent-soft": "bg-accent-tint text-accent enabled:hover:opacity-85",
  success: "bg-green text-canvas enabled:hover:opacity-90"
};
const BTN_SIZES = {
  xs: "h-6 gap-1 px-2 text-tiny [&_svg]:size-3",
  sm: "h-8 gap-1.5 px-3 text-caption [&_svg]:size-3.5",
  md: "h-9 gap-2 px-3.5 text-body [&_svg]:size-3.5",
  lg: "h-10 gap-2 px-4 text-lead [&_svg]:size-4"
};
function Button({
  children = "Button",
  variant = "primary",
  size = "md",
  shape = "square",
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
  iconEnd,
  href,
  target,
  type = "button",
  className = "",
  style,
  onClick,
  ...rest
}) {
  const classes = `${fullWidth ? "flex w-full" : "inline-flex"} items-center justify-center font-medium leading-none corner-smooth
    ${shape === "pill" ? "rounded-full" : "rounded-control"}
    transition-[background-color,color,box-shadow,opacity,transform] duration-150
    enabled:active:scale-[0.97] disabled:cursor-default disabled:opacity-45
    ${BTN_SIZES[size]} ${BTN_VARIANTS[variant]} ${className}`;
  const content = <>
      {loading ? <Spinner /> : icon && <span aria-hidden className="shrink-0">{icon}</span>}
      <span className="optical-text">{children}</span>
      {!loading && iconEnd && <span aria-hidden className="shrink-0">{iconEnd}</span>}
    </>;
  if (href !== void 0 && !disabled) {
    return <a
      {...rest}
      href={href}
      target={target}
      rel={target === "_blank" ? "noreferrer" : void 0}
      aria-busy={loading || void 0}
      aria-disabled={loading || void 0}
      onClick={(event) => {
        if (loading) {
          event.preventDefault();
          return;
        }
        onClick?.();
      }}
      className={classes.replaceAll("enabled:", "")}
      style={style}
    >
        {content}
      </a>;
  }
  return <button
    {...rest}
    type={type}
    disabled={disabled}
    aria-busy={loading || void 0}
    aria-disabled={loading || void 0}
    onClick={(event) => {
      if (loading) {
        event.preventDefault();
        return;
      }
      onClick?.();
    }}
    className={classes}
    style={style}
  >
      {content}
    </button>;
}

/* ═══════════ ChatComposer ═══════════ */
const CC_TABS = ["Flavors", "Suppliers"];
const CC_ACTIONS = [
  { name: "plus", label: "New chat" },
  { name: "clock", label: "History" },
  { name: "ellipsis", label: "More options" },
];
const CC_REPLIES = [
  { label: "Sales History", sub: "Flavor Data", time: "4s", body: "Pulled 3 summers of mint chip sales for comparison." },
  { label: "Comparison", sub: "Trend Detection", time: "2s", body: "Mint chip is up 12% with stronger weekend peaks." },
];
function ReplySection({ label, sub, time, body, resolving }) {
  return (
    <div
      className="flex w-full flex-col gap-1.5 transition-[opacity,filter,transform] duration-400"
      style={{
        opacity: resolving ? 0.55 : 1,
        filter: resolving ? "blur(0.5px)" : "blur(0)",
        transform: resolving ? "scale(0.985)" : "scale(1)",
        transformOrigin: "top left",
        transitionTimingFunction: "var(--ease-out-quint)",
        ...fadeUp(0, { duration: 400 }),
      }}
    >
      <div className="flex items-center gap-1 text-small leading-[1.3]">
        <span className="font-medium text-ink">{label}</span>
        <span className="text-ink-2">{sub}</span>
        <span className="text-ink">for {time}</span>
      </div>
      <p className="text-body leading-normal text-ink">{body}</p>
    </div>
  );
}
function ChatComposer({ tabs = CC_TABS, placeholder = "Prompt or tag a flavor with @", initialMessage = "Compare mint chip to last summer", replies = CC_REPLIES, onSend }) {
  const [phase, setPhase] = useState(initialMessage ? "done" : "idle");
  const [draft, setDraft] = useState("");
  const [submitted, setSubmitted] = useState(initialMessage);
  const [tab, setTab] = useState(tabs[0]);
  const inputRef = useRef(null);
  useEffect(() => {
    let t;
    if (phase === "sent") t = setTimeout(() => setPhase("reply1"), 500);
    else if (phase === "reply1") t = setTimeout(() => setPhase("reply2"), 1400);
    else if (phase === "reply2") t = setTimeout(() => setPhase("done"), 1200);
    else return;
    return () => clearTimeout(t);
  }, [phase]);
  const sent = phase !== "idle";
  const canSend = draft.trim().length > 0;
  const send = () => {
    if (!canSend) return;
    const text = draft.trim();
    setSubmitted(text);
    onSend?.(text);
    setDraft("");
    setPhase("sent");
  };
  return (
    <Card className="flex h-[288px] w-full max-w-95 flex-col self-start">
      <div className="flex shrink-0 items-center justify-between border-b border-line p-1.5">
        <div className="flex items-center">
          {tabs.map((item) => (
            <button key={item} type="button" aria-pressed={tab === item} onClick={() => setTab(item)}
              className={`rounded-sm px-2 py-[3px] text-body text-ink transition-[background-color,opacity] duration-150 ${tab === item ? "bg-field" : "opacity-50 hover:opacity-75"}`}>
              {item}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {CC_ACTIONS.map(({ name, label }) => (
            <IconButton key={name} label={label} className="text-ink-3 hover:bg-hover hover:text-ink-2">
              <Icon name={name} size={15} strokeWidth={2} />
            </IconButton>
          ))}
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-3 pt-2.5 pb-1">
        <div className="flex justify-end pl-14">
          <div className="rounded-md bg-field px-3 py-1.5 text-body leading-[1.4] text-ink transition-[opacity,transform] duration-300"
            style={{ opacity: sent ? 1 : 0, transform: sent ? "translateY(0)" : "translateY(10px)", transitionTimingFunction: "var(--ease-out-quint)" }}>
            {submitted}
          </div>
        </div>
        <div aria-live="polite" className="contents">
          {(phase === "reply1" || phase === "reply2" || phase === "done") && replies[0] ? (
            <ReplySection {...replies[0]} />
          ) : null}
          {(phase === "reply2" || phase === "done") && replies[1] ? (
            <ReplySection {...replies[1]} resolving={phase === "reply2"} />
          ) : null}
        </div>
      </div>
      <div className="mt-auto shrink-0 p-1.5">
        <div role="presentation" onClick={() => inputRef.current?.focus()}
          className="primitive-field flex cursor-text flex-col gap-2 rounded-control border border-line bg-field p-2.5">
          <input ref={inputRef} value={draft} onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter" && !event.nativeEvent.isComposing) send(); }}
            placeholder={placeholder} aria-label="Chat prompt"
            className="min-h-4.5 bg-transparent text-body leading-[1.4] text-ink outline-none placeholder:text-ink-3" />
          <div className="flex items-center justify-end">
            <SendButton enabled={canSend} onClick={send} />
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ══ Landing page app — accent picker + live hero mounts ══ */
/* Every preset shares Lime green's properties — saturation 75%, lightness
   52% — with hues spread >= 40° apart, so the row reads as one family. The
   accent engine fits each seed to AA per mode, so vivid seeds are correct
   here: light mode darkens them, dark mode keeps them. Lime is the default
   (hex "" = the token), and the swatch shows the dark value because the
   landing page is dark-first. */
const ACCENT_PRESETS = [
  { hex: "", swatch: "#a5e12a", label: "Lime green (default)" },
  { hex: "#e0a329", swatch: "#e0a329", label: "Amber" },
  { hex: "#29e0c2", swatch: "#29e0c2", label: "Teal" },
  { hex: "#2985e0", swatch: "#2985e0", label: "Azure" },
  { hex: "#9429e0", swatch: "#9429e0", label: "Violet" },
  { hex: "#e02985", swatch: "#e02985", label: "Magenta" },
  { hex: "#ffffff", swatch: "#ffffff", label: "Mono" },
];

function AccentPicker() {
  const [accent, setAccentHex] = useAccent();
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <span className="text-small font-medium text-ink-2">Pick an accent:</span>
      {ACCENT_PRESETS.map((preset) => (
        <button
          key={preset.label}
          type="button"
          aria-label={preset.label}
          aria-pressed={accent === preset.hex}
          onClick={() => setAccentHex(preset.hex)}
          className={`h-6 w-11 rounded-capsule transition-transform duration-150 hover:scale-105 ${
            accent === preset.hex ? "outline-2 outline-offset-2 outline-line-strong outline" : "shadow-hairline"
          }`}
          style={{ background: preset.swatch }}
        />
      ))}
      <label
        className="flex h-6 w-11 cursor-pointer items-center justify-center rounded-capsule bg-field text-ink-2 shadow-hairline transition-transform duration-150 hover:scale-105"
        title="Custom color"
      >
        <Icon name="edit" size={12} strokeWidth={2} />
        <input
          type="color"
          className="sr-only"
          value={accent || "#3b5bdb"}
          onChange={(event) => setAccentHex(event.target.value)}
          aria-label="Custom accent color"
        />
      </label>
    </div>
  );
}

/* ── Morphing principle cards ───────────────────────────
 * Stack / grid / list, swipeable, expandable. Built on the
 * system's own tokens and easing: no motion library, no
 * second icon set (rules 1, 3, 4).
 * ─────────────────────────────────────────────────────── */
const PRINCIPLES = [
  {
    id: "tokens",
    icon: "layers",
    tone: "bg-accent-tint text-accent",
    title: "Tokens only",
    description: "No hardcoded colors, sizes, radii, shadows, or easings. Every component reads CSS variables, so themes and palettes come for free.",
  },
  {
    id: "contrast",
    icon: "circle-check",
    tone: "bg-green-tint text-green",
    title: "WCAG AA, everywhere",
    description: "Every text and UI pair is contrast-checked across light, dark, and all five palettes, automatically, on every change.",
  },
  {
    id: "type",
    icon: "typography",
    tone: "bg-orange-tint text-orange",
    title: "One type ramp",
    description: "Twelve integer steps on a 14px base, set in Urbanist. Medium is the working weight; semibold is the ceiling; bold never appears.",
  },
  {
    id: "qa",
    icon: "gear",
    tone: "bg-accent-tint text-accent",
    title: "A QA gate, not a wiki",
    description: "One script checks forbidden patterns, contrast, token drift, and compilation. Work is not done while it fails.",
  },
];

const LAYOUT_MODES = [
  { key: "stack", icon: "layers", label: "Stack" },
  { key: "grid", icon: "grid", label: "Grid" },
  { key: "list", icon: "lines", label: "List" },
];
const SWIPE_THRESHOLD = 56;

function PrincipleCards() {
  const [layout, setLayout] = useState("stack");
  const [activeIndex, setActiveIndex] = useState(0);
  const [expanded, setExpanded] = useState(null);
  const [drag, setDrag] = useState(0);
  const dragState = useRef({ startX: 0, active: false, moved: false });

  const count = PRINCIPLES.length;
  const advance = (step) => setActiveIndex((i) => (i + step + count) % count);

  const onPointerDown = (event) => {
    if (layout !== "stack") return;
    dragState.current = { startX: event.clientX, active: true, moved: false };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const onPointerMove = (event) => {
    if (!dragState.current.active) return;
    const dx = event.clientX - dragState.current.startX;
    if (Math.abs(dx) > 4) dragState.current.moved = true;
    setDrag(dx);
  };
  const onPointerUp = () => {
    if (!dragState.current.active) return;
    const dx = drag;
    dragState.current.active = false;
    setDrag(0);
    if (dx < -SWIPE_THRESHOLD) advance(1);
    else if (dx > SWIPE_THRESHOLD) advance(-1);
  };

  /* stack order: active card on top, the rest fanned behind it */
  const ordered = layout === "stack"
    ? Array.from({ length: count }, (_, i) => ({ ...PRINCIPLES[(activeIndex + i) % count], pos: i }))
    : PRINCIPLES.map((card, i) => ({ ...card, pos: i }));

  return (
    <div>
      {/* layout toggle — same segmented control the system uses */}
      <div className="mx-auto mb-6 flex w-fit items-center gap-0.5 rounded-control bg-field p-1 shadow-hairline">
        {LAYOUT_MODES.map((mode) => (
          <button
            key={mode.key}
            type="button"
            onClick={() => setLayout(mode.key)}
            aria-pressed={layout === mode.key}
            aria-label={`${mode.label} layout`}
            className={`corner-smooth flex h-7 items-center gap-1.5 rounded-sm px-2.5 text-small font-medium transition-colors duration-150 ${
              layout === mode.key ? "bg-surface text-ink shadow-btn" : "text-ink-3 hover:text-ink"
            }`}
          >
            <Icon name={mode.icon} size={14} strokeWidth={2} />
            {mode.label}
          </button>
        ))}
      </div>

      <div className={`principle-deck is-${layout}`}>
        {ordered.map((card) => {
          const isTop = layout === "stack" && card.pos === 0;
          const isOpen = expanded === card.id;
          const stacked = layout === "stack";
          const style = stacked
            ? {
                zIndex: count - card.pos,
                transform: `translate3d(${(isTop ? drag : 0) + card.pos * 10}px, ${card.pos * 10}px, 0) rotate(${(card.pos - 1) * 1.4}deg) scale(${isOpen ? 1.02 : 1 - card.pos * 0.02})`,
                opacity: card.pos > 2 ? 0 : 1,
                transition: dragState.current.active ? "none" : "transform 300ms var(--ease-out-quint), opacity 300ms var(--ease-out-quint)",
              }
            : { transition: "transform 300ms var(--ease-out-quint)", transform: isOpen ? "scale(1.01)" : "none" };
          return (
            <article
              key={card.id}
              onPointerDown={isTop ? onPointerDown : undefined}
              onPointerMove={isTop ? onPointerMove : undefined}
              onPointerUp={isTop ? onPointerUp : undefined}
              onPointerCancel={isTop ? onPointerUp : undefined}
              onClick={() => {
                if (dragState.current.moved) return;
                setExpanded(isOpen ? null : card.id);
              }}
              className={`principle-card${isOpen ? " is-open" : ""}${isTop ? " is-top" : ""}`}
              style={style}
            >
              <div className="flex items-start gap-3">
                <span className={`corner-smooth flex size-8 shrink-0 items-center justify-center rounded-control ${card.tone}`}>
                  <Icon name={card.icon} size={16} strokeWidth={2} />
                </span>
                <div className="min-w-0">
                  <h3 className="text-lead font-semibold text-ink">{card.title}</h3>
                  <p className={`mt-1 text-caption text-ink-2 ${isOpen || layout === "stack" ? "" : "principle-clamp"}`}>
                    {card.description}
                  </p>
                </div>
              </div>
              {isTop ? (
                <span className="mt-auto pt-3 text-center text-micro text-ink-3">Drag or use the dots to flip through</span>
              ) : null}
            </article>
          );
        })}
      </div>

      {layout === "stack" ? (
        <div className="mt-5 flex justify-center gap-1.5">
          {PRINCIPLES.map((card, index) => (
            <button
              key={card.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`Show ${card.title}`}
              aria-current={index === activeIndex}
              className={`h-1.5 rounded-full transition-all duration-150 ${
                index === activeIndex ? "w-5 bg-accent" : "w-1.5 bg-line-strong hover:bg-ink-3"
              }`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

const CHAT_REPLIES = [
  "Formic ships tokens first, so every component reads CSS variables instead of hardcoded values. Change one token and the whole page follows.",
  "The AI surface is the point: chat threads, prompt bars, streaming text, agent traces, approvals. The everyday controls around them match to the pixel.",
  "Contrast is checked by a script across light, dark and five palettes. If a pair drops under AA, the gate fails and the work is not done.",
  "Copy the styles folder and the components you need, import one CSS stack, and compose. Two peer dependencies: React and Tabler icons.",
];

function ChatDemo() {
  const [messages, setMessages] = useState([
    { id: "m0", role: "assistant", text: "Ask me anything about Formic. This thread is running on the real PromptBar component.", done: true },
  ]);
  const [replyIndex, setReplyIndex] = useState(0);
  const endRef = useRef(null);
  const mounted = useRef(false);

  /* Keep the thread pinned to the newest message, but never move the page:
     this effect also runs on mount, and scrollIntoView walks up to the
     window, which was dragging the whole site down to the bento on load.
     Scroll the chat container itself instead. */
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    const box = endRef.current?.closest(".chat-scroll");
    if (box) box.scrollTop = box.scrollHeight;
  }, [messages]);

  const handleSend = (text) => {
    if (!text) return;
    const stamp = Date.now();
    const reply = CHAT_REPLIES[replyIndex % CHAT_REPLIES.length];
    setReplyIndex((i) => i + 1);
    setMessages((list) => [...list, { id: `u${stamp}`, role: "user", text, done: true }]);
    window.setTimeout(() => {
      setMessages((list) => [...list, { id: `a${stamp}`, role: "assistant", text: reply, done: false }]);
    }, 260);
  };

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="chat-scroll flex flex-col gap-2.5">
        {messages.map((message) =>
          message.role === "user" ? (
            <div key={message.id} className="flex justify-end">
              <span className="corner-smooth max-w-[85%] rounded-card bg-hover-2 px-3 py-2 text-caption text-ink">
                {message.text}
              </span>
            </div>
          ) : (
            <div key={message.id} className="flex gap-2.5">
              <span className="corner-smooth flex size-7 shrink-0 items-center justify-center rounded-chip bg-accent-tint text-accent">
                <Icon name="sparkles" size={14} strokeWidth={2} />
              </span>
              <span className="max-w-[85%] pt-0.5 text-caption text-ink-2">
                {message.done ? message.text : <StreamText text={message.text} intervalMs={26} />}
              </span>
            </div>
          ),
        )}
        <div ref={endRef} />
      </div>
      <div className="mt-auto">
        <PromptBar demo={false} placeholder="Ask about tokens, components, or the QA gate" onSend={handleSend} />
      </div>
    </div>
  );
}

function BentoCard({ label, span = "sp3", body = "", children }) {
  return (
    <div className={`bento-card ${span}${body ? ` ${body}` : ""}`}>
      <div className="bento-label">{label}</div>
      <div className="bento-body">{children}</div>
    </div>
  );
}

/* Bento grid on a 6-column base — asymmetric tiles sized to each
   component's natural shape. Everything visible; no overflow. */
function Bento() {
  return (
    <div className="bento">
      {/* three rows on the six column base */}
      <BentoCard label="ApprovalCard · answer it" span="sp2"><ApprovalCard /></BentoCard>
      <BentoCard label="TaskRows · agent progress" span="sp2"><TaskRows /></BentoCard>
      <BentoCard label="LoadingState · three variants" span="sp2">
        <div className="flex h-full flex-col justify-center gap-5 py-2">
          <LoadingState label="Indexing sources" variant="Orbit" />
          <LoadingState label="Churning" variant="Drive" />
          <LoadingState label="Thinking" variant="Dots" />
        </div>
      </BentoCard>
      <BentoCard label="SelectionActions · inline rewrite" span="sp3" body="body-center"><SelectionActions /></BentoCard>
      <BentoCard label="ChatComposer · tabs and replies" span="sp3" body="body-fill"><ChatComposer /></BentoCard>
      <BentoCard label="PromptBar · a working chat" span="sp3"><ChatDemo /></BentoCard>
      <BentoCard label="StreamingText · citations and follow ups" span="sp3"><StreamingText /></BentoCard>
    </div>
  );
}

function mount(id, element) {
  const node = document.getElementById(id);
  if (node) ReactDOM.createRoot(node).render(element);
}
if (typeof document !== "undefined") {
  mount("accent-picker", <AccentPicker />);
  mount("rail", <Bento />);
  mount("principles-cards", <PrincipleCards />);
}
