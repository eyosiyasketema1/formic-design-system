"use client";
import { useEffect, useState } from "react";
/* ─────────────────────────────────────────────────────────
 * HOOKS — shared timing utilities
 *
 *   useSequence  advance a stage counter through timed steps
 *   useElapsed   live elapsed clock, "4.2s" / "1m 12.5s"
 *   useStream    reveal N items one-by-one (streamed text)
 * ───────────────────────────────────────────────────────── */

/** Steps through 0..steps.length-1, waiting steps[i] ms at each stage.
 *  Pass a stable array (module constant or memoized) — a new array each
 *  render restarts the pending timeout. */
export function useSequence(steps: number[]) {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    if (stage >= steps.length - 1) return;
    const t = setTimeout(() => setStage((s) => s + 1), steps[stage]);
    return () => clearTimeout(t);
  }, [stage, steps]);
  return stage;
}

/** Reveals `length` items one every `intervalMs` — the timing engine behind
 *  streamed text (StreamText primitive, StreamingText). With `loop` the count
 *  resets after `holdMs`; without it `onDone` fires once when the stream ends. */
export function useStream(
  length: number,
  {
    intervalMs = 55,
    holdMs = 3400,
    loop = false,
    onDone,
  }: { intervalMs?: number; holdMs?: number; loop?: boolean; onDone?: () => void } = {},
) {
  const [count, setCount] = useState(0);
  const done = count >= length;
  useEffect(() => {
    if (done && !loop) {
      onDone?.();
      return;
    }
    const t = setTimeout(
      () => setCount((c) => (c >= length ? 0 : c + 1)),
      done ? holdMs : intervalMs,
    );
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- callbacks stay out so re-created handlers don't restart the stream
  }, [count, done, loop, length]);
  return { count, done };
}

/** Ticks every 100ms from mount; returns a formatted elapsed string. */
export function useElapsed() {
  const [ds, setDs] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setDs((d) => d + 1), 100);
    return () => clearInterval(t);
  }, []);
  const total = ds / 10;
  if (total < 60) return `${total.toFixed(1)}s`;
  return `${Math.floor(total / 60)}m ${(total % 60).toFixed(1)}s`;
}
