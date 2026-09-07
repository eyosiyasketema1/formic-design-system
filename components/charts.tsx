"use client";
import { useEffect, useId, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { TOOLTIP_CHIP, TOOLTIP_CHIP_STYLE } from "./primitives";
import { useReducedMotion, useWidth } from "./hooks";
import { FORMIC_CONFIG } from "./config";
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

export type Series = { name: string; color?: ChartColor; values: number[]; /** dashed: a comparison line (last period, the target) behind the real one */ style?: "solid" | "dashed" };

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

/* Tick values a human would pick between two ends: a step of 1, 2, 2.5
 * or 5 × 10ⁿ, so an axis from -14 to 20 reads -10, 0, 10, 20 rather than
 * -14, -5.5, 3, 11.5. Zero is always on it when the range crosses zero. */
function niceTicks(min: number, max: number, target = 4): number[] {
  const span = max - min || 1;
  const raw = span / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((v) => v >= raw) ?? mag * 10;
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + step / 1000; v += step) out.push(Math.round(v * 1000) / 1000);
  return out;
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
          {s.style === "dashed"
            ? <span aria-hidden className="w-3.5 shrink-0 border-t border-dashed border-ink-3" />
            : <span className={`size-2 shrink-0 rounded-full ${SERIES_BG[toneOf(s.color, i)]}`} />}
          {s.name}
        </span>
      ))}
    </div>
  );
}

