"use client";
import { Children, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { Spinner } from "./primitives";
/* ─────────────────────────────────────────────────────────
 * BUTTON — the workhorse control
 *
 * Fills      primary (ink) · destructive (red) · accent · success — flat, no inner sheen
 * Quiet      secondary (surface) · outline (border) · ghost (bare)
 * Soft       accent-soft · destructive-soft (tint + tone text)
 * Inline     link (accent text, animated underline)
 *
 * Sizes xs (24) / sm (32) / md (36) / lg (40); shape square
 * (rounded-control) or pill. States: hover, active press,
 * disabled (opacity — keeps the variant's identity in both
 * modes), loading (spinner, clicks ignored). icon / iconEnd
 * flank the label and size themselves to the button; fullWidth
 * stretches; href renders a real <a> with the same look.
 * Focus ring comes from the shared :focus-visible rule.
 *
 * Usage: the page's main CTA is the accent variant — one per
 * view; ink primary is for secondary-emphasis fills. Everything
 * beside them is secondary/outline/ghost. One destructive per view. Width
 * hugs the label; never fix it. Icon-only actions use the
 * IconButton primitive, not a label-less Button.
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
export type ButtonShape = "square" | "pill";
/* disabled is uniform opacity — the variant keeps its identity and
 * both themes come out right without per-variant disabled colors.
 * 45% (vs the 60% on bordered form fields) because colored fills
 * need a deeper dim to read as inactive. */
const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-ink text-canvas enabled:hover:opacity-90",
  secondary: "bg-surface text-ink shadow-btn enabled:hover:bg-hover",
  outline: "border border-line-strong text-ink enabled:hover:bg-hover",
  ghost: "text-ink-2 enabled:hover:bg-hover-2 enabled:hover:text-ink",
  link: "animated-underline !px-1 text-accent enabled:hover:opacity-90 disabled:pointer-events-none",
  destructive: "bg-red text-canvas enabled:hover:opacity-90",
  "destructive-soft": "bg-red-tint text-red enabled:hover:opacity-85",
  accent: "bg-accent text-canvas enabled:hover:opacity-90",
  "accent-soft": "bg-accent-tint text-accent enabled:hover:opacity-85",
  success: "bg-green text-canvas enabled:hover:opacity-90",
};
/* Control metrics (CLAUDE.md rule 11): heights shared with the form
 * fields (24 / 32 / 36 / 40 — a md button lines up with a md input),
 * horizontal padding ≈ height/3 on the spacing scale, icons sized to
 * the button — callers never measure. */
const SIZES: Record<ButtonSize, string> = {
  xs: "h-6 gap-1 px-2 text-tiny [&_svg]:size-3",
  sm: "h-8 gap-1.5 px-3 text-caption [&_svg]:size-3.5",
  md: "h-9 gap-2 px-3.5 text-body [&_svg]:size-3.5",
  lg: "h-10 gap-2 px-4 text-lead [&_svg]:size-4",
};
export default function Button({
  children = "Button",
  variant = "primary",
  size = "md",
  shape = "square",
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
  /** square (rounded-control) or fully round pill */
  shape?: ButtonShape;
  /** shows a spinner and ignores clicks, keeping the variant's look */
  loading?: boolean;
  disabled?: boolean;
  /** stretch to the container's width */
  fullWidth?: boolean;
  /** leading icon — sized automatically to the button. An <Icon> passed as a
   *  child also works: the label row is a flex row, so Tailwind's block svg
   *  preflight cannot stack it above the text. Labels never wrap. */
  icon?: ReactNode;
  /** trailing icon — sized automatically to the button */
  iconEnd?: ReactNode;
  /** render a real link with the button's look */
  href?: string;
  target?: string;
  type?: "button" | "submit";
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
} & Record<string, unknown>) {
  /* .corner-smooth squircles the radius where supported; the label span
     below carries .optical-text (text-box needs a block container —
     it is inert on the flex button itself) */
  const classes = `${fullWidth ? "flex w-full" : "inline-flex"} items-center justify-center font-medium leading-none corner-smooth
    ${shape === "pill" ? "rounded-full" : "rounded-control"}
    transition-[background-color,color,box-shadow,opacity,transform] duration-150
    enabled:active:scale-[0.97] disabled:cursor-default disabled:opacity-45
    ${SIZES[size]} ${VARIANTS[variant]} ${className}`;
  const content = (
    <>
      {loading ? (
        <Spinner />
      ) : (
        icon && <span aria-hidden className="shrink-0">{icon}</span>
      )}
      <span className="inline-flex items-center gap-[inherit] whitespace-nowrap">
        {/* text-box trims block containers only, so each text run gets its own
            block span (a blockified flex item); an <Icon> child stays a sibling
            in the row instead of stacking under Tailwind's block-svg preflight */}
        {Children.map(children, (child) =>
          typeof child === "string" || typeof child === "number" ? <span className="optical-text">{child}</span> : child,
        )}
      </span>
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
        style={style}
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
      style={style}
    >
      {content}
    </button>
  );
}
