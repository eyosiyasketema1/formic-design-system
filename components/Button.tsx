"use client";
import { type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { Spinner } from "./primitives";
/* ─────────────────────────────────────────────────────────
 * BUTTON — the workhorse control
 *
 * Variants:
 *   primary      ink fill, canvas text — the main action
 *   secondary    surface + button shadow — supporting actions
 *   ghost        bare text, hover reveals a soft fill
 *   destructive  red fill — irreversible actions
 *
 * Sizes sm (28px) / md (32px). States: hover, active
 * (presses down 3%), disabled (field fill, muted text),
 * loading (spinner in currentColor, clicks ignored).
 * Focus ring comes from the shared :focus-visible rule.
 * ───────────────────────────────────────────────────────── */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive" | "accent" | "success";
export type ButtonSize = "sm" | "md";
const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-ink text-canvas enabled:hover:opacity-90 disabled:bg-field disabled:text-ink-3",
  secondary:
    "bg-surface text-ink shadow-btn enabled:hover:bg-hover disabled:bg-field disabled:text-ink-3 disabled:shadow-none",
  ghost:
    "text-ink-2 enabled:hover:bg-hover-2 enabled:hover:text-ink disabled:text-ink-3",
  destructive:
    "bg-red text-canvas enabled:hover:opacity-90 disabled:bg-field disabled:text-ink-3",
  accent:
    "bg-accent text-canvas enabled:hover:opacity-90 disabled:bg-field disabled:text-ink-3",
  success:
    "bg-green text-canvas enabled:hover:opacity-90 disabled:bg-field disabled:text-ink-3",
};
const SIZES: Record<ButtonSize, string> = {
  sm: "h-7 gap-1.5 px-2.5 text-caption",
  md: "h-8 gap-2 px-3 text-body",
};
/* raised fills get a subtle top highlight, like the send arrow */
const RAISED: ButtonVariant[] = ["primary", "destructive", "accent", "success"];
export default function Button({
  children = "Button",
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  icon,
  type = "button",
  className = "",
  style,
  onClick,
  ...rest
}: {
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** shows a spinner and ignores clicks, keeping the variant's look */
  loading?: boolean;
  disabled?: boolean;
  /** optional leading icon (sized by the caller, ~14px) */
  icon?: ReactNode;
  type?: "button" | "submit";
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
} & Record<string, unknown>) {
  return (
    <button
      {...rest}
      type={type}
      disabled={disabled}
      aria-busy={loading || undefined}
      aria-disabled={loading || undefined}
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        /* keyboard activation synthesizes a click; preventDefault also
           cancels native form submission while loading */
        if (loading) {
          event.preventDefault();
          return;
        }
        onClick?.();
      }}
      className={`inline-flex items-center justify-center rounded-control font-medium
        transition-[background-color,color,box-shadow,opacity,transform] duration-150
        enabled:active:scale-[0.97] disabled:cursor-default
        ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
      style={
        RAISED.includes(variant) && !disabled
          ? { ...style, boxShadow: "var(--highlight-raised)" }
          : style
      }
    >
      {loading ? (
        <Spinner />
      ) : (
        icon && <span aria-hidden className="shrink-0">{icon}</span>
      )}
      {children}
    </button>
  );
}
