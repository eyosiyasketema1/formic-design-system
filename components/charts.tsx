"use client";
import { useEffect, useId, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { TOOLTIP_CHIP, TOOLTIP_CHIP_STYLE } from "./primitives";
import { useReducedMotion } from "./hooks";
/* ─────────────────────────────────────────────────────────
 * CHARTS
 * Bars, lines and rings for dashboards. No chart library:
 * everything is CSS/SVG built from tokens, so it re-themes
 * with the accent picker like the rest of the system.
 *
 * Bars are HTML rather than SVG on purpose — a scaled SVG
 * scales its text too, which would break the type ramp.
 * The line chart is SVG (it has to be) and pairs a stretched
 * viewBox with vector-effect="non-scaling-stroke" so the
 * stroke stays 2px at any width, with the labels as real
 * HTML underneath at real token sizes.
 * ───────────────────────────────────────────────────────── */

/* Series colours are the categorical ramp, never the semantic
 * green/red. Mapped statically because Tailwind only sees class
 * names that appear literally in the source. */
export type ChartColor = 1 | 2 | 3 | 4 | 5;
const SERIES_BG: Record<ChartColor, string> = {
  1: "bg-chart-1", 2: "bg-chart-2", 3: "bg-chart-3", 4: "bg-chart-4", 5: "bg-chart-5",
};
const SERIES_STROKE: Record<ChartColor, string> = {
  1: "stroke-chart-1", 2: "stroke-chart-2", 3: "stroke-chart-3", 4: "stroke-chart-4", 5: "stroke-chart-5",
};
const SERIES_TEXT: Record<ChartColor, string> = {
  1: "text-chart-1", 2: "text-chart-2", 3: "text-chart-3", 4: "text-chart-4", 5: "text-chart-5",
};
const toneOf = (color: ChartColor | undefined, index: number): ChartColor =>
  color ?? (((index % 5) + 1) as ChartColor);

/* Every interactive mark is at least this wide/tall (rule 15).
 * Bars get it as a per-series minimum, points as a padded hit area. */
const HIT = 24;

export type Series = { name: string; color?: ChartColor; values: number[] };

/* ── compact number formatting ─────────────────────────── */
export function compact(n: number): string {
  if (!Number.isFinite(n)) return "—";   // empty series must not print "-InfinityM"
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${trim(n / 1_000_000)}M`;
  if (abs >= 1_000) return `${trim(n / 1_000)}K`;
  return `${trim(n)}`;
}
const trim = (n: number) => String(Math.round(n * 10) / 10);

/* Round the axis up to something a human would pick, so bars
 * don't touch the ceiling and the top gridline reads cleanly. */
function niceMax(v: number): number {
  if (!Number.isFinite(v) || v <= 0) return 1;
  const mag = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / (mag / 2)) * (mag / 2);
}

/* ── shared hover tip ──────────────────────────────────── */
/* Positioned inside the chart's own relative box rather than
 * portalled to the viewport: charts sit inside cards, so local
 * positioning avoids the whole z-index and clamping problem.
 * The chip surface itself comes from primitives, shared with
 * Tooltip so the two can't drift into different-looking tips. */
type Tip = { x: number; y: number; node: ReactNode } | null;

function useTip() {
  const [tip, setTip] = useState<Tip>(null);
  return {
    tip,
    /** viewport coordinates — pass the mark's bounding rect centre-top */
    show: (x: number, y: number, node: ReactNode) => setTip({ x, y, node }),
    hide: () => setTip(null),
  };
}
/** the mark's anchor point in viewport space: horizontal centre, top edge */
function anchorOf(event: React.MouseEvent | React.FocusEvent): [number, number] {
  const r = (event.currentTarget as Element).getBoundingClientRect();
  return [r.left + r.width / 2, r.top];
}

function ChartTip({ tip }: { tip: Tip }) {
  if (!tip || typeof document === "undefined") return null;
  /* Portalled and fixed: charts live inside cards with overflow-hidden and
     scroll containers with overflow-x-auto (which also clips vertically), so
     an in-flow tooltip above the tallest bar was cut off. */
  return createPortal(
    <div
      /* aria-hidden: the value is already on the mark's aria-label,
         so announcing the tip too would read it twice. */
      aria-hidden="true"
      className={`pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full ${TOOLTIP_CHIP}`}
      style={{ left: tip.x, top: tip.y - 8, ...TOOLTIP_CHIP_STYLE }}
    >
      {tip.node}
    </div>,
    document.body,
  );
}

/* ── useEntrance — the one-shot "draw in" every chart shares ──── */
/* `animate` is on by default (rule: motion is part of the system, not a
 * garnish one chart gets). It collapses to the final frame under reduced
 * motion, and `animate={false}` switches it off for a chart that re-renders
 * often. Returns true once the entrance should be at its resting state. */
function useEntrance(animate: boolean): { settled: boolean; drawing: boolean } {
  const reduced = useReducedMotion();
  const drawing = animate && !reduced;
  const [settled, setSettled] = useState(!drawing);
  useEffect(() => {
    if (!drawing) { setSettled(true); return; }
    const t = setTimeout(() => setSettled(true), 30);
    return () => clearTimeout(t);
  }, [drawing]);
  return { settled, drawing };
}

/* ── legend ────────────────────────────────────────────── */
/* Series are separated by hue alone, which fails for colour-blind
 * readers, so anything with more than one series gets a legend. */
export function ChartLegend({ series }: { series: Series[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5">
      {series.map((s, i) => (
        <span key={`${s.name}-${i}`} className="flex items-center gap-1.5 text-tiny text-ink-2">
          <span className={`size-2 shrink-0 rounded-full ${SERIES_BG[toneOf(s.color, i)]}`} />
          {s.name}
        </span>
      ))}
    </div>
  );
}

/* ═══════════ BarChart ═══════════ */
const DEFAULT_BAR_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"];
const DEFAULT_BAR_SERIES: Series[] = [
  { name: "Transactions", values: [38, 52, 32, 12, 35, 28, 33, 25] },
];

export type BarVariant = "grouped" | "stacked";

export function BarChart({
  labels = DEFAULT_BAR_LABELS,
  series = DEFAULT_BAR_SERIES,
  variant = "grouped",
  /** index of the column to emphasise; the rest drop to a tint */
  highlight,
  height = 168,
  fill = false,
  showValues = true,
  animate = true,
  className = "",
}: {
  labels?: string[];
  series?: Series[];
  variant?: BarVariant;
  highlight?: number;
  /** plot height in px; with `fill` it becomes the minimum */
  height?: number;
  /** stretch to the parent's height — inside a Panel body this fills the card */
  fill?: boolean;
  showValues?: boolean;
  /** bars grow in from the baseline once, column by column; off for live-updating charts */
  animate?: boolean;
  className?: string;
}) {
  const { tip, show, hide } = useTip();
  const { settled, drawing } = useEntrance(animate);
  const stacked = variant === "stacked";

  /* Scale off the tallest thing a column will actually draw: the sum
   * when stacked, the tallest single bar when grouped. */
  const columnPeak = labels.map((_, i) =>
    stacked
      ? series.reduce((n, s) => n + (s.values[i] ?? 0), 0)
      : Math.max(0, ...series.map((s) => s.values[i] ?? 0)),
  );
  const max = niceMax(Math.max(0, ...columnPeak));

  /* A headline number over the column only means something when it
   * represents the whole column. Grouped multi-series has no such
   * number — printing the tallest series would read as the total. */
  const labelValues = showValues && (stacked || series.length === 1);

  const onEnter = (event: React.MouseEvent | React.FocusEvent, node: ReactNode) => {
    const [x, y] = anchorOf(event);
    show(x, y, node);
  };

  return (
    <div className={`flex w-full flex-col ${fill ? "h-full min-h-0" : ""} ${className}`}>
      {series.length > 1 && <div className="mb-3 shrink-0"><ChartLegend series={series} /></div>}
      {/* Every bar has to stay a 24px target, so a dense grouped chart
          scrolls rather than shrinking its bars into unhittable slivers. */}
      {/* When filling, the plot is absolutely positioned inside a wrapper that
          only sets a minimum height. In a stretched grid row the wrapper grows
          (flex-1) and the plot with it; in an auto-height row the wrapper is
          exactly `height` tall. A plain h-full child would resolve to auto
          there and the bars would collapse to nothing. */}
      <div
        className={`overflow-x-auto ${fill ? "relative min-h-0 flex-1" : ""}`}
        style={fill ? { minHeight: height } : undefined}
        onMouseLeave={hide}
      >
        <div className={`flex items-end gap-1.5 ${fill ? "absolute inset-0" : ""}`} style={fill ? undefined : { height }}>
          {labels.map((label, i) => (
            <div
              key={`${label}-${i}`}
              className="flex h-full min-w-0 flex-1 flex-col justify-end gap-1"
              style={{ minWidth: stacked ? HIT : series.length * HIT }}
            >
              {labelValues && (
                <span className="text-center text-tiny font-medium text-ink tabular-nums">
                  {compact(columnPeak[i])}
                </span>
              )}
              {/* column-reverse makes the BOTTOM the main-start edge, so a
                  stack anchors with justify-start; justify-center would float it. */}
              <div className={`flex h-full gap-0.5 ${stacked ? "flex-col-reverse items-center justify-start" : "items-end justify-center"}`}>
                {series.map((s, si) => {
                  const value = s.values[i] ?? 0;
                  const tone = toneOf(s.color, si);
                  const dimmed = highlight !== undefined && highlight !== i;
                  const text = `${s.name} · ${value.toLocaleString()}`;
                  return (
                    <button
                      key={`${s.name}-${si}`}
                      type="button"
                      aria-label={`${s.name}, ${label}: ${value.toLocaleString()}`}
                      onMouseEnter={(e) => onEnter(e, text)}
                      onFocus={(e) => onEnter(e, text)}
                      onBlur={hide}
                      className={`w-full origin-bottom rounded-sm transition-opacity duration-150 hover:opacity-80 ${SERIES_BG[tone]} ${dimmed ? "opacity-25" : ""}`}
                      style={{
                        height: `${(value / max) * 100}%`,
                        /* scaleY composites on the GPU; animating height relays out every frame */
                        transform: settled ? "scaleY(1)" : "scaleY(0)",
                        transition: drawing ? `transform 900ms var(--ease-out-quint) ${i * 60}ms` : undefined,
                      }}
                    />
                  );
                })}
              </div>
              <span className="truncate text-center text-tiny text-ink-3">{label}</span>
            </div>
          ))}
        </div>
        <ChartTip tip={tip} />
      </div>
    </div>
  );
}

/* ═══════════ LineChart ═══════════ */
const DEFAULT_LINE_SERIES: Series[] = [
  { name: "Profit", values: [18, 26, 21, 34, 29, 41, 38, 52] },
];

export function LineChart({
  labels = DEFAULT_BAR_LABELS,
  series = DEFAULT_LINE_SERIES,
  area = true,
  points = true,
  height = 150,
  fill = false,
  animate = true,
  className = "",
}: {
  labels?: string[];
  /** values are positional against `labels` — same length, same order */
  series?: Series[];
  area?: boolean;
  points?: boolean;
  /** plot height in px; with `fill` it becomes the minimum */
  height?: number;
  /** stretch to the parent's height — inside a Panel body this fills the card */
  fill?: boolean;
  /** the line reveals left to right once, points follow; off for live-updating charts */
  animate?: boolean;
  className?: string;
}) {
  const gradientId = useId();
  const { tip, show, hide } = useTip();
  const { settled, drawing } = useEntrance(animate);
  const W = 100, H = 40;                      // viewBox units; CSS does the sizing
  const max = niceMax(Math.max(0, ...series.flatMap((s) => s.values)));
  const slots = Math.max(labels.length, ...series.map((s) => s.values.length), 1);
  const step = slots > 1 ? W / (slots - 1) : W;

  const onPoint = (event: React.MouseEvent | React.FocusEvent, node: ReactNode) => {
    const [x, y] = anchorOf(event);
    show(x, y, node);
  };

  return (
    <div className={`flex w-full flex-col ${fill ? "h-full min-h-0" : ""} ${className}`}>
      {series.length > 1 && <div className="mb-3 shrink-0"><ChartLegend series={series} /></div>}
      {/* Filling: the svg is absolute so its 100×40 viewBox aspect cannot set
          the height; the wrapper takes the panel's height (flex-1) or, in an
          auto-height row, exactly `height`. Dots are %-positioned in the same
          wrapper, so they track whatever height CSS settles on. */}
      <div
        className={`relative ${fill ? "min-h-0 flex-1" : ""}`}
        style={fill ? { minHeight: height } : undefined}
        onMouseLeave={hide}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          style={{ ...(fill ? {} : { height }), ...(drawing ? { animation: "reveal-x 1400ms var(--ease-out-quint) both" } : {}) }}
          className={`block w-full overflow-visible ${fill ? "absolute inset-0 h-full" : ""}`}
          role="img"
          aria-label={series.map((s) => `${s.name}: ${s.values.map((v) => v.toLocaleString()).join(", ")}`).join(". ")}
        >
          {[0, 0.5, 1].map((t) => (
            <line
              key={t} x1="0" x2={W} y1={H * t} y2={H * t}
              className="stroke-chart-track" strokeWidth="1" vectorEffect="non-scaling-stroke"
            />
          ))}
          {series.map((s, si) => {
            const tone = toneOf(s.color, si);
            const d = s.values.map((v, i) => `${i ? "L" : "M"}${i * step} ${H - (v / max) * H}`).join(" ");
            return (
              /* The colour class goes on the <g>, not the path: a gradient
                 stop resolves currentColor from its OWN inherited colour, so
                 putting it on the sibling path leaves the fill ambient ink. */
              <g key={`${s.name}-${si}`} className={SERIES_TEXT[tone]}>
                {area && (
                  <>
                    <defs>
                      <linearGradient id={`${gradientId}-${si}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
                        <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d={`${d} L${(s.values.length - 1) * step} ${H} L0 ${H} Z`} fill={`url(#${gradientId}-${si})`} />
                  </>
                )}
                <path
                  d={d} fill="none" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  className={SERIES_STROKE[tone]}
                />
              </g>
            );
          })}
        </svg>

        {/* Dots live in HTML, not SVG: the stretched viewBox would turn
            circles into ellipses, and they need to be real focus targets.
            The button is a 24px hit area; the visible dot is the inner span. */}
        {points && series.map((s, si) => {
          const tone = toneOf(s.color, si);
          return s.values.map((v, i) => (
            <button
              key={`${s.name}-${si}-${i}`}
              type="button"
              aria-label={`${s.name}, ${labels[i] ?? i + 1}: ${v.toLocaleString()}`}
              onMouseEnter={(e) => onPoint(e, `${s.name} · ${v.toLocaleString()}`)}
              onFocus={(e) => onPoint(e, `${s.name} · ${v.toLocaleString()}`)}
              onBlur={hide}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
              style={{
                opacity: settled ? 1 : 0,
                transition: drawing ? `opacity 400ms var(--ease-out-quint) ${900 + i * 40}ms` : undefined,
                width: HIT, height: HIT,
                left: `${(i / Math.max(slots - 1, 1)) * 100}%`,
                /* percent, not px: the plot's height is whatever CSS gave it */
                top: `${(1 - v / max) * 100}%`,
              }}
            >
              <span className={`size-2.5 rounded-full border-2 border-surface transition-transform duration-150 ${SERIES_BG[tone]}`} />
            </button>
          ));
        })}
        <ChartTip tip={tip} />
      </div>
      <div className="mt-2 flex shrink-0 justify-between">
        {labels.map((l, i) => (
          <span key={`${l}-${i}`} className="min-w-0 truncate text-tiny text-ink-3">{l}</span>
        ))}
      </div>
    </div>
  );
}

