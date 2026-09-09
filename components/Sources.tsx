"use client";
import { useState, useRef, useId, type ReactNode } from "react";
import { Icon, Popover, AvatarStack, type IconName } from "./primitives";
import { BrandIcon, type BrandName } from "./brand";
import { useAnchoredLayer } from "./hooks";

/* ─────────────────────────────────────────────────────────
 * SOURCES & INLINE CITATION
 * Provenance components for AI output:
 * 1. InlineCitation — a quiet superscript marker [1] in prose
 *    that opens an anchored hover card with title, quote & link.
 * 2. SourcesList — a minimal collapsible source row below
 *    an AI reply that expands to readable item rows.
 * ───────────────────────────────────────────────────────── */

export interface Source {
  /** Unique index or identifier for citation (e.g. 1, 2, "1") */
  id: number | string;
  /** Title of the article, document, or webpage */
  title: string;
  /** Full URL of the source */
  url: string;
  /** Domain name for display (e.g. "selamcoffee.com") */
  domain?: string;
  /** Brand mark name from BrandIcon */
  brand?: BrandName;
  /** Generic icon fallback name from ICONS */
  icon?: IconName;
  /** Optional favicon URL for AvatarStack */
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
    title: "Northwind Bank — Commercial Onboarding Policy (v4.2)",
    url: "https://compliance.northwind.internal/policies/kyc",
    domain: "northwind.internal",
    brand: "slack",
    snippet: "Entity verification requires dual authorization for credit lines exceeding 250,000 ETB.",
    author: "Compliance Dept",
    date: "Sep 2026",
  },
  {
    id: 2,
    title: "Selam Coffee — Q3 Velocity & Single-Origin Margins",
    url: "https://reports.selamcoffee.com/analytics/q3-margins",
    domain: "selamcoffee.com",
    brand: "stripe",
    snippet: "Yirgacheffe washed beans maintain 44% margin; recommend increasing roast batch sizes before Friday.",
    author: "Selam Analytics",
    date: "Aug 2026",
  },
  {
    id: 3,
    title: "Cold-Chain Supplier Audit & Dairy Delivery Checklist",
    url: "https://ops.freshdairy.internal/sop/cold-chain",
    domain: "freshdairy.internal",
    brand: "notion",
    snippet: "Refrigerated transport logs must verify unbroken temperature monitoring under 4°C at intake.",
    author: "Quality Operations",
    date: "Aug 2026",
  },
];

