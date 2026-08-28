"use client";
import { useEffect, useState } from "react";
import { Card, Chip, fadeUp, Icon } from "./primitives";
/* ─────────────────────────────────────────────────────────
 * CONTEXT CARDS
 * Retrieved chunks enter once, then remain available.
 * ───────────────────────────────────────────────────────── */
export type ChunkTone = "red" | "green" | "accent" | "orange";
export type Chunk = {
  title: string;
  chars: string;
  body: string;
  source: string;
  /** file-type letters inside the mini badge, e.g. "PDF" */
  badge: string;
  tone: ChunkTone;
  /** link to the source document — the chip is a plain label without it */
  href?: string;
};
const TONES: Record<ChunkTone, string> = {
  red: "bg-red",
  green: "bg-green",
  accent: "bg-accent",
  orange: "bg-orange",
};
const DEFAULT_CHUNKS: Chunk[] = [
  {
    title: "Vendor onboarding rule",
    chars: "290 characters",
    body: "Cold-chain certification must be verified before a new dairy can be added to the reorder workflow.",
    source: "Dairy Onboarding SOP.pdf",
    badge: "PDF",
    tone: "red",
    href: "#",
  },
  {
    title: "Seasonal demand row",
    chars: "1,250 characters",
    body: "Q4 velocity table: pistachio +18%, vanilla +6%, rocky road -11%; retire flavors below 40 scoops weekly.",
    source: "Sales Velocity Export.csv",
    badge: "CSV",
    tone: "green",
    href: "#",
  },
];
export default function ContextCards({
  title = "All chunks",
  count = 32,
  chunks = DEFAULT_CHUNKS,
}: {
  title?: string;
  /** total chunk count shown in the header pill */
  count?: number;
  /** retrieved chunks; defaults to demo content */
  chunks?: Chunk[];
} = {}) {
  const [chipsShown, setChipsShown] = useState(false);
  useEffect(() => {
    const chips = setTimeout(() => setChipsShown(true), 700);
    return () => clearTimeout(chips);
  }, []);
  return (
    <div className="flex w-full max-w-95 flex-col gap-2">
      <div
        className="flex items-center gap-2 px-0.5"
        style={{ animation: "fade-in 400ms ease-out both" }}
      >
        <span className="text-body font-semibold text-ink">{title}</span>
        <Chip tone="inset" className="font-medium tabular-nums">
          {count}
        </Chip>
      </div>
      {chunks.map((chunk, i) => (
        <Card key={chunk.title} style={fadeUp(i, { duration: 400, stagger: 100 })}>
          <div className="primitive-card-bar flex items-center gap-2.5 border-b border-line">
            <span className="flex min-w-0 items-center gap-1.5 text-body font-medium text-ink">
              <Icon name="lines" size={11} strokeWidth={2.5} className="shrink-0" />
              <span className="truncate">{chunk.title}</span>
            </span>
            <span className="ml-auto shrink-0 text-small text-ink-3 tabular-nums">{chunk.chars}</span>
          </div>
          <p className="px-3 pt-2 pb-1 text-caption leading-relaxed text-ink-2">
            {chunk.body}
          </p>
          <div className="px-3 pb-3">
            {(() => {
              const SourceEl: "a" | "span" = chunk.href ? "a" : "span";
              const delay = chipsShown ? "0ms" : `${i * 80}ms`;
              return (
                <SourceEl
                  {...(chunk.href ? { href: chunk.href, target: "_blank", rel: "noreferrer" } : {})}
                  className={`inline-flex h-6 items-center gap-1.5 rounded-full bg-inset px-2
                    text-small font-medium text-ink-2 shadow-btn ${chunk.href ? "hover:bg-hover" : ""}`}
                  style={{
                    opacity: chipsShown ? 1 : 0,
                    transform: chipsShown ? "scale(1)" : "scale(0.95)",
                    transition: `opacity 300ms var(--ease-out-quint) ${delay}, transform 300ms var(--ease-out-quint) ${delay}, background-color 150ms ease`,
                  }}
                >
                  <span
                    className={`flex size-4 items-center justify-center rounded-[4px] ${TONES[chunk.tone]} text-nano font-bold text-canvas`}
                  >
                    {chunk.badge}
                  </span>
                  {chunk.source}
                  {chunk.href && <Icon name="external" size={9} strokeWidth={2.5} />}
                </SourceEl>
              );
            })()}
          </div>
        </Card>
      ))}
    </div>
  );
}