/* ═══════════ DonutChart ═══════════ */
export function DonutChart({
  value = 500,
  max = 720,
  label = "Visitors",
  color = 4,
  size = 116,
  animate = true,
  className = "",
}: {
  value?: number;
  max?: number;
  label?: string;
  color?: ChartColor;
  size?: number;
  /** the arc sweeps from zero to its value once; off for live-updating charts */
  animate?: boolean;
  className?: string;
}) {
  const { settled, drawing } = useEntrance(animate);
  const pct = Math.max(0, Math.min(1, max === 0 ? 0 : value / max));
  const r = 42, C = 2 * Math.PI * r;
  const shown = settled ? pct : 0;
  return (
    <div
      className={`relative shrink-0 ${className}`}
      /* intrinsically sized, but never wider than its container */
      style={{ width: size, height: size, maxWidth: "100%" }}
      role="img"
      aria-label={`${label}: ${value.toLocaleString()} of ${max.toLocaleString()}, ${Math.round(pct * 100)}%`}
    >
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="11" className="stroke-chart-track" />
        <circle
          cx="50" cy="50" r={r} fill="none" strokeWidth="11" strokeLinecap="round"
          className={SERIES_STROKE[color]}
          strokeDasharray={`${shown * C} ${C}`}
          style={{ transition: `stroke-dasharray ${drawing ? 1100 : 520}ms var(--ease-out-quint)` }}
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        <span className="text-title font-semibold text-ink tabular-nums">{drawing ? <CountUp value={value} format={compact} duration={1100} /> : compact(value)}</span>
        <span className="text-tiny text-ink-3">{label}</span>
      </span>
    </div>
  );
}

