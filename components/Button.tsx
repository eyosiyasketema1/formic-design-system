"use client";
import { type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { Spinner } from "./primitives";
/* ─────────────────────────────────────────────────────────
 * BUTTON — the workhorse control
 *
 * Fills      primary (ink) · destructive (red) · accent · success
 * Quiet      secondary (surface) · outline (border) · ghost (bare)
 * Soft       accent-soft · destructive-soft (tint + tone text)
 * Inline     link (accent text, animated underline)
 *
 * Sizes xs (24) / sm (28) / md (32) / lg (40). States: hover,
 * active press, disabled, loading (spinner, clicks ignored).
 * icon / iconEnd flank the label; fullWidth stretches; href
 * renders a real <a> with the same look. Focus ring comes
 * from the shared :focus-visible rule.
 * ───────────────────────────────────────────────────────── */
export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "link"
  | "destructive"
  | "destructive-soft"
  | "accent"
  | "accent-soft"
  | "success";
export type ButtonSize = "xs" | "sm" | "md" | "lg";
const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-ink text-canvas enabled:hover:opacity-90 disabled:bg-field disabled:text-ink-3",
  secondary:
    "bg-surface text-ink shadow-btn enabled:hover:bg-hover disabled:bg-field disabled:text-ink-3 disabled:shadow-none",
  outline:
    "border border-line-strong text-ink enabled:hover:bg-hover disabled:border-line disabled:text-ink-3",
  ghost:
    "text-ink-2 enabled:hover:bg-hover-2 enabled:hover:text-ink disabled:text-ink-3",
  link:
    "animated-underline px-1 text-accent enabled:hover:opacity-90 disabled:text-ink-3",
  destructive:
    "bg-red text-canvas enabled:hover:opacity-90 disabled:bg-field disabled:text-ink-3",
  "destructive-soft":
    "bg-red-tint text-red enabled:hover:opacity-85 disabled:bg-field disabled:text-ink-3",
  accent:
    "bg-accent text-canvas enabled:hover:opacity-90 disabled:bg-field disabled:text-ink-3",
  "accent-soft":
    "bg-accent-tint text-accent enabled:hover:opacity-85 disabled:bg-field disabled:text-ink-3",
  success:
    "bg-green text-canvas enabled:hover:opacity-90 disabled:bg-field disabled:text-ink-3",
};
const SIZES: Record<ButtonSize, string> = {
  xs: "h-6 gap-1 px-2 text-tiny",
  sm: "h-7 gap-1.5 px-2.5 text-caption",
  md: "h-8 gap-2 px-3 text-body",
  lg: "h-10 gap-2 px-4 text-lead",
};
/* raised fills get a subtle top highlight, like the send arrow */
const RAISED: ButtonVariant[] = ["primary", "destructive", "accent", "success"];
export default function Button({
  children = "Button",
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
  iconEnd,
  href,
  target,
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
  /** stretch to the container's width */
  fullWidth?: boolean;
  /** leading icon (sized by the caller, ~14px) */
  icon?: ReactNode;
  /** trailing icon */
  iconEnd?: ReactNode;
  /** render a real link with the button's look */
  href?: string;
  target?: string;
  type?: "button" | "submit";
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
} & Record<string, unknown>) {
  const classes = `${fullWidth ? "flex w-full" : "inline-flex"} items-center justify-center rounded-control font-medium
    transition-[background-color,color,box-shadow,opacity,transform] duration-150
    enabled:active:scale-[0.97] disabled:cursor-default
    ${SIZES[size]} ${VARIANTS[variant]} ${className}`;
  const raised =
    RAISED.includes(variant) && !disabled
      ? { ...style, boxShadow: "var(--highlight-raised)" }
      : style;
  const content = (
    <>
      {loading ? (
        <Spinner />
      ) : (
        icon && <span aria-hidden className="shrink-0">{icon}</span>
      )}
      {children}
      {!loading && iconEnd && <span aria-hidden className="shrink-0">{iconEnd}</span>}
    </>
  );
  if (href !== undefined && !disabled) {
    return (
      <a
        {...rest}
        href={href}
        target={target}
        rel={target === "_blank" ? "noreferrer" : undefined}
        aria-busy={loading || undefined}
        aria-disabled={loading || undefined}
        onClick={(event: MouseEvent<HTMLAnchorElement>) => {
          if (loading) {
            event.preventDefault();
            return;
          }
          onClick?.();
        }}
        /* :enabled never matches anchors — drop the guards (links can't be disabled) */
        className={classes.replaceAll("enabled:", "")}
        style={raised}
      >
        {content}
      </a>
    );
  }
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
      className={classes}
      style={raised}
    >
      {content}
    </button>
  );
}
