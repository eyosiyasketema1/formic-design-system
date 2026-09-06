"use client";
import { useEffect, useRef, useState } from "react";
/* ─────────────────────────────────────────────────────────
 * SLIDER
 * A native range input drawn with tokens (.primitive-slider):
 * keyboard, ARIA and touch come from the platform. Fill percent
 * feeds the track gradient via a CSS variable. Works inside
 * Field (id / aria-describedby injected).
 *
 * On top of the plain control: `steps` snaps to a list of values
 * and `showSteps` marks them with dots; `formatValue` shapes the
 * readout; `editable` turns the readout into a number field on
 * click (Enter commits, Escape cancels); `valuePosition="thumb"`
 * shows the value in a chip above the thumb while dragging or
 * focused instead of beside the track.
 *
 * RangeSlider is the two-thumb version (a pair of native inputs
 * on one track, so each thumb is a real control with its own
 * name), for a price band or a date window.
 * ───────────────────────────────────────────────────────── */
export type SliderValuePosition = "right" | "thumb";

const nearest = (v: number, steps: number[]) => steps.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a), steps[0]);

/* keyboard on a stepped slider walks the list, not the native step */
const stepKey = (key: string, current: number, steps: number[] | undefined): number | null => {
  if (!steps?.length) return null;
  const sorted = [...steps].sort((a, b) => a - b);
  const i = sorted.indexOf(nearest(current, sorted));
  if (key === "ArrowRight" || key === "ArrowUp" || key === "PageUp") return sorted[Math.min(sorted.length - 1, i + 1)];
  if (key === "ArrowLeft" || key === "ArrowDown" || key === "PageDown") return sorted[Math.max(0, i - 1)];
  if (key === "Home") return sorted[0];
  if (key === "End") return sorted[sorted.length - 1];
  return null;
};

/* the readout: a number, or a field when clicked (editable) */
function Readout({
  value,
  min,
  max,
  step,
  steps,
  format,
  editable,
  disabled,
  onCommit,
  label,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  steps?: number[];
  format: (v: number) => string;
  editable: boolean;
  disabled: boolean;
  onCommit: (v: number) => void;
  label?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);
  const commit = () => {
    const n = Number(text);
    if (!Number.isNaN(n) && text.trim() !== "") {
      const clamped = Math.min(max, Math.max(min, n));
      onCommit(steps?.length ? nearest(clamped, steps) : Math.round((clamped - min) / step) * step + min);
    }
    setEditing(false);
  };
  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={text}
        aria-label={label ? `${label} value` : "Value"}
        onChange={(event) => setText(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") { event.preventDefault(); commit(); }
          if (event.key === "Escape") { event.preventDefault(); setEditing(false); }
        }}
        className="primitive-field corner-smooth h-7 w-16 shrink-0 rounded-control border border-line bg-field px-2 text-right text-caption text-ink outline-none tabular-nums"
      />
    );
  }
  if (!editable) {
    return <span className="min-w-9 shrink-0 text-right text-caption tabular-nums text-ink-2">{format(value)}</span>;
  }
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={`Edit ${label ? `${label} ` : ""}value, ${format(value)}`}
      onClick={() => { setText(String(value)); setEditing(true); }}
      className="corner-smooth h-7 min-w-9 shrink-0 rounded-control px-1.5 text-right text-caption tabular-nums text-ink-2 transition-colors duration-150 hover:bg-hover hover:text-ink disabled:hover:bg-transparent"
    >
      {format(value)}
    </button>
  );
}

