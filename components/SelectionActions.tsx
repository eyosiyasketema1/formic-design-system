"use client";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Icon, inertWhen, SendButton, ShimmerLabel, Spinner, StreamText } from "./primitives";
/* ─────────────────────────────────────────────────────────
 * SELECTION ACTIONS
 * A contextual AI bar attached beneath selected text: quick
 * actions, a free-text instruction field, and a keep/discard
 * review once the rewrite streams in. The bar re-anchors as
 * the streamed text reflows the selection.
 * ───────────────────────────────────────────────────────── */
const DEFAULT_LEAD = "Pistachio holds the top slot all weekend. ";
const DEFAULT_SELECTED =
  "Churn it first thing Saturday so the batch has time to firm up before the afternoon rush.";
const DEFAULT_REWRITE =
  "Churn pistachio first thing Saturday so the batch has time to fully firm before the afternoon rush.";
type Mode = "idle" | "thinking" | "streaming" | "result";
const QUICK_ACTIONS = [
  { label: "Shorten", icon: "scissors", busy: "Shortening" },
  { label: "Change tone", short: "Tone", icon: "mood-smile", busy: "Changing tone" },
  { label: "Fix grammar", short: "Grammar", icon: "typography", busy: "Fixing grammar" },
] as const;
const BUSY_LABELS: Record<string, string> = {
  Explain: "Explaining",
  Improve: "Improving",
  ...Object.fromEntries(QUICK_ACTIONS.map((a) => [a.label, a.busy])),
};
/* WAAPI can't consume var(--ease-out-quint) directly — resolve the token's
 * computed value so the one house easing still drives the width animation */
const resolveEasing = () =>
  (typeof window !== "undefined"
    ? getComputedStyle(document.documentElement).getPropertyValue("--ease-out-quint").trim()
    : "") || "ease-out";
const control =
  "inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-small text-ink transition-[background-color,color,transform] duration-150 hover:bg-hover active:scale-[0.96]";
const primary =
  "inline-flex h-7 shrink-0 items-center gap-1 rounded-full bg-ink px-2.5 text-caption text-canvas shadow-hairline transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-[0.96]";
