"use client";
import { cloneElement, isValidElement, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ElementType, type ReactElement, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  IconAlertCircle, IconAlignLeft, IconArrowUp, IconArrowUpRight, IconCalendar, IconChartBar, IconCheck, IconCircleCheck,
  IconChevronDown, IconChevronLeft, IconChevronRight, IconClock, IconDots, IconFileText, IconHome,
  IconCopy, IconInfoCircle, IconLayoutSidebarLeftCollapse, IconLogout, IconMessageQuestion, IconMicrophone,
  IconMoodSmile, IconPaperclip, IconPencil, IconPlus, IconRefresh, IconScissors,
  IconBell, IconEye, IconLayoutGrid, IconMinus, IconMoon, IconSun, IconTrash, IconSearch, IconSettings, IconSparkles, IconStack2, IconTypography,
  IconUpload, IconUserPlus, IconWorld, IconX, type Icon as TablerIcon,
} from "@tabler/icons-react";
import { useStream } from "./hooks";
/* ─────────────────────────────────────────────────────────
 * PRIMITIVES — the atoms every component composes
 *
 *   Icon          shared stroke-icon set (Tabler, name-mapped)
 *   Spinner       the one loading ring (currentColor)
 *   ShimmerLabel  gradient shimmer over a working label
 *   StreamText    word-by-word blur-in text stream
 *   StreamCaret   the cursor shown while text streams
 *   Chip          inline pill: tones field/surface/inset
 *   DiffStat      "+74 −41" green/red tabular counts
 *   IconButton    24px square hover button
 *   SendButton    round/square send arrow control
 *   Switch        toggle: role=switch, sizes sm/md
 *   Disclosure    expand/collapse (grid-rows 0fr→1fr)
 *   GlideMenu     one highlight glides across menu rows
 *   Card          surface container (rounded-card + shadow)
 *   Badge         status pill: green/red/neutral tints
 *   RadioCheck    custom radio/checkbox visual
 *   AvatarStack   overlapping mini avatars
 *   Popover       fixed-position portal (Escape closes)
 *   inertWhen     version-safe inert for hidden regions
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

/* ── inertWhen — version-safe `inert` ──────────────────── */
/* React 18 drops unknown boolean attributes and React 19 treats
 * `inert` as a real boolean prop — setting it through a ref works
 * identically in both. Spread onto the element that hides. */
export const inertWhen = (hidden: boolean) => ({
  ref: (el: HTMLElement | null) => {
    if (el) el.inert = hidden;
  },
});

/* ── Icon — thin wrapper over @tabler/icons-react ──────── */
/* One icon library for the whole system. Add new names to the
 * ICONS map — never inline <svg>, never a second icon package.
 * The name-based API keeps components decoupled from Tabler. */
export type IconName =
  | "chevron" | "check" | "close" | "search" | "retry"
  | "arrow-up" | "plus" | "clock" | "ellipsis"
  | "mic" | "file" | "clip" | "chart" | "layers" | "globe"
  | "lines" | "external"
  | "edit" | "home" | "gear" | "user-add" | "sign-out" | "sidebar"
  | "message-question" | "sparkles" | "scissors" | "mood-smile" | "typography" | "chevron-right"
  | "copy" | "circle-check" | "alert" | "info" | "chevron-left" | "upload" | "calendar"
  | "bell" | "moon" | "sun" | "eye" | "trash" | "grid" | "minus";