/* Helper to render source icon (BrandIcon, favicon img, or fallback Icon) */
function SourceIcon({ source, size = 14 }: { source: Source; size?: number }) {
  if (source.favicon) {
    return <img src={source.favicon} alt="" className="size-3.5 rounded-full object-cover shrink-0" />;
  }
  if (source.brand) {
    return <BrandIcon name={source.brand} size={size} className="text-ink-2 shrink-0" />;
  }
  if (source.icon) {
    return <Icon name={source.icon} size={size} className="text-ink-3 shrink-0" />;
  }
  return <Icon name="file" size={size} className="text-ink-3 shrink-0" />;
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
    label ?? (sources.length === 1 ? String(primarySource?.id ?? "1") : sources.map((s) => s.id).join(", "));

  const layerId = useId();
  const { open, position, anchorRef, openAt, close } = useAnchoredLayer<HTMLButtonElement>(layerId);
  const timerRef = useRef<number | null>(null);

  const handleMouseEnter = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    openAt({ estimatedHeight: 160, width: 280, align: "start" });
  };

  const handleMouseLeave = () => {
    timerRef.current = window.setTimeout(() => close(), 180);
  };

  const handleClick = () => {
    if (open) close();
    else openAt({ estimatedHeight: 160, width: 280, align: "start" });
  };

  if (!primarySource) return null;

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? layerId : undefined}
        aria-label={`Source citation ${displayLabel}`}
        className={`align-super text-micro font-medium text-ink-3 hover:text-ink hover:underline cursor-pointer select-none leading-none px-0.5 ${className}`}
      >
        [{displayLabel}]
      </button>

      {open && position && (
        <Popover
          id={layerId}
          x={position.x}
          top={position.top}
          bottom={position.bottom}
          width={position.width ?? 280}
          role="dialog"
          className="p-3 shadow-overlay"
          onClose={close}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="flex flex-col gap-2.5">
            {sources.map((src, idx) => (
              <div key={src.id} className={`flex flex-col gap-1.5 ${idx > 0 ? "pt-2 border-t border-line" : ""}`}>
                <div className="flex items-center justify-between gap-2 text-caption">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <SourceIcon source={src} size={13} />
                    <span className="font-medium text-ink-3 truncate">
                      {src.domain || (src.url ? new URL(src.url).hostname.replace(/^www\./, "") : "Source")}
                    </span>
                  </div>
                  <span className="font-mono text-ink-3 shrink-0">[{src.id}]</span>
                </div>

                <a
                  href={src.url}
                  target="_blank"
                  rel="noreferrer"
                  className="animated-underline text-body font-semibold text-ink hover:underline line-clamp-2"
                >
                  {src.title}
                </a>

                {src.snippet && (
                  <p className="rounded-sm bg-inset p-2 text-caption leading-relaxed text-ink-2 line-clamp-3">
                    {src.snippet}
                  </p>
                )}

                <div className="flex items-center justify-between pt-0.5 text-caption text-ink-3">
                  <span>{src.author || src.date || ""}</span>
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-ink hover:underline"
                  >
                    <span>Open</span>
                    <Icon name="external" size={13} />
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
  className = "",
  onSourceClick,
}: {
  /** Array of sources to display */
  sources?: Source[];
  /** Initial expanded state */
  defaultExpanded?: boolean;
  className?: string;
  onSourceClick?: (source: Source) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (!sources || sources.length === 0) return null;

  const faviconSrcs = sources.map((s) => s.favicon).filter(Boolean) as string[];

  return (
    <div className={`flex w-full flex-col gap-2 ${className}`}>
      {/* Quiet trigger: 32px (sm control scale) */}
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
        className="corner-smooth group flex h-8 w-fit items-center gap-2 rounded-control bg-surface px-2.5 text-caption font-medium text-ink-2 shadow-hairline hover:bg-hover hover:text-ink transition-colors duration-150 cursor-pointer select-none"
      >
        {faviconSrcs.length > 0 && <AvatarStack srcs={faviconSrcs.slice(0, 3)} />}
        <span>
          {sources.length} {sources.length === 1 ? "source" : "sources"}
        </span>
        <Icon
          name="chevron"
          size={14}
          className={`text-ink-3 transition-transform duration-150 group-hover:text-ink ${
            isExpanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Expanded: Clean vertical list of rows for conversation replies */}
      {isExpanded && (
        <div className="flex w-full flex-col divide-y divide-line rounded-control bg-surface shadow-hairline border border-line overflow-hidden">
          {sources.map((src) => (
            <div
              key={src.id}
              className="flex items-start justify-between gap-3 p-2.5 hover:bg-hover transition-colors duration-150"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <span className="font-mono text-caption text-ink-3 shrink-0 pt-0.5">[{src.id}]</span>
                <div className="mt-1 shrink-0">
                  <SourceIcon source={src} size={14} />
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => onSourceClick?.(src)}
                    className="text-caption font-medium text-ink hover:underline truncate"
                  >
                    {src.title}
                  </a>
                  {src.snippet && (
                    <p className="text-caption text-ink-2 line-clamp-1">
                      {src.snippet}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-caption text-ink-3">
                    <span>{src.domain || (src.url ? new URL(src.url).hostname.replace(/^www\./, "") : "")}</span>
                    {src.date && (
                      <>
                        <span>·</span>
                        <span>{src.date}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <a
                href={src.url}
                target="_blank"
                rel="noreferrer"
                onClick={() => onSourceClick?.(src)}
                aria-label={`Open ${src.title}`}
                className="p-1 text-ink-3 hover:text-ink shrink-0"
              >
                <Icon name="external" size={14} />
              </a>
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
