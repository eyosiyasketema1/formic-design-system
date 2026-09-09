"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Disclosure, Icon, Popover } from "./primitives";
import { BrandIcon, type BrandName } from "./brand";
import { useAnchoredLayer } from "./hooks";
/* ─────────────────────────────────────────────────────────
 * SOURCES & INLINE CITATION — where an answer came from
 * Two pieces, one list of sources.
 *
 *   InlineCitation   a small number in the running text, the height of
 *                    a superscript so the line does not move. Hover or
 *                    focus opens a card: the source's mark and domain,
 *                    its title, the quoted passage, and one link out.
 *   Sources          one quiet row under the reply: the marks, "3
 *                    sources", a chevron. Open, it is a list of rows
 *                    (number, mark, title, domain), not a grid of cards;
 *                    a reply is a column, and rows read in a column.
 *
 * Colour: ink on inset for the marks and the numbers; the one link out
 * is the only accent (rule 13). A source's mark is its favicon, a brand
 * mark from brand.tsx when the source is a known company, or the
 * initials of its title, the way Avatar falls back for people.
 * ───────────────────────────────────────────────────────── */
export type Source = {
  /** the number the text cites; 1-based, in the order sources are listed */
  id: number;
  /** what the page or document is called */
  title: string;
  url: string;
  /** shown under the title; derived from the url when omitted */
  domain?: string;
  /** the favicon; a brand mark or initials stand in without one */
  favicon?: string;
  /** a known company: its monochrome mark from brand.tsx */
  brand?: BrandName;
  /** the passage the answer leans on */
  quote?: string;
  /** who or when: "Northwind Bank · Aug 2026" */
  meta?: string;
};

export const DEFAULT_SOURCES: Source[] = [
  {
    id: 1,
    title: "Brand guidelines, second edition",
    url: "https://northwindbank.et/brand/guidelines-2026.pdf",
    domain: "northwindbank.et",
    quote: "Use the wordmark on white or on Northwind blue only. On photography, use the reversed mark inside the safe area.",
    meta: "Northwind Bank · Aug 2026",
  },
  {
    id: 2,
    title: "Site analytics, July to August",
    url: "https://selamcoffee.com/reports/site-summer-2026",
    domain: "selamcoffee.com",
    quote: "Mobile is 71% of sessions; the menu page carries 38% of exits, most of them on the price table.",
    meta: "Selam Coffee · 2 Sep 2026",
  },
  {
    id: 3,
    title: "Supplier price list, Q3",
    url: "https://creamery.et/suppliers/q3-2026",
    domain: "creamery.et",
    quote: "Pistachio paste rises 12% from 1 October; cocoa holds until the December tender.",
    meta: "Creamery · 28 Aug 2026",
  },
];

const domainOf = (source: Source) => {
  if (source.domain) return source.domain;
  try { return new URL(source.url).hostname.replace(/^www\./, ""); } catch { return source.url; }
};

/** the source's mark: favicon, brand mark, or initials; 16px, round */
export function SourceMark({ source, className = "" }: { source: Source; className?: string }) {
  if (source.favicon) return <img src={source.favicon} alt="" className={`size-4 shrink-0 rounded-full bg-surface ${className}`} />;
  if (source.brand) return <span className={`flex size-4 shrink-0 items-center justify-center rounded-full bg-inset text-ink-2 ${className}`}><BrandIcon name={source.brand} size={10} /></span>;
  const initials = source.title.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
  return <span aria-hidden className={`flex size-4 shrink-0 items-center justify-center rounded-full bg-inset text-nano font-semibold text-ink ${className}`}>{initials}</span>;
}