const ICONS: Record<IconName, TablerIcon> = {
  chevron: IconChevronDown,
  bell: IconBell,
  grid: IconLayoutGrid,
  moon: IconMoon,
  sun: IconSun,
  eye: IconEye,
  trash: IconTrash,
  minus: IconMinus,
  check: IconCheck,
  close: IconX,
  search: IconSearch,
  retry: IconRefresh,
  "arrow-up": IconArrowUp,
  plus: IconPlus,
  clock: IconClock,
  ellipsis: IconDots,
  mic: IconMicrophone,
  file: IconFileText,
  clip: IconPaperclip,
  chart: IconChartBar,
  layers: IconStack2,
  globe: IconWorld,
  lines: IconAlignLeft,
  external: IconArrowUpRight,
  edit: IconPencil,
  home: IconHome,
  gear: IconSettings,
  "user-add": IconUserPlus,
  "sign-out": IconLogout,
  sidebar: IconLayoutSidebarLeftCollapse,
  "message-question": IconMessageQuestion,
  sparkles: IconSparkles,
  scissors: IconScissors,
  "mood-smile": IconMoodSmile,
  typography: IconTypography,
  "chevron-right": IconChevronRight,
  copy: IconCopy,
  "circle-check": IconCircleCheck,
  alert: IconAlertCircle,
  info: IconInfoCircle,
  "chevron-left": IconChevronLeft,
  upload: IconUpload,
  calendar: IconCalendar,
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
  const TablerGlyph = ICONS[name];
  /* Tabler names its width prop `stroke` — the wrapper keeps our API */
  return <TablerGlyph aria-hidden size={size} stroke={strokeWidth} className={className} style={style} />;
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

/* ── StreamText ────────────────────────────────────────── */
/* Plain text streaming in word by word, each resolving out of
 * blur. Timing comes from useStream; the parent owns aria-live.
 * onProgress fires after each word lays out — hook repositioning
 * (anchored toolbars, autoscroll) to it. */
export function StreamText({
  text,
  intervalMs = 45,
  className = "",
  onProgress,
  onDone,
}: {
  text: string;
  intervalMs?: number;
  className?: string;
  /** called after each new word is laid out */
  onProgress?: () => void;
  onDone?: () => void;
}) {
  const words = text.split(" ");
  const { count } = useStream(words.length, { intervalMs, onDone });
  useLayoutEffect(() => {
    onProgress?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire per revealed word, not per handler identity
  }, [count]);
  return (
    <>
      {words.slice(0, count).map((word, i) => (
        <span
          key={i}
          className={`inline [will-change:filter,opacity] ${className}`}
          style={{ animation: "stream-in 420ms var(--ease-out-quint) both" }}
        >
          {word}{" "}
        </span>
      ))}
    </>
  );
}

/* ── StreamCaret ───────────────────────────────────────── */
/* The cursor shown while text streams in. */
export function StreamCaret({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`ml-0.5 inline-block h-3 w-0.5 translate-y-0.5 rounded-full bg-ink ${className}`}
      style={{ animation: "fade-in 150ms ease-out both" }}
    />
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

/* ── Skeleton ──────────────────────────────────────────── */
/* Loading placeholder block — shape it with className
 * (e.g. "size-8 rounded-full" for an avatar). The block is
 * decorative; put aria-busy on the loading region so
 * assistive tech knows content is on the way. */
export function Skeleton({ className = "h-4 w-full" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`block rounded-sm ${className}`}
      style={{
        backgroundImage:
          "linear-gradient(90deg, var(--inset) 35%, var(--hover) 50%, var(--inset) 65%)",
        backgroundSize: "200% 100%",
        animation: "shimmer-text 1.4s linear infinite",
      }}
    />
  );
}

/* ── Switch ────────────────────────────────────────────── */
export type SwitchSize = "sm" | "md";
/* sm is the dense-popover size (sanctioned sub-24px exception —
 * RecordsTable precedent); md, the default, meets the 24px floor */
const SWITCH_SIZES: Record<SwitchSize, { track: string; thumb: string; travel: number }> = {
  sm: { track: "h-4.5 w-7.5", thumb: "size-3.5", travel: 12 },
  md: { track: "h-6 w-10", thumb: "size-5", travel: 16 },
};
export function Switch({
  on,
  onToggle,
  label,
  size = "md",
  disabled = false,
  className = "",
  id,
  "aria-describedby": describedBy,
}: {
  on: boolean;
  onToggle: () => void;
  /** accessible name — required unless a Field label targets this via id */
  label?: string;
  size?: SwitchSize;
  disabled?: boolean;
  className?: string;
  id?: string;
  "aria-describedby"?: string;
}) {
  const spec = SWITCH_SIZES[size];
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={on}
      aria-label={label}
      aria-describedby={describedBy}
      disabled={disabled}
      onClick={onToggle}
      className={`relative shrink-0 rounded-full transition-colors duration-150 disabled:opacity-60 ${spec.track} ${className}`}
      style={{ background: on ? "var(--accent)" : "var(--line-strong)" }}
    >
      <span
        className={`absolute top-0.5 left-0.5 rounded-full bg-canvas shadow-btn transition-transform duration-150 ${spec.thumb}`}
        style={{
          transform: on ? `translateX(${spec.travel}px)` : "translateX(0)",
          transitionTimingFunction: "var(--ease-out-quint)",
        }}
      />
    </button>
  );
}

