"use client";
import { useState, type ComponentType, type ReactNode } from "react";
import Button from "./Button";
import Tabs from "./Tabs";
import { BarChart, LineChart, type ChartColor } from "./charts";
import { Badge, Card, Icon, IconButton } from "./primitives";
/* ─────────────────────────────────────────────────────────
 * INSIGHT CARDS — what the assistant noticed, one page at a time
 * A small carousel ("Insights 3 ‹ ›"): each page is a sentence
 * with @entity mentions and mono deltas, a mini visualisation on
 * a surface, and a follow-up prompt the person can send. Three
 * cards ship: Compare (two series, big deltas, line chart),
 * Anomaly (a spike against a threshold, Spend / Usage toggle,
 * bars) and Allocation (a hero number, a segmented bar, a legend
 * that inspects a segment). Pages take any component, so an app
 * adds its own.
 *
 * Charts are the system's own (LineChart, BarChart): categorical
 * chart colours, legends, tooltips, entrance motion, no library.
 * Deltas use --green / --red because they mean better and worse.
 * ───────────────────────────────────────────────────────── */
export const formatPercent = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(2)}%`;
export const formatMoney = (v: number) => `$${Math.round(v).toLocaleString("en-US")}`;

/* an inline @entity mention */
export function Entity({ name, color = 1 }: { name: string; color?: ChartColor }) {
  return (
    <span className="inline-flex items-center gap-1 align-baseline font-medium text-ink">
      <span aria-hidden className={`inline-block size-2 rounded-full ${DOT[color]}`} />
      @{name}
    </span>
  );
}
/* a delta in mono, coloured by meaning */
export function Delta({ children, tone }: { children: ReactNode; tone: "up" | "down" }) {
  return <code className={`font-mono text-tiny ${tone === "down" ? "text-red" : "text-green"}`}>{children}</code>;
}
const DOT: Record<ChartColor, string> = { 1: "bg-chart-1", 2: "bg-chart-2", 3: "bg-chart-3", 4: "bg-chart-4", 5: "bg-chart-5" };

/* the framed plot inside a card: a caption row, then the chart */
function Stage({ caption, action, children }: { caption: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="mt-2 overflow-hidden rounded-control bg-inset shadow-hairline">
      <div className="flex h-8 items-center justify-between gap-2 border-b border-line px-2.5">
        <span className="min-w-0 truncate text-small text-ink-3 tabular-nums">{caption}</span>
        {action ?? <Badge>Snapshot</Badge>}
      </div>
      <div className="bg-surface p-2">{children}</div>
    </div>
  );
}

/* ── 1. compare: two series, legend with the latest delta ── */
export type CompareSeries = { name: string; values: number[]; sub: string; color: ChartColor };
const COMPARE: CompareSeries[] = [
  { name: "Mint Chip", values: [-2.9, -3.4, -3.05, -3.86, -3.52, -4.1, -3.82, -4.41], sub: "-$2,377.66", color: 2 },
  { name: "Pistachio", values: [0.22, 0.58, 0.42, 0.91, 0.76, 1.08, 0.96, 1.15], sub: "+$617.22", color: 1 },
];
const WEEKS = ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"];
export function CompareCard({ series = COMPARE, labels = WEEKS }: { series?: CompareSeries[]; labels?: string[] }) {
  return (
    <Card className="p-3">
      <div className="flex items-start gap-4">
        {series.map((s) => {
          const last = s.values[s.values.length - 1] ?? 0;
          return (
            <div key={s.name} className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-small text-ink-2">
                <span aria-hidden className={`size-2 rounded-full ${DOT[s.color]}`} />
                <span className="truncate">{s.name}</span>
              </span>
              <span className={`block text-lead font-semibold tabular-nums ${last < 0 ? "text-red" : "text-green"}`}>{formatPercent(last)}</span>
              <Delta tone={last < 0 ? "down" : "up"}>{s.sub}</Delta>
            </div>
          );
        })}
      </div>
      <Stage caption="Trend, last 8 weeks">
        <LineChart labels={labels} series={series.map((s) => ({ name: s.name, values: s.values, color: s.color }))} height={130} points={false} />
      </Stage>
    </Card>
  );
}

/* ── 2. anomaly: a spike against a threshold, two metrics ── */
export type AnomalyData = { spend: number[]; usage: number[]; labels?: string[]; spendThreshold: number; usageThreshold: number };
const ANOMALY: AnomalyData = {
  spend: [274, 289, 264, 307, 331, 1210, 1718, 2112],
  usage: [18, 19, 17, 21, 22, 58, 81, 96],
  spendThreshold: 900,
  usageThreshold: 40,
};
export function AnomalyCard({ data = ANOMALY, title = "High freezer spend", delta = "+$1,834.66", compare = "vs 3 months" }: { data?: AnomalyData; title?: string; delta?: string; compare?: string }) {
  const [metric, setMetric] = useState<"spend" | "usage">("spend");
  const values = metric === "spend" ? data.spend : data.usage;
  const threshold = metric === "spend" ? data.spendThreshold : data.usageThreshold;
  const fmt = (v: number) => (metric === "spend" ? formatMoney(v) : `${Math.round(v)} kWh`);
  const spike = values.findIndex((v) => v > threshold);
  const last = data.spend[data.spend.length - 1] ?? 0;
  return (
    <Card className="p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 text-caption font-medium text-ink">
          <Icon name="arrow-up" size={13} strokeWidth={2.5} className="shrink-0 text-red" />
          <span className="truncate">{title}</span>
        </span>
        <Badge>Snapshot</Badge>
      </div>
      <Stage
        caption={`${fmt(threshold)} threshold`}
        action={
          <Tabs
            variant="segmented"
            value={metric}
            onChange={(k) => setMetric(k as "spend" | "usage")}
            tabs={[{ key: "spend", label: "Spend" }, { key: "usage", label: "Usage" }]}
            className="w-auto [&_[role=tab]]:h-6 [&_[role=tab]]:px-2 [&_[role=tab]]:text-small [&_[role=tablist]]:p-0.5"
          />
        }
      >
        <BarChart key={metric} labels={data.labels ?? WEEKS} series={[{ name: metric === "spend" ? "Spend" : "Usage", values }]} highlight={spike < 0 ? undefined : spike} height={120} showValues={false} />
      </Stage>
      <div className="mt-2 flex flex-wrap items-baseline gap-2">
        <span className="text-lead font-semibold text-ink tabular-nums">{formatMoney(last)} spent</span>
        <Delta tone="down">{delta}</Delta>
        <span className="text-small text-ink-3">{compare}</span>
      </div>
    </Card>
  );
}

/* ── 3. allocation: hero number, segmented bar, legend that inspects ── */
export type AllocationSegment = { name: string; label: string; pct: number; amount: string; color: ChartColor };
const ALLOCATION: AllocationSegment[] = [
  { name: "VAN", label: "Vanilla", pct: 72.5, amount: "$51,785", color: 1 },
  { name: "CHOC", label: "Chocolate", pct: 22.8, amount: "$16,278", color: 2 },
  { name: "MINT", label: "Mint", pct: 4.7, amount: "$3,357", color: 3 },
];
export function AllocationCard({ segments = ALLOCATION, title = "Vanilla allocation", note = "Contribution across current inventory value. Picking a segment changes what is inspected without moving the card." }: { segments?: AllocationSegment[]; title?: string; note?: string }) {
  const [selected, setSelected] = useState(segments[0]?.name);
  const active = segments.find((s) => s.name === selected) ?? segments[0];
  return (
    <Card className="p-3">
      <span className="flex items-center gap-1.5 text-caption font-medium text-ink">
        <span aria-hidden className={`size-2 rounded-full ${DOT[active.color]}`} />
        {title}
      </span>
      <span className="mt-1 block text-heading font-semibold tracking-tight text-ink tabular-nums">{active.amount}</span>
      <div role="group" aria-label="Allocation segments" className="mt-3 flex h-8 gap-0.5 overflow-hidden rounded-full bg-field p-0.5">
        {segments.map((s) => {
          const on = s.name === selected;
          return (
            <button
              key={s.name}
              type="button"
              aria-pressed={on}
              aria-label={`${s.label}: ${s.pct}%`}
              onClick={() => setSelected(s.name)}
              className={`h-full min-w-2 rounded-full transition-[opacity,box-shadow] duration-300 ${DOT[s.color]} ${on ? "opacity-100 shadow-[inset_0_0_0_2px_var(--surface)]" : "opacity-45 hover:opacity-70"}`}
              style={{ width: `${s.pct}%`, transitionTimingFunction: "var(--ease-out-quint)" }}
            />
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1">
        {segments.map((s) => {
          const on = s.name === selected;
          return (
            <button
              key={s.name}
              type="button"
              aria-pressed={on}
              onClick={() => setSelected(s.name)}
              className={`corner-smooth flex h-6 items-center gap-1 rounded-full px-1.5 text-small transition-colors duration-150 ${on ? "bg-field text-ink" : "text-ink-2 hover:bg-hover hover:text-ink"}`}
            >
              <span aria-hidden className={`size-1.5 rounded-full ${DOT[s.color]}`} />
              {s.name} <span className="tabular-nums">{s.pct}%</span>
            </button>
          );
        })}
      </div>
      <div className="mt-3 rounded-control bg-inset px-2.5 py-2 shadow-hairline">
        <span className="block text-small font-medium text-ink">{active.label}</span>
        <span className="mt-0.5 block text-small leading-relaxed text-ink-3">{note}</span>
      </div>
    </Card>
  );
}

/* ── the carousel ── */
export type InsightPage = { key: string; prose: ReactNode; Card: ComponentType; prompt: string };
const DEFAULT_PAGES: InsightPage[] = [
  {
    key: "compare",
    prose: <>The worst performer in your <Entity name="Creamery" color={2} /> is Rocky Road, down <Delta tone="down">-6%</Delta> or <Delta tone="down">-$2,453.44</Delta>.</>,
    Card: CompareCard,
    prompt: "Should I rebalance flavours?",
  },
  {
    key: "anomaly",
    prose: <>Unusually high freezer bill on <span className="font-medium text-ink">Dec 13</span>: <Delta tone="down">+$1,834.66</Delta> above your average.</>,
    Card: AnomalyCard,
    prompt: "Get tips on cutting freezer costs",
  },
  {
    key: "allocation",
    prose: <>You are heavily invested in <Entity name="Vanilla" /> at <span className="font-medium text-ink">72.5%</span> of your case.</>,
    Card: AllocationCard,
    prompt: "If we look at seasonals, what changes?",
  },
];

export default function InsightCards({
  pages = DEFAULT_PAGES,
  title = "Insights",
  onPrompt,
  className = "",
}: {
  pages?: InsightPage[];
  title?: string;
  /** the follow-up pill was pressed; send it as the next message */
  onPrompt?: (prompt: string, page: InsightPage) => void;
  className?: string;
} = {}) {
  const [index, setIndex] = useState(0);
  const move = (d: -1 | 1) => setIndex((i) => (i + d + pages.length) % pages.length);
  const page = pages[index];
  if (!page) return null;
  const { prose, Card: Body, prompt } = page;
  return (
    <section aria-roledescription="carousel" aria-label={title} className={`w-full max-w-90 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="flex items-baseline gap-1.5">
          <span className="text-caption font-semibold text-ink">{title}</span>
          <span className="text-caption text-ink-3 tabular-nums">{index + 1} / {pages.length}</span>
        </span>
        {pages.length > 1 && (
          <span className="flex items-center gap-0.5">
            <IconButton label="Previous insight" onClick={() => move(-1)} className="text-ink-3 hover:bg-hover hover:text-ink"><Icon name="chevron-left" size={14} strokeWidth={2.2} /></IconButton>
            <IconButton label="Next insight" onClick={() => move(1)} className="text-ink-3 hover:bg-hover hover:text-ink"><Icon name="chevron-right" size={14} strokeWidth={2.2} /></IconButton>
          </span>
        )}
      </div>
      {/* the page remounts, so it fades in and its charts play their entrance */}
      <div key={page.key} aria-live="polite" style={{ animation: "fade-in 200ms ease-out both" }}>
        <p className="mt-1.5 text-caption leading-relaxed text-ink-2">{prose}</p>
        <div className="mt-2"><Body /></div>
        <Button variant="secondary" size="sm" shape="pill" icon={<Icon name="sparkles" size={13} />} className="mt-2" onClick={() => onPrompt?.(prompt, page)}>{prompt}</Button>
      </div>
    </section>
  );
}
