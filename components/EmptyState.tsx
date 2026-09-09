"use client";
import type { ReactNode } from "react";
import { Icon, type IconName } from "./primitives";
/* ─────────────────────────────────────────────────────────
 * EMPTY STATE — what a surface says when there is nothing to show
 * The doctrine says real empty states, never fake numbers; this
 * is the one component that says it. Four situations, each with
 * its own default icon and wording so the reader knows why the
 * surface is empty and what to do next:
 *
 *   first    nothing has been made yet: the lead action creates it
 *   search   a query matched nothing: say what was searched, clear it
 *   filter   filters hid everything: clear them
 *   error    the data could not load: retry
 *
 * One title, one line of description, one action; a secondary link
 * at most. Centered, fluid, capped so the copy stays a readable
 * measure. `size="sm"` for inside a panel, list or table cell;
 * `md` for a page. The icon tile is ink on inset (rule 16); the one
 * action carries the accent only for `first`, where creating the
 * thing is the page's purpose.
 * ───────────────────────────────────────────────────────── */
export type EmptyStateKind = "first" | "search" | "filter" | "error";
export type EmptyStateSize = "sm" | "md";

const KINDS: Record<EmptyStateKind, { icon: IconName; title: string; description: string }> = {
  first: { icon: "sparkles", title: "Nothing here yet", description: "When you add the first one it shows up here." },
  search: { icon: "search", title: "No matches", description: "Nothing matches that search. Try another word or clear it." },
  filter: { icon: "filter-off", title: "Nothing matches these filters", description: "Every item is hidden by the current filters. Clear them to see the list again." },
  error: { icon: "refresh-alert", title: "Could not load", description: "Something went wrong on the way here. Try again in a moment." },
};

export default function EmptyState({
  kind = "first",
  icon,
  title,
  description,
  query,
  action,
  secondary,
  size = "md",
  className = "",
}: {
  /** why the surface is empty; picks the default icon and words */
  kind?: EmptyStateKind;
  /** overrides the kind's icon */
  icon?: IconName;
  title?: ReactNode;
  description?: ReactNode;
  /** for `search`: the words that matched nothing, quoted in the title */
  query?: string;
  /** the one action: a Button (accent for `first`, secondary otherwise) */
  action?: ReactNode;
  /** an optional quieter second action: a ghost Button or a link */
  secondary?: ReactNode;
  /** md for a page or a large panel, sm inside a list, table or small panel */
  size?: EmptyStateSize;
  className?: string;
}) {
  const spec = KINDS[kind];
  const heading = title ?? (kind === "search" && query ? <>No matches for &ldquo;{query}&rdquo;</> : spec.title);
  const sm = size === "sm";
  return (
    <div role="status" className={`flex w-full flex-col items-center justify-center text-center ${sm ? "gap-2 px-4 py-6" : "gap-3 px-6 py-12"} ${className}`}>
      <span aria-hidden className={`corner-smooth flex shrink-0 items-center justify-center rounded-md bg-inset text-ink-2 ${sm ? "size-9" : "size-12"}`}>
        <Icon name={icon ?? spec.icon} size={sm ? 17 : 22} strokeWidth={1.8} />
      </span>
      <div className="flex max-w-sm flex-col gap-1">
        <p className={`font-semibold text-ink ${sm ? "text-body" : "text-title"}`}>{heading}</p>
        <p className={`text-ink-2 ${sm ? "text-caption" : "text-body"}`}>{description ?? spec.description}</p>
      </div>
      {(action || secondary) && (
        <div className={`flex flex-wrap items-center justify-center gap-2 ${sm ? "" : "mt-1"}`}>
          {action}
          {secondary}
        </div>
      )}
    </div>
  );
}
