"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Chip, DiffStat, Disclosure, Icon } from "./primitives";
/* ─────────────────────────────────────────────────────────
 * TOOL CHIPS
 * An agent run as compact rows: tool calls with inline
 * chips, then file-diff chips summarizing the edits.
 * Hover a row to reveal its chevron; every row expands
 * to show what the tool actually did.
 * ───────────────────────────────────────────────────────── */
const STEP_MS = 700;
const Icons: Record<string, React.ReactNode> = {
  think: <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />,
  write: <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" /></g>,
  run: <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 17l6-5-6-5M12 19h8" /></g>,
  read: <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></g>,
};
export type ToolIcon = "think" | "write" | "run" | "read";
export type DetailLine = { text: string; tone?: "add" };
export type ToolRow = {
  icon: ToolIcon;
  label: string;
  chip: string;
  mono?: boolean;
  detailMono?: boolean;
  detail: DetailLine[];
};
export type DiffLine = { text: string; tone: "add" | "del" | "ctx" };
export type FileDiff = { file: string; add: number; del: number };
const DEFAULT_ROWS: ToolRow[] = [
  {
    icon: "think", label: "Thinking", chip: "Planning the churn schedule…",
    detail: [
      { text: "Weekend demand carries pistachio, so it churns first." },
      { text: "Batch capacity leaves two evening freezer windows." },
    ],
  },
  {
    icon: "write", label: "Write 204 lines", chip: "ChurnSchedule.tsx", mono: true, detailMono: true,
    detail: [
      { text: "+ const windows = slots.filter((s) => s.temp <= -12)", tone: "add" },
      { text: "+ return schedule(windows, { hero: \"pistachio\" })", tone: "add" },
    ],
  },
  {
    icon: "run", label: "Rebuild and verify", chip: "npm run freeze", mono: true, detailMono: true,
    detail: [
      { text: "✓ built in 1.2s" },
      { text: "✓ 34 checks passed" },
    ],
  },
  {
    icon: "read", label: "Read image", chip: "flavor-chart.png", mono: true,
    detail: [
      { text: "1280 × 720 · line chart, three summers." },
      { text: "Mint chip trends up 12% through July." },
    ],
  },
];
const DEFAULT_DIFFS: FileDiff[] = [
  { file: "flavors.css", add: 13, del: 0 },
  { file: "ChurnSchedule.tsx", add: 74, del: 41 },
  { file: "menu.ts", add: 8, del: 2 },
];
/* hovering a file chip opens its diff — green added, red removed */
const DEFAULT_DIFF_LINES: Record<string, DiffLine[]> = {
  "flavors.css": [
    { text: ".scoop-card {", tone: "ctx" },
    { text: "  gap: 14px;", tone: "del" },
    { text: "  gap: 12px;", tone: "add" },
    { text: "  container-type: inline-size;", tone: "add" },
    { text: "}", tone: "ctx" },
  ],
  "ChurnSchedule.tsx": [
    { text: "const slots = coldSlots(week);", tone: "ctx" },
    { text: "const windows = slots;", tone: "del" },
    { text: "const windows = slots.filter(", tone: "add" },
    { text: "  (s) => s.temp <= -12,", tone: "add" },
    { text: ");", tone: "add" },
  ],
  "menu.ts": [
    { text: "export const hero = \"mint-chip\";", tone: "del" },
    { text: "export const hero = \"pistachio\";", tone: "add" },
  ],
};
const DEFAULT_SUMMARY = "4 tool calls, 2 messages";
const DEFAULT_MORE = "+2 more";
export default function ToolChips({
  rows = DEFAULT_ROWS,
  diffs = DEFAULT_DIFFS,
  diffLines = DEFAULT_DIFF_LINES,
  summary,
  more,
}: {
  /** tool call rows; defaults to demo content */
  rows?: ToolRow[];
  /** file-diff chips shown after the rows */
  diffs?: FileDiff[];
  /** per-file diff lines for the hover preview */
  diffLines?: Record<string, DiffLine[]>;
  /** collapsed header label (defaults to a count of rows) */
  summary?: string;
  /** trailing note after the chips (e.g. "+2 more") */
  more?: string;
} = {}) {
  const resolvedSummary =
    summary ?? (rows === DEFAULT_ROWS ? DEFAULT_SUMMARY : `${rows.length} tool calls`);
  const resolvedMore = more ?? (diffs === DEFAULT_DIFFS ? DEFAULT_MORE : undefined);
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(true);
  const [openRows, setOpenRows] = useState<Set<number>>(new Set());
  /* Rendered in a body portal so animated/translated reply wrappers cannot
   * redefine the fixed-position coordinate system. */
  const [preview, setPreview] = useState<{
    file: string;
    x: number;
    top?: number;
    bottom?: number;
  } | null>(null);
  /* close on a short delay so the pointer can travel into the preview
   * (WCAG 1.4.13: content on hover must be hoverable) */
  const closeTimer = useRef<number | null>(null);
  const cancelClose = () => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };
  const openPreview = (file: string) => (event: React.SyntheticEvent) => {
    cancelClose();
    const rect = (event.currentTarget as Element).closest("[data-diffchip]")!.getBoundingClientRect();
    const previewHeight = 38 + (diffLines[file]?.length ?? 0) * 21;
    const fitsBelow = rect.bottom + 6 + previewHeight <= window.innerHeight - 12;
    setPreview({
      file,
      x: Math.max(12, Math.min(rect.left, window.innerWidth - 300)),
      ...(fitsBelow
        ? { top: rect.bottom + 6 }
        : { bottom: window.innerHeight - rect.top + 6 }),
    });
  };
  const closePreview = (file: string) => () => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => {
      setPreview((current) => (current?.file === file ? null : current));
    }, 120);
  };
  /* WCAG 1.4.13: dismissible without moving pointer or focus */
  useEffect(() => {
    if (!preview) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreview(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [preview]);
  /* a new run resets the reveal and any expanded rows */
  useEffect(() => {
    setStep(0);
    setOpenRows(new Set());
    setPreview(null);
  }, [rows]);
  const total = rows.length + 1; // rows, then diff chips
  useEffect(() => {
    if (step >= total) return;
    const t = setTimeout(() => setStep((s) => s + 1), STEP_MS);
    return () => clearTimeout(t);
  }, [step, total]);
  const toggleRow = (index: number) =>
    setOpenRows((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  return (
    <div className="min-h-[220px] w-full max-w-80 pb-1">
      {/* collapsed run header */}
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="-mx-1.5 flex w-fit items-center gap-1.5 rounded-control px-1.5 py-1 text-caption text-ink-2 transition-colors duration-150 hover:bg-hover-2"
      >
        <Icon name="chevron" size={12} className="transition-transform duration-200" style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)" }} />
        <span className="tabular-nums">{resolvedSummary}</span>
      </button>
      {/* tool call rows — the -mx-1 + px-1.5 inner keeps content at the same x
          while giving the row hover pills room inside the clip box */}
      <Disclosure open={open} live innerClassName="-mx-1 overflow-hidden px-1.5 pb-1">
        <div className="mt-1.5 flex flex-col gap-1">
          {rows.slice(0, step).map((row, rowIndex) => {
            const rowOpen = openRows.has(rowIndex);
            return (
            <div key={rowIndex} style={{ animation: "fade-up 300ms var(--ease-out-quint) both" }}>
              <button
                type="button"
                aria-expanded={rowOpen}
                onClick={() => toggleRow(rowIndex)}
                className="group/row -mx-[3px] flex h-7 w-[calc(100%+6px)] min-w-0 items-center gap-2 rounded-control px-[3px] text-left transition-colors duration-150 hover:bg-hover-2"
              >
                <span className="relative flex size-4 shrink-0 items-center justify-center text-ink-3">
                  <svg
                    width="13" height="13" viewBox="0 0 24 24" fill={row.icon === "think" ? "currentColor" : "none"} stroke="currentColor"
                    className={`transition-opacity duration-150 group-hover/row:opacity-0 ${rowOpen ? "opacity-0" : ""}`}
                  >
                    {Icons[row.icon]}
                  </svg>
                  <Icon
                    name="chevron"
                    size={12}
                    className={`absolute transition-[opacity,transform] duration-150 group-hover/row:opacity-100 ${rowOpen ? "opacity-100" : "opacity-0"}`}
                    style={{ transform: rowOpen ? "rotate(0deg)" : "rotate(-90deg)" }}
                  />
                </span>
                <span className="shrink-0 text-caption font-medium text-ink">{row.label}</span>
                <Chip mono={row.mono} className="min-w-0 flex-1 cursor-pointer truncate hover:bg-hover-2">
                  {row.chip}
                </Chip>
              </button>
              {/* expanded detail */}
              <Disclosure open={rowOpen}>
                  <div className="mt-0.5 mb-1 ml-2 flex flex-col gap-0.5 border-l border-line py-0.5 pl-3.5">
                    {row.detail.map((line, lineIndex) => (
                      <span
                        key={lineIndex}
                        className={`truncate text-tiny leading-[1.6] ${row.detailMono ? "font-mono" : ""} ${line.tone === "add" ? "text-green" : "text-ink-2"}`}
                      >
                        {line.text}
                      </span>
                    ))}
                  </div>
              </Disclosure>
            </div>
            );
          })}
        </div>
      {/* file-diff chips */}
      {step >= total && (
        <div className="mt-2.5 flex max-w-full flex-wrap gap-1.5 border-t border-line pt-2.5">
          {diffs.map((d, i) => (
            <span
              key={d.file}
              data-diffchip
              className="relative"
              onMouseEnter={openPreview(d.file)}
              onMouseLeave={closePreview(d.file)}
            >
              <Chip
                as="button"
                type="button"
                tone="surface"
                size="md"
                mono
                aria-expanded={preview?.file === d.file}
                aria-label={`Show diff for ${d.file}`}
                aria-describedby={preview?.file === d.file ? "ds-diff-preview" : undefined}
                onFocus={openPreview(d.file)}
                onBlur={closePreview(d.file)}
                className="max-w-full hover:bg-hover"
                style={{ animation: `pop-in 250ms var(--ease-out-quint) ${i * 80}ms both` }}
              >
                <span className="min-w-0 truncate">{d.file}</span>
                <DiffStat add={d.add} del={d.del} />
              </Chip>
            </span>
          ))}
          {resolvedMore && (
            <button
              type="button"
              className="inline-flex h-7 items-center rounded-chip px-1.5 font-mono text-tiny text-ink-3
                underline decoration-transparent underline-offset-2 transition-colors duration-150
                hover:text-ink-2 hover:decoration-current"
              style={{ animation: `fade-in 300ms ease-out ${diffs.length * 80}ms both` }}
            >
              {resolvedMore}
            </button>
          )}
        </div>
      )}
      </Disclosure>
      {preview && typeof document !== "undefined" && createPortal(
        <div
          id="ds-diff-preview"
          role="tooltip"
          onMouseEnter={cancelClose}
          onMouseLeave={closePreview(preview.file)}
          className="fixed z-50 w-72 overflow-hidden rounded-md bg-surface shadow-overlay"
          style={{
            left: preview.x,
            top: preview.top,
            bottom: preview.bottom,
            animation: "pop-in 160ms var(--ease-out-quint) both",
            transformOrigin: preview.top === undefined ? "bottom left" : "top left",
          }}
        >
          <div className="flex items-center justify-between border-b border-line px-2.5 py-1.5 font-mono text-tiny">
            <span className="min-w-0 truncate text-ink-2">{preview.file}</span>
            <DiffStat
              add={diffs.find((diff) => diff.file === preview.file)?.add ?? 0}
              del={diffs.find((diff) => diff.file === preview.file)?.del ?? 0}
            />
          </div>
          <div className="py-1 font-mono text-tiny leading-[1.8]">
            {(diffLines[preview.file] ?? []).map((line, index) => (
              <div
                key={index}
                className={`flex gap-2 px-2.5 whitespace-pre ${
                  line.tone === "add"
                    ? "bg-green-tint text-green"
                    : line.tone === "del"
                      ? "bg-red-tint text-red"
                      : "text-ink-2"
                }`}
              >
                <span className="w-3 shrink-0 select-none">{line.tone === "add" ? "+" : line.tone === "del" ? "−" : " "}</span>
                <span className="min-w-0 truncate">{line.text}</span>
              </div>
            ))}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
