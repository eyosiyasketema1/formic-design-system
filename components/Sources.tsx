"use client";
import React, { useState, useRef, useEffect, type ReactNode } from "react";
import { Icon, Popover } from "./primitives";
import { BrandIcon } from "./brand";

/* ─────────────────────────────────────────────────────────
 * SOURCES & INLINE CITATION
 * Provenance components for AI output:
 * 1. InlineCitation — a numbered marker [1] in text that opens
 *    a popover hover card with title, domain, quote & link.
 * 2. Sources / SourcesList — a collapsible source block below
 *    an AI answer with favicon preview and detailed cards.
 * ───────────────────────────────────────────────────────── */

export interface Source {
  /** Unique index or identifier for citation (e.g. 1, 2, "1") */
  id: number | string;
  /** Title of the article, document, or webpage */
  title: string;
  /** Full URL of the source */
  url: string;
  /** Domain name for display (e.g. "formicai.dev" or "w3.org") */
  domain?: string;
  /** BrandIcon or Tabler icon name for the source logo */
  iconName?: string;
  /** Optional favicon URL */
  favicon?: string;
  /** Excerpt snippet / quoted text from the source */
  snippet?: string;
  /** Optional author or publisher name */
  author?: string;
  /** Optional publication / update date string */
  date?: string;
}

export const DEFAULT_SOURCES: Source[] = [
  {
    id: 1,
    title: "Formic Design System Tokens & Specifications",
    url: "https://formicai.dev/docs/tokens",
    domain: "formicai.dev",
    iconName: "github",
    snippet: "All components read CSS variables from styles/tokens.css with zero hardcoded colors or spacing values.",
    author: "Formic Docs",
    date: "Sep 2026",
  },
  {
    id: 2,
    title: "WCAG 2.1 Contrast Standards & Palette Derivation",
    url: "https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum",
    domain: "w3.org",
    iconName: "google",
    snippet: "Text and images of text must have a contrast ratio of at least 4.5:1 for normal text and 3:1 for large text.",
    author: "W3C Standards",
    date: "Aug 2026",
  },
  {
    id: 3,
    title: "Composition Intelligence & Admission Tests",
    url: "https://formicai.dev/docs/composition",
    domain: "formicai.dev",
    snippet: "Every screen declares a brief (reader, question, action, register) and passes mechanical validation via compose_check.py.",
    author: "Formic Design",
    date: "Sep 2026",
  },
];

/* Helper to render source icon (BrandIcon, favicon img, or fallback) */
function SourceLogo({ source, size = "sm" }: { source: Source; size?: "sm" | "md" }) {
  const sizeCls = size === "sm" ? "size-3.5" : "size-4";

  if (source.favicon) {
    return (
      <img
        src={source.favicon}
        alt=""
        className={`${sizeCls} rounded-full object-cover shadow-[0_0_0_1px_var(--line)]`}
      />
    );
  }

  if (source.iconName) {
    return <BrandIcon name={source.iconName} className={`${sizeCls} text-ink-2 shrink-0`} />;
  }

  return <Icon name="link" className={`${sizeCls} text-ink-3 shrink-0`} />;
}

