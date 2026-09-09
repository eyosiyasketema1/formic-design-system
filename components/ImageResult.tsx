"use client";
import { useState, type ReactNode } from "react";
import Button from "./Button";
import EmptyState from "./EmptyState";
import { Icon, IconButton, Progress, ShimmerLabel, Skeleton, Tooltip } from "./primitives";
/* ─────────────────────────────────────────────────────────
 * IMAGE RESULT — a picture the model made, from ask to keep
 * Three states in one frame that never changes size, so the
 * transcript does not jump when the picture lands:
 *
 *   generating   the frame shimmers, a line says what is being made,
 *                a thin bar shows progress when the API gives one
 *   done         the image; hover or focus shows a quiet toolbar in
 *                the corner (download, regenerate, open), and the
 *                prompt sits under it as a caption with the meta
 *   error        the frame holds an EmptyState with Try again
 *
 * The one accent is `onUse`, the button that takes the image into
 * the work; download and regenerate stay ghost. ImageResults lays
 * several candidates in a grid and lets the reader pick one.
 * ───────────────────────────────────────────────────────── */
export type ImageResultState = "generating" | "done" | "error";
export type ImageAspect = "square" | "landscape" | "portrait";
const ASPECT: Record<ImageAspect, string> = { square: "aspect-square", landscape: "aspect-video", portrait: "aspect-[3/4]" };

/* the demo picture: a latte being poured, for Selam Coffee's menu board
   hero (Unsplash, free to use under its licence; the component itself
   never loads it unless `src` is left at the default) */
export const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=1200&q=80";

export default function ImageResult({
  src = DEFAULT_IMAGE,
  alt = "",
  prompt = "A warm hero for Selam Coffee's menu board: a cup, an early-morning field, room for the price list on the left.",
  state = "done",
  progress,
  aspect = "landscape",
  meta = "1536 × 1024 · 6.2s",
  onDownload,
  onRegenerate,
  onOpen,
  onUse,
  onRetry,
  actions,
  className = "",
}: {
  src?: string;
  alt?: string;
  /** the request, shown as the caption */
  prompt?: string;
  state?: ImageResultState;
  /** 0..1 while generating, when the API reports it */
  progress?: number;
  aspect?: ImageAspect;
  /** size, model, time: "1536 × 1024 · 6.2s" */
  meta?: string;
  onDownload?: () => void;
  onRegenerate?: () => void;
  /** open at full size */
  onOpen?: () => void;
  /** the one accent action: take the image into the work */
  onUse?: () => void;
  onRetry?: () => void;
  /** replaces the footer's buttons */
  actions?: ReactNode;
  className?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const generating = state === "generating";
  return (
    <figure className={`group/image w-full min-w-0 max-w-130 ${className}`}>
      <div className={`relative w-full overflow-hidden rounded-card bg-inset shadow-hairline ${ASPECT[aspect]}`}>
        {state === "done" && (
          <>
            <img src={src} alt={alt} onLoad={() => setLoaded(true)} className={`absolute inset-0 size-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`} />
            {!loaded && <Skeleton className="absolute inset-0 h-full w-full rounded-none" />}
            {(onDownload || onRegenerate || onOpen) && (
              <div className="absolute top-2 right-2 flex items-center gap-1 rounded-control bg-surface p-1 opacity-0 shadow-overlay transition-opacity duration-150 group-focus-within/image:opacity-100 group-hover/image:opacity-100 [@media(hover:none)]:opacity-100">
                {onDownload && <Tooltip label="Download"><IconButton label="Download" onClick={onDownload} className="text-ink-2 hover:bg-hover hover:text-ink"><Icon name="download" size={14} strokeWidth={2} /></IconButton></Tooltip>}
                {onRegenerate && <Tooltip label="Regenerate"><IconButton label="Regenerate" onClick={onRegenerate} className="text-ink-2 hover:bg-hover hover:text-ink"><Icon name="retry" size={14} strokeWidth={2} /></IconButton></Tooltip>}
                {onOpen && <Tooltip label="Open"><IconButton label="Open at full size" onClick={onOpen} className="text-ink-2 hover:bg-hover hover:text-ink"><Icon name="maximize" size={14} strokeWidth={2} /></IconButton></Tooltip>}
              </div>
            )}
          </>
        )}
        {generating && (
          <div role="status" aria-live="polite" className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6">
            <Skeleton className="absolute inset-0 h-full w-full rounded-none" />
            <span className="relative flex size-10 items-center justify-center rounded-md bg-surface text-ink-2 shadow-hairline"><Icon name="image" size={18} strokeWidth={1.8} /></span>
            <ShimmerLabel className="relative text-caption">Generating…</ShimmerLabel>
            {progress !== undefined && <Progress value={Math.round(progress * 100)} tone="ink" className="relative w-40" />}
          </div>
        )}
        {state === "error" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <EmptyState kind="error" size="sm" title="Could not make it" description="The image service did not answer. Your prompt is kept; try again." action={onRetry && <Button variant="secondary" size="sm" icon={<Icon name="retry" />} onClick={onRetry}>Try again</Button>} />
          </div>
        )}
      </div>
      {(prompt || meta || onUse || actions) && (
        <figcaption className="mt-2 flex items-start justify-between gap-3">
          <span className="min-w-0 flex-1">
            {prompt && <span className="line-clamp-2 text-caption text-ink-2">{prompt}</span>}
            {meta && state === "done" && <span className="mt-0.5 block text-small tabular-nums text-ink-3">{meta}</span>}
          </span>
          {state === "done" && (actions ?? (onUse && <Button variant="accent" size="sm" icon={<Icon name="check" />} onClick={onUse}>Use image</Button>))}
        </figcaption>
      )}
    </figure>
  );
}

