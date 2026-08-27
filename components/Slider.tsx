"use client";
import { useState } from "react";
/* ─────────────────────────────────────────────────────────
 * SLIDER
 * A native range input drawn with tokens (.primitive-slider)
 * — keyboard, ARIA, and touch come from the platform. Fill
 * percent feeds the track gradient via a CSS variable.
 * Works inside Field (id / aria-describedby injected).
 * ───────────────────────────────────────────────────────── */
export default function Slider({
  min = 0,
  max = 100,
  step = 1,
  value,
  defaultValue,
  onChange,
  label,
  showValue = false,
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
  disabled?: boolean;
  className?: string;
  id?: string;
  "aria-describedby"?: string;
} = {}) {
  const [internal, setInternal] = useState(defaultValue ?? min);
  const current = Math.min(max, Math.max(min, value !== undefined ? value : internal));
  const percent = max === min ? 0 : ((current - min) / (max - min)) * 100;
  return (
    <span className={`flex w-full items-center gap-3 ${className}`}>
      <input
        type="range"
        id={id}
        min={min}
        max={max}
        step={step}
        value={current}
        disabled={disabled}
        aria-label={label}
        aria-describedby={describedBy}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (value === undefined) setInternal(next);
          onChange?.(next);
        }}
        className="primitive-slider w-full min-w-0 cursor-pointer disabled:cursor-default disabled:opacity-60"
        style={{ "--slider-fill": `${percent}%` } as React.CSSProperties}
      />
      {showValue && (
        <span className="min-w-9 shrink-0 text-right text-caption tabular-nums text-ink-2">
          {current}
        </span>
      )}
    </span>
  );
}
