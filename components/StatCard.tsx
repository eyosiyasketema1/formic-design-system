"use client";
import type { ReactNode } from "react";
import { Card, Icon, IconTile, type IconName, type IconTileTone } from "./primitives";
import { DonutChart, MiniBars, Sparkline, compact, type ChartColor } from "./charts";
import { FORMIC_CONFIG } from "./config";
/* ─────────────────────────────────────────────────────────
 * STAT CARD / METRIC ROW
 * The small tiles a dashboard is mostly made of: a label, one
 * number that matters, and how it moved. Everything past the
 * value is optional, so the same component covers a bare KPI
 * and a tile with an icon, a caption and a trend line.
 *
 * Shapes a dashboard needs, all one component:
 *   layout="value-first"   number and delta on top, the label under
 *                          them, a trend below (the profit tile)
 *   trendKind="bars"       capsule columns on tracks instead of a line
 *   trendKind="stacked"    two series stacked, `trendSplit` on top
 *   ring={{ value, max }}  a progress ring beside the copy (user reach)
 *   align="center"         icon tile, caption and a big number centred,
 *                          for the two halves of a report panel
 * ───────────────────────────────────────────────────────── */

/* Direction is explicit rather than inferred from the sign, because
 * "down" is good for churn and cost. The caller knows; we don't. */
export type DeltaTone = "up" | "down" | "flat";
const DELTA_TONES: Record<DeltaTone, string> = {
  up: "bg-green-tint text-green",
  down: "bg-red-tint text-red",
  flat: "bg-inset text-ink-2",
};
const DELTA_ICONS: Record<DeltaTone, IconName> = {
  up: "arrow-up",
  down: "arrow-up",     // rotated below — one glyph, two directions
  flat: "minus",
};

export function Delta({ tone = "up", children }: { tone?: DeltaTone; children: ReactNode }) {
  return (
    <span
      className={`corner-smooth inline-flex h-5.5 shrink-0 items-center gap-0.5 rounded-chip px-1.5 text-tiny font-medium tabular-nums ${DELTA_TONES[tone]}`}
    >
      <Icon
        name={DELTA_ICONS[tone]}
        size={12}
        strokeWidth={2}
        className={tone === "down" ? "rotate-180" : ""}
      />
      {children}
    </span>
  );
}

export type StatIconTone = IconTileTone;

export function StatCard({
  label = "Total profit",
  value = 88_500,
  /** pass a string to control formatting yourself, e.g. "$88.5k" */
  display,
  caption,
  delta,
  deltaTone = "up",
  icon,
  iconTone = "neutral",
  trend,
  trendTone = 1,
  trendSmooth = false,
  trendAnimate = FORMIC_CONFIG.motion,
  trendKind = "line",
  trendSplit,
  layout = "label-first",
  align = "start",
  ring,
  chart: chartProp,
  className = "",
}: {
  label?: string;
  value?: number;
  /** formatted value, or a node such as <CountUp> / <Masked> */
  display?: ReactNode;
  caption?: string;
  delta?: string;
  deltaTone?: DeltaTone;
  icon?: IconName;
  /** "neutral" (default) or "accent" for the single lead tile */
  iconTone?: StatIconTone;
  trend?: number[];
  trendTone?: ChartColor;
  /** curve the sparkline (Catmull-Rom) */
  trendSmooth?: boolean;
  /** reveal the sparkline once on mount (default); false for tiles that re-render often */
  trendAnimate?: boolean;
  /** line (sparkline), bars (capsule columns on tracks) or stacked (two series, `trendSplit` on top) */
  trendKind?: "line" | "bars" | "stacked";
  trendSplit?: number[];
  /** label-first (default), value-first (the number leads, the label under it) or chart-middle (label, chart, then the number) */
  layout?: "label-first" | "value-first" | "chart-middle";
  /** centre everything: the hero halves of a report panel */
  align?: "start" | "center";
  /** a progress ring beside the copy, with its own centre label */
  ring?: { value: number; max: number; label?: string; color?: ChartColor };
  /** any chart in the trend slot (a small LineChart with guides, a BarList…) instead of `trend` */
  chart?: ReactNode;
  className?: string;
}) {
  const centred = align === "center";
  const copy = (
    <div className={`min-w-0 ${centred ? "text-center" : ""}`}>
      <div className="truncate text-caption font-medium text-ink">{label}</div>
      {caption && <div className="mt-0.5 truncate text-small text-ink-3">{caption}</div>}
    </div>
  );
  const number = (
    <div className={`flex flex-wrap items-center gap-2 ${centred ? "justify-center" : ""}`}>
      <span className="text-display font-semibold text-ink tabular-nums">{display ?? compact(value)}</span>
      {delta && <Delta tone={deltaTone}>{delta}</Delta>}
    </div>
  );
  const chart = chartProp ??
    (trend && trend.length > 1
      ? trendKind === "line"
        ? <Sparkline values={trend} color={trendTone} smooth={trendSmooth} animate={trendAnimate} />
        : <MiniBars values={trend} split={trendKind === "stacked" ? trendSplit : undefined} track={trendKind === "bars"} color={trendTone} animate={trendAnimate} />
      : null);
  const body = layout === "value-first" ? <>{number}{copy}</> : layout === "chart-middle" ? <>{copy}{chart}{number}</> : <>{copy}{number}</>;
  return (
    <Card className={`flex w-full max-w-95 flex-col gap-3 p-4 ${centred ? "items-center" : ""} ${className}`}>
      {icon && <IconTile icon={icon} tone={iconTone} />}
      {ring ? (
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-3">{body}</div>
          <DonutChart value={ring.value} max={ring.max} label={ring.label ?? ""} color={ring.color ?? 1} size={96} animate={trendAnimate} className="shrink-0" />
        </div>
      ) : body}
      {layout !== "chart-middle" && chart}
    </Card>
  );
}

/* ── MetricRow ─────────────────────────────────────────── */
/* A line item inside a card — the breakdown under a headline
 * number, as in "Online store $20k +12.6%". With `detail` it is a
 * funnel stage: the label in ink, a plain-words line under it, and
 * the delta on the right — "Booked a call / 41 talked it through". */
export function MetricRow({
  icon,
  label,
  detail,
  value,
  delta,
  deltaTone = "up",
}: {
  icon?: IconName;
  label: string;
  /** second line in muted ink, e.g. "96 opened their private link" */
  detail?: string;
  /** a string, or a node such as <Masked> */
  value?: ReactNode;
  delta?: string;
  deltaTone?: DeltaTone;
}) {
  return (
    <div className={`flex w-full items-center gap-2.5 border-t border-line first:border-t-0 ${detail ? "py-3" : "py-2.5"}`}>
      {icon && <Icon name={icon} size={15} strokeWidth={2} className="shrink-0 text-ink-3" />}
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-caption ${detail ? "font-medium text-ink" : "text-ink-2"}`}>{label}</span>
        {detail && <span className="block truncate text-small text-ink-3">{detail}</span>}
      </span>
      {value != null && <span className="shrink-0 text-caption font-medium text-ink tabular-nums">{value}</span>}
      {delta ? <Delta tone={deltaTone}>{delta}</Delta> : detail ? <span className="text-caption text-ink-3">—</span> : null}
    </div>
  );
}
