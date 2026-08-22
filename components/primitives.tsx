"use client";
import { useEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from "react";
import { createPortal } from "react-dom";
/* ─────────────────────────────────────────────────────────
 * PRIMITIVES — the atoms every component composes
 *
 *   Icon          shared stroke-icon set (chevron, check, …)
 *   Spinner       the one loading ring (currentColor)
 *   ShimmerLabel  gradient shimmer over a working label
 *   Chip          inline pill: tones field/surface/inset
 *   DiffStat      "+74 −41" green/red tabular counts
 *   IconButton    24px square hover button
 *   Disclosure    expand/collapse (grid-rows 0fr→1fr)
 *   Card          surface container (rounded-card + shadow)
 *   Badge         status pill: green/red/neutral tints
 *   RadioCheck    custom radio/checkbox visual
 *   AvatarStack   overlapping mini avatars
 *   Popover       fixed-position portal (Escape closes)
 *   fadeUp/popIn  staggered entrance style helpers
 *
 * Everything reads tokens only; no theme branching.
 * ───────────────────────────────────────────────────────── */

/* ── Motion helpers — staggered entrances ──────────────── */
type EntranceOpts = { duration?: number; stagger?: number; delay?: number };
const entrance = (name: string, index: number, { duration = 300, stagger = 80, delay = 0 }: EntranceOpts): CSSProperties => ({
  animation: `${name} ${duration}ms var(--ease-out-quint) ${delay + index * stagger}ms both`,
});
export const fadeUp = (index = 0, opts: EntranceOpts = {}) => entrance("fade-up", index, opts);
export const popIn = (index = 0, opts: EntranceOpts = {}) => entrance("pop-in", index, opts);

/* ── Icon ──────────────────────────────────────────────── */
export type IconName =
  | "chevron" | "check" | "close" | "search" | "retry"
  | "arrow-up" | "plus" | "clock" | "ellipsis"
  | "mic" | "file" | "clip" | "chart" | "layers" | "globe"
  | "lines" | "external";
const PATHS: Record<IconName, ReactNode> = {
  chevron: <path d="M6 9l6 6 6-6" />,
  check: <path d="M20 6L9 17l-5-5" />,
  close: <path d="M18 6L6 18M6 6l12 12" />,
  retry: <path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" />,
  "arrow-up": <path d="M12 19V5M5 12l7-7 7 7" />,
  plus: <path d="M12 5v14M5 12h14" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  ellipsis: (
    <g fill="currentColor" stroke="none">
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </g>
  ),
  mic: (
    <>
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3" />
    </>
  ),
  file: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </>
  ),
  clip: <path d="m21.4 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />,
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  layers: (
    <>
      <path d="M12 2 2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </>
  ),
  lines: <path d="M4 6h16M4 12h16M4 18h10" />,
  external: <path d="M7 17L17 7M7 7h10v10" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </>
  ),
};
export function Icon({
  name,
  size = 14,
  strokeWidth = 2.2,
  className,
  style,
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      aria-hidden
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      {PATHS[name]}
    </svg>
  );
}