export default function SelectionActions({
  lead = DEFAULT_LEAD,
  selected = DEFAULT_SELECTED,
  rewrite = DEFAULT_REWRITE,
  onKeep,
  onDiscard,
}: {
  /** copy before the selection; defaults to demo content */
  lead?: string;
  /** the selected passage the bar attaches to */
  selected?: string;
  /** the rewrite streamed in when an action runs */
  rewrite?: string;
  /** called with the rewrite when the user keeps it */
  onKeep?: (rewrite: string) => void;
  onDiscard?: () => void;
} = {}) {
  const [shown, setShown] = useState(false);
  const [mode, setMode] = useState<Mode>("idle");
  const [action, setAction] = useState("Improve");
  const [prompt, setPrompt] = useState("");
  const [typingWidth, setTypingWidth] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [anchor, setAnchor] = useState({ x: 0, y: 0 });
  const [positioned, setPositioned] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const previousModeRef = useRef<Mode>("idle");
  const lastWidthRef = useRef(0);
  const widthAnimationRef = useRef<Animation | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => setShown(true), 280);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (mode !== "thinking") return;
    const timer = window.setTimeout(() => setMode("streaming"), 700);
    return () => window.clearTimeout(timer);
  }, [mode]);
  /* Attach beneath the final selected line, while centering the bar
   * against the complete selection bounds. requestAnimationFrame batches
   * streaming reflow measurements and avoids visible intermediate positions. */
  const place = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      const host = hostRef.current;
      const selection = selectionRef.current;
      if (!host || !selection) return;
      const bounds = selection.getBoundingClientRect();
      const lines = Array.from(selection.getClientRects());
      const lastLine = lines.at(-1);
      if (!lastLine) return;
      const hostBounds = host.getBoundingClientRect();
      const next = {
        x: Math.round(bounds.left - hostBounds.left + bounds.width / 2),
        y: Math.round(lastLine.bottom - hostBounds.top + 8),
      };
      /* clamp the centered bar inside the viewport (24px gutters) —
       * a short selection near an edge must not push it off-screen */
      const barHalf = (barRef.current?.getBoundingClientRect().width ?? 0) / 2;
      const minX = 24 + barHalf - hostBounds.left;
      const maxX = window.innerWidth - 24 - barHalf - hostBounds.left;
      next.x = Math.round(minX > maxX ? (minX + maxX) / 2 : Math.min(Math.max(next.x, minX), maxX));
      setAnchor((current) =>
        current.x === next.x && current.y === next.y ? current : next,
      );
      setPositioned(true);
    });
  }, []);
  useLayoutEffect(() => {
    place();
  }, [mode, place]);
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const observer = new ResizeObserver(place);
    observer.observe(host);
    if (barRef.current) observer.observe(barRef.current); /* re-clamp when the bar resizes */
    window.addEventListener("resize", place);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", place);
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [place]);
  /* Intrinsic width handles the preset expansion. When the entire content
   * changes between idle, loading and confirmation, animate from the last
   * rendered width to the new intrinsic width before the browser paints. */
  useLayoutEffect(() => {
    const bar = barRef.current;
    const content = contentRef.current;
    if (!bar || !content) return;
    const nextWidth = Math.ceil(content.getBoundingClientRect().width) + 8;
    /* mid-animation the live rect is the truth — lastWidthRef holds the
     * pre-animation width and would make the next animation jump */
    const running = widthAnimationRef.current?.playState === "running";
    const previousWidth =
      !running && lastWidthRef.current
        ? lastWidthRef.current
        : Math.ceil(bar.getBoundingClientRect().width);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (
      !reduced &&
      previousModeRef.current !== mode &&
      Math.abs(nextWidth - previousWidth) > 1
    ) {
      widthAnimationRef.current?.cancel();
      const animation = bar.animate(
        [{ width: `${previousWidth}px` }, { width: `${nextWidth}px` }],
        { duration: 320, easing: resolveEasing() },
      );
      widthAnimationRef.current = animation;
      animation.onfinish = () => {
        lastWidthRef.current = nextWidth;
        widthAnimationRef.current = null;
      };
      animation.oncancel = () => {
        widthAnimationRef.current = null;
      };
    } else {
      lastWidthRef.current = nextWidth;
    }
    previousModeRef.current = mode;
  }, [mode]);
  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const observer = new ResizeObserver(() => {
      if (widthAnimationRef.current?.playState === "running") return;
      lastWidthRef.current =
        Math.ceil(content.getBoundingClientRect().width) + 8;
    });
    observer.observe(content);
    return () => {
      observer.disconnect();
      widthAnimationRef.current?.cancel();
    };
  }, []);
  const run = (nextAction: string) => {
    setAction(nextAction);
    setExpanded(false);
    setMode("thinking");
  };
  const reset = () => {
    setExpanded(false);
    setPrompt("");
    setTypingWidth(null);
    setAction("Improve");
    setMode("idle");
  };
  const busy = mode === "thinking" || mode === "streaming";
  const visible = shown && positioned;
  const hasPrompt = prompt.trim().length > 0;
  const busyLabel = BUSY_LABELS[action] ?? "Editing";
  return (
    <div className="w-full max-w-105">
      <div ref={hostRef} className="relative select-none pb-12">
        <p className="text-body leading-relaxed text-ink" aria-live="polite" aria-busy={busy}>
          {lead}
          <span
            ref={selectionRef}
            className="box-decoration-clone rounded-[3px] bg-accent-tint text-ink"
          >
            {mode === "idle" || mode === "thinking" ? (
              selected
            ) : mode === "streaming" ? (
              <StreamText
                text={rewrite}
                onProgress={place}
                onDone={() => setMode("result")}
              />
            ) : (
              rewrite
            )}
          </span>
        </p>
        <div
          className="absolute top-0 left-0 z-10"
          style={{
            transform: `translate3d(${anchor.x}px, ${anchor.y}px, 0) translateX(-50%)`,
            transition:
              "transform 320ms var(--ease-out-quint), opacity 180ms ease-out",
            opacity: visible ? 1 : 0,
            pointerEvents: visible ? "auto" : "none",
            willChange: "transform",
          }}
        >
          {/* A 36px pill wraps 28px controls at a 4px inset. The controls
              resolve to a 14px radius, preserving the concentric curve. */}
          <div
            ref={barRef}
            /* on viewports narrower than the content, the pill becomes its own
               scroll container (rule 12) — keyboard focus scrolls controls into
               view instead of landing on clipped, invisible buttons */
            className="flex h-9 w-fit max-w-[calc(100vw-48px)] items-center gap-0.5 overflow-x-auto overflow-y-hidden rounded-full bg-surface p-1 text-ink shadow-overlay [scrollbar-width:none]"
            style={{
              width:
                mode === "idle" && hasPrompt && typingWidth
                  ? typingWidth
                  : undefined,
              ...(visible
                ? { animation: "pop-in 220ms var(--ease-out-quint) both" }
                : {}),
            }}
          >
            <div
              ref={contentRef}
              /* mx-auto centers without breaking scroll — flex justify-center
                 makes the leading overflow of a scroll container unreachable */
              className="mx-auto flex w-fit shrink-0 items-center justify-center gap-0.5"
              style={{
                width:
                  mode === "idle" && hasPrompt && typingWidth
                    ? typingWidth - 8
                    : undefined,
              }}
            >
            {busy && (
              <span role="status" className="inline-flex h-7 items-center gap-1.5 whitespace-nowrap px-2.5 text-body text-ink-2">
                <Spinner size={12} className="text-ink-2" />
                {mode === "thinking" ? (
                  <ShimmerLabel>{busyLabel}…</ShimmerLabel>
                ) : (
                  <span>{busyLabel}…</span>
                )}
              </span>
            )}
            {mode === "result" && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onKeep?.(rewrite);
                    reset();
                  }}
                  className={primary}
                >
                  <Icon name="check" strokeWidth={1.8} />
                  Keep
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDiscard?.();
                    reset();
                  }}
                  className={control}
                >
                  <Icon name="close" strokeWidth={1.8} />
                  Discard
                </button>
                <span className="mx-0.5 h-4 w-px shrink-0 bg-line" />
                <button
                  type="button"
                  aria-label="Try again"
                  onClick={() => run(action)}
                  className="flex size-7 shrink-0 items-center justify-center rounded-full text-ink-3 transition-[background-color,color,transform] duration-150 hover:bg-hover-2 hover:text-ink-2 active:scale-[0.96]"
                >
                  <Icon name="retry" strokeWidth={1.8} />
                </button>
              </>
            )}
            {mode === "idle" && (
              <>
                <div
                  className="flex min-w-0 items-center overflow-hidden transition-[max-width,opacity,transform] duration-400"
                  style={{
                    maxWidth: expanded
                      ? 0
                      : hasPrompt && typingWidth
                        ? typingWidth - 40
                        : 145,
                    opacity: expanded ? 0 : 1,
                    transform: expanded ? "translateX(-8px)" : "translateX(0)",
                    transitionTimingFunction: "var(--ease-out-quint)",
                  }}
                  {...inertWhen(expanded)}
                >
                  <form
                    className="flex h-7 shrink-0 items-center transition-[width] duration-400"
                    style={{
                      width: hasPrompt && typingWidth ? typingWidth - 40 : 145,
                      transitionTimingFunction: "var(--ease-out-quint)",
                    }}
                    onSubmit={(event) => {
                      event.preventDefault();
                      run(prompt.trim() || "Improve");
                    }}
                  >
                    <input
                      value={prompt}
                      onChange={(event) => {
                        const next = event.target.value;
                        if (!prompt.trim() && next.trim()) {
                          setTypingWidth(
                            Math.ceil(
                              barRef.current?.getBoundingClientRect().width ?? 0,
                            ),
                          );
                        } else if (!next.trim()) {
                          setTypingWidth(null);
                        }
                        setPrompt(next);
                      }}
                      aria-label="Describe edits"
                      placeholder="Describe edits"
                      className="h-7 w-full bg-transparent pr-2.5 pl-3 text-caption text-ink outline-none placeholder:text-ink-3"
                    />
                  </form>
                </div>
                <div
                  className="flex min-w-0 items-center gap-0.5 overflow-hidden transition-[max-width,opacity,transform] duration-400"
                  style={{
                    maxWidth: hasPrompt ? 0 : expanded ? 462 : 224,
                    opacity: hasPrompt ? 0 : 1,
                    transform: hasPrompt ? "translateX(-8px)" : "translateX(0)",
                    transitionTimingFunction: "var(--ease-out-quint)",
                  }}
                  {...inertWhen(hasPrompt)}
                >
                  {!expanded && (
                    <span className="mx-1 h-4 w-px shrink-0 bg-line-strong" />
                  )}
                  <button
                    type="button"
                    onClick={() => run("Explain")}
                    className={control}
                  >
                    <Icon name="message-question" strokeWidth={1.8} />
                    Explain
                  </button>
                  <button
                    type="button"
                    onClick={() => run("Improve")}
                    className={control}
                  >
                    <Icon name="sparkles" strokeWidth={1.8} />
                    Improve
                  </button>
                  <div
                    className="flex min-w-0 items-center gap-0.5 overflow-hidden transition-[max-width,opacity,margin] duration-400"
                    style={{
                      maxWidth: expanded ? 262 : 0,
                      opacity: expanded ? 1 : 0,
                      marginLeft: expanded ? 2 : 0,
                      transitionTimingFunction: "var(--ease-out-quint)",
                    }}
                    {...inertWhen(!expanded)}
                  >
                    {QUICK_ACTIONS.map((quick) => (
                      <button
                        key={quick.label}
                        type="button"
                        onClick={() => run(quick.label)}
                        className={control}
                      >
                        <Icon name={quick.icon} strokeWidth={1.8} />
                        {"short" in quick ? quick.short : quick.label}
                      </button>
                    ))}
                  </div>
                  <span className="mx-0.5 h-4 w-px shrink-0 bg-line" />
                  <button
                    type="button"
                    aria-label={expanded ? "Show fewer actions" : "Show more actions"}
                    aria-expanded={expanded}
                    onClick={() => setExpanded((value) => !value)}
                    className="flex size-7 shrink-0 items-center justify-center rounded-full text-ink transition-[background-color,transform] duration-150 hover:bg-hover active:scale-[0.96]"
                  >
                    <span
                      className="flex transition-transform duration-400"
                      style={{
                        transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                        transitionTimingFunction: "var(--ease-out-quint)",
                      }}
                    >
                      <Icon name="chevron-right" strokeWidth={1.8} />
                    </span>
                  </button>
                </div>
                <div
                  className="flex min-w-0 items-center overflow-hidden transition-[max-width,opacity,transform] duration-400"
                  style={{
                    maxWidth: hasPrompt ? 30 : 0,
                    opacity: hasPrompt ? 1 : 0,
                    transform: hasPrompt ? "scale(1)" : "scale(0.88)",
                    transitionTimingFunction: "var(--ease-out-quint)",
                  }}
                  {...inertWhen(!hasPrompt)}
                >
                  <SendButton
                    round
                    label="Send edit instruction"
                    onClick={() => run(prompt.trim() || "Improve")}
                  />
                </div>
              </>
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
