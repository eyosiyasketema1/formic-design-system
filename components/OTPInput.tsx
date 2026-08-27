"use client";
import { useRef, useState } from "react";
/* ─────────────────────────────────────────────────────────
 * OTP INPUT
 * One quiet field box per digit. Typing advances, backspace
 * walks back, paste and one-time-code autofill distribute
 * across the cells. Works inside Field — the injected id
 * lands on the first cell so the label focuses it.
 * ───────────────────────────────────────────────────────── */
export default function OTPInput({
  length = 6,
  value,
  defaultValue = "",
  onChange,
  onComplete,
  invalid = false,
  disabled = false,
  className = "",
  id,
  label,
  "aria-describedby": describedBy,
  "aria-labelledby": labelledBy,
}: {
  length?: number;
  /** controlled code — omit and use defaultValue for uncontrolled */
  value?: string;
  defaultValue?: string;
  onChange?: (code: string) => void;
  /** fires once the code reaches full length */
  onComplete?: (code: string) => void;
  /** error styling — set automatically by Field when it has an error */
  invalid?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
  /** group name for standalone use — Field provides aria-labelledby instead */
  label?: string;
  "aria-describedby"?: string;
  "aria-labelledby"?: string;
} = {}) {
  const [internal, setInternal] = useState(defaultValue.slice(0, length));
  const code = (value !== undefined ? value : internal).slice(0, length);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const commit = (next: string) => {
    if (value === undefined) setInternal(next);
    onChange?.(next);
    if (next.length === length) onComplete?.(next);
  };
  const insertAt = (index: number, raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (!digits) return;
    const next = (code.slice(0, index) + digits + code.slice(index + digits.length)).slice(0, length);
    if (next === code) return; /* dead keystroke on a full code — no re-fire */
    commit(next);
    refs.current[Math.min(index + digits.length, length - 1)]?.focus();
  };
  const onKeyDown = (index: number, event: React.KeyboardEvent) => {
    if (event.key === "Backspace") {
      event.preventDefault();
      if (code[index]) {
        commit(code.slice(0, index) + code.slice(index + 1));
      } else if (index > 0) {
        commit(code.slice(0, index - 1) + code.slice(index));
        refs.current[index - 1]?.focus();
      }
    } else if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      refs.current[index - 1]?.focus();
    } else if (event.key === "ArrowRight" && index < length - 1) {
      event.preventDefault();
      refs.current[index + 1]?.focus();
    }
  };
  return (
    <div
      role="group"
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      className={`flex gap-2 ${className}`}
    >
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el;
          }}
          id={index === 0 ? id : undefined}
          value={code[index] ?? ""}
          inputMode="numeric"
          /* platform OTP autofill lands on the first cell and distributes */
          autoComplete={index === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${index + 1} of ${length}`}
          aria-invalid={invalid || undefined}
          data-invalid={invalid || undefined}
          disabled={disabled}
          onChange={(event) => insertAt(index, event.target.value)}
          onKeyDown={(event) => onKeyDown(index, event)}
          onFocus={(event) => event.target.select()}
          onPaste={(event) => {
            event.preventDefault();
            insertAt(index, event.clipboardData.getData("text"));
          }}
          className="primitive-field size-10 min-w-0 rounded-control border border-line bg-field text-center text-title text-ink outline-none disabled:opacity-60"
        />
      ))}
    </div>
  );
}