/* ── Separator ─────────────────────────────────────────── */
/* The one divider. Vertical needs a height from the caller
 * (e.g. className="h-4"). */
export function Separator({
  vertical = false,
  className = "",
}: {
  vertical?: boolean;
  className?: string;
}) {
  return (
    <div
      role="separator"
      aria-orientation={vertical ? "vertical" : undefined}
      className={`shrink-0 bg-line ${vertical ? "w-px" : "h-px w-full"} ${className}`}
    />
  );
}

/* ── Progress ──────────────────────────────────────────── */
export function Progress({
  value = 0,
  max = 100,
  label,
  tone = "accent",
  indeterminate = false,
  className = "",
}: {
  value?: number;
  max?: number;
  /** accessible name — what is progressing */
  label?: string;
  tone?: "accent" | "green";
  /** unknown duration — animated sweep instead of a fill */
  indeterminate?: boolean;
  className?: string;
}) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={indeterminate ? undefined : Math.round(Math.min(max, Math.max(0, value)))}
      className={`h-1.5 w-full overflow-hidden rounded-full bg-inset shadow-hairline ${className}`}
    >
      <div
        className={`h-full rounded-full ${tone === "green" ? "bg-green" : "bg-accent"} ${
          indeterminate ? "progress-indeterminate-bar" : ""
        }`}
        style={
          indeterminate
            ? { width: "30%", animation: "progress-slide 1.2s var(--ease-out-quint) infinite" }
            : {
                width: `${percent}%`,
                transition: "width 300ms var(--ease-out-quint)",
              }
        }
      />
    </div>
  );
}

/* ── Avatar ────────────────────────────────────────────── */
/* Image when src is given; otherwise initials on a hue hashed
 * from the name via the verified tag formula (16% bg / 50%
 * into ink — ≥4.5:1 in every mode × palette). */
export type AvatarSize = "sm" | "md" | "lg" | "xl";
export type AvatarTone = 0 | 1 | 2 | 3;
const AVATAR_SIZES: Record<AvatarSize, string> = {
  sm: "size-6 text-micro",
  md: "size-7 text-tiny",
  lg: "size-10 text-caption",
  xl: "size-12 text-body",
};
/* The four system tint tones (accent / green / orange / neutral) —
 * initials stay inside the token palette instead of a free hue,
 * so avatars read as part of the same family as badges and chips
 * (Turumba decision 2026-08-29; replaces the oklch hue hash). */
const AVATAR_TONES = [
  "bg-accent-tint text-accent",
  "bg-green-tint text-green",
  "bg-orange-tint text-orange",
  "bg-field text-ink-2",
];
const initialsOf = (name: string) => {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return (words[0] ?? "").slice(0, 2).toUpperCase(); // "Amina" → "AM"
};
const toneOf = (name: string) => {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) % 997;
  return AVATAR_TONES[hash % AVATAR_TONES.length];
};
export function Avatar({
  name,
  src,
  size = "md",
  tone,
  className = "",
}: {
  /** person's name — drives initials and the deterministic tone */
  name: string;
  /** photo URL — renders the image (hairline ring) instead of initials */
  src?: string;
  size?: AvatarSize;
  /** pin a tone (0 accent · 1 green · 2 orange · 3 neutral) instead of hashing the name */
  tone?: AvatarTone;
  className?: string;
}) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`source-avatar shrink-0 rounded-full bg-surface shadow-hairline ${AVATAR_SIZES[size]} ${className}`}
      />
    );
  }
  return (
    <span
      role="img"
      aria-label={name}
      className={`flex shrink-0 items-center justify-center rounded-full font-medium shadow-hairline ${
        tone !== undefined ? AVATAR_TONES[tone] : toneOf(name)
      } ${AVATAR_SIZES[size]} ${className}`}
    >
      {initialsOf(name)}
    </span>
  );
}

