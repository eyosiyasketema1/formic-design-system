"use client";
import type { ReactNode } from "react";
import Button from "./Button";
import { Icon } from "./primitives";
/* ─────────────────────────────────────────────────────────
 * FILTER BAR — the row above a list, done once
 * Filters sit in ONE row and wrap only when they run out of
 * room: four selects share a line, the fifth drops down alone.
 * Each control gets a width through its `width` prop (Select and
 * Input default to w-full for forms; here they take w-40, w-56…),
 * the search input is pinned to the right end, and a "Clear"
 * appears only while something is applied.
 *
 *   <FilterBar search={<Input width="w-56" … />} onClear={reset} active={n}>
 *     <Select width="w-40" … /> <Select width="w-40" … />
 *   </FilterBar>
 *
 * One filter per row, each full width, is the layout agents
 * fall into; this component is why they no longer have to.
 * ───────────────────────────────────────────────────────── */
export default function FilterBar({
  children,
  search,
  active = 0,
  onClear,
  clearLabel = "Clear",
  className = "",
}: {
  /** the filter controls — selects, segmented toggles, date pickers */
  children: ReactNode;
  /** a search input, pinned to the right end of the row */
  search?: ReactNode;
  /** how many filters are applied; > 0 shows the clear action */
  active?: number;
  onClear?: () => void;
  clearLabel?: string;
  className?: string;
}) {
  return (
    <div role="group" aria-label="Filters" className={`flex w-full flex-wrap items-center gap-2 ${className}`}>
      {/* each child keeps its own width: min-w-0 lets a long select shrink
          before the row wraps, and `[&>*]:max-w-full` stops any one control
          from forcing a scrollbar at 360px */}
      <div className="flex min-w-0 flex-wrap items-center gap-2 [&>*]:max-w-full">{children}</div>
      {active > 0 && onClear && (
        <Button variant="ghost" size="sm" icon={<Icon name="filter-off" />} onClick={onClear}>
          {clearLabel} · {active}
        </Button>
      )}
      {search && <div className="ml-auto min-w-0 shrink-0">{search}</div>}
    </div>
  );
}
