"use client";
import { useId, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Icon, type IconName } from "./primitives";
/* ─────────────────────────────────────────────────────────
 * INPUT GROUP — several fields as one block
 * Rows on a single surface divided by hairlines, the way a
 * settings sheet or a sign-up card lays out its fields. The
 * label sits inside the row above the value, so nothing needs
 * a column of labels beside it. The row under the pointer tints
 * (hover), the row being typed in lifts to the surface with a
 * hairline (focus), and an error row carries its message below
 * the value in red. Use Field + Input for a single field or a
 * conventional form; this is for a short, related set: name,
 * email, company; street, city, postcode.
 *
 *   <InputGroup>
 *     <InputField label="Name" icon="user" />
 *     <InputField label="Email" type="email" error="Enter a valid address" />
 *   </InputGroup>
 * ───────────────────────────────────────────────────────── */
export function InputGroup({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div role="group" className={`corner-smooth flex w-full flex-col divide-y divide-line overflow-hidden rounded-md border border-line bg-field ${className}`}>
      {children}
    </div>
  );
}

export function InputField({
  label,
  labelHidden = false,
  icon,
  error,
  disabled = false,
  trailing,
  className = "",
  ...rest
}: {
  label: string;
  /** keep the label for assistive tech only */
  labelHidden?: boolean;
  icon?: IconName;
  error?: string;
  disabled?: boolean;
  /** a small control on the trailing edge: a unit, a button */
  trailing?: ReactNode;
  className?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "disabled">) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div
      className={`group/field relative flex items-center gap-3 px-3 transition-colors duration-150 ${labelHidden ? "h-10" : "min-h-14 py-2"} ${
        disabled ? "opacity-50" : focused ? "bg-surface" : "hover:bg-hover"
      } ${error ? "text-red" : ""} ${className}`}
      onClick={() => document.getElementById(id)?.focus()}
    >
      {icon && <Icon name={icon} size={16} strokeWidth={focused ? 2 : 1.6} className={`shrink-0 transition-colors duration-150 ${error ? "text-red" : focused ? "text-ink" : "text-ink-3"}`} />}
      <div className="flex min-w-0 flex-1 flex-col">
        <label
          htmlFor={id}
          className={labelHidden ? "sr-only" : `text-small transition-colors duration-150 ${error ? "text-red" : focused ? "font-medium text-ink" : "text-ink-3"}`}
        >
          {label}
        </label>
        <input
          id={id}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={labelHidden ? label : rest.placeholder}
          className="min-w-0 w-full bg-transparent text-body text-ink outline-none placeholder:text-ink-3"
          {...rest}
        />
        {error && <span id={errorId} className="mt-0.5 text-small text-red">{error}</span>}
      </div>
      {trailing && <span className="shrink-0 text-caption text-ink-3">{trailing}</span>}
      {/* the focused row's hairline, drawn inside so the group's dividers stay put */}
      <span aria-hidden className={`pointer-events-none absolute inset-0 border transition-colors duration-150 ${focused ? (error ? "border-red" : "border-line-strong") : "border-transparent"}`} />
    </div>
  );
}

export default InputGroup;
