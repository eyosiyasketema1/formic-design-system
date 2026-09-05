"use client";
import type { ReactNode } from "react";
import { Card, Icon, type IconName } from "./primitives";
import { Sparkline, compact, type ChartColor } from "./charts";
import { FORMIC_CONFIG } from "./config";
/* ─────────────────────────────────────────────────────────
 * STAT CARD / METRIC ROW
 * The small tiles a dashboard is mostly made of: a label, one
 * number that matters, and how it moved. Everything past the
 * value is optional, so the same component covers a bare KPI
 * and a tile with an icon, a caption and a trend line.
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

export type StatIconTone = "neutral" | "accent";
/* Icons are furniture, not data: ink on inset by default, accent only on
 * the one tile a dashboard leads with. A different colour per card is the
 * surest sign of machine-made UI (rule 16 covers series, this covers icons). */
const STAT_ICON_TINTS: Record<StatIconTone, string> = {
  neutral: "bg-inset text-ink-2",
  accent: "bg-accent-tint text-accent",
};

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
  className?: string;
}) {
  return (
    <Card className={`flex w-full max-w-95 flex-col gap-3 p-4 ${className}`}>
      {icon && (
        <span className={`corner-smooth flex size-9 items-center justify-center rounded-control ${STAT_ICON_TINTS[iconTone]}`}>
          <Icon name={icon} size={17} strokeWidth={2} />
        </span>
      )}
      <div className="min-w-0">
        <div className="truncate text-caption font-medium text-ink">{label}</div>
        {caption && <div className="mt-0.5 truncate text-small text-ink-3">{caption}</div>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-display font-semibold text-ink tabular-nums">
          {display ?? compact(value)}
        </span>
        {delta && <Delta tone={deltaTone}>{delta}</Delta>}
      </div>
      {trend && trend.length > 1 && <Sparkline values={trend} color={trendTone} smooth={trendSmooth} animate={trendAnimate} />}
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