/** several candidates from one prompt, in a grid; the picked one carries the accent ring and Use */
export function ImageResults({
  images,
  prompt,
  picked,
  onPick,
  onUse,
  columns = 2,
  className = "",
}: {
  images: { key: string; src: string; alt?: string; meta?: string }[];
  prompt?: string;
  picked?: string;
  onPick?: (key: string) => void;
  onUse?: (key: string) => void;
  columns?: 2 | 3;
  className?: string;
}) {
  const [own, setOwn] = useState<string | undefined>(images[0]?.key);
  const current = picked ?? own;
  const choose = (key: string) => { if (picked === undefined) setOwn(key); onPick?.(key); };
  return (
    <div className={`flex w-full min-w-0 max-w-130 flex-col gap-3 ${className}`}>
      <div role="radiogroup" aria-label="Candidates" className={`grid gap-2 ${columns === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
        {images.map((img, i) => {
          const on = img.key === current;
          return (
            <button
              key={img.key}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={`Candidate ${i + 1}${img.meta ? `, ${img.meta}` : ""}`}
              onClick={() => choose(img.key)}
              className={`relative aspect-square overflow-hidden rounded-md bg-inset transition-[box-shadow] duration-150 ${on ? "shadow-[0_0_0_2px_var(--accent)]" : "shadow-hairline hover:shadow-[0_0_0_1px_var(--line-strong)]"}`}
            >
              <img src={img.src} alt={img.alt ?? ""} className="absolute inset-0 size-full object-cover" />
              {on && <span className="absolute top-2 left-2 flex size-5 items-center justify-center rounded-full bg-accent text-canvas"><Icon name="check" size={12} strokeWidth={2.5} /></span>}
            </button>
          );
        })}
      </div>
      {(prompt || onUse) && (
        <div className="flex items-start justify-between gap-3">
          {prompt && <span className="line-clamp-2 min-w-0 flex-1 text-caption text-ink-2">{prompt}</span>}
          {onUse && current && <Button variant="accent" size="sm" icon={<Icon name="check" />} onClick={() => onUse(current)}>Use this one</Button>}
        </div>
      )}
    </div>
  );
}
