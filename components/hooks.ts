"use client";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
/* ─────────────────────────────────────────────────────────
 * HOOKS — shared timing utilities
 *
 *   useSequence      advance a stage counter through timed steps
 *   useElapsed       live elapsed clock, "4.2s" / "1m 12.5s"
 *   useStream        reveal N items one-by-one (streamed text)
 *   useAnchoredLayer anchored popover state: measure, clamp,
 *                    flip, close on outside press/scroll/resize
 *   useModalLayer    dialog machinery: focus trap + restore,
 *                    layered Escape, ref-counted scroll lock
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

export type AnchoredPosition = { x: number; width?: number; top?: number; bottom?: number };
/** Shared engine for anchored floating layers (Select's listbox,
 *  DropdownMenu). Measures the anchor, clamps x inside the viewport,
 *  flips above when the estimated height doesn't fit below, and closes
 *  on outside press, page scroll (scrolls inside the layer excepted),
 *  and resize. The caller renders the layer with `id={layerId}`. */
export function useAnchoredLayer<T extends HTMLElement>(layerId: string) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<AnchoredPosition | null>(null);
  const anchorRef = useRef<T>(null);
  const close = useCallback(() => setOpen(false), []);
  const openAt = useCallback(
    ({
      estimatedHeight,
      width,
      matchWidth = false,
      align = "start",
    }: {
      estimatedHeight: number;
      /** fixed layer width in px (for clamping and end-alignment) */
      width?: number;
      /** size the layer to the anchor (Select) */
      matchWidth?: boolean;
      align?: "start" | "end";
    }) => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return false;
      const layerWidth = matchWidth ? rect.width : width;
      const rawX = align === "end" && layerWidth !== undefined ? rect.right - layerWidth : rect.left;
      const fitsBelow = rect.bottom + 4 + estimatedHeight < window.innerHeight - 8;
      setPosition({
        x: Math.max(8, Math.min(rawX, window.innerWidth - (layerWidth ?? rect.width) - 8)),
        width: layerWidth,
        ...(fitsBelow
          ? { top: rect.bottom + 4 }
          : { bottom: window.innerHeight - rect.top + 4 }),
      });
      setOpen(true);
      return true;
    },
    [],
  );
  useEffect(() => {
    if (!open) return;
    const layer = () => document.getElementById(layerId);
    const onScroll = (event: Event) => {
      if (layer()?.contains(event.target as Node)) return;
      setOpen(false);
    };
    const onResize = () => setOpen(false);
    const onDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target) || layer()?.contains(target)) return;
      setOpen(false);
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousedown", onDown);
    };
  }, [open, layerId]);
  return { open, setOpen, position, anchorRef, openAt, close };
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
/* one shared scroll lock so stacked modal layers don't unlock early */
let scrollLocks = 0;
let previousOverflow = "";
const lockScroll = () => {
  if (scrollLocks === 0) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  scrollLocks += 1;
};
const unlockScroll = () => {
  scrollLocks = Math.max(0, scrollLocks - 1);
  if (scrollLocks === 0) document.body.style.overflow = previousOverflow;
};
/** The machinery every modal surface shares (Modal, Drawer):
 *  saves and restores focus, traps Tab inside the container,
 *  locks page scroll (ref-counted for stacking), and closes on
 *  Escape — deferring to open popover layers so only the
 *  innermost layer dismisses. */
export function useModalLayer(
  ref: RefObject<HTMLElement | null>,
  open: boolean,
  { onClose, closeOnEscape = true }: { onClose: () => void; closeOnEscape?: boolean },
) {
  useEffect(() => {
    if (!open) return;
    const container = ref.current;
    const restore = document.activeElement as HTMLElement | null;
    const focusables = () =>
      Array.from(container?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    (focusables()[0] ?? container)?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && closeOnEscape) {
        /* an open popover layer (Select listbox, menu) owns this Escape */
        if (event.defaultPrevented || document.querySelector("[data-popover-layer]")) return;
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const list = focusables();
      if (list.length === 0) {
        event.preventDefault();
        return;
      }
      const first = list[0];
      const last = list[list.length - 1];
      const activeElement = document.activeElement;
      if (!container?.contains(activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && (activeElement === first || activeElement === container)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    lockScroll();
    return () => {
      document.removeEventListener("keydown", onKey);
      unlockScroll();
      restore?.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-arm only on open/close
  }, [open, closeOnEscape]);
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