/* ── Spinner ───────────────────────────────────────────── */
export function Spinner({ size = 12, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 rounded-full border-[1.5px] ${className}`}
      style={{
        width: size,
        height: size,
        animation: "spin 700ms linear infinite",
        borderColor: "color-mix(in srgb, currentColor 30%, transparent)",
        borderTopColor: "currentColor",
      }}
    />
  );
}

/* ── ShimmerLabel ──────────────────────────────────────── */
export function ShimmerLabel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`bg-clip-text text-body font-medium text-transparent ${className}`}
      style={{
        backgroundImage:
          "linear-gradient(90deg, var(--ink-3) 35%, var(--ink) 50%, var(--ink-3) 65%)",
        backgroundSize: "200% 100%",
        animation: "shimmer-text 1.4s linear infinite",
      }}
    >
      {children}
    </span>
  );
}

/* ── Chip ──────────────────────────────────────────────── */
export type ChipTone = "field" | "surface" | "inset";
export type ChipSize = "xs" | "sm" | "md";
const CHIP_TONES: Record<ChipTone, string> = {
  field: "bg-field text-ink-2 shadow-hairline",
  surface: "bg-surface text-ink shadow-btn",
  inset: "bg-inset text-ink-2 shadow-hairline",
};
const CHIP_SIZES: Record<ChipSize, string> = {
  xs: "h-4.5 gap-1 rounded-[5px] px-[3px] text-micro",
  sm: "h-5.5 rounded-chip px-1.5 text-tiny",
  md: "h-7 gap-1.5 rounded-chip px-2 text-tiny",
};
export function Chip({
  as: As = "span",
  tone = "field",
  size = "sm",
  mono = false,
  className = "",
  children,
  ...rest
}: {
  /** rendered element — "span" (default), "button", "a", … */
  as?: ElementType;
  tone?: ChipTone;
  size?: ChipSize;
  mono?: boolean;
  className?: string;
  children: ReactNode;
} & Record<string, unknown>) {
  return (
    <As
      className={`inline-flex items-center transition-colors duration-150
        ${CHIP_SIZES[size]} ${CHIP_TONES[tone]} ${mono ? "font-mono" : ""} ${className}`}
      {...rest}
    >
      {children}
    </As>
  );
}

/* ── DiffStat ──────────────────────────────────────────── */
export function DiffStat({ add, del = 0, className = "" }: { add: number; del?: number; className?: string }) {
  return (
    <span className={`shrink-0 font-mono text-tiny tabular-nums ${className}`}>
      <span className="text-green">+{add}</span>
      {del > 0 && <span className="text-red"> −{del}</span>}
    </span>
  );
}

/* ── IconButton ────────────────────────────────────────── */
export function IconButton({
  label,
  onClick,
  className = "",
  children,
  ...rest
}: {
  /** accessible name — required, the button has no text */
  label: string;
  onClick?: () => void;
  className?: string;
  children: ReactNode;
} & Record<string, unknown>) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`flex size-6 shrink-0 items-center justify-center rounded-sm
        transition-colors duration-150 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ── Card ──────────────────────────────────────────────── */
export function Card({
  className = "",
  children,
  ...rest
}: { className?: string; children: ReactNode } & Record<string, unknown>) {
  return (
    <div className={`overflow-hidden rounded-card bg-surface shadow-card ${className}`} {...rest}>
      {children}
    </div>
  );
}

/* ── Badge ─────────────────────────────────────────────── */
export type BadgeTone = "green" | "red" | "neutral";
const BADGE_TONES: Record<BadgeTone, string> = {
  green: "bg-green-tint text-green",
  red: "bg-red-tint text-red",
  neutral: "bg-inset text-ink-2",
};
export function Badge({
  tone = "neutral",
  /** skip the default sizing so the caller controls padding/type */
  free = false,
  className = "",
  style,
  children,
}: {
  tone?: BadgeTone;
  free?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium
        ${free ? "" : "h-5.5 px-2 text-tiny"} ${BADGE_TONES[tone]} ${className}`}
      style={style}
    >
      {children}
    </span>
  );
}

/* ── RadioCheck ────────────────────────────────────────── */
export function RadioCheck({ type, on }: { type: "radio" | "check"; on: boolean }) {
  return (
    <span
      className={`flex size-4 shrink-0 items-center justify-center transition-colors duration-200
        ${type === "radio" ? "rounded-full" : "rounded-[5px]"}
        ${on ? "bg-ink text-canvas" : "shadow-[inset_0_0_0_1.5px_var(--line-strong)] text-transparent"}`}
    >
      {type === "radio" ? (
        <span
          className="size-1.5 rounded-full bg-canvas transition-transform duration-200"
          style={{ transform: on ? "scale(1)" : "scale(0)" }}
        />
      ) : (
        <Icon name="check" size={12} strokeWidth={3} />
      )}
    </span>
  );
}

/* ── AvatarStack ───────────────────────────────────────── */
export function AvatarStack({ srcs, className = "" }: { srcs: string[]; className?: string }) {
  return (
    <span className={`flex -space-x-1 ${className}`}>
      {srcs.map((src, i) => (
        <img
          key={i}
          src={src}
          alt=""
          className="source-avatar size-3.5 rounded-full bg-surface shadow-[0_0_0_1.5px_var(--canvas)]"
        />
      ))}
    </span>
  );
}

/* ── Popover ───────────────────────────────────────────── */
export function Popover({
  x,
  top,
  bottom,
  id,
  role = "tooltip",
  className = "w-72",
  onClose,
  onMouseEnter,
  onMouseLeave,
  children,
}: {
  x: number;
  top?: number;
  bottom?: number;
  id?: string;
  role?: string;
  className?: string;
  /** called on Escape — WCAG 1.4.13 dismissibility */
  onClose?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!onClose) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      id={id}
      role={role}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`fixed z-50 overflow-hidden rounded-md bg-surface shadow-overlay ${className}`}
      style={{
        left: x,
        top,
        bottom,
        animation: "pop-in 160ms var(--ease-out-quint) both",
        transformOrigin: top === undefined ? "bottom left" : "top left",
      }}
    >
      {children}
    </div>,
    document.body,
  );
}

/* ── SendButton ────────────────────────────────────────── */
export function SendButton({
  enabled = true,
  label = "Send",
  round = false,
  className = "",
  onClick,
}: {
  enabled?: boolean;
  /** accessible name — describes what sending does right now */
  label?: string;
  /** fully round (for pill-shaped surfaces) instead of rounded-control */
  round?: boolean;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={!enabled}
      onClick={onClick}
      className={`flex size-7 shrink-0 items-center justify-center ${round ? "rounded-full" : "rounded-control"}
        transition-[background-color,color,transform] duration-200 enabled:active:scale-[0.96] ${className}`}
      style={{
        background: enabled ? "var(--ink)" : "var(--field)",
        color: enabled ? "var(--surface)" : "var(--ink-3)",
        boxShadow: enabled ? "var(--highlight-raised)" : "var(--shadow-btn)",
      }}
    >
      <Icon name="arrow-up" strokeWidth={2.5} />
    </button>
  );
}

/* ── GlideMenu ─────────────────────────────────────────── */
/* A single highlight glides to the hovered row instead of each
 * row toggling its own background. Mark rows with data-menu-row. */
export function GlideMenu({
  className = "",
  highlightClassName = "inset-x-0 rounded-control bg-hover",
  children,
}: {
  className?: string;
  /** position/shape of the gliding highlight */
  highlightClassName?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ top: number; height: number } | null>(null);
  const [engaged, setEngaged] = useState(false);
  return (
    <div
      ref={ref}
      className={`relative ${className}`}
      onMouseLeave={() => setEngaged(false)}
      onMouseOver={(event) => {
        const row = (event.target as Element).closest("[data-menu-row]") as HTMLElement | null;
        if (row && ref.current?.contains(row)) {
          setBox({ top: row.offsetTop, height: row.offsetHeight });
          setEngaged(true);
        }
      }}
    >
      <span
        aria-hidden
        className={`pointer-events-none absolute ${highlightClassName}`}
        style={{
          top: box?.top ?? 0,
          height: box?.height ?? 0,
          opacity: box && engaged ? 1 : 0,
          transition:
            "top 220ms var(--ease-out-quint), height 220ms var(--ease-out-quint), opacity 150ms ease",
        }}
      />
      {children}
    </div>
  );
}

/* ── Disclosure ────────────────────────────────────────── */
export function Disclosure({
  open,
  duration = 300,
  live = false,
  className = "",
  innerClassName = "min-h-0 overflow-hidden",
  children,
}: {
  open: boolean;
  /** transition duration in ms */
  duration?: number;
  /** announce revealed content to screen readers */
  live?: boolean;
  className?: string;
  /** the clipping wrapper — override to adjust padding/margins */
  innerClassName?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`grid transition-[grid-template-rows,opacity] ${className}`}
      style={{
        gridTemplateRows: open ? "1fr" : "0fr",
        opacity: open ? 1 : 0,
        transitionDuration: `${duration}ms`,
        transitionTimingFunction: "var(--ease-out-quint)",
      }}
    >
      {/* inert while closed so hidden interactive content is unreachable */}
      <div className={innerClassName} aria-live={live ? "polite" : undefined} {...(open ? {} : { inert: "" })}>
        {children}
      </div>
    </div>
  );
}
