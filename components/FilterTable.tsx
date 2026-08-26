"use client";
import { useState } from "react";
import { Disclosure } from "./primitives";
/* ─────────────────────────────────────────────────────────
 * FILTER TABLE
 * Status chips directly filter the task table.
 * ───────────────────────────────────────────────────────── */
export type Status = "todo" | "progress" | "done";
export type FilterRow = { task: string; date: string; status: Status; owner: string };
const DEFAULT_ROWS: FilterRow[] = [
  { task: "Restock mango sorbet", date: "Dec 03", status: "todo", owner: "Mango Moon Gelato" },
  { task: "Churn black sesame", date: "Sep 22", status: "progress", owner: "Kumo Creamery" },
  { task: "Print summer menu", date: "Jan 02", status: "todo", owner: "Coral Coast Sorbet" },
  { task: "Taste-test batch 42", date: "Nov 08", status: "progress", owner: "Maple Orbit" },
  { task: "Order waffle cones", date: "Apr 14", status: "done", owner: "Aurora Scoops" },
];
/* pill classes + dot colors both derive from the --status-* base hues */
const STATUS: Record<Status, { label: string; pill: string; dot: string }> = {
  todo: { label: "To do", pill: "status-pill-todo", dot: "var(--status-todo)" },
  progress: { label: "In Progress", pill: "status-pill-progress", dot: "var(--status-progress)" },
  done: { label: "Completed", pill: "status-pill-done", dot: "var(--status-done)" },
};
const FILTER_KEYS: ("all" | Status)[] = ["all", "todo", "progress", "done"];
export default function FilterTable({
  rows = DEFAULT_ROWS,
}: {
  /** tasks to display; chip counts derive from these (task names must be unique — they key the rows) */
  rows?: FilterRow[];
} = {}) {
  const [filter, setFilter] = useState<"all" | Status>("all");
  const countFor = (key: "all" | Status) =>
    key === "all" ? rows.length : rows.filter((row) => row.status === key).length;
  return (
    <div className="w-full max-w-105">
      {/* filter chips */}
      <div
        className="-mx-1 mb-1 flex items-center gap-1 overflow-x-auto px-1 py-1"
        style={{ scrollbarWidth: "none" }}
      >
        {FILTER_KEYS.map((key) => {
          const active = filter === key;
          const status = key === "all" ? null : STATUS[key];
          return (
            <button
              key={key}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(key)}
              className={`flex h-6.5 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-small
                font-medium transition-[background-color,box-shadow,color] duration-200
                ${active ? "bg-surface text-ink shadow-btn" : "text-ink-2 hover:bg-hover"}`}
            >
              {status && <span className="size-1.5 rounded-full" style={{ background: status.dot }} />}
              {status ? status.label : "All"}
              <span
                className={`rounded-[4px] px-1 text-micro tabular-nums
                  ${active ? "bg-field text-ink-2" : "text-ink-3"}`}
              >
                {countFor(key)}
              </span>
            </button>
          );
        })}
      </div>
      {/* table */}
      <div
        aria-label="Scrollable task table"
        className="overflow-x-auto rounded-card bg-surface shadow-card"
        role="region"
        tabIndex={0}
        style={{ scrollbarWidth: "none" }}
      >
        <div className="min-w-[420px]">
          <div className="grid grid-cols-[1.3fr_0.6fr_0.95fr_0.9fr] border-b border-line px-3 py-2 text-tiny font-medium text-ink-3">
            <span>Task name</span>
            <span>Date</span>
            <span>Status</span>
            <span>Advisor</span>
          </div>
          {rows.map((row) => {
            const shown = filter === "all" || row.status === filter;
            const status = STATUS[row.status];
            return (
              <Disclosure key={row.task} open={shown} className="border-b border-line last:border-0">
                  <div
                    className="grid grid-cols-[1.3fr_0.6fr_0.95fr_0.9fr] items-center px-3 py-2
                      text-small transition-colors duration-150 hover:bg-hover"
                  >
                    <span className="truncate font-medium text-ink">{row.task}</span>
                    <span className="text-ink-2 tabular-nums">{row.date}</span>
                    <span>
                      <span
                        className={`inline-flex h-5 items-center rounded-[5px] px-1.5
                          text-tiny font-medium ${status.pill}`}
                      >
                        {status.label}
                      </span>
                    </span>
                    <span className="truncate text-ink-2">{row.owner}</span>
                  </div>
              </Disclosure>
            );
          })}
        </div>
      </div>
    </div>
  );
}