/* the chip above a thumb; `percent` places it, visible while active */
function ThumbValue({ percent, text, show }: { percent: number; text: string; show: boolean }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute -top-7 -translate-x-1/2 rounded-chip px-1.5 py-0.5 font-mono text-tiny whitespace-nowrap transition-opacity duration-150 ${show ? "opacity-100" : "opacity-0"}`}
      style={{ left: `calc(8px + (100% - 16px) * ${percent / 100})`, background: "var(--tooltip-bg)", color: "var(--tooltip-fg)" }}
    >
      {text}
    </span>
  );
}

/* step dots on the track; the thumb is 16px, so the dots sit on the thumb's travel */
function StepDots({ steps, min, max, current }: { steps: number[]; min: number; max: number; current: number | [number, number] }) {
  const on = (v: number) => (Array.isArray(current) ? v >= current[0] && v <= current[1] : v <= current);
  return (
    <span aria-hidden className="pointer-events-none absolute inset-x-0 top-1/2 h-0 -translate-y-1/2">
      {steps.map((v) => (
        <span
          key={v}
          className={`absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors duration-150 ${on(v) ? "bg-canvas" : "bg-line-strong"}`}
          style={{ left: `calc(8px + (100% - 16px) * ${max === min ? 0 : (v - min) / (max - min)})` }}
        />
      ))}
    </span>
  );
}

export default function Slider({
  min = 0,
  max = 100,
  step = 1,
  value,
  defaultValue,
  onChange,
  label,
  showValue = false,
  steps,
  showSteps = false,
  formatValue,
  editable = false,
  valuePosition = "right",
  disabled = false,
  className = "",
  id,
  "aria-describedby": describedBy,
}: {
  min?: number;
  max?: number;
  step?: number;
  /** controlled value — omit and use defaultValue for uncontrolled */
  value?: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
  /** accessible name — required unless a Field label targets this via id */
  label?: string;
  /** render the current value beside the track */
  showValue?: boolean;
  /** snap to these values only (e.g. [0, 25, 50, 100]) */
  steps?: number[];
  /** mark the steps with dots on the track */
  showSteps?: boolean;
  /** shape the readout: (v) => `${v}%` */
  formatValue?: (v: number) => string;
  /** click the readout to type a value */
  editable?: boolean;
  /** right: readout beside the track. thumb: a chip above the thumb while dragging or focused */
  valuePosition?: SliderValuePosition;
  disabled?: boolean;
  className?: string;
  id?: string;
  "aria-describedby"?: string;
} = {}) {
  const [internal, setInternal] = useState(defaultValue ?? min);
  const [active, setActive] = useState(false);
  const current = Math.min(max, Math.max(min, value !== undefined ? value : internal));
  const percent = max === min ? 0 : ((current - min) / (max - min)) * 100;
  const format = formatValue ?? String;
  const set = (raw: number) => {
    const next = steps?.length ? nearest(raw, steps) : raw;
    if (value === undefined) setInternal(next);
    onChange?.(next);
  };
  return (
    <span className={`flex w-full items-center gap-3 ${className}`}>
      <span className="relative flex min-w-0 flex-1 items-center">
        <input
          type="range"
          id={id}
          min={min}
          max={max}
          step={step}
          value={current}
          disabled={disabled}
          aria-label={label}
          aria-valuetext={formatValue ? format(current) : undefined}
          aria-describedby={describedBy}
          onChange={(event) => set(Number(event.target.value))}
          onKeyDown={(event) => { const v = stepKey(event.key, current, steps); if (v !== null) { event.preventDefault(); set(v); } }}
          onPointerDown={() => setActive(true)}
          onPointerUp={() => setActive(false)}
          onFocus={() => setActive(true)}
          onBlur={() => setActive(false)}
          className="primitive-slider w-full min-w-0 cursor-pointer disabled:cursor-default disabled:opacity-60"
          style={{ "--slider-fill": `${percent}%` } as React.CSSProperties}
        />
        {showSteps && steps?.length ? <StepDots steps={steps} min={min} max={max} current={current} /> : null}
        {valuePosition === "thumb" && <ThumbValue percent={percent} text={format(current)} show={active} />}
      </span>
      {(showValue || editable) && valuePosition === "right" && (
        <Readout value={current} min={min} max={max} step={step} steps={steps} format={format} editable={editable} disabled={disabled} onCommit={set} label={label} />
      )}
    </span>
  );
}

export function RangeSlider({
  min = 0,
  max = 100,
  step = 1,
  value,
  defaultValue,
  onChange,
  label = "Range",
  showValue = false,
  steps,
  showSteps = false,
  formatValue,
  editable = false,
  valuePosition = "right",
  disabled = false,
  className = "",
}: {
  min?: number;
  max?: number;
  step?: number;
  value?: [number, number];
  defaultValue?: [number, number];
  onChange?: (value: [number, number]) => void;
  /** names the pair; the thumbs are "<label> minimum" and "<label> maximum" */
  label?: string;
  showValue?: boolean;
  steps?: number[];
  showSteps?: boolean;
  formatValue?: (v: number) => string;
  editable?: boolean;
  valuePosition?: SliderValuePosition;
  disabled?: boolean;
  className?: string;
} = {}) {
  const [internal, setInternal] = useState<[number, number]>(defaultValue ?? [min, max]);
  const [active, setActive] = useState<0 | 1 | null>(null);
  const [lo, hi] = value ?? internal;
  const pct = (v: number) => (max === min ? 0 : ((v - min) / (max - min)) * 100);
  const format = formatValue ?? String;
  const set = (which: 0 | 1, raw: number) => {
    const v = steps?.length ? nearest(raw, steps) : raw;
    const next: [number, number] = which === 0 ? [Math.min(v, hi), hi] : [lo, Math.max(v, lo)];
    if (value === undefined) setInternal(next);
    onChange?.(next);
  };
  const thumb = (which: 0 | 1) => (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={which === 0 ? lo : hi}
      disabled={disabled}
      aria-label={`${label} ${which === 0 ? "minimum" : "maximum"}`}
      aria-valuetext={formatValue ? format(which === 0 ? lo : hi) : undefined}
      onChange={(event) => set(which, Number(event.target.value))}
      onKeyDown={(event) => { const v = stepKey(event.key, which === 0 ? lo : hi, steps); if (v !== null) { event.preventDefault(); set(which, v); } }}
      onPointerDown={() => setActive(which)}
      onPointerUp={() => setActive(null)}
      onFocus={() => setActive(which)}
      onBlur={() => setActive(null)}
      /* the thumb being moved sits on top so it can cross the other one */
      className={`primitive-slider is-layered absolute inset-0 w-full min-w-0 cursor-pointer disabled:cursor-default disabled:opacity-60 ${active === which ? "z-20" : "z-10"}`}
    />
  );
  return (
    <span className={`flex w-full items-center gap-3 ${className}`}>
      {(showValue || editable) && valuePosition === "right" && (
        <Readout value={lo} min={min} max={hi} step={step} steps={steps} format={format} editable={editable} disabled={disabled} onCommit={(v) => set(0, v)} label={`${label} minimum`} />
      )}
      <span className="relative flex h-6 min-w-0 flex-1 items-center">
        {/* the shared track: inset with the accent between the thumbs */}
        <span aria-hidden className="absolute inset-x-0 h-1.5 rounded-full bg-inset shadow-hairline">
          <span className="absolute inset-y-0 rounded-full bg-accent" style={{ left: `${pct(lo)}%`, right: `${100 - pct(hi)}%` }} />
        </span>
        {thumb(0)}
        {thumb(1)}
        {showSteps && steps?.length ? <StepDots steps={steps} min={min} max={max} current={[lo, hi]} /> : null}
        {valuePosition === "thumb" && (
          <>
            <ThumbValue percent={pct(lo)} text={format(lo)} show={active === 0} />
            <ThumbValue percent={pct(hi)} text={format(hi)} show={active === 1} />
          </>
        )}
      </span>
      {(showValue || editable) && valuePosition === "right" && (
        <Readout value={hi} min={lo} max={max} step={step} steps={steps} format={format} editable={editable} disabled={disabled} onCommit={(v) => set(1, v)} label={`${label} maximum`} />
      )}
    </span>
  );
}