/* ── Tooltip ───────────────────────────────────────────── */
/* The chip surface is shared with the chart tooltips in charts.tsx —
 * extracted on second use so the two can never drift apart. */
export const TOOLTIP_CHIP = "rounded-chip px-2 py-1 text-tiny font-medium whitespace-nowrap";
export const TOOLTIP_CHIP_STYLE: CSSProperties = {
  background: "var(--tooltip-bg)",
  color: "var(--tooltip-fg)",
};

/* Hover / focus label on the tooltip tokens. Wraps its child;
 * the child gains aria-describedby while the tip is visible. */
export function Tooltip({
  label,
  delay = 250,
  children,
}: {
  label: string;
  /** hover delay in ms (focus shows immediately) */
  delay?: number;
  children: ReactElement;
}) {
  const id = useId();
  const anchorRef = useRef<HTMLSpanElement>(null);
  const timerRef = useRef<number | null>(null);
  const [position, setPosition] = useState<{ x: number; top?: number; bottom?: number } | null>(null);
  const show = () => {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(40, Math.min(rect.left + rect.width / 2, window.innerWidth - 40));
    setPosition(
      rect.top > 44
        ? { x, bottom: window.innerHeight - rect.top + 6 }
        : { x, top: rect.bottom + 6 },
    );
  };
  const schedule = () => {
    timerRef.current = window.setTimeout(show, delay);
  };
  const hide = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    setPosition(null);
  };
  useEffect(() => {
    if (!position) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") hide();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [position]);
  useEffect(() => hide, []); /* clear the pending timer on unmount */
  const existingDescribedBy = isValidElement(children)
    ? ((children.props as Record<string, unknown>)["aria-describedby"] as string | undefined)
    : undefined;
  const child = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        /* extend, don't clobber, an existing description (e.g. from Field) */
        "aria-describedby": position
          ? [existingDescribedBy, id].filter(Boolean).join(" ")
          : existingDescribedBy,
      })
    : children;
  return (
    <>
      <span
        ref={anchorRef}
        className="inline-flex"
        onMouseEnter={schedule}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        {child}
      </span>
      {position &&
        typeof document !== "undefined" &&
        createPortal(
          <span
            id={id}
            role="tooltip"
            className={`pointer-events-none fixed z-50 ${TOOLTIP_CHIP}`}
            style={{
              left: position.x,
              top: position.top,
              bottom: position.bottom,
              transform: "translateX(-50%)",
              ...TOOLTIP_CHIP_STYLE,
              animation: "pop-in 150ms var(--ease-out-quint) both",
            }}
          >
            {label}
          </span>,
          document.body,
        )}
    </>
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
  width,
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
  /** explicit pixel width — e.g. to match a trigger; overrides className sizing */
  width?: number;
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
      /* layered dismissal: Modal defers its Escape while a popover layer is open */
      data-popover-layer=""
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`fixed z-50 overflow-hidden rounded-md bg-surface shadow-overlay ${className}`}
      style={{
        left: x,
        top,
        bottom,
        width,
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
        boxShadow: "var(--shadow-btn)",
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
  rowSelector = "[data-menu-row]",
  children,
}: {
  className?: string;
  /** position/shape of the gliding highlight */
  highlightClassName?: string;
  /** CSS selector marking glidable rows */
  rowSelector?: string;
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
        const row = (event.target as Element).closest(rowSelector) as HTMLElement | null;
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
      <div className={innerClassName} aria-live={live ? "polite" : undefined} {...inertWhen(!open)}>
        {children}
      </div>
    </div>
  );
}