/* ═══════════ Sparkline ═══════════ */
/* The mini trend inside a StatCard. Decorative by design: the
 * number beside it carries the meaning, so it is aria-hidden.
 * `smooth` runs a Catmull-Rom curve through the points so weekly
 * data reads as one calm wave; `animate` reveals it left to right once. */
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    d += ` C ${p1.x + (p2.x - p0.x) / 6} ${p1.y + (p2.y - p0.y) / 6}, ${p2.x - (p3.x - p1.x) / 6} ${p2.y - (p3.y - p1.y) / 6}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export function Sparkline({
  values = [4, 7, 5, 9, 8, 12, 10, 15],
  color = 1,
  area = true,
  smooth = false,
  animate = true,
  className = "",
}: {
  values?: number[];
  color?: ChartColor;
  area?: boolean;
  /** Catmull-Rom curve instead of straight segments */
  smooth?: boolean;
  /** one-shot left→right reveal on mount; collapses to the final frame under reduced motion */
  animate?: boolean;
  className?: string;
}) {
  const gradientId = useId();
  const reduced = useReducedMotion();
  const W = 100, H = 28, PAD = 2;
  /* One point is not a trend — drawing it would fill a wedge across
     the whole box, which reads as a real shape that isn't there. */
  if (values.length < 2) return null;
  const max = Math.max(...values), min = Math.min(...values);
  const span = max - min || 1;
  const step = W / (values.length - 1);
  const pts = values.map((v, i) => ({ x: i * step, y: PAD + (H - PAD * 2) - ((v - min) / span) * (H - PAD * 2) }));
  const d = smooth ? smoothPath(pts) : pts.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" ");
  const drawing = animate && !reduced;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true"
      className={`h-8 w-full overflow-visible ${SERIES_TEXT[color]} ${className}`}
      /* The reveal clips the whole svg left→right. A stroke-dash draw-in
         (pathLength + dasharray) breaks under non-scaling-stroke in Chromium
         and showed up as a line with holes in it. */
      style={drawing ? { animation: "reveal-x 1700ms var(--ease-out-quint) both" } : undefined}
    >
      {area && (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.24" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${d} L${W} ${H} L0 ${H} Z`} fill={`url(#${gradientId})`} />
        </>
      )}
      <path
        d={d} fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/* ═══════════ CountUp ═══════════ */
