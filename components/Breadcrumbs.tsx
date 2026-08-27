"use client";
import { Fragment } from "react";
import { Icon, IconButton } from "./primitives";
import DropdownMenu from "./DropdownMenu";
/* ─────────────────────────────────────────────────────────
 * BREADCRUMBS
 * Path trail with chevron separators. When the trail is
 * longer than maxVisible, the middle collapses into a
 * DropdownMenu; the current page carries aria-current and
 * is never a link. Crumbs render as <a> when href is set,
 * as buttons otherwise (SPA navigation via onNavigate).
 * ───────────────────────────────────────────────────────── */
export type Crumb = { key: string; label: string; href?: string };
const DEFAULT_CRUMBS: Crumb[] = [
  { key: "home", label: "Home" },
  { key: "flavors", label: "Flavors" },
  { key: "seasonal", label: "Seasonal" },
  { key: "pistachio", label: "Roasted Pistachio" },
  { key: "batch", label: "Batch 42" },
];
const linkClass =
  "flex h-6 max-w-40 items-center rounded-sm px-1 text-caption text-ink-3 transition-colors duration-150 hover:bg-hover hover:text-ink";
function CrumbLink({ crumb, onNavigate }: { crumb: Crumb; onNavigate?: (key: string) => void }) {
  if (crumb.href) {
    return (
      <a href={crumb.href} onClick={() => onNavigate?.(crumb.key)} className={linkClass}>
        <span className="min-w-0 truncate">{crumb.label}</span>
      </a>
    );
  }
  return (
    <button type="button" onClick={() => onNavigate?.(crumb.key)} className={linkClass}>
      <span className="min-w-0 truncate">{crumb.label}</span>
    </button>
  );
}
export default function Breadcrumbs({
  items = DEFAULT_CRUMBS,
  maxVisible = 4,
  onNavigate,
  className = "",
}: {
  /** the trail, root first; defaults to demo content */
  items?: Crumb[];
  /** crumbs shown before the middle collapses into a menu (min 3) */
  maxVisible?: number;
  /** called with the crumb key on click / menu selection */
  onNavigate?: (key: string) => void;
  className?: string;
} = {}) {
  const limit = Math.max(3, maxVisible);
  const collapsed = items.length > limit;
  /* first crumb + menu + trailing (limit − 2) crumbs */
  const hidden = collapsed ? items.slice(1, items.length - (limit - 2)) : [];
  const trail = collapsed ? [items[0], ...items.slice(items.length - (limit - 2))] : items;
  const separator = (
    <Icon name="chevron-right" size={13} strokeWidth={2} className="shrink-0 text-ink-3" />
  );
  return (
    <nav aria-label="Breadcrumb" className={`w-full ${className}`}>
      <ol className="flex flex-wrap items-center gap-0.5">
        {trail.map((crumb, index) => {
          const isLast = index === trail.length - 1;
          return (
            <Fragment key={crumb.key}>
              {collapsed && index === 1 && (
                <li className="flex items-center gap-0.5">
                  <DropdownMenu
                    menuWidth={192}
                    items={hidden.map((entry) => ({ key: entry.key, label: entry.label }))}
                    onSelect={(key) => {
                      /* mirror visible-crumb behavior: callback fires and href navigates */
                      onNavigate?.(key);
                      const target = hidden.find((entry) => entry.key === key);
                      if (target?.href) window.location.assign(target.href);
                    }}
                  >
                    <IconButton
                      label={`Show ${hidden.length} hidden levels`}
                      className="text-ink-3 hover:bg-hover hover:text-ink"
                    >
                      <Icon name="ellipsis" size={13} strokeWidth={2} />
                    </IconButton>
                  </DropdownMenu>
                  <span aria-hidden>{separator}</span>
                </li>
              )}
              <li className="flex min-w-0 items-center gap-0.5">
              {isLast ? (
                <span
                  aria-current="page"
                  className="flex h-6 max-w-48 items-center px-1 text-caption font-medium text-ink"
                >
                  <span className="min-w-0 truncate">{crumb.label}</span>
                </span>
              ) : (
                <>
                  <CrumbLink crumb={crumb} onNavigate={onNavigate} />
                  <span aria-hidden>{separator}</span>
                </>
              )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
