"use client";
import { useId, useRef, useState, type ReactNode } from "react";
import { TOOLTIP_CHIP, TOOLTIP_CHIP_STYLE } from "./primitives";
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
    show: (x: number, y: number, node: ReactNode) => setTip({ x, y, node }),
    hide: () => setTip(null),
  };
}

function ChartTip({ tip }: { tip: Tip }) {
  if (!tip) return null;
  return (
    <div
      /* aria-hidden: the value is already on the mark's aria-label,
         so announcing the tip too would read it twice. */
      aria-hidden="true"
      className={`pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full ${TOOLTIP_CHIP}`}
      style={{ left: tip.x, top: tip.y - 8, ...TOOLTIP_CHIP_STYLE }}
    >
      {tip.node}
    </div>
  );
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
  showValues = true,
  className = "",
}: {
  labels?: string[];
  series?: Series[];
  variant?: BarVariant;
  highlight?: number;
  height?: number;
  showValues?: boolean;
  className?: string;
}) {
  const { tip, show, hide } = useTip();
  const boxRef = useRef<HTMLDivElement>(null);
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
    const box = boxRef.current?.getBoundingClientRect();
    const bar = (event.currentTarget as HTMLElement).getBoundingClientRect();
    if (!box) return;
    show(bar.left - box.left + bar.width / 2, bar.top - box.top, node);
  };

  return (
    <div className={`w-full max-w-160 ${className}`}>
      {series.length > 1 && <div className="mb-3"><ChartLegend series={series} /></div>}
      {/* Every bar has to stay a 24px target, so a dense grouped chart
          scrolls rather than shrinking its bars into unhittable slivers. */}
      <div ref={boxRef} className="relative overflow-x-auto" onMouseLeave={hide}>
        <div className="flex items-end gap-1.5" style={{ height }}>
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
                      className={`w-full rounded-sm transition-opacity duration-150 hover:opacity-80 ${SERIES_BG[tone]} ${dimmed ? "opacity-25" : ""}`}
                      style={{ height: `${(value / max) * 100}%` }}
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
  className = "",
}: {
  labels?: string[];
  /** values are positional against `labels` — same length, same order */
  series?: Series[];
  area?: boolean;
  points?: boolean;
  height?: number;
  className?: string;
}) {
  const gradientId = useId();
  const { tip, show, hide } = useTip();
  const boxRef = useRef<HTMLDivElement>(null);
  const W = 100, H = 40;                      // viewBox units; CSS does the sizing
  const max = niceMax(Math.max(0, ...series.flatMap((s) => s.values)));
  const slots = Math.max(labels.length, ...series.map((s) => s.values.length), 1);
  const step = slots > 1 ? W / (slots - 1) : W;

  const onPoint = (event: React.MouseEvent | React.FocusEvent, node: ReactNode) => {
    const box = boxRef.current?.getBoundingClientRect();
    const dot = (event.currentTarget as Element).getBoundingClientRect();
    if (!box) return;
    show(dot.left - box.left + dot.width / 2, dot.top - box.top, node);
  };

  return (
    <div className={`w-full max-w-160 ${className}`}>
      {series.length > 1 && <div className="mb-3"><ChartLegend series={series} /></div>}
      <div ref={boxRef} className="relative" onMouseLeave={hide}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          style={{ height }}
          className="w-full overflow-visible"
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
                width: HIT, height: HIT,
                left: `${(i / Math.max(slots - 1, 1)) * 100}%`,
                top: `${(1 - v / max) * height}px`,
              }}
            >
              <span className={`size-2.5 rounded-full border-2 border-surface transition-transform duration-150 ${SERIES_BG[tone]}`} />
            </button>
          ));
        })}
        <ChartTip tip={tip} />
      </div>
      <div className="mt-2 flex justify-between">
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
  className = "",
}: {
  value?: number;
  max?: number;
  label?: string;
  color?: ChartColor;
  size?: number;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(1, max === 0 ? 0 : value / max));
  const r = 42, C = 2 * Math.PI * r;
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
          strokeDasharray={`${pct * C} ${C}`}
          style={{ transition: "stroke-dasharray 520ms var(--ease-out-quint)" }}
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        <span className="text-title font-semibold text-ink tabular-nums">{compact(value)}</span>
        <span className="text-tiny text-ink-3">{label}</span>
      </span>
    </div>
  );
}

/* ═══════════ Sparkline ═══════════ */
/* The mini trend inside a StatCard. Decorative by design: the
 * number beside it carries the meaning, so it is aria-hidden. */
export function Sparkline({
  values = [4, 7, 5, 9, 8, 12, 10, 15],
  color = 1,
  area = true,
  className = "",
}: {
  values?: number[];
  color?: ChartColor;
  area?: boolean;
  className?: string;
}) {
  const gradientId = useId();
  const W = 100, H = 28;
  /* One point is not a trend — drawing it would fill a wedge across
     the whole box, which reads as a real shape that isn't there. */
  if (values.length < 2) return null;
  const max = Math.max(...values), min = Math.min(...values);
  const span = max - min || 1;
  const step = W / (values.length - 1);
  const d = values
    .map((v, i) => `${i ? "L" : "M"}${i * step} ${H - ((v - min) / span) * H}`)
    .join(" ");
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true"
      className={`h-8 w-full ${SERIES_TEXT[color]} ${className}`}
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
