"use client";
import {
  cloneElement,
  isValidElement,
  useId,
  useRef,
  type InputHTMLAttributes,
  type ReactElement,
  type TextareaHTMLAttributes,
} from "react";
import { Icon, type IconName } from "./primitives";
/* ─────────────────────────────────────────────────────────
 * FIELD · INPUT · TEXTAREA
 * The form trio. Field owns the label / hint / error row and
 * wires aria onto its control automatically. Input and
 * Textarea style on .primitive-field — the deliberately
 * quiet focus (border shift, no ring; see CLAUDE.md rule 6).
 * ───────────────────────────────────────────────────────── */
export function Field({
  label,
  hint,
  error,
  required = false,
  className = "",
  children,
}: {
  label: string;
  /** helper text below the control (replaced by error when set) */
  hint?: string;
  /** error message — also flips the control's invalid border */
  error?: string;
  required?: boolean;
  className?: string;
  /** one of the system's form controls (Input, Textarea, …) —
   *  Field injects id, aria-describedby, and invalid into it */
  children: ReactElement;
}) {
  const id = useId();
  const controlId = `${id}-control`;
  const labelId = `${id}-label`;
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        id: controlId,
        /* names grouped controls (OTP cells) and comboboxes, not just inputs */
        "aria-labelledby": labelId,
        ...(describedBy ? { "aria-describedby": describedBy } : {}),
        ...(error ? { invalid: true } : {}),
      })
    : children;
  return (
    <div className={`flex w-full flex-col gap-1.5 ${className}`}>
      <label id={labelId} htmlFor={controlId} className="text-caption font-medium text-ink">
        {label}
        {required && (
          <span aria-hidden className="text-red">
            {" "}
            *
          </span>
        )}
      </label>
      {control}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-small text-red">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-small text-ink-3">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
export type InputSize = "sm" | "md";
const INPUT_HEIGHTS: Record<InputSize, string> = { sm: "h-8", md: "h-9" };
export default function Input({
  size = "md",
  leadingIcon,
  invalid = false,
  className = "",
  ...rest
}: {
  size?: InputSize;
  /** icon rendered inside the field's leading edge */
  leadingIcon?: IconName;
  /** error styling — set automatically by Field when it has an error */
  invalid?: boolean;
  className?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "size">) {
  const innerRef = useRef<HTMLInputElement>(null);
  return (
    /* clicking anywhere on the field focuses the input — same
       affordance as ChatComposer's wrapper */
    <span
      data-invalid={invalid || undefined}
      onClick={() => innerRef.current?.focus()}
      className={`primitive-field flex w-full cursor-text items-center gap-2 rounded-control border border-line bg-field px-3 ${INPUT_HEIGHTS[size]} ${className}`}
    >
      {leadingIcon && <Icon name={leadingIcon} size={14} strokeWidth={2} className="shrink-0 text-ink-3" />}
      <input
        ref={innerRef}
        aria-invalid={invalid || undefined}
        className="min-w-0 flex-1 bg-transparent text-body text-ink outline-none placeholder:text-ink-3"
        {...rest}
      />
    </span>
  );
}
export function Textarea({
  rows = 3,
  invalid = false,
  className = "",
  ...rest
}: {
  rows?: number;
  invalid?: boolean;
  className?: string;
} & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const innerRef = useRef<HTMLTextAreaElement>(null);
  return (
    <span
      data-invalid={invalid || undefined}
      onClick={() => innerRef.current?.focus()}
      className={`primitive-field flex w-full cursor-text rounded-control border border-line bg-field px-3 py-2 ${className}`}
    >
      <textarea
        ref={innerRef}
        rows={rows}
        aria-invalid={invalid || undefined}
        className="min-w-0 flex-1 resize-none bg-transparent text-body leading-relaxed text-ink outline-none placeholder:text-ink-3"
        {...rest}
      />
    </span>
  );
}
