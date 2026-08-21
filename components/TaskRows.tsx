"use client";
import { useEffect, useState, type ReactNode } from "react";
import { Disclosure, Icon } from "./primitives";
/* ─────────────────────────────────────────────────────────
 * TASK ROWS
 *
 * Agent tasks as expandable rows — capsule or list flavor.
 * Demo choreography (default content only):
 *     0ms   rows enter staggered (80ms apart)
 *   600ms   row 2 ring sweeps
 *  1500ms   row 2 expands — detail steps drop down
 *  3900ms   row 2 collapses; row 3 flips to Failed + retry
 *  5300ms   row 3 resolves to Completed
 * With a `rows` prop the statuses render statically and the
 * choreography is skipped; task details stay clickable.
 * ───────────────────────────────────────────────────────── */
const TICKS = [600, 900, 2400, 1400, 2400, 600];
function useTick(intervals: number[]) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (tick >= intervals.length - 1) return;
    const t = setTimeout(() => setTick((x) => x + 1), intervals[tick]);
    return () => clearTimeout(t);
  }, [tick, intervals]);
  return tick;
}
function SpinnerRing({ active, children }: { active?: boolean; children?: ReactNode }) {
  const size = 24, stroke = 2;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size} height={size} className="absolute inset-0"
        style={active ? { animation: "spin 1.1s linear infinite" } : undefined}
      >
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
        {active && (
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke="var(--ink-3)" strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={`${c * 0.28} ${c * 0.72}`}
          />
        )}
      </svg>
      <span className="relative text-micro font-semibold tabular-nums text-ink">{children}</span>
    </span>
  );
}
function StatusDot({ tone, children }: { tone: "red" | "green"; children: ReactNode }) {
  return (
    <span
      className={`flex size-5.5 shrink-0 items-center justify-center rounded-full text-canvas
        ${tone === "red" ? "bg-red" : "bg-green"}`}
      style={{ animation: "pop-in 300ms var(--ease-out-quint) both" }}
    >
      {children}
    </span>
  );
}
function StatusPill({ tone, children }: { tone: "red" | "green"; children: ReactNode }) {
  return (
    <span
      className={`inline-flex h-5.5 items-center gap-1.5 rounded-full px-2 text-tiny font-medium
        ${tone === "red" ? "bg-red-tint text-red" : "bg-green-tint text-green"}`}
      style={{ animation: "fade-in 200ms ease-out both" }}
    >
      {children}
    </span>
  );
}
export type TaskStatus = "completed" | "active" | "pending" | "failed";
export type TaskDetail = { label: string; meta: string };
export type TaskRowData = {
  /** must be unique across rows — keys toggle expansion state */
  key: string;
  label: string;
  amount: string;
  status: TaskStatus;
  /** number shown inside the pending/active ring */
  step?: number;
  details: TaskDetail[];
};
export default function TaskRows({
  variant = "Capsules",
  rows: rowsProp,
}: {
  variant?: "Capsules" | "List";
  /** task rows; defaults to demo content with a scripted status run */
  rows?: TaskRowData[];
}) {
  const tick = useTick(TICKS);
  const [manualOpen, setManualOpen] = useState<Record<string, boolean>>({});
  const demo = rowsProp === undefined;
  const draftStatus: TaskStatus = tick < 3 ? "pending" : tick === 3 ? "failed" : "completed";
  const rows: TaskRowData[] = rowsProp ?? [
    {
      key: "verify",
      label: "Verified vendor records",
      amount: "12 suppliers",
      status: "completed",
      details: [
        { label: "Matched tax and contact IDs", meta: "12/12" },
        { label: "Flagged stale records", meta: "0" },
      ],
    },
    {
      key: "index",
      label: "Build reorder task list",
      amount: "7 SKUs",
      status: "active",
      step: 2,
      details: [
        { label: "Reading POS export", meta: "3 files" },
        { label: "Scoring stockout risk", meta: "68%" },
      ],
    },
    {
      key: "draft",
      label: "Draft supplier emails",
      amount: "2 messages",
      status: draftStatus,
      step: 3,
      details: [
        { label: "Cone supplier follow-up", meta: "draft" },
        { label: "Pistachio reorder note", meta: "draft" },
      ],
    },
  ];
  const badgeFor = (row: TaskRowData) =>
    row.status === "completed" ? (
      <StatusDot tone="green"><Icon name="check" size={13} strokeWidth={3.5} /></StatusDot>
    ) : row.status === "failed" ? (
      <StatusDot tone="red"><Icon name="close" size={12} strokeWidth={3.5} /></StatusDot>
    ) : (
      <SpinnerRing active={row.status === "active"}>{row.step}</SpinnerRing>
    );
  const pillFor = (row: TaskRowData) =>
    row.status === "completed" ? (
      <StatusPill tone="green">Completed</StatusPill>
    ) : row.status === "failed" ? (
      <StatusPill tone="red">
        Failed
        <span className="flex" style={{ animation: "spin 1.2s linear infinite" }}>
          <Icon name="retry" size={12} strokeWidth={3} />
        </span>
      </StatusPill>
    ) : null;
  const list = variant === "List";
  return (
    <div
      className={`flex w-full max-w-110 flex-col ${
        list ? "gap-0 self-start overflow-hidden rounded-card bg-surface shadow-card" : "min-h-[196px] gap-2"
      }`}
    >
      {rows.map((row, i) => {
        const open = manualOpen[row.key] ?? (demo && row.key === "index" && tick === 2);
        return (
          <div
            key={row.key}
            className={`self-stretch overflow-hidden transition-[border-radius,background-color] duration-300 hover:bg-inset ${
              list ? "border-b border-line last:border-0" : "bg-surface shadow-card"
            }`}
            style={{
              borderRadius: list ? 0 : open ? "var(--radius-card)" : "var(--radius-capsule)",
              animation: `fade-up 450ms var(--ease-out-quint) ${i * 80}ms both`,
            }}
          >
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setManualOpen((current) => ({ ...current, [row.key]: !open }))}
              className="flex h-11 w-full items-center gap-2.5 px-2.5 text-left"
            >
              <span className="flex size-6 shrink-0 items-center justify-center">
                {badgeFor(row)}
              </span>
              <span className="min-w-0 flex-1 truncate text-body font-medium text-ink">
                {row.label}
              </span>
              <span className="text-caption text-ink-2 tabular-nums">{row.amount}</span>
              <span aria-live="polite" className="contents">{pillFor(row)}</span>
              <span
                aria-hidden="true"
                className="-ml-2 flex size-7 shrink-0 items-center justify-center rounded-full text-ink-3"
              >
                <Icon
                  name="chevron"
                  size={15}
                  className="transition-transform duration-300"
                  style={{ transform: open ? "rotate(180deg)" : "rotate(0)" }}
                />
              </span>
            </button>
            {/* dropdown detail — same expandable grammar as the agent traces */}
            <Disclosure open={open} live={demo}>
                  <div className="mb-2.5 grid grid-cols-[24px_1fr] gap-2.5 px-2.5">
                    <span aria-hidden className="mx-auto h-full w-px bg-line" />
                    <div className="flex flex-col gap-1.5">
                      {row.details.map((d, j) => (
                        <div
                          key={j}
                          className="flex items-center justify-between"
                          style={
                            open
                              ? { animation: `fade-up 300ms var(--ease-out-quint) ${120 + j * 100}ms both` }
                              : undefined
                          }
                        >
                          <span className="text-small text-ink-2">{d.label}</span>
                          <span className="font-mono text-tiny text-ink-3 tabular-nums">
                            {d.meta}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
            </Disclosure>
          </div>
        );
      })}
    </div>
  );
}
