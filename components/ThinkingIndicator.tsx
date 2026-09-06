"use client";
import { useEffect, useState } from "react";
import { useReducedMotion } from "./hooks";
import { ShimmerLabel } from "./primitives";
/* ─────────────────────────────────────────────────────────
 * THINKING INDICATOR — the smallest "working on it"
 * A glyph that breathes between a circle and an infinity loop,
 * and one word that shimmers and rotates every few seconds
 * (Thinking, Planning, Refining…). For the gap before a reply
 * starts, inline in a thread. ThinkingState is the bigger
 * sibling with steps, reasoning and sources; this is a single
 * line. Screen readers hear one "Thinking…", not every word.
 * Reduced motion: still glyph, first word, no rotation.
 *
 * The morphing path is a component-specific illustration (an
 * SVG animate on `d`, no library); the glyph is not an icon.
 * ───────────────────────────────────────────────────────── */
const CIRCLE_A = "M 12 8 C 14.21 8 16 9.79 16 12 C 16 14.21 14.21 16 12 16 C 9.79 16 8 14.21 8 12 C 8 9.79 9.79 8 12 8 Z";
const INFINITY = "M 12 12 C 14 8.5 19 8.5 19 12 C 19 15.5 14 15.5 12 12 C 10 8.5 5 8.5 5 12 C 5 15.5 10 15.5 12 12 Z";
const CIRCLE_B = "M 12 16 C 14.21 16 16 14.21 16 12 C 16 9.79 14.21 8 12 8 C 9.79 8 8 9.79 8 12 C 8 14.21 9.79 16 12 16 Z";
const DEFAULT_WORDS = ["Thinking", "Planning", "Refining", "Checking"];

export default function ThinkingIndicator({
  words = DEFAULT_WORDS,
  interval = 3200,
  glyph = true,
  className = "",
}: {
  /** the status words, rotated in order */
  words?: string[];
  /** ms between words */
  interval?: number;
  /** the morphing glyph before the word; off for a text-only line */
  glyph?: boolean;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (reduced || words.length < 2) return;
    const t = window.setInterval(() => setIndex((i) => (i + 1) % words.length), interval);
    return () => window.clearInterval(t);
  }, [reduced, words.length, interval]);
  const longest = words.reduce((a, b) => (a.length >= b.length ? a : b), "");
  const word = reduced ? words[0] : words[index];
  return (
    <div role="status" className={`inline-flex items-center gap-2 ${className}`}>
      <span className="sr-only">Thinking…</span>
      {glyph && (
        <svg aria-hidden width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-ink-3">
          {reduced ? (
            <path d={INFINITY} />
          ) : (
            <path d={CIRCLE_A}>
              <animate attributeName="d" dur="6s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.25;0.5;0.75;1" keySplines="0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1" values={`${CIRCLE_A};${INFINITY};${CIRCLE_B};${INFINITY};${CIRCLE_A}`} />
            </path>
          )}
        </svg>
      )}
      {/* the longest word reserves the width, so the line never shifts */}
      <span aria-hidden className="inline-grid overflow-hidden text-caption">
        <span className="invisible col-start-1 row-start-1 font-medium">{longest}</span>
        <ShimmerLabel key={word} className="col-start-1 row-start-1 text-caption" style={reduced ? undefined : { animation: "shimmer-text 1.4s linear infinite, fade-up 240ms var(--ease-out-quint) both" }}>
          {word}
        </ShimmerLabel>
      </span>
    </div>
  );
}
