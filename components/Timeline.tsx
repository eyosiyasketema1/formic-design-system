"use client";
import { fadeUp } from "./primitives";
/* ─────────────────────────────────────────────────────────
 * TIMELINE
 * Vertical event history: toned dots on a rail, title and
 * time on one line, description beneath. Events stagger in
 * with the house entrance.
 * ───────────────────────────────────────────────────────── */
export type TimelineTone = "neutral" | "accent" | "green" | "red";
export type TimelineItem = {
  key: string;
  title: string;
  description?: string;
  time?: string;
  tone?: TimelineTone;
};
const TONE_DOTS: Record<TimelineTone, string> = {
  neutral: "bg-line-strong",
  accent: "bg-accent",
  green: "bg-green",
  red: "bg-red",
};
const DEFAULT_ITEMS: TimelineItem[] = [
  { key: "sent", title: "Proposal sent", time: "09:12", tone: "neutral", description: "Northwind Bank brand refresh, two phases." },
  { key: "opened", title: "Opened by the client", time: "09:40", tone: "accent" },
  { key: "question", title: "Pricing questioned", time: "11:02", tone: "red", description: "Phase two came in 15% above their budget; flagged for a revised quote." },
  { key: "signed", title: "Signed", time: "14:45", tone: "green", description: "Revised quote accepted; kickoff booked for Monday." },
];
export default function Timeline({
  items = DEFAULT_ITEMS,
  className = "",
}: {
  /** events, oldest first; defaults to demo content */
  items?: TimelineItem[];
  className?: string;
} = {}) {
  return (
    <ol className={`flex w-full flex-col ${className}`}>
      {items.map((item, index) => {
        const last = index === items.length - 1;
        return (
          <li key={item.key} className="flex gap-3" style={fadeUp(index, { duration: 300, stagger: 90 })}>
            <div className="flex w-2.5 flex-col items-center">
              <span
                aria-hidden
                className={`mt-1.5 size-2.5 shrink-0 rounded-full ${TONE_DOTS[item.tone ?? "neutral"]}`}
              />
              {!last && <div className="my-1 w-px flex-1 bg-line" style={{ minHeight: 12 }} />}
            </div>
            <div className={`min-w-0 flex-1 ${last ? "" : "pb-4"}`}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 truncate text-body font-medium text-ink">{item.title}</p>
                {item.time && (
                  <span className="shrink-0 font-mono text-micro text-ink-3">{item.time}</span>
                )}
              </div>
              {item.description && (
                <p className="mt-0.5 text-caption leading-relaxed text-ink-2">{item.description}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