/* A big number settles in once, ease-out, then holds. Under reduced
 * motion it renders the final value immediately. Re-runs if `value`
 * changes so a live dashboard can tick to a new figure. */
export function CountUp({
  value,
  duration = 1400,
  format = (n: number) => n.toLocaleString(),
}: {
  value: number;
  duration?: number;
  /** e.g. (n) => `$${n.toLocaleString()}` */
  format?: (n: number) => string;
}) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(reduced ? value : 0);
  useEffect(() => {
    if (reduced || duration <= 0) { setShown(value); return; }
    const from = shown, t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(from + (value - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- animate from wherever we are toward the new value
  }, [value, reduced, duration]);
  return <span className="tabular-nums">{format(reduced ? value : shown)}</span>;
}

/* ═══════════ Gauge ═══════════ */
/* A ticked radial arc, open at the bottom. Ticks light up in sequence
 * once; the number counts up in the centre. Single-hue: lit ticks are
 * the accent, the rest the track — it shows one quantity, not series. */
export function Gauge({
  percent = 64,
  label = "of people become clients",
  ticks = 36,
  animate = true,
  className = "",
}: {
  percent?: number;
  label?: string;
  ticks?: number;
  /** ticks light in sequence and the number counts up once; off for live-updating gauges */
  animate?: boolean;
  className?: string;
}) {
  const { drawing } = useEntrance(animate);
  const p = Math.max(0, Math.min(100, percent));
  /* Two ticks is the floor — a lone tick has no arc to sit on. */
  const n = Math.max(2, Math.round(ticks));
  const lit = Math.round((p / 100) * n);
  const START = 150, SWEEP = 240, CX = 110, CY = 96, R1 = 74, R2 = 92;
  return (
    <div className={`relative mx-auto w-full max-w-55 ${className}`} role="img" aria-label={`${Math.round(p)} percent ${label}`}>
      <svg viewBox="0 0 220 150" className="block w-full" aria-hidden="true">
        {Array.from({ length: n }, (_, i) => {
          const a = ((START + (i / (n - 1)) * SWEEP) * Math.PI) / 180;
          const on = i < lit;
          return (
            <line
              key={i}
              x1={CX + R1 * Math.cos(a)} y1={CY + R1 * Math.sin(a)}
              x2={CX + R2 * Math.cos(a)} y2={CY + R2 * Math.sin(a)}
              strokeWidth="4" strokeLinecap="round"
              className={on ? "stroke-accent" : "stroke-chart-track"}
              style={on && drawing ? { animation: `fade-in 300ms var(--ease-out-quint) ${i * 34}ms both` } : undefined}
            />
          );
        })}
      </svg>
      <div className="absolute inset-x-0 top-[38%] text-center">
        <p className="text-display-lg font-semibold text-ink">{drawing ? <CountUp value={Math.round(p)} /> : Math.round(p)}%</p>
        <p className="mt-1 text-small text-ink-3">{label}</p>
      </div>
    </div>
  );
}

/* ═══════════ BarList ═══════════ */
/* Ranked horizontal bars — "top services", "top clients". One quantity,
 * not a series, so no rainbow (rule 16): the leader is the accent and the
 * rest sit in muted ink, both ≥3:1 against the track in every mode (gated
 * in qa_check.py). Labels live beside the bar, never on it, so a short bar
 * can't swallow its own name; the value is always text. Bars grow in once,
 * staggered, and collapse to the final frame under reduced motion. */
export type BarItem = { label: string; value: number };
const DEFAULT_BARS: BarItem[] = [
  { label: "Brand Identity", value: 48 }, { label: "Website", value: 31 },
  { label: "Company Profile", value: 24 }, { label: "Graphic Design", value: 17 },
];
export function BarList({
  items = DEFAULT_BARS,
  max,
  format = (n: number) => n.toLocaleString(),
  stagger = 90,
  fill = false,
  animate = true,
  className = "",
}: {
  items?: BarItem[];
  /** scale ceiling; defaults to the largest value */
  max?: number;
  format?: (n: number) => string;
  /** ms between each bar's entrance */
  stagger?: number;
  /** spread the rows over the parent's height — inside a Panel body this fills the card */
  fill?: boolean;
  /** bars grow in once, staggered; off for live-updating lists */
  animate?: boolean;
  className?: string;
}) {
  const { settled: on, drawing } = useEntrance(animate);
  const ceiling = max ?? Math.max(1, ...items.map((i) => i.value));
  return (
    <div className={`flex w-full flex-col gap-2.5 ${fill ? "h-full justify-between" : ""} ${className}`}>
      {items.map((item, i) => {
        const pct = Math.max(2, (item.value / ceiling) * 100);
        const leader = i === 0;
        return (
          <div key={`${item.label}-${i}`} className="flex items-center gap-3">
            <span className={`w-28 shrink-0 truncate text-caption sm:w-36 ${leader ? "font-medium text-ink" : "text-ink-2"}`} title={item.label}>
              {item.label}
            </span>
            <div className="relative h-2.5 min-w-0 flex-1 overflow-hidden rounded-sm bg-chart-track">
              {/* scaleX composites on the GPU; animating width relays out every frame */}
              <div
                className={`absolute inset-y-0 left-0 origin-left rounded-sm ${leader ? "bg-accent" : "bg-ink-3"}`}
                style={{
                  width: `${pct}%`,
                  transform: on ? "scaleX(1)" : "scaleX(0)",
                  transition: drawing ? `transform 1400ms var(--ease-out-quint) ${i * stagger}ms` : undefined,
                }}
              />
            </div>
            <span className="w-14 shrink-0 text-right text-caption font-semibold text-ink tabular-nums">{format(item.value)}</span>
          </div>
        );
      })}
    </div>
  );
}
