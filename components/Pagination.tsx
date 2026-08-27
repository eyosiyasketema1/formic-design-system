"use client";
import { useState } from "react";
import { Icon } from "./primitives";
/* ─────────────────────────────────────────────────────────
 * PAGINATION
 * Numbered pages with sibling windows and gap ellipses;
 * first and last pages always stay reachable. Active page
 * carries aria-current; prev / next disable at the edges.
 * ───────────────────────────────────────────────────────── */
type PageEntry = number | "gap";
/** 1 … [sibling window] … count. The window expands at the edges so
 *  the item count stays constant while paging (no buttons shifting
 *  under the cursor), and a gap never hides a single page. */
function pageRange(page: number, count: number, siblings: number): PageEntry[] {
  const visible = siblings * 2 + 5; /* first + last + window + both gaps */
  if (count <= visible) return Array.from({ length: count }, (_, i) => i + 1);
  const start = Math.max(2, Math.min(page - siblings, count - (visible - 3)));
  const end = Math.min(count - 1, Math.max(page + siblings, visible - 2));
  const range: PageEntry[] = [1];
  if (start > 3) range.push("gap");
  else if (start === 3) range.push(2);
  for (let i = start; i <= end; i += 1) range.push(i);
  if (end < count - 2) range.push("gap");
  else if (end === count - 2) range.push(count - 1);
  range.push(count);
  return range;
}
export default function Pagination({
  pageCount = 12,
  page,
  defaultPage = 1,
  onChange,
  siblingCount = 1,
  className = "",
}: {
  pageCount?: number;
  /** controlled current page — omit and use defaultPage for uncontrolled */
  page?: number;
  defaultPage?: number;
  onChange?: (page: number) => void;
  /** pages shown on each side of the current page */
  siblingCount?: number;
  className?: string;
} = {}) {
  const [internal, setInternal] = useState(defaultPage);
  const current = Math.min(Math.max(page !== undefined ? page : internal, 1), pageCount);
  const go = (next: number) => {
    const clamped = Math.min(Math.max(next, 1), pageCount);
    if (clamped === current) return;
    if (page === undefined) setInternal(clamped);
    onChange?.(clamped);
  };
  const arrow =
    "flex size-8 shrink-0 items-center justify-center rounded-control text-ink-2 transition-colors duration-150 enabled:hover:bg-hover enabled:hover:text-ink disabled:opacity-40";
  return (
    <nav aria-label="Pagination" className={`w-full ${className}`}>
      <ul className="flex flex-wrap items-center gap-1">
        <li>
          <button
            type="button"
            aria-label="Previous page"
            disabled={current <= 1}
            onClick={() => go(current - 1)}
            className={arrow}
          >
            <Icon name="chevron-left" size={15} strokeWidth={2} />
          </button>
        </li>
        {pageRange(current, pageCount, siblingCount).map((entry, index) =>
          entry === "gap" ? (
            <li key={`gap-${index}`} aria-hidden>
              <span className="flex size-8 items-end justify-center pb-2 text-ink-3">
                <Icon name="ellipsis" size={13} strokeWidth={2} />
              </span>
            </li>
          ) : (
            <li key={entry}>
              <button
                type="button"
                aria-label={`Page ${entry}`}
                aria-current={entry === current ? "page" : undefined}
                onClick={() => go(entry)}
                className={`flex h-8 min-w-8 shrink-0 items-center justify-center rounded-control px-1 text-caption font-medium tabular-nums transition-colors duration-150 ${
                  entry === current
                    ? "bg-ink text-canvas"
                    : "text-ink-2 hover:bg-hover hover:text-ink"
                }`}
                style={entry === current ? { boxShadow: "var(--highlight-raised)" } : undefined}
              >
                {entry}
              </button>
            </li>
          ),
        )}
        <li>
          <button
            type="button"
            aria-label="Next page"
            disabled={current >= pageCount}
            onClick={() => go(current + 1)}
            className={arrow}
          >
            <Icon name="chevron-right" size={15} strokeWidth={2} />
          </button>
        </li>
      </ul>
    </nav>
  );
}
