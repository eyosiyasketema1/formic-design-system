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
  { key: "queued", title: "Batch queued", time: "07:12", tone: "neutral", description: "Double pistachio, drum 2." },
  { key: "churn", title: "Churn started", time: "07:30", tone: "accent" },
  { key: "fault", title: "Cold-chain dip", time: "09:02", tone: "red", description: "Drum 2 rose to −9°C for 4 minutes — flagged for QA taste check." },
  { key: "cased", title: "Cased and set", time: "11:45", tone: "green", description: "Passed taste check; on the board for the weekend." },
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
