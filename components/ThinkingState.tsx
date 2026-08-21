"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { DiffStat, Disclosure, Icon, ShimmerLabel, Spinner } from "./primitives";
/* ─────────────────────────────────────────────────────────
 * THINKING — expandable agent trace, four variants
 *
 *   Steps      step list with spinner → muted checks
 *   Reasoning  prose reasoning that expands, then settles
 *   Search     web-search trace: query + sources read
 *   Coding     tool trace: files read, edits, commands
 *
 * The trace runs once, settles, and remains expandable.
 * ───────────────────────────────────────────────────────── */
const STAGES = [800, 600, 1800, 2600, 1600];
function useSequence(steps: number[]) {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    if (stage >= steps.length - 1) return;
    const t = setTimeout(() => setStage((s) => s + 1), steps[stage]);
    return () => clearTimeout(t);
  }, [stage, steps]);
  return stage;
}
export type Row = {
  primary: string;
  secondary?: string;
  mono?: boolean;
  add?: number;
  del?: number;
  href?: string;
};
const VARIANTS: Record<
  string,
  { active: string; done: string; rows: Row[]; query?: string; more?: string }
> = {
  Steps: {
    active: "Thinking",
    done: "Thought for 4 seconds",
    rows: [
      { primary: "Reading flavor briefs" },
      { primary: "Scanning supplier lists" },
      { primary: "Comparing tasting notes", secondary: "6 flavors" },
      { primary: "Writing the scoop report" },
    ],
  },
  Reasoning: {
    active: "Thinking",
    done: "Thought for 4 seconds",
    rows: [
      { primary: "Summer demand spikes for stone-fruit flavors — peach and apricot lead." },
      { primary: "I should check cone inventory before promoting a waffle-bowl special." },
    ],
  },
  Search: {
    active: "Searching the web",
    done: "Searched the web",
    query: "best waffle cone supplier",
    rows: [
      { primary: "Joy Cone", secondary: "joycone.com", href: "https://joycone.com/fs_products/waffle-cones/" },
      { primary: "WebstaurantStore", secondary: "webstaurantstore.com", href: "https://www.webstaurantstore.com/ice-cream-shop-supplies.html" },
      { primary: "The Konery", secondary: "thekonery.com", href: "https://www.thekonery.com/" },
    ],
    more: "+7 more",
  },
  Coding: {
    active: "Running tools",
    done: "Ran 3 tools",
    rows: [
      { primary: "Read", secondary: "flavors.ts", mono: true },
      { primary: "Edit", secondary: "ChurnSchedule.tsx", mono: true, add: 74, del: 41 },
      { primary: "Run", secondary: "npm run freeze", mono: true },
    ],
  },
};
function Dot({ tone }: { tone: string }) {
  return (
    <span className={`flex size-3.5 shrink-0 items-center justify-center rounded-full text-canvas ${tone}`}>
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="9" />
        <path d="M3.5 12h17M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
      </svg>
    </span>
  );
}
const TONES = ["bg-accent", "bg-orange", "bg-green"];
export type ThinkingVariant = "Steps" | "Reasoning" | "Search" | "Coding";
export default function ThinkingState({
  variant = "Steps",
  rows,
  active,
  done,
  query,
  more,
  onSettled,
}: {
  variant?: ThinkingVariant;
  /** trace rows to display; defaults to demo content */
  rows?: Row[];
  /** label while working (e.g. "Searching the web") */
  active?: string;
  /** label after settling (e.g. "Searched the web") */
  done?: string;
  /** query line shown above rows (Search variant) */
  query?: string;
  /** trailing note under the rows (e.g. "+7 more") */
  more?: string;
  onSettled?: () => void;
}) {
  const stage = useSequence(STAGES);
  const [manualExpanded, setManualExpanded] = useState<boolean | null>(null);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const base = VARIANTS[variant] ?? VARIANTS.Steps;
  const v = {
    active: active ?? base.active,
    done: done ?? base.done,
    rows: rows ?? base.rows,
    query: query ?? base.query,
    more: more ?? (rows ? undefined : base.more),
  };
  const autoExpanded = stage >= 1 && stage < 4;
  const expanded = manualExpanded ?? autoExpanded;
  const working = stage < 3;
  const visible = stage < 2 ? 0 : stage === 2 ? Math.min(2, v.rows.length) : v.rows.length;
  const traceRef = useRef<HTMLDivElement>(null);
  const [lineHeight, setLineHeight] = useState(0);
  useLayoutEffect(() => {
    if (traceRef.current) setLineHeight(traceRef.current.offsetHeight);
  }, [visible, expanded, variant, stage]);
  /* let embedders sequence content after the trace settles */
  const settledRef = useRef(false);
  useEffect(() => {
    if (working || settledRef.current) return;
    settledRef.current = true;
    onSettled?.();
  }, [working, onSettled]);
  return (
    <div
      key={variant}
      className="flex w-full max-w-95 flex-col"
      style={{
        minHeight: working || expanded ? 176 : undefined,
        transition: "min-height 400ms var(--ease-out-quint)",
      }}
    >
      {/* header — shared across variants */}
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setManualExpanded((current) => !(current ?? autoExpanded))}
        className="-mx-1.5 flex w-fit items-center gap-2 rounded-control px-1.5 py-1
          transition-colors duration-150 hover:bg-hover-2"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill={working ? "var(--ink-2)" : "var(--ink-3)"}>
          <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
        </svg>
        <span role="status" className="contents">
          {working ? (
            <ShimmerLabel className="whitespace-nowrap">{v.active}</ShimmerLabel>
          ) : (
            <span
              className="text-body font-medium whitespace-nowrap text-ink-2"
              style={{ animation: "fade-in 350ms ease-out both" }}
            >
              {v.done}
            </span>
          )}
        </span>
        <Icon
          name="chevron"
          className="text-ink-3 transition-transform duration-300"
          style={{ transform: expanded ? "rotate(180deg)" : "rotate(0)" }}
        />
      </button>
      {/* expandable trace */}
      <Disclosure open={expanded} duration={400} innerClassName="overflow-hidden">
          <div className="relative mt-1 ml-[5px] pl-4">
            <span
              aria-hidden
              className="absolute left-[3px] w-px bg-line"
              style={{ top: -8, height: lineHeight ? lineHeight - 2 : 0, transition: "height 500ms var(--ease-out-quint)" }}
            />
            <div ref={traceRef} className="flex flex-col gap-1 py-1">
            {v.query && (
              <div className="flex h-6 items-center gap-2 px-1.5" style={{ animation: expanded ? "fade-up 300ms var(--ease-out-quint) both" : undefined }}>
                <Icon name="search" strokeWidth={2} className="shrink-0 text-ink-3" />
                <span className="text-caption text-ink-2">{v.query}</span>
              </div>
            )}
            {v.rows.slice(0, visible).map((row, i) => {
              const content = (
                <>
                {variant === "Search" && <Dot tone={TONES[i % 3]} />}
                {variant === "Steps" && (
                  i < visible - 1 || !working ? (
                    <Icon name="check" strokeWidth={2.5} className="shrink-0 text-ink-3" />
                  ) : (
                    <Spinner className="text-ink-2" />
                  )
                )}
                <span className={`min-w-0 truncate text-caption ${variant === "Reasoning" ? "whitespace-normal leading-relaxed text-ink-2" : "font-medium text-ink"} ${variant === "Search" ? "animated-underline" : ""}`}>
                  {row.primary}
                </span>
                {row.secondary && (
                  <span className={`shrink-0 text-tiny text-ink-3 ${row.mono ? "font-mono" : ""}`}>
                    {row.secondary}
                  </span>
                )}
                {row.add !== undefined && <DiffStat add={row.add} del={row.del} />}
                </>
              );
              const rowClass = "flex min-h-7 w-full items-center gap-2 rounded-sm px-1.5 py-0.5 text-left";
              const animation = { animation: `fade-up 320ms var(--ease-out-quint) ${i * 120}ms both` };
              if (variant === "Search") {
                return (
                  <a
                    key={row.primary}
                    href={row.href}
                    target="_blank"
                    rel="noreferrer"
                    className={`${rowClass} transition-colors duration-150 hover:bg-hover`}
                    style={animation}
                  >
                    {content}
                  </a>
                );
              }
              if (variant === "Coding") {
                const selected = selectedTool === row.primary;
                return (
                  <button
                    key={row.primary}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setSelectedTool(selected ? null : row.primary)}
                    className={`${rowClass} transition-colors duration-150 ${selected ? "bg-inset" : "hover:bg-hover"}`}
                    style={animation}
                  >
                    {content}
                  </button>
                );
              }
              return (
                <div key={row.primary} className={rowClass} style={animation}>
                  {content}
                </div>
              );
            })}
            {v.more && stage >= 3 && (
              <span className="text-small text-ink-3" style={{ animation: "fade-in 300ms ease-out both" }}>
                {v.more}
              </span>
            )}
            </div>
          </div>
      </Disclosure>
    </div>
  );
}
