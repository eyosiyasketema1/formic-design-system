"use client";
import { useState } from "react";
import { GlideMenu, Icon } from "./primitives";
/* ─────────────────────────────────────────────────────────
 * SEARCH — command search with live filtering.
 * The field, clear action, and results are directly usable.
 * ───────────────────────────────────────────────────────── */
const DEFAULT_ITEMS = [
  "Forecast summer demand",
  "Find waffle cone suppliers",
  "Compare seasonal flavors",
  "Draft flavor launch plan",
  "Check cold-chain status",
  "Audit sugar costs",
  "Retire low sellers",
];
export default function SearchList({
  items = DEFAULT_ITEMS,
  placeholder = "Search flavors…",
  onPick,
}: {
  /** searchable entries; defaults to demo content */
  items?: string[];
  placeholder?: string;
  /** called with the picked result */
  onPick?: (item: string) => void;
} = {}) {
  const [query, setQuery] = useState("");
  const results = query
    ? items.filter((i) => i.toLowerCase().includes(query.toLowerCase()))
    : items.slice(0, 5);
  const empty = query.length > 2 && results.length === 0;
  return (
    <div className="flex min-h-[248px] w-full max-w-72 flex-col items-stretch">
      <div className="w-full self-start overflow-hidden rounded-card bg-surface shadow-overlay">
        {/* input row */}
        <div className="flex h-10 items-center gap-2 border-b border-line px-3 transition-colors duration-150 focus-within:bg-hover hover:bg-hover">
          <Icon name="search" size={14} strokeWidth={2} className="shrink-0 text-ink-3" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder}
            aria-label={placeholder.replace("…", "")}
            className="min-w-0 flex-1 bg-transparent text-body text-ink outline-none placeholder:text-ink-3"
          />
          {query && (
            <button
              aria-label="Clear search"
              type="button"
              onClick={() => setQuery("")}
              className="flex size-6 items-center justify-center rounded-full text-ink-3
                transition-colors duration-150 hover:bg-line/70 hover:text-ink"
              style={{ animation: "fade-in 150ms ease-out both" }}
            >
              <Icon name="close" size={11} />
            </button>
          )}
        </div>
        {/* results / empty state */}
        {empty ? (
          <div className="flex flex-col items-center justify-center gap-1 px-4 py-8" style={{ animation: "fade-in 250ms ease-out both" }}>
            <span className="mb-1.5 flex size-8 items-center justify-center rounded-control bg-inset text-ink-3 shadow-hairline">
              <Icon name="search" size={15} strokeWidth={1.8} />
            </span>
            <span className="text-body font-medium text-ink">No results found</span>
            <span className="text-small text-ink-3">Adjust your search to try again</span>
          </div>
        ) : (
          <div className="p-1">
            <GlideMenu className="flex flex-col gap-px" highlightClassName="inset-x-0 rounded-sm bg-hover">
              {results.map((item) => (
                <button
                  key={item}
                  data-menu-row
                  type="button"
                  onClick={() => {
                    setQuery(item);
                    onPick?.(item);
                  }}
                  className="relative z-10 flex h-8 w-full items-center rounded-sm px-2 text-left text-body text-ink"
                  style={{ animation: "fade-in 200ms ease-out both" }}
                >
                  {item}
                </button>
              ))}
            </GlideMenu>
          </div>
        )}
      </div>
    </div>
  );
}