/* ═══════════ BarChart ═══════════ */
const DEFAULT_BAR_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"];
const DEFAULT_BAR_SERIES: Series[] = [
  { name: "Invoices", values: [38, 52, 32, 12, 35, 28, 33, 25] },
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
  valuePosition = "top",
  axis = false,
  thin = false,
  horizontal = false,
  format = compact,
  animate = FORMIC_CONFIG.motion,
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
  /** top: one row of values above the plot. bar: each value rides just above its own bar */
  valuePosition?: "top" | "bar";
  /** a value axis on the left with dashed gridlines behind the bars; it replaces the per-column values */
  axis?: boolean;
  /** narrow bars centred in their columns, for a month-by-month stack */
  thin?: boolean;
  /** bars run left to right, one row per label, the axis along the bottom — for a few named things compared on one quantity (won and lost per source) */
  horizontal?: boolean;
  /** how the axis prints a value, e.g. (n) => `${n}h` */
  format?: (n: number) => string;
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
  /* grouped bars may go below zero (a month's net): the baseline then
     sits inside the plot and bars hang from it */
  const minV = stacked ? 0 : Math.min(0, ...series.flatMap((s) => s.values));
  const span = max - minV || 1;
  const zeroPct = (max / span) * 100;

  /* A headline number over the column only means something when it
   * represents the whole column. Grouped multi-series has no such
   * number — printing the tallest series would read as the total. An
   * axis already says how tall a column is, so it switches them off. */
  const labelValues = showValues && !axis && (stacked || series.length === 1);
  /* gridlines at round values between the floor and the ceiling, zero among them */
  const tickValues = niceTicks(minV, max);
  const grid = tickValues.map((v) => (max - v) / span);
  const columnMin = stacked ? HIT : series.length * HIT;

  const onEnter = (event: React.MouseEvent | React.FocusEvent, node: ReactNode) => {
    const [x, y] = anchorOf(event);
    show(x, y, node);
  };

  if (horizontal) {
    return (
      <div className={`flex w-full flex-col ${fill ? "h-full min-h-0 justify-between" : ""} ${className}`} onMouseLeave={hide}>
        <div className={`flex flex-col gap-2.5 ${fill ? "flex-1 justify-around" : ""}`}>
          {labels.map((label, i) => (
            <div key={`${label}-${i}`} className="flex items-center gap-3">
              <span className="w-20 shrink-0 truncate text-right text-caption text-ink-2 sm:w-24" title={label}>{label}</span>
              <div className={`relative min-w-0 flex-1 ${stacked ? "flex h-6 overflow-hidden rounded-sm" : "flex flex-col gap-0.5"}`}>
                {axis && tickValues.map((v) => (
                  <span key={v} aria-hidden className="pointer-events-none absolute inset-y-0 border-l border-dashed border-chart-track" style={{ left: `${(v / max) * 100}%` }} />
                ))}
                {series.map((s, si) => {
                  const value = s.values[i] ?? 0;
                  const tone = toneOf(s.color, si);
                  const text = `${s.name} · ${format(value)}`;
                  return (
                    <button
                      key={`${s.name}-${si}`}
                      type="button"
                      aria-label={`${s.name}, ${label}: ${value.toLocaleString()}`}
                      onMouseEnter={(e) => onEnter(e, text)}
                      onFocus={(e) => onEnter(e, text)}
                      onBlur={hide}
                      className={`origin-left transition-opacity duration-150 hover:opacity-80 ${SERIES_BG[tone]} ${stacked ? "h-full" : "h-4 rounded-sm"}`}
                      style={{ width: `${(value / max) * 100}%`, transform: settled ? "scaleX(1)" : "scaleX(0)", transition: drawing ? `transform 900ms var(--ease-out-quint) ${i * 60}ms` : undefined }}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        {axis && (
          <div aria-hidden className="mt-2 flex items-center gap-3">
            <span className="w-20 shrink-0 sm:w-24" />
            <div className="relative h-4 min-w-0 flex-1">
              {tickValues.map((v) => (
                <span key={v} className={`absolute top-0 text-tiny text-ink-3 tabular-nums ${v === 0 ? "" : v === max ? "-translate-x-full" : "-translate-x-1/2"}`} style={{ left: `${(v / max) * 100}%` }}>{format(v)}</span>
              ))}
            </div>
          </div>
        )}
        {series.length > 1 && <div className="mt-3 flex justify-center"><ChartLegend series={series} /></div>}
        <ChartTip tip={tip} />
      </div>
    );
  }

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
        {/* two columns (axis, plot) by two rows (bars, x labels): the axis
            spans only the bars row, so its top and bottom meet the gridlines */}
        <div className={`grid grid-cols-[auto_1fr] grid-rows-[minmax(0,1fr)_auto] ${fill ? "absolute inset-0" : ""}`} style={fill ? undefined : { height: height + 20 }}>
          {axis ? (
            <div aria-hidden className="relative w-10 pr-2 text-right text-tiny text-ink-3 tabular-nums">
              {/* labels slide from their top edge at the ceiling to their bottom edge at the floor, so none is cut off */}
              {tickValues.map((v, i) => <span key={v} className="absolute right-2 leading-none" style={{ top: `${grid[i] * 100}%`, transform: `translateY(-${grid[i] * 100}%)` }}>{format(v)}</span>)}
            </div>
          ) : <span />}
          <div className="relative flex min-h-0 items-end gap-1.5">
            {minV < 0 && <span aria-hidden className="pointer-events-none absolute inset-x-0 border-t border-line-strong" style={{ top: `${zeroPct}%` }} />}
            {axis && grid.map((t, i) => (
              <span key={tickValues[i]} aria-hidden className="pointer-events-none absolute inset-x-0 border-t border-dashed border-chart-track" style={{ top: `${t * 100}%` }} />
            ))}
            {labels.map((label, i) => (
              <div
                key={`${label}-${i}`}
                className="relative flex h-full min-w-0 flex-1 flex-col justify-end gap-1"
                style={{ minWidth: columnMin }}
              >
                {labelValues && valuePosition === "top" && (
                  <span className="text-center text-tiny font-medium text-ink tabular-nums">
                    {compact(columnPeak[i])}
                  </span>
                )}
                {labelValues && valuePosition === "bar" && (
                  /* a spacer keeps the plot below the tallest possible label */
                  <span aria-hidden className="h-4" />
                )}
                {/* column-reverse makes the BOTTOM the main-start edge, so a
                    stack anchors with justify-start; justify-center would float it. */}
                <div className={`relative flex h-full gap-0.5 ${stacked ? "flex-col-reverse items-center justify-start" : "items-end justify-center"}`}>
                  {labelValues && valuePosition === "bar" && (
                    <span
                      className="pointer-events-none absolute inset-x-0 text-center text-tiny font-medium text-ink tabular-nums"
                      style={{ bottom: `calc(${(columnPeak[i] / max) * 100}% + 4px)`, opacity: settled ? 1 : 0, transition: drawing ? `opacity 400ms var(--ease-out-quint) ${600 + i * 60}ms` : undefined }}
                    >
                      {compact(columnPeak[i])}
                    </span>
                  )}
                  {series.map((s, si) => {
                    const value = s.values[i] ?? 0;
                    const tone = toneOf(s.color, si);
                    const dimmed = highlight !== undefined && highlight !== i;
                    const text = `${s.name} · ${format(value)}`;
                    return (
                      <button
                        key={`${s.name}-${si}`}
                        type="button"
                        aria-label={`${s.name}, ${label}: ${value.toLocaleString()}`}
                        onMouseEnter={(e) => onEnter(e, text)}
                        onFocus={(e) => onEnter(e, text)}
                        onBlur={hide}
                        className={`w-full transition-opacity duration-150 hover:opacity-80 ${value < 0 ? "origin-top" : "origin-bottom"} ${thin ? "max-w-3 rounded-[2px]" : "rounded-sm"} ${value < 0 ? "bg-ink-3" : SERIES_BG[tone]} ${dimmed ? "opacity-25" : ""}`}
                        style={{
                          height: `${(Math.abs(value) / span) * 100}%`,
                          /* below zero the bar hangs from the baseline: pushed down by the
                             positive room above it, in muted ink so the sign reads at a glance */
                          marginBottom: minV < 0 ? `${((Math.min(value, 0) - minV) / span) * 100}%` : undefined,
                          /* scaleY composites on the GPU; animating height relays out every frame */
                          transform: settled ? "scaleY(1)" : "scaleY(0)",
                          transition: drawing ? `transform 900ms var(--ease-out-quint) ${i * 60}ms` : undefined,
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <span />
          <div className="flex gap-1.5 pt-1">
            {labels.map((label, i) => (
              <span key={`${label}-${i}`} className="min-w-0 flex-1 truncate text-center text-tiny text-ink-3" style={{ minWidth: columnMin }}>{label}</span>
            ))}
          </div>
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
  animate = FORMIC_CONFIG.motion,
  legend = true,
  curve = "linear",
  backdrop = false,
  guides = false,
  axis = false,
  floor = true,
  format = compact,
  endMarker = false,
  tooltip = "point",
  className = "",
}: {
  labels?: string[];
  /** values are positional against `labels` — same length, same order */
  series?: Series[];
  area?: boolean;
  /** true: a dot at every value. "hover": the dot appears only under the pointer or focus, for a long series */
  points?: boolean | "hover";
  /** the legend a multi-series chart carries; off only when the surrounding card already names the series with the same dots */
  legend?: boolean;
  /** plot height in px; with `fill` it becomes the minimum */
  height?: number;
  /** stretch to the parent's height — inside a Panel body this fills the card */
  fill?: boolean;
  /** the line reveals left to right once, points follow; off for live-updating charts */
  animate?: boolean;
  /** linear: point to point. step: a plateau per label with slanted joins, for hourly or daily totals. smooth: one calm curve through the points, for a long series like a year of value */
  curve?: "linear" | "step" | "smooth";
  /** faint columns under the line at every label, the way a sales-by-hour chart shows volume behind the trend */
  backdrop?: boolean;
  /** dashed vertical guide at every label */
  guides?: boolean;
  /** a value axis on the left: top, middle and bottom of the scale as text, gridlines dashed */
  axis?: boolean;
  /** the scale starts at zero (default). false lets it start at the lowest value, so a series that lives between 65K and 131K uses the whole height */
  floor?: boolean;
  /** how the axis prints a value, e.g. (n) => `$${compact(n)}` */
  format?: (n: number) => string;
  /** a ringed dot on the last value of every solid series: "this is now" */
  endMarker?: boolean;
  /** point: each dot is its own target. shared: one target per label, the tip lists every series at that label under a crosshair */
  tooltip?: "point" | "shared";
  className?: string;
}) {
  const gradientId = useId();
  const [cross, setCross] = useState<number | null>(null);
  const shared = tooltip === "shared";
  const { tip, show, hide } = useTip();
  const { settled, drawing } = useEntrance(animate);
  const W = 100, H = 40;                      // viewBox units; CSS does the sizing
  const all = series.flatMap((s) => s.values);
  const max = niceMax(Math.max(0, ...all));
  /* a series can go below zero (a return, a delta): the scale then runs
     from the lowest value, and the area closes on the zero line */
  const min = floor ? Math.min(0, ...all) : Math.min(...all);
  const span = max - min || 1;
  const yOf = (v: number) => H - ((v - min) / span) * H;
  /* the area closes on zero, or on the floor of the plot when zero is off-scale */
  const zeroY = Math.min(H, Math.max(0, yOf(0)));
  const slots = Math.max(labels.length, ...series.map((s) => s.values.length), 1);
  const step = slots > 1 ? W / (slots - 1) : W;
  const grid = [0, 0.5, 1];
  const [labelRow, rowWidth] = useWidth<HTMLDivElement>();
  const every = rowWidth ? Math.max(1, Math.ceil((labels.length * 34) / rowWidth)) : 1;

  const onPoint = (event: React.MouseEvent | React.FocusEvent, node: ReactNode) => {
    const [x, y] = anchorOf(event);
    show(x, y, node);
  };

  return (
    <div className={`flex w-full flex-col ${fill ? "h-full min-h-0" : ""} ${className}`}>
      {legend && series.length > 1 && <div className="mb-3 shrink-0"><ChartLegend series={series} /></div>}
      {/* With an axis the chart is a two-column grid: the value labels down
          the left (spanning only the plot row), the plot and its x labels on
          the right. Without one the first column is simply empty. */}
      <div className={`grid min-h-0 grid-cols-[auto_1fr] ${fill ? "flex-1 grid-rows-[minmax(0,1fr)_auto]" : "grid-rows-[auto_auto]"}`}>
        {axis ? (
          <div aria-hidden className="flex flex-col justify-between pr-2 text-right text-tiny text-ink-3 tabular-nums">
            {grid.map((t) => <span key={t} className="leading-none">{format(max - t * span)}</span>)}
          </div>
        ) : <span />}
      {/* Filling: the svg is absolute so its 100×40 viewBox aspect cannot set
          the height; the wrapper takes the panel's height (flex-1) or, in an
          auto-height row, exactly `height`. Dots are %-positioned in the same
          wrapper, so they track whatever height CSS settles on. */}
      <div
        className={`relative ${fill ? "min-h-0" : ""}`}
        style={fill ? { minHeight: height } : undefined}
        onMouseLeave={() => { hide(); setCross(null); }}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          style={{ ...(fill ? {} : { height }), ...(drawing ? { animation: "reveal-x 1400ms var(--ease-out-quint) both" } : {}) }}
          className={`block w-full overflow-visible ${fill ? "absolute inset-0 h-full" : ""}`}
          role="img"
          aria-label={series.map((s) => `${s.name}: ${s.values.map((v) => v.toLocaleString()).join(", ")}`).join(". ")}
        >
          {grid.map((t) => (
            <line
              key={t} x1="0" x2={W} y1={H * t} y2={H * t}
              className="stroke-chart-track" strokeWidth="1" strokeDasharray={axis ? "3 3" : undefined} vectorEffect="non-scaling-stroke"
            />
          ))}
          {guides && labels.map((l, i) => (
            <line key={`g-${l}-${i}`} x1={i * step} x2={i * step} y1="0" y2={H} className="stroke-chart-track" strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
          ))}
          {shared && cross !== null && (
            <line x1={cross * step} x2={cross * step} y1="0" y2={H} className="stroke-ink-3" strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
          )}
          {backdrop && series[0] && series[0].values.map((v, i) => (
            <rect key={`b-${i}`} x={i * step - step * 0.28} width={step * 0.56} y={yOf(v)} height={Math.max(0, zeroY - yOf(v))} className="fill-chart-track" opacity="0.6" />
          ))}
          {series.map((s, si) => {
            const tone = toneOf(s.color, si);
            /* step: each value is a plateau centred on its label; consecutive
               plateaus join with a straight slant. smooth: a Catmull-Rom curve
               through every point, the same one the Sparkline draws. */
            const plateau = step * 0.3;
            const pts = s.values.map((v, i) => ({ x: i * step, y: yOf(v) }));
            const d = curve === "step"
              ? s.values.map((v, i) => `${i ? "L" : "M"}${Math.max(0, i * step - plateau)} ${yOf(v)} L${Math.min(W, i * step + plateau)} ${yOf(v)}`).join(" ")
              : curve === "smooth" && pts.length > 1
                ? smoothPath(pts)
                : pts.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" ");
            return (
              /* The colour class goes on the <g>, not the path: a gradient
                 stop resolves currentColor from its OWN inherited colour, so
                 putting it on the sibling path leaves the fill ambient ink. */
              <g key={`${s.name}-${si}`} className={s.style === "dashed" ? "text-ink-3" : SERIES_TEXT[tone]}>
                {area && s.style !== "dashed" && (
                  <>
                    <defs>
                      <linearGradient id={`${gradientId}-${si}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
                        <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d={`${d} L${(s.values.length - 1) * step} ${zeroY} L0 ${zeroY} Z`} fill={`url(#${gradientId}-${si})`} />
                  </>
                )}
                <path
                  d={d} fill="none" strokeWidth={s.style === "dashed" ? "1.5" : "2"}
                  strokeLinecap="round" strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  strokeDasharray={s.style === "dashed" ? "5 5" : undefined}
                  className={s.style === "dashed" ? "stroke-ink-3" : SERIES_STROKE[tone]}
                />
              </g>
            );
          })}
        </svg>

        {endMarker && series.filter((s) => s.style !== "dashed" && s.values.length).map((s, si) => {
          const i = s.values.length - 1;
          return (
            <span
              key={`end-${s.name}-${si}`} aria-hidden
              className={`pointer-events-none absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-surface ${SERIES_TEXT[toneOf(s.color, si)]} border-current`}
              style={{ left: `${(i / Math.max(slots - 1, 1)) * 100}%`, top: `${(yOf(s.values[i]) / H) * 100}%`, opacity: settled ? 1 : 0, transition: drawing ? "opacity 400ms var(--ease-out-quint) 1300ms" : undefined }}
            >
              <span className="absolute inset-0.5 rounded-full bg-current" />
            </span>
          );
        })}
        {/* Dots live in HTML, not SVG: the stretched viewBox would turn
            circles into ellipses, and they need to be real focus targets.
            The button is a 24px hit area; the visible dot is the inner span.
            points="hover" keeps the targets but shows the dot only while it
            is hovered or focused — for a long series where 50 dots would
            bead the line. */}
        {shared && Array.from({ length: slots }, (_, i) => {
          const node = (
            <span className="flex flex-col gap-1">
              <span className="font-medium text-ink">{labels[i] ?? i + 1}</span>
              {series.map((s, si) => (
                <span key={`${s.name}-${si}`} className="flex items-center gap-1.5">
                  {s.style === "dashed" ? <span className="w-2.5 border-t border-dashed border-ink-3" /> : <span className={`size-2 rounded-full ${SERIES_BG[toneOf(s.color, si)]}`} />}
                  <span className="text-ink-2">{s.name}</span>
                  <span className="ml-auto pl-3 font-medium tabular-nums">{format(s.values[i] ?? 0)}</span>
                </span>
              ))}
            </span>
          );
          const enter = (e: React.MouseEvent | React.FocusEvent) => { setCross(i); const r = (e.currentTarget as Element).getBoundingClientRect(); show(r.left + r.width / 2, r.top, node); };
          const leave = () => { setCross(null); hide(); };
          return (
            <button
              key={`slot-${i}`}
              type="button"
              aria-label={`${labels[i] ?? i + 1}: ${series.map((s) => `${s.name} ${format(s.values[i] ?? 0)}`).join(", ")}`}
              onMouseEnter={enter}
              onFocus={enter}
              onMouseLeave={leave}
              onBlur={leave}
              className="absolute inset-y-0 -translate-x-1/2 rounded-sm"
              style={{ left: `${(i / Math.max(slots - 1, 1)) * 100}%`, width: `max(${HIT}px, ${100 / Math.max(slots, 1)}%)` }}
            />
          );
        })}
        {points && series.map((s, si) => {
          const tone = toneOf(s.color, si);
          if (s.style === "dashed") return null;
          return s.values.map((v, i) => shared ? (
            <span
              key={`${s.name}-${si}-${i}`} aria-hidden
              className={`pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface transition-transform duration-150 ${SERIES_BG[tone]} ${points === "hover" && cross !== i ? "scale-0" : ""}`}
              style={{ left: `${(i / Math.max(slots - 1, 1)) * 100}%`, top: `${(yOf(v) / H) * 100}%`, opacity: settled ? 1 : 0, transition: drawing ? `opacity 400ms var(--ease-out-quint) ${900 + i * 40}ms` : undefined }}
            />
          ) : (
            <button
              key={`${s.name}-${si}-${i}`}
              type="button"
              aria-label={`${s.name}, ${labels[i] ?? i + 1}: ${v.toLocaleString()}`}
              onMouseEnter={(e) => onPoint(e, `${s.name} · ${format(v)}`)}
              onFocus={(e) => onPoint(e, `${s.name} · ${format(v)}`)}
              onBlur={hide}
              className="group absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
              style={{
                opacity: settled ? 1 : 0,
                transition: drawing ? `opacity 400ms var(--ease-out-quint) ${900 + i * 40}ms` : undefined,
                width: HIT, height: HIT,
                left: `${(i / Math.max(slots - 1, 1)) * 100}%`,
                /* percent, not px: the plot's height is whatever CSS gave it */
                top: `${(yOf(v) / H) * 100}%`,
              }}
            >
              <span className={`size-2.5 rounded-full border-2 border-surface transition-transform duration-150 ${SERIES_BG[tone]} ${points === "hover" ? "scale-0 group-hover:scale-100 group-focus-visible:scale-100" : ""}`} />
            </button>
          ));
        })}
        <ChartTip tip={tip} />
      </div>
      <span />
      {/* only as many labels as fit at ~34px each; the rest keep their slot
          but stay blank, so a year of months reads Oct · Dec · Feb on a phone
          instead of twelve "O…" */}
      <div ref={labelRow} className="mt-2 flex min-w-0 shrink-0 justify-between">
        {labels.map((l, i) => (
          <span key={`${l}-${i}`} className="min-w-0 truncate text-tiny text-ink-3">{i % every === 0 ? l : ""}</span>
        ))}
      </div>
      </div>
    </div>
  );
}

/* ═══════════ DonutChart ═══════════ */
/* One ring, two jobs. Alone it is a progress ring: `value` of `max`, the
 * number in the middle. With `segments` it is a share-of-whole: one arc
 * per part in the categorical ramp, the leading part named in the middle
 * until a segment is hovered or its legend row is focused, when that
 * part takes the centre. The legend carries every value as text, so the
 * colours are never the only way to read it (rule 16). */
export type DonutSegment = { name: string; value: number; color?: ChartColor; detail?: string };

export function DonutChart({
  value = 500,
  max = 720,
  label = "Visitors",
  color = 4,
  size = 116,
  segments,
  legend = true,
  center,
  format = compact,
  animate = FORMIC_CONFIG.motion,
  className = "",
}: {
  value?: number;
  max?: number;
  label?: string;
  color?: ChartColor;
  size?: number;
  /** parts of a whole, largest first; replaces `value`/`max` */
  segments?: DonutSegment[];
  /** with `segments`: true for a wrapped legend under the ring; "list" for rows beside it with each count and share, the ring empty in the middle */
  legend?: boolean | "list";
  /** with `segments`: what the middle shows instead of the leading part — a total, say */
  center?: ReactNode;
  /** how a value prints in the centre and the legend */
  format?: (n: number) => string;
  /** the arc sweeps from zero to its value once; off for live-updating charts */
  animate?: boolean;
  className?: string;
}) {
  const { settled, drawing } = useEntrance(animate);
  const [active, setActive] = useState<number | null>(null);
  const r = 42, C = 2 * Math.PI * r;
  if (segments && segments.length) {
    const total = segments.reduce((n, s) => n + s.value, 0) || 1;
    const gap = segments.length > 1 ? 1.2 : 0;
    let start = 0;
    const arcs = segments.map((seg, i) => {
      const len = (seg.value / total) * C;
      const arc = { seg, i, start, len: Math.max(0, len - gap), tone: toneOf(seg.color, i) };
      start += len;
      return arc;
    });
    const lead = arcs[active ?? 0];
    const sweep = settled ? 1 : 0;
    const list = legend === "list";
    const rowFor = ({ seg, i, tone }: typeof arcs[number]) => (
      <li key={`${seg.name}-${i}`} className={list ? "w-full" : undefined}>
        {/* a row is a button so the keyboard can bring each part to the centre */}
        <button
          type="button"
          aria-label={`${seg.name}: ${format(seg.value)}, ${Math.round((seg.value / total) * 100)}%`}
          onMouseEnter={() => setActive(i)}
          onFocus={() => setActive(i)}
          onBlur={() => setActive(null)}
          className={`flex items-center gap-1.5 rounded-sm px-1 transition-colors duration-150 ${list ? "h-7 w-full gap-2.5 text-caption" : "h-6 text-tiny"} ${active === i ? "text-ink" : "text-ink-2"}`}
        >
          <span className={`size-2 shrink-0 rounded-full ${SERIES_BG[tone]}`} />
          <span className={list ? "min-w-0 flex-1 truncate text-left" : undefined}>{seg.name}</span>
          {list && <span className="w-10 shrink-0 text-right font-medium text-ink tabular-nums">{format(seg.value)}</span>}
          <span className={`text-ink-3 tabular-nums ${list ? "w-10 shrink-0 text-right text-small" : ""}`}>{Math.round((seg.value / total) * 100)}%</span>
        </button>
      </li>
    );
    return (
      <div className={`flex w-full ${list ? "flex-wrap items-center justify-center gap-6" : "flex-col items-center gap-4"} ${className}`}>
        <div
          className="relative shrink-0"
          style={{ width: size, height: size, maxWidth: "100%" }}
          role="img"
          aria-label={`${label}: ${segments.map((s) => `${s.name} ${format(s.value)}, ${Math.round((s.value / total) * 100)}%`).join("; ")}`}
          onMouseLeave={() => setActive(null)}
        >
          <svg viewBox="0 0 100 100" className="size-full -rotate-90">
            {arcs.map(({ seg, i, start: at, len, tone }) => (
              <circle
                key={`${seg.name}-${i}`}
                cx="50" cy="50" r={r} fill="none" strokeWidth="11"
                className={`transition-opacity duration-150 ${SERIES_STROKE[tone]} ${active !== null && active !== i ? "opacity-40" : ""}`}
                strokeDasharray={`${len * sweep} ${C}`}
                strokeDashoffset={-at * sweep}
                style={{ transition: `stroke-dasharray ${drawing ? 1100 : 520}ms var(--ease-out-quint), stroke-dashoffset ${drawing ? 1100 : 520}ms var(--ease-out-quint), opacity 150ms` }}
                onMouseEnter={() => setActive(i)}
              />
            ))}
          </svg>
          {center !== undefined && active === null ? (
            <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-4 text-center">{center}</span>
          ) : (
            <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0.5 px-4 text-center">
              <span className="text-title font-semibold text-ink tabular-nums">{format(lead.seg.value)}</span>
              <span className="max-w-full truncate text-tiny text-ink-2">{lead.seg.name}</span>
              {lead.seg.detail && <span className="max-w-full truncate text-tiny text-ink-3">{lead.seg.detail}</span>}
            </span>
          )}
        </div>
        {legend && (
          <ul className={list ? "flex min-w-44 flex-1 flex-col gap-0.5" : "flex w-full flex-wrap justify-center gap-x-3.5 gap-y-1.5"}>
            {arcs.map(rowFor)}
          </ul>
        )}
      </div>
    );
  }
  const pct = Math.max(0, Math.min(1, max === 0 ? 0 : value / max));
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
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth={size < 80 ? 7 : 11} className="stroke-chart-track" />
        <circle
          cx="50" cy="50" r={r} fill="none" strokeWidth={size < 80 ? 7 : 11} strokeLinecap="round"
          className={SERIES_STROKE[color]}
          strokeDasharray={`${shown * C} ${C}`}
          style={{ transition: `stroke-dasharray ${drawing ? 1100 : 520}ms var(--ease-out-quint)` }}
        />
      </svg>
      {/* under 80px there is room for the number alone, and only in small type */}
      {size < 80 ? (
        <span className="absolute inset-0 flex items-center justify-center text-tiny font-semibold text-ink tabular-nums">{format(value)}</span>
      ) : (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
          <span className="text-title font-semibold text-ink tabular-nums">{drawing ? <CountUp value={value} format={compact} duration={1100} /> : compact(value)}</span>
          <span className="text-tiny text-ink-3">{label}</span>
        </span>
      )}
    </div>
  );
}

/* ═══════════ RadarChart ═══════════ */
/* Shares across a handful of axes — work by discipline, hours by team —
 * as one polygon per series on rings. SVG for the geometry (a square
 * viewBox, so nothing stretches), HTML for the axis labels and the
 * vertex targets so type stays on the ramp and every value is a 24px
 * focusable mark with a tooltip. The polygon grows from the centre once. */
const DEFAULT_RADAR_AXES = ["Brand", "Web", "Product", "Motion", "Print"];
const DEFAULT_RADAR_SERIES: Series[] = [{ name: "Share of work", values: [34, 27, 21, 11, 7] }];

export function RadarChart({
  axes = DEFAULT_RADAR_AXES,
  series = DEFAULT_RADAR_SERIES,
  max,
  rings = 4,
  size = 300,
  format = (n: number) => String(n),
  detail,
  legend = true,
  animate = FORMIC_CONFIG.motion,
  className = "",
}: {
  /** one label per axis, clockwise from the top */
  axes?: string[];
  /** values are positional against `axes` */
  series?: Series[];
  /** scale ceiling; defaults to a rounded-up largest value */
  max?: number;
  rings?: number;
  /** the widest the chart gets; it is fluid below that */
  size?: number;
  /** how a value prints in the tooltip, e.g. (n) => `${n}%` */
  format?: (n: number) => string;
  /** a second tooltip line per vertex, e.g. (value, axis) => `${projects[axis]} projects` */
  detail?: (value: number, axisIndex: number, series: Series) => ReactNode;
  legend?: boolean;
  animate?: boolean;
  className?: string;
}) {
  const { tip, show, hide } = useTip();
  const { settled, drawing } = useEntrance(animate);
  const n = Math.max(3, axes.length);
  const ceiling = max ?? niceMax(Math.max(0, ...series.flatMap((s) => s.values)));
  const R = 32, CX = 50, CY = 50;
  const labelR = 37;
  const angle = (i: number) => -Math.PI / 2 + (i / n) * Math.PI * 2;
  const at = (i: number, k: number) => ({ x: CX + Math.cos(angle(i)) * R * k, y: CY + Math.sin(angle(i)) * R * k });
  const ring = (k: number) => Array.from({ length: n }, (_, i) => { const p = at(i, k); return `${p.x},${p.y}`; }).join(" ");
  const onVertex = (event: React.MouseEvent | React.FocusEvent, node: ReactNode) => {
    const [x, y] = anchorOf(event);
    show(x, y, node);
  };
  return (
    <div className={`flex w-full flex-col items-center gap-3 ${className}`}>
      <div className="relative aspect-square w-full" style={{ maxWidth: size }} onMouseLeave={hide}>
        <svg
          viewBox="0 0 100 100"
          className="block size-full overflow-visible"
          role="img"
          aria-label={series.map((s) => `${s.name}: ${axes.map((a, i) => `${a} ${format(s.values[i] ?? 0)}`).join(", ")}`).join(". ")}
        >
          {Array.from({ length: rings }, (_, i) => (
            <polygon key={i} points={ring((i + 1) / rings)} fill="none" className="stroke-chart-track" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          ))}
          {axes.map((a, i) => {
            const p = at(i, 1);
            return <line key={`${a}-${i}`} x1={CX} y1={CY} x2={p.x} y2={p.y} className="stroke-chart-track" strokeWidth="1" vectorEffect="non-scaling-stroke" />;
          })}
          {series.map((s, si) => {
            const tone = toneOf(s.color, si);
            const pts = axes.map((_, i) => { const p = at(i, Math.max(0, Math.min(1, (s.values[i] ?? 0) / ceiling))); return `${p.x},${p.y}`; }).join(" ");
            return (
              <g key={`${s.name}-${si}`} className={SERIES_TEXT[tone]} style={{ transform: settled ? "scale(1)" : "scale(0)", transformOrigin: "50% 50%", transformBox: "view-box", transition: drawing ? `transform 1100ms var(--ease-out-quint) ${si * 120}ms` : undefined }}>
                <polygon points={pts} fill="currentColor" fillOpacity="0.24" />
                <polygon points={pts} fill="none" className={SERIES_STROKE[tone]} strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              </g>
            );
          })}
        </svg>
        {/* axis labels, pulled outward from each vertex and aligned away from the centre */}
        {axes.map((a, i) => {
          const c = Math.cos(angle(i)), sn = Math.sin(angle(i));
          const x = CX + c * labelR, y = CY + sn * labelR;
          const tx = c > 0.2 ? "0" : c < -0.2 ? "-100%" : "-50%";
          const ty = sn > 0.2 ? "0" : sn < -0.2 ? "-100%" : "-50%";
          return (
            <span key={`${a}-${i}`} aria-hidden className="absolute max-w-[30%] truncate text-tiny text-ink-3" style={{ left: `${x}%`, top: `${y}%`, transform: `translate(${tx}, ${ty})` }}>{a}</span>
          );
        })}
        {series.map((s, si) => {
          const tone = toneOf(s.color, si);
          return axes.map((a, i) => {
            const v = s.values[i] ?? 0;
            const p = at(i, Math.max(0, Math.min(1, v / ceiling)));
            const node = detail
              ? <span className="flex flex-col gap-0.5"><span>{s.name} · {format(v)}</span><span className="text-ink-3">{detail(v, i, s)}</span></span>
              : `${s.name} · ${format(v)}`;
            return (
              <button
                key={`${s.name}-${si}-${i}`}
                type="button"
                aria-label={`${s.name}, ${a}: ${format(v)}`}
                onMouseEnter={(e) => onVertex(e, node)}
                onFocus={(e) => onVertex(e, node)}
                onBlur={hide}
                className="group absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
                style={{ width: HIT, height: HIT, left: `${p.x}%`, top: `${p.y}%`, opacity: settled ? 1 : 0, transition: drawing ? `opacity 400ms var(--ease-out-quint) ${900 + i * 40}ms` : undefined }}
              >
                <span className={`size-2.5 rounded-full border-2 border-surface transition-transform duration-150 group-hover:scale-125 group-focus-visible:scale-125 ${SERIES_BG[tone]}`} />
              </button>
            );
          });
        })}
        <ChartTip tip={tip} />
      </div>
      {legend && series.length > 1 && <ChartLegend series={series} />}
    </div>
  );
}

/* ═══════════ ScatterChart ═══════════ */
/* Two quantities per thing, a third as the mark's size — deal size
 * against days to close, bubble for how many. SVG axes and guides, the
 * marks as HTML buttons (real targets, real tooltips with every field
 * as text), a dashed crosshair to the hovered mark. One colour per
 * point in the ramp with a legend, because the points are categories. */
export type ScatterPoint = { name: string; x: number; y: number; size?: number; color?: ChartColor };
const DEFAULT_POINTS: ScatterPoint[] = [
  { name: "Referrals", x: 184_000, y: 31, size: 22 }, { name: "Website", x: 96_000, y: 48, size: 34 },
  { name: "Repeat clients", x: 212_000, y: 19, size: 15 }, { name: "Events", x: 58_000, y: 62, size: 9 }, { name: "Directories", x: 41_000, y: 74, size: 6 },
];
export function ScatterChart({
  points = DEFAULT_POINTS,
  xLabel = "Average project value",
  yLabel = "Days to sign",
  sizeLabel = "Projects",
  formatX = (n: number) => `ETB ${compact(n)}`,
  formatY = (n: number) => `${n}d`,
  height = 220,
  legend = true,
  animate = FORMIC_CONFIG.motion,
  className = "",
}: {
  points?: ScatterPoint[];
  xLabel?: string;
  yLabel?: string;
  /** what `size` counts, for the tooltip */
  sizeLabel?: string;
  formatX?: (n: number) => string;
  formatY?: (n: number) => string;
  height?: number;
  legend?: boolean;
  animate?: boolean;
  className?: string;
}) {
  const { tip, show, hide } = useTip();
  const { settled, drawing } = useEntrance(animate);
  const [cross, setCross] = useState<number | null>(null);
  const maxX = niceMax(Math.max(0, ...points.map((p) => p.x)));
  const maxY = niceMax(Math.max(0, ...points.map((p) => p.y)));
  const maxS = Math.max(1, ...points.map((p) => p.size ?? 1));
  const xTicks = niceTicks(0, maxX), yTicks = niceTicks(0, maxY);
  const px = (p: ScatterPoint) => (p.x / maxX) * 100;
  const py = (p: ScatterPoint) => 100 - (p.y / maxY) * 100;
  const r = (p: ScatterPoint) => 6 + Math.sqrt((p.size ?? 1) / maxS) * 10;
  return (
    <div className={`flex w-full flex-col gap-3 ${className}`}>
      <div className="grid grid-cols-[auto_1fr] grid-rows-[auto_auto]">
        <div aria-hidden className="relative w-12 pr-2 text-right text-tiny text-ink-3 tabular-nums">
          {yTicks.map((v) => <span key={v} className="absolute right-2 leading-none" style={{ top: `${100 - (v / maxY) * 100}%`, transform: `translateY(-${100 - (v / maxY) * 100}%)` }}>{formatY(v)}</span>)}
        </div>
        <div className="relative" style={{ height }} onMouseLeave={() => { hide(); setCross(null); }}>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" role="img" aria-label={`${yLabel} against ${xLabel}. ${points.map((p) => `${p.name}: ${formatX(p.x)}, ${formatY(p.y)}${p.size !== undefined ? `, ${sizeLabel} ${p.size}` : ""}`).join(". ")}`}>
            {yTicks.map((v) => <line key={`h${v}`} x1="0" x2="100" y1={100 - (v / maxY) * 100} y2={100 - (v / maxY) * 100} className="stroke-chart-track" strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />)}
            {xTicks.map((v) => <line key={`v${v}`} x1={(v / maxX) * 100} x2={(v / maxX) * 100} y1="0" y2="100" className="stroke-chart-track" strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />)}
            {cross !== null && points[cross] && (
              <>
                <line x1={px(points[cross])} x2={px(points[cross])} y1="0" y2="100" className="stroke-ink-3" strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
                <line x1="0" x2="100" y1={py(points[cross])} y2={py(points[cross])} className="stroke-ink-3" strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
              </>
            )}
          </svg>
          {points.map((p, i) => {
            const tone = toneOf(p.color, i);
            const node = (
              <span className="flex flex-col gap-0.5">
                <span className="font-medium text-ink">{p.name}</span>
                <span className="text-ink-2">{xLabel}: <span className="text-ink tabular-nums">{formatX(p.x)}</span></span>
                <span className="text-ink-2">{yLabel}: <span className="text-ink tabular-nums">{formatY(p.y)}</span></span>
                {p.size !== undefined && <span className="text-ink-2">{sizeLabel}: <span className="text-ink tabular-nums">{p.size}</span></span>}
              </span>
            );
            const enter = (e: React.MouseEvent | React.FocusEvent) => { setCross(i); const [x, y] = anchorOf(e); show(x, y, node); };
            return (
              <button
                key={`${p.name}-${i}`}
                type="button"
                aria-label={`${p.name}: ${xLabel} ${formatX(p.x)}, ${yLabel} ${formatY(p.y)}${p.size !== undefined ? `, ${sizeLabel} ${p.size}` : ""}`}
                onMouseEnter={enter}
                onFocus={enter}
                onBlur={() => { setCross(null); hide(); }}
                className="group absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
                style={{ left: `${px(p)}%`, top: `${py(p)}%`, width: Math.max(HIT, r(p) * 2), height: Math.max(HIT, r(p) * 2) }}
              >
                <span
                  className={`rounded-full transition-transform duration-150 group-hover:scale-110 ${SERIES_BG[tone]} ${cross !== null && cross !== i ? "opacity-50" : ""}`}
                  style={{ width: r(p) * 2, height: r(p) * 2, transform: settled ? "scale(1)" : "scale(0)", transition: drawing ? `transform 700ms var(--ease-out-quint) ${i * 80}ms` : undefined }}
                />
              </button>
            );
          })}
          <ChartTip tip={tip} />
        </div>
        <span />
        <div aria-hidden className="relative mt-2 h-4">
          {xTicks.map((v) => (
            <span key={v} className={`absolute top-0 text-tiny text-ink-3 tabular-nums ${v === 0 ? "" : v === maxX ? "-translate-x-full" : "-translate-x-1/2"}`} style={{ left: `${(v / maxX) * 100}%` }}>{formatX(v)}</span>
          ))}
        </div>
      </div>
      {legend && <ChartLegend series={points.map((p, i) => ({ name: p.name, color: toneOf(p.color, i), values: [] }))} />}
    </div>
  );
}

/* ═══════════ ShareBar ═══════════ */
/* One bar split into its parts — where the week went, what the fleet
 * is doing — each part named on a tick above with its share, in the
 * categorical ramp, a tooltip and an aria-label per part. The share
 * is printed on the tick rather than inside the part: ink on a chart
 * colour does not reach 4.5:1 in every mode (rule 5), a tick does. */
export type SharePart = { name: string; value: number; color?: ChartColor };
const DEFAULT_SHARES: SharePart[] = [
  { name: "Design", value: 38 }, { name: "Client calls", value: 22 }, { name: "Reviews", value: 21 }, { name: "Admin", value: 19 },
];
export function ShareBar({
  parts = DEFAULT_SHARES,
  labels = true,
  format = (share: number) => `${Math.round(share)}%`,
  height = 40,
  animate = FORMIC_CONFIG.motion,
  className = "",
}: {
  parts?: SharePart[];
  /** the names and shares on ticks above the bar; off when rows under the bar already carry them */
  labels?: boolean;
  /** how a share (0–100) prints */
  format?: (share: number) => string;
  height?: number;
  animate?: boolean;
  className?: string;
}) {
  const { tip, show, hide } = useTip();
  const { settled, drawing } = useEntrance(animate);
  const total = parts.reduce((n, p) => n + p.value, 0) || 1;
  const shares = parts.map((p) => (p.value / total) * 100);
  return (
    <div className={`flex w-full flex-col gap-2 ${className}`} onMouseLeave={hide}>
      {labels && (
        <div aria-hidden className="flex">
          {parts.map((p, i) => (
            <span key={`${p.name}-${i}`} className="flex min-w-0 flex-col gap-1 pr-2" style={{ width: `${shares[i]}%` }}>
              <span className="truncate text-small text-ink-3"><span className="font-medium text-ink-2">{format(shares[i])}</span> {p.name}</span>
              <span className="h-1.5 w-px bg-ink-3" />
            </span>
          ))}
        </div>
      )}
      <div role="group" aria-label={parts.map((p, i) => `${p.name} ${format(shares[i])}`).join(", ")} className="flex w-full gap-0.5 overflow-hidden rounded-control" style={{ height }}>
        {parts.map((p, i) => {
          const tone = toneOf(p.color, i);
          const text = `${p.name} · ${format(shares[i])}`;
          return (
            <button
              key={`${p.name}-${i}`}
              type="button"
              aria-label={`${p.name}: ${format(shares[i])}`}
              onMouseEnter={(e) => { const [x, y] = anchorOf(e); show(x, y, text); }}
              onFocus={(e) => { const [x, y] = anchorOf(e); show(x, y, text); }}
              onBlur={hide}
              className={`min-w-0 transition-opacity duration-150 hover:opacity-85 ${SERIES_BG[tone]}`}
              style={{ width: `${shares[i]}%`, minWidth: HIT, transform: settled ? "scaleX(1)" : "scaleX(0)", transformOrigin: "left", transition: drawing ? `transform 900ms var(--ease-out-quint) ${i * 80}ms` : undefined }}
            />
          );
        })}
      </div>
      <ChartTip tip={tip} />
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
  animate = FORMIC_CONFIG.motion,
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

/* ═══════════ MiniBars ═══════════ */
/* The bar sparkline: a row of capsule columns inside a tile. Two looks:
 * `track` draws each column's full height in the track colour with the
 * value filled from the bottom (the Order tile), and `split` stacks a
 * second series on top of the first in the next chart colour (profit
 * over cost). Same entrance as the bars: they grow from the baseline. */
export function MiniBars({
  values = [12, 18, 9, 22, 16, 25, 14],
  split,
  names = ["Value", "Second"],
  labels,
  track = true,
  color = 1,
  height = 64,
  legend = false,
  format = (v) => v.toLocaleString(),
  animate = FORMIC_CONFIG.motion,
  className = "",
}: {
  values?: number[];
  /** a second series stacked on top of `values`, one entry per column */
  split?: number[];
  /** what the two series are called: the tooltip and legend say it, so two colours never need guessing */
  names?: [string, string] | string[];
  /** one per column, for the tooltip ("Mar · Revenue 120") */
  labels?: string[];
  /** draw the column's full height in the track colour behind the value */
  track?: boolean;
  color?: ChartColor;
  height?: number;
  /** a two-dot legend under a stacked chart */
  legend?: boolean;
  format?: (v: number) => string;
  animate?: boolean;
  className?: string;
}) {
  const { settled, drawing } = useEntrance(animate);
  const { tip, show, hide } = useTip();
  const max = niceMax(Math.max(1, ...values.map((v, i) => v + (split?.[i] ?? 0))));
  const second: ChartColor = (color % 5 + 1) as ChartColor;
  const bar = (i: number, v: number, top: number) => {
    const at = labels?.[i] ? `${labels[i]} · ` : "";
    return split ? `${at}${names[0]} ${format(v)}, ${names[1]} ${format(top)}` : `${at}${format(v)}`;
  };
  const tipNode = (i: number, v: number, top: number) =>
    split ? (
      <span className="flex flex-col gap-0.5">
        {labels?.[i] && <span className="opacity-70">{labels[i]}</span>}
        <span className="flex items-center gap-1.5"><span className={`size-1.5 rounded-full ${SERIES_BG[second]}`} />{names[1]} · {format(top)}</span>
        <span className="flex items-center gap-1.5"><span className={`size-1.5 rounded-full ${SERIES_BG[color]}`} />{names[0]} · {format(v)}</span>
      </span>
    ) : bar(i, v, top);
  return (
    <div className={`flex w-full flex-col gap-2 ${className}`}>
      <div role="img" aria-label={values.map((v, i) => bar(i, v, split?.[i] ?? 0)).join("; ")} className="relative flex w-full items-end justify-between gap-1.5" style={{ height }} onMouseLeave={hide}>
        {values.map((v, i) => {
          const top = split?.[i] ?? 0;
          return (
            /* each column is a focus target: hover or Tab to read it as text (rule 16) */
            <button
              key={i}
              type="button"
              aria-label={bar(i, v, top)}
              onMouseEnter={(e) => show(...anchorOf(e), tipNode(i, v, top))}
              onFocus={(e) => show(...anchorOf(e), tipNode(i, v, top))}
              onBlur={hide}
              className={`relative flex h-full w-full max-w-4 min-w-1.5 flex-col justify-end overflow-hidden rounded-full transition-opacity duration-150 hover:opacity-80 ${track ? "bg-chart-track" : ""}`}
            >
              {split ? (
                <>
                  <span className={`w-full rounded-t-full ${SERIES_BG[second]}`} style={{ height: `${(top / max) * 100}%`, transform: settled ? "scaleY(1)" : "scaleY(0)", transformOrigin: "bottom", transition: drawing ? `transform 700ms var(--ease-out-quint) ${i * 40}ms` : undefined }} />
                  <span className={`w-full rounded-b-full ${SERIES_BG[color]}`} style={{ height: `${(v / max) * 100}%`, transform: settled ? "scaleY(1)" : "scaleY(0)", transformOrigin: "bottom", transition: drawing ? `transform 700ms var(--ease-out-quint) ${i * 40}ms` : undefined }} />
                </>
              ) : (
                <span className={`w-full rounded-full ${SERIES_BG[color]}`} style={{ height: `${(v / max) * 100}%`, transform: settled ? "scaleY(1)" : "scaleY(0)", transformOrigin: "bottom", transition: drawing ? `transform 700ms var(--ease-out-quint) ${i * 40}ms` : undefined }} />
              )}
            </button>
          );
        })}
        <ChartTip tip={tip} />
      </div>
      {legend && split && (
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          <span className="flex items-center gap-1.5 text-tiny text-ink-3"><span className={`size-1.5 rounded-full ${SERIES_BG[color]}`} />{names[0]}</span>
          <span className="flex items-center gap-1.5 text-tiny text-ink-3"><span className={`size-1.5 rounded-full ${SERIES_BG[second]}`} />{names[1]}</span>
        </div>
      )}
    </div>
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
  animate = FORMIC_CONFIG.motion,
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
  rank = false,
  axis = false,
  animate = FORMIC_CONFIG.motion,
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
  /** a position number before each label: 1, 2, 3… */
  rank?: boolean;
  /** dotted guides at 0 / 25 / 50 / 75 / 100% of `max` with a tick row under the bars, for a list of shares */
  axis?: boolean;
  /** bars grow in once, staggered; off for live-updating lists */
  animate?: boolean;
  className?: string;
}) {
  const { settled: on, drawing } = useEntrance(animate);
  const ceiling = max ?? Math.max(1, ...items.map((i) => i.value));
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  return (
    <div className={`flex w-full flex-col gap-2.5 ${fill ? "h-full justify-between" : ""} ${className}`}>
      {items.map((item, i) => {
        const pct = Math.max(2, (item.value / ceiling) * 100);
        const leader = i === 0;
        return (
          <div key={`${item.label}-${i}`} className="flex items-center gap-3">
            {rank && <span className="w-4 shrink-0 text-right text-tiny text-ink-3 tabular-nums">{i + 1}</span>}
            <span className={`w-28 shrink-0 truncate text-caption sm:w-36 ${leader ? "font-medium text-ink" : "text-ink-2"}`} title={item.label}>
              {item.label}
            </span>
            <div className={`relative h-2.5 min-w-0 flex-1 rounded-sm ${axis ? "" : "overflow-hidden bg-chart-track"}`}>
              {axis && ticks.map((t) => (
                <span key={t} aria-hidden className="absolute -inset-y-1 border-l border-dashed border-chart-track" style={{ left: `${t * 100}%` }} />
              ))}
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
      {axis && (
        <div aria-hidden className="flex items-center gap-3">
          {rank && <span className="w-4 shrink-0" />}
          <span className="w-28 shrink-0 sm:w-36" />
          <div className="relative h-4 min-w-0 flex-1">
            {ticks.map((t) => (
              <span key={t} className={`absolute top-0 text-tiny text-ink-3 tabular-nums ${t === 0 ? "" : t === 1 ? "-translate-x-full" : "-translate-x-1/2"}`} style={{ left: `${t * 100}%` }}>{format(ceiling * t)}</span>
            ))}
          </div>
          <span className="w-14 shrink-0" />
        </div>
      )}
    </div>
  );
}
