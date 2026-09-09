"use client";
import { useEffect, useId, useRef } from "react";
import { Popover } from "./primitives";
import { useAnchoredLayer } from "./hooks";
/* ─────────────────────────────────────────────────────────
 * CONTEXT METER — how much of the model's window a thread has used
 * A thread fills a context window the way a tank fills; the reader
 * needs to know before the model starts forgetting. Two shapes:
 *
 *   ring   a 16px ring beside "48k / 200k" for a composer's toolbar
 *          or a thread header; hover or focus opens the breakdown
 *   bar    a full row for a settings or usage panel: the bar split
 *          into what filled it (system, messages, tools, files), a
 *          legend with each count, and the cost so far
 *
 * The fill is ink until 80%, orange from 80% (plan for it), red from
 * 95% (it is about to trim). Those are the two colours the system
 * keeps for warning and danger, and this is one of the few meters
 * that earns them: a full window changes what the model can do. The
 * parts of the breakdown use the chart ramp, categorical (rule 16).
 * ───────────────────────────────────────────────────────── */
export type ContextPart = { label: string; tokens: number };

export const formatTokens = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));

const tone = (share: number) => (share >= 0.95 ? "red" : share >= 0.8 ? "orange" : "ink");
const TONE_TEXT = { ink: "text-ink", orange: "text-orange", red: "text-red" } as const;
const TONE_STROKE = { ink: "var(--ink)", orange: "var(--orange)", red: "var(--red)" } as const;

export const DEFAULT_CONTEXT_PARTS: ContextPart[] = [
  { label: "System prompt", tokens: 2_400 },
  { label: "Messages", tokens: 31_800 },
  { label: "Tool results", tokens: 9_600 },
  { label: "Files", tokens: 4_200 },
];

function Ring({ share, size = 16 }: { share: number; size?: number }) {
  const r = (size - 3) / 2, c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--chart-track)" strokeWidth={3} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={TONE_STROKE[tone(share)]} strokeWidth={3} strokeLinecap="butt" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, share))} style={{ transition: "stroke-dashoffset 400ms var(--ease-out-quint)" }} />
    </svg>
  );
}

function Breakdown({ used, max, parts, cost, model, headline = true }: { used: number; max: number; parts?: ContextPart[]; cost?: string; model?: string; headline?: boolean }) {
  const share = used / max;
  return (
    <div className="flex flex-col gap-2.5">
      {headline && <div className="flex items-baseline justify-between gap-3">
        <span className="text-caption font-semibold text-ink">{formatTokens(used)} of {formatTokens(max)}</span>
        <span className={`text-small tabular-nums ${TONE_TEXT[tone(share)]}`}>{Math.round(share * 100)}%</span>
      </div>}
      {parts && parts.length > 0 && (
        <>
          <div className="flex h-1.5 w-full gap-px overflow-hidden rounded-full bg-chart-track">
            {parts.map((p, i) => <span key={p.label} className="h-full" style={{ width: `${(p.tokens / max) * 100}%`, background: `var(--chart-${(i % 5) + 1})` }} />)}
          </div>
          <ul className="flex flex-col gap-1">
            {parts.map((p, i) => (
              <li key={p.label} className="flex items-center gap-2 text-small">
                <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: `var(--chart-${(i % 5) + 1})` }} />
                <span className="min-w-0 flex-1 truncate text-ink-2">{p.label}</span>
                <span className="tabular-nums text-ink">{formatTokens(p.tokens)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {(cost || model) && (
        <div className="flex items-center justify-between gap-3 border-t border-line pt-2 text-small text-ink-3">
          <span className="min-w-0 truncate">{model}</span>
          {cost && <span className="tabular-nums">{cost}</span>}
        </div>
      )}
      {share >= 0.8 && <p className={`text-small ${TONE_TEXT[tone(share)]}`}>{share >= 0.95 ? "Nearly full: older messages will be trimmed." : "Filling up: start a new thread for a new topic."}</p>}
    </div>
  );
}

export default function ContextMeter({
  used = 48_000,
  max = 200_000,
  parts = DEFAULT_CONTEXT_PARTS,
  cost = "$0.42 so far",
  model,
  variant = "ring",
  label = "Context",
  className = "",
}: {
  /** tokens in the window now */
  used?: number;
  /** the model's window */
  max?: number;
  /** what filled it; omit for the number alone */
  parts?: ContextPart[];
  /** the thread's spend, as the reader reads it */
  cost?: string;
  /** the model's name, for the breakdown's foot */
  model?: string;
  variant?: "ring" | "bar";
  label?: string;
  className?: string;
}) {
  const share = Math.max(0, Math.min(1, max ? used / max : 0));
  const text = `${formatTokens(used)} / ${formatTokens(max)}`;
  const layerId = useId();
  const { open, position, anchorRef, openAt, close } = useAnchoredLayer<HTMLButtonElement>(layerId);
  const leave = useRef<number | null>(null);
  const show = () => { if (leave.current) window.clearTimeout(leave.current); if (!open) openAt({ estimatedHeight: 220, width: 264, align: "end" }); };
  const hide = () => { if (leave.current) window.clearTimeout(leave.current); leave.current = window.setTimeout(close, 160); };
  useEffect(() => () => { if (leave.current) window.clearTimeout(leave.current); }, []);

  if (variant === "bar") {
    return (
      <div className={`flex w-full min-w-0 flex-col gap-2 ${className}`} role="group" aria-label={`${label}: ${text}`}>
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-caption font-medium text-ink">{label}</span>
          <span className="text-small tabular-nums text-ink-2">{text} · <span className={TONE_TEXT[tone(share)]}>{Math.round(share * 100)}%</span></span>
        </div>
        <Breakdown used={used} max={max} parts={parts} cost={cost} model={model} headline={false} />
      </div>
    );
  }
  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        aria-label={`${label}: ${text}, ${Math.round(share * 100)}% used`}
        aria-expanded={open}
        aria-controls={open ? layerId : undefined}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={() => (open ? close() : show())}
        className={`corner-smooth inline-flex h-8 items-center gap-2 rounded-control px-2 text-small tabular-nums text-ink-2 transition-colors duration-150 hover:bg-hover hover:text-ink ${className}`}
      >
        <Ring share={share} />
        <span>{text}</span>
      </button>
      {open && position && (
        <Popover id={layerId} role="dialog" x={position.x} top={position.top} bottom={position.bottom} width={264} onClose={close} onMouseEnter={show} onMouseLeave={hide} className="p-3">
          <Breakdown used={used} max={max} parts={parts} cost={cost} model={model} />
        </Popover>
      )}
    </>
  );
}
