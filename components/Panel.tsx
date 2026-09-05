"use client";
import type { ReactNode } from "react";
import { Card } from "./primitives";
/* ─────────────────────────────────────────────────────────
 * PANEL — the dashboard card, with its anatomy built in
 * Title and caption on the left, actions on the right, on one
 * baseline; the body below. The panel stretches to its grid
 * cell (`h-full`) and the body is a flex column that fills it,
 * so a chart with `fill`, a BarList with `fill`, or a table
 * reaches the bottom edge. Two panels in one row therefore end
 * up the same height with no empty lower half in the shorter
 * one — the failure the agent reviews kept finding.
 *
 * Use Card directly only for things that are not a titled
 * section: a stat tile, a message, a composer.
 * ───────────────────────────────────────────────────────── */
export default function Panel({
  title,
  caption,
  actions,
  children,
  padding = "md",
  className = "",
  bodyClassName = "",
}: {
  title?: ReactNode;
  /** one line under the title, muted */
  caption?: ReactNode;
  /** controls that act on this panel — a select, a segmented toggle, a button */
  actions?: ReactNode;
  children: ReactNode;
  /** `md` for a section, `lg` for a hero panel */
  padding?: "md" | "lg";
  className?: string;
  /** extra classes on the body — e.g. `justify-between` to spread rows */
  bodyClassName?: string;
}) {
  const hasHeader = title || caption || actions;
  return (
    <Card className={`flex h-full min-w-0 flex-col ${padding === "lg" ? "p-5" : "p-4"} ${className}`}>
      {hasHeader && (
        <div className="flex shrink-0 items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <h3 className="truncate text-body font-medium text-ink">{title}</h3>}
            {caption && <p className="mt-0.5 text-caption text-ink-3">{caption}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={`flex min-h-0 flex-1 flex-col ${hasHeader ? "mt-3" : ""} ${bodyClassName}`}>{children}</div>
    </Card>
  );
}