/* ── InlineCitation ─────────────────────────────────────── */
export function InlineCitation({
  source,
  label,
  className = "",
}: {
  /** Source object or array of sources for this citation marker */
  source: Source | Source[];
  /** Optional custom marker label (defaults to source.id or "1, 2") */
  label?: string | ReactNode;
  className?: string;
}) {
  const sources = Array.isArray(source) ? source : [source];
  const primarySource = sources[0];
  const displayLabel =
    label ?? (sources.length === 1 ? `[${primarySource.id}]` : `[${sources.map((s) => s.id).join(", ")}]`);

  const [isOpen, setIsOpen] = useState(false);
  const [popoverPos, setPopoverPos] = useState<{ x: number; top?: number; bottom?: number }>({ x: 0, top: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeTimeout = useRef<NodeJS.Timeout | null>(null);

  const updatePos = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const width = 288; /* w-72 = 18rem = 288px */
    const x = Math.max(12, Math.min(window.innerWidth - width - 12, rect.left + rect.width / 2 - width / 2));

    /* flip popover above trigger if tight at bottom */
    if (rect.bottom + 220 > window.innerHeight && rect.top > 220) {
      setPopoverPos({ x, bottom: window.innerHeight - rect.top + 6 });
    } else {
      setPopoverPos({ x, top: rect.bottom + 6 });
    }
  };

  const handleMouseEnter = () => {
    if (closeTimeout.current) clearTimeout(closeTimeout.current);
    updatePos();
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    closeTimeout.current = setTimeout(() => {
      setIsOpen(false);
    }, 180);
  };

  useEffect(() => {
    return () => {
      if (closeTimeout.current) clearTimeout(closeTimeout.current);
    };
  }, []);

  if (!primarySource) return null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleMouseEnter}
        onBlur={handleMouseLeave}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label={`Citation ${displayLabel}`}
        className={`corner-smooth inline-flex items-center justify-center align-baseline px-1.5 py-0.5 mx-0.5 rounded-sm font-mono text-micro font-semibold text-accent bg-accent-tint hover:bg-accent hover:text-canvas focus-visible:outline-none transition-colors duration-150 cursor-pointer select-none ${className}`}
      >
        {displayLabel}
      </button>

      {isOpen && (
        <Popover
          x={popoverPos.x}
          top={popoverPos.top}
          bottom={popoverPos.bottom}
          className="w-72 p-3 shadow-popover"
          onClose={() => setIsOpen(false)}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="flex flex-col gap-2">
            {sources.map((src, idx) => (
              <div
                key={src.id}
                className={`flex flex-col gap-1.5 ${idx > 0 ? "pt-2 border-t border-line" : ""}`}
              >
                {/* Header: logo + domain + citation number */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <SourceLogo source={src} size="sm" />
                    <span className="text-micro font-medium text-ink-3 truncate">
                      {src.domain || (src.url ? new URL(src.url).hostname.replace(/^www\./, "") : "Source")}
                    </span>
                  </div>
                  <span className="rounded-sm bg-accent-tint px-1 py-0.2 font-mono text-micro font-medium text-accent">
                    [{src.id}]
                  </span>
                </div>

                {/* Title */}
                <a
                  href={src.url}
                  target="_blank"
                  rel="noreferrer"
                  className="animated-underline text-caption font-semibold text-ink hover:text-accent line-clamp-2"
                >
                  {src.title}
                </a>

                {/* Snippet / quote */}
                {src.snippet && (
                  <p className="rounded-sm bg-inset px-2.5 py-1.5 border-l-2 border-accent text-caption leading-relaxed text-ink-2 line-clamp-3">
                    “{src.snippet}”
                  </p>
                )}

                {/* Footer link */}
                <div className="flex items-center justify-between pt-0.5 text-micro text-ink-3">
                  <span>{src.author || src.date || "Verified citation"}</span>
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-accent hover:underline"
                  >
                    <span>Visit source</span>
                    <Icon name="external-link" className="size-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </Popover>
      )}
    </>
  );
}

/* ── Sources / SourcesList ──────────────────────────────── */
export function SourcesList({
  sources = DEFAULT_SOURCES,
  defaultExpanded = false,
  title = "Sources",
  className = "",
  onSourceClick,
}: {
  /** Array of sources to display */
  sources?: Source[];
  /** Whether the list is expanded by default */
  defaultExpanded?: boolean;
  /** Section header title */
  title?: string;
  className?: string;
  onSourceClick?: (source: Source) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (!sources || sources.length === 0) return null;

  return (
    <div className={`flex w-full flex-col gap-2 ${className}`}>
      {/* Collapsible Trigger Bar */}
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
        className="corner-smooth group flex w-full items-center justify-between gap-3 rounded-control bg-surface px-3 py-2 text-small font-medium text-ink-2 shadow-hairline hover:bg-hover hover:text-ink transition-colors duration-150"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Icon name="bookmark" className="size-3.5 text-accent shrink-0" />
          <span className="font-semibold text-ink">{title}</span>
          <span className="rounded-full bg-accent-tint px-1.5 py-0.2 font-mono text-micro font-semibold text-accent">
            {sources.length}
          </span>

          {/* Collapsed favicon strip */}
          {!isExpanded && (
            <div className="ml-1 hidden sm:flex items-center -space-x-1 overflow-hidden">
              {sources.slice(0, 4).map((src) => (
                <div
                  key={src.id}
                  className="size-4 rounded-full bg-surface shadow-[0_0_0_1.5px_var(--canvas)] flex items-center justify-center overflow-hidden shrink-0"
                >
                  <SourceLogo source={src} size="sm" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-ink-3 group-hover:text-ink">
          <span className="text-micro hidden sm:inline">{isExpanded ? "Hide sources" : "Show sources"}</span>
          <Icon
            name="chevron-down"
            className={`size-3.5 transition-transform duration-150 ${isExpanded ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {/* Expanded Grid of Source Cards */}
      {isExpanded && (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 pt-1">
          {sources.map((src) => (
            <div
              key={src.id}
              className="corner-smooth group relative flex flex-col justify-between gap-2 rounded-control bg-surface p-3 shadow-hairline hover:shadow-card transition-all duration-150 border border-line/60 hover:border-line-strong"
            >
              <div className="flex flex-col gap-1.5">
                {/* Header row: logo + domain + index badge */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <SourceLogo source={src} size="sm" />
                    <span className="text-micro font-medium text-ink-3 truncate">
                      {src.domain || (src.url ? new URL(src.url).hostname.replace(/^www\./, "") : "Source")}
                    </span>
                  </div>
                  <span className="rounded-sm bg-accent-tint px-1.5 py-0.2 font-mono text-micro font-semibold text-accent">
                    [{src.id}]
                  </span>
                </div>

                {/* Title */}
                <a
                  href={src.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => onSourceClick?.(src)}
                  className="animated-underline text-caption font-semibold text-ink hover:text-accent line-clamp-2"
                >
                  {src.title}
                </a>

                {/* Snippet */}
                {src.snippet && (
                  <p className="text-caption leading-relaxed text-ink-2 line-clamp-2">
                    {src.snippet}
                  </p>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-1 border-t border-line/40 text-micro text-ink-3">
                <span className="truncate">{src.author || src.date || "Verified source"}</span>
                <a
                  href={src.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => onSourceClick?.(src)}
                  className="inline-flex items-center gap-1 font-medium text-accent hover:underline shrink-0"
                >
                  <span>Open</span>
                  <Icon name="external-link" className="size-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sources({
  sources = DEFAULT_SOURCES,
  defaultExpanded = false,
  className = "",
}: {
  sources?: Source[];
  defaultExpanded?: boolean;
  className?: string;
}) {
  return <SourcesList sources={sources} defaultExpanded={defaultExpanded} className={className} />;
}