/* ── InlineCitation ─────────────────────────────────────── */
export function InlineCitation({
  source,
  className = "",
}: {
  /** the cited source, or several when one sentence leans on more than one */
  source: Source | Source[];
  className?: string;
}) {
  const sources = Array.isArray(source) ? source : [source];
  const layerId = useId();
  const { open, position, anchorRef, openAt, close } = useAnchoredLayer<HTMLButtonElement>(layerId);
  const leave = useRef<number | null>(null);
  const show = () => { if (leave.current) window.clearTimeout(leave.current); if (!open) openAt({ estimatedHeight: 200, width: 288 }); };
  const hide = () => { if (leave.current) window.clearTimeout(leave.current); leave.current = window.setTimeout(close, 160); };
  useEffect(() => () => { if (leave.current) window.clearTimeout(leave.current); }, []);
  if (sources.length === 0) return null;
  const label = sources.map((s) => s.id).join(", ");
  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        aria-label={`Source ${label}`}
        aria-expanded={open}
        aria-controls={open ? layerId : undefined}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={() => (open ? close() : show())}
        className={`relative -top-0.5 ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-sm bg-inset px-1 align-baseline text-tiny leading-none font-medium text-ink-2 transition-colors duration-150 hover:bg-hover-2 hover:text-ink ${className}`}
      >
        {label}
      </button>
      {open && position && (
        <Popover id={layerId} role="dialog" x={position.x} top={position.top} bottom={position.bottom} width={288} onClose={close} onMouseEnter={show} onMouseLeave={hide} className="p-3">
          <div className="flex flex-col gap-3">
            {sources.map((s) => (
              <SourceCard key={s.id} source={s} />
            ))}
          </div>
        </Popover>
      )}
    </>
  );
}

function SourceCard({ source }: { source: Source }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <SourceMark source={source} />
        <span className="min-w-0 truncate text-small text-ink-2">{domainOf(source)}</span>
        <span className="ml-auto shrink-0 text-small tabular-nums text-ink-3">{source.id}</span>
      </div>
      <p className="text-caption font-semibold leading-snug text-ink">{source.title}</p>
      {source.quote && <p className="rounded-sm bg-inset px-2.5 py-2 text-caption leading-relaxed text-ink-2">&ldquo;{source.quote}&rdquo;</p>}
      <div className="flex items-center justify-between gap-2">
        {source.meta ? <span className="min-w-0 truncate text-small text-ink-3">{source.meta}</span> : <span />}
        <a href={source.url} target="_blank" rel="noreferrer" className="animated-underline inline-flex shrink-0 items-center gap-1 text-small font-medium text-accent">
          Open <Icon name="external" size={12} strokeWidth={2} />
        </a>
      </div>
    </div>
  );
}

/* ── Sources ────────────────────────────────────────────── */
export default function Sources({
  sources = DEFAULT_SOURCES,
  defaultOpen = false,
  label,
  onOpenSource,
  className = "",
}: {
  sources?: Source[];
  defaultOpen?: boolean;
  /** replaces "N sources" */
  label?: ReactNode;
  onOpenSource?: (source: Source) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const listId = useId();
  if (sources.length === 0) return null;
  return (
    <div className={`w-full min-w-0 ${className}`}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
        className="corner-smooth flex h-8 items-center gap-2 rounded-control px-2 text-small font-medium text-ink-2 transition-colors duration-150 hover:bg-hover hover:text-ink"
      >
        <span className="flex -space-x-1">
          {sources.slice(0, 4).map((s) => <SourceMark key={s.id} source={s} className="ring-2 ring-canvas" />)}
        </span>
        <span>{label ?? `${sources.length} ${sources.length === 1 ? "source" : "sources"}`}</span>
        <Icon name="chevron" size={14} strokeWidth={2} className={`text-ink-3 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>
      <Disclosure open={open} live>
        <ol id={listId} className="mt-1 flex flex-col divide-y divide-line">
          {sources.map((s) => (
            <li key={s.id}>
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer"
                onClick={() => onOpenSource?.(s)}
                className="group flex min-h-10 items-center gap-3 rounded-control px-2 py-2 transition-colors duration-150 hover:bg-hover"
              >
                <span className="w-4 shrink-0 text-small tabular-nums text-ink-3">{s.id}</span>
                <SourceMark source={s} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-caption font-medium text-ink">{s.title}</span>
                  <span className="block truncate text-small text-ink-3">{domainOf(s)}{s.meta ? ` · ${s.meta}` : ""}</span>
                </span>
                <Icon name="external" size={14} strokeWidth={2} className="shrink-0 text-ink-3 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100" />
              </a>
            </li>
          ))}
        </ol>
      </Disclosure>
    </div>
  );
}
