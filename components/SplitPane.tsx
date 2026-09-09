"use client";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { Icon } from "./primitives";
/* ─────────────────────────────────────────────────────────
 * SPLIT PANE — two things side by side, the line between them movable
 * The shape a chat-and-canvas app has: the conversation on one side,
 * the thing being made (a page, a file, a terminal) on the other, and
 * a divider the reader drags to give one of them more room. The
 * divider is a hairline the width of the system's borders; the grip
 * only shows on hover or focus so the line reads as a line, not a
 * control, until it is needed.
 *
 * Keyboard: the divider is a separator with a value (the first pane's
 * share); arrows move it 16px, Shift+arrow 64px, Home and End go to
 * the limits, Enter returns to the default. Below `stackBelow` the
 * panes stack and the divider goes away, because a split at 360px
 * gives neither side enough to read.
 *
 * `collapsible` lets a drag past half the minimum fold the first pane
 * away (the grip stays, so it can be pulled back); `storageKey` keeps
 * the position between visits.
 * ───────────────────────────────────────────────────────── */
export type SplitDirection = "horizontal" | "vertical";

const STEP = 16, BIG_STEP = 64;

export default function SplitPane({
  children,
  direction = "horizontal",
  defaultSize = 0.5,
  size,
  onResize,
  min = 160,
  max,
  minSecond = 160,
  collapsible = false,
  stackBelow = 640,
  storageKey,
  label = "Resize panes",
  className = "",
  paneClassName = "",
}: {
  /** exactly two panes */
  children: [ReactNode, ReactNode];
  direction?: SplitDirection;
  /** the first pane's share, 0..1, or its size in px when ≥ 1 */
  defaultSize?: number;
  /** controlled: the first pane's size in px */
  size?: number;
  onResize?: (px: number) => void;
  /** the first pane's smallest size in px */
  min?: number;
  /** the first pane's largest size in px; unset means the second pane's minimum decides */
  max?: number;
  /** the second pane's smallest size in px */
  minSecond?: number;
  /** dragging past half the minimum folds the first pane away */
  collapsible?: boolean;
  /** container width under which the panes stack; 0 never stacks */
  stackBelow?: number;
  /** localStorage key that remembers the position */
  storageKey?: string;
  /** the divider's accessible name */
  label?: string;
  className?: string;
  /** added to both panes */
  paneClassName?: string;
}) {
  const horizontal = direction === "horizontal";
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => setBox({ width: entry.contentRect.width, height: entry.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const { width } = box;
  /* the axis the divider moves on: width side by side, height stacked */
  const extent = horizontal ? box.width : box.height;

  const resolveDefault = useCallback((total: number) => (defaultSize >= 1 ? defaultSize : Math.round(total * defaultSize)), [defaultSize]);
  const [own, setOwn] = useState<number | null>(() => {
    if (!storageKey || typeof window === "undefined") return null;
    try { const raw = window.localStorage.getItem(storageKey); const n = raw ? Number(raw) : NaN; return Number.isFinite(n) ? n : null; } catch { return null; }
  });
  const [collapsed, setCollapsed] = useState(false);
  const clamp = useCallback((px: number) => {
    const upper = Math.min(max ?? Infinity, Math.max(min, extent - minSecond));
    return Math.max(min, Math.min(upper, px));
  }, [min, max, minSecond, extent]);
  const current = collapsed ? 0 : clamp(size ?? own ?? resolveDefault(extent));

  const commit = (px: number, fold?: boolean) => {
    const next = fold ? 0 : clamp(px);
    setCollapsed(!!fold);
    if (size === undefined && !fold) setOwn(next);
    if (storageKey && !fold) { try { window.localStorage.setItem(storageKey, String(next)); } catch { /* storage unavailable */ } }
    onResize?.(next);
  };
  const reset = () => { setCollapsed(false); const px = clamp(resolveDefault(extent)); if (size === undefined) setOwn(null); if (storageKey) { try { window.localStorage.removeItem(storageKey); } catch { /* storage unavailable */ } } onResize?.(px); };

  /* drag */
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ at: number; from: number } | null>(null);
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    start.current = { at: horizontal ? event.clientX : event.clientY, from: current };
    setDragging(true);
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!start.current) return;
    const delta = (horizontal ? event.clientX : event.clientY) - start.current.at;
    const px = start.current.from + delta;
    if (collapsible && px < min / 2) { if (!collapsed) commit(0, true); return; }
    commit(px);
  };
  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!start.current) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    start.current = null;
    setDragging(false);
  };
  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? BIG_STEP : STEP;
    const less = horizontal ? "ArrowLeft" : "ArrowUp", more = horizontal ? "ArrowRight" : "ArrowDown";
    if (event.key === less) { event.preventDefault(); if (collapsible && !collapsed && current <= min) commit(0, true); else if (!collapsed) commit(current - step); }
    else if (event.key === more) { event.preventDefault(); commit((collapsed ? min - step : current) + step); }
    else if (event.key === "Home") { event.preventDefault(); commit(collapsible ? 0 : min, collapsible); }
    else if (event.key === "End") { event.preventDefault(); commit(Infinity); }
    else if (event.key === "Enter") { event.preventDefault(); reset(); }
  };

  const stacked = stackBelow > 0 && width > 0 && width < stackBelow;
  const upper = Math.min(max ?? Infinity, Math.max(min, extent - minSecond));
  const percent = extent ? Math.round((current / extent) * 100) : 0;
  const pane = `min-h-0 min-w-0 overflow-auto ${paneClassName}`;

  if (stacked) {
    return (
      <div ref={ref} className={`flex w-full min-w-0 flex-col ${className}`}>
        <div className={pane}>{children[0]}</div>
        <div className="h-px shrink-0 bg-line" aria-hidden />
        <div className={pane}>{children[1]}</div>
      </div>
    );
  }
  return (
    <div ref={ref} className={`flex w-full min-w-0 ${horizontal ? "flex-row" : "flex-col"} ${dragging ? "select-none" : ""} ${className}`}>
      <div className={`shrink-0 ${pane} ${collapsed ? "overflow-hidden" : ""}`} style={{ ...(horizontal ? { width: current } : { height: current }), ...(collapsed ? { padding: 0 } : {}) }} aria-hidden={collapsed || undefined}>
        {children[0]}
      </div>
      <div
        role="separator"
        tabIndex={0}
        aria-label={label}
        aria-orientation={horizontal ? "vertical" : "horizontal"}
        aria-valuenow={percent}
        aria-valuemin={Math.round((collapsible ? 0 : min) / (extent || 1) * 100)}
        aria-valuemax={Math.round((upper / (extent || 1)) * 100)}
        aria-valuetext={collapsed ? "Collapsed" : `${percent}%`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={reset}
        onKeyDown={onKeyDown}
        className={`group/split relative z-10 flex shrink-0 touch-none items-center justify-center rounded-sm ${horizontal ? "-mx-1 w-2.5 cursor-col-resize" : "-my-1 h-2.5 cursor-row-resize"}`}
      >
        {/* the line itself, one hairline in a 10px hit area; the grip shows on hover or focus */}
        <span aria-hidden className={`absolute ${horizontal ? "inset-y-0 left-1 w-px" : "inset-x-0 top-1 h-px"} ${dragging ? "bg-line-strong" : "bg-line"}`} />
        <span aria-hidden className={`pointer-events-none relative flex items-center justify-center rounded-sm bg-surface text-ink-3 shadow-hairline transition-opacity duration-150 group-hover/split:opacity-100 group-focus-visible/split:opacity-100 ${dragging ? "opacity-100" : "opacity-0"} ${horizontal ? "h-6 w-3" : "h-3 w-6"}`}>
          <Icon name="grip-vertical" size={12} strokeWidth={2} className={horizontal ? "" : "rotate-90"} />
        </span>
      </div>
      <div className={`flex-1 ${pane}`}>{children[1]}</div>
    </div>
  );
}
