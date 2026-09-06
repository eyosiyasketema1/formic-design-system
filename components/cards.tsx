"use client";
import { useContext, type ReactNode } from "react";
import Button, { type ButtonVariant } from "./Button";
import { Card, CardGroupContext, IconTile, type IconName, type IconTileTone } from "./primitives";
/* ─────────────────────────────────────────────────────────
 * CARD FAMILY — compose a card from parts, lay cards out as a group
 *
 *   <CardGroup columns={2}>                    a grid of surfaces
 *     <Card>
 *       <CardHeader>
 *         <CardMedia icon="search" />
 *         <CardTitle>Find critical bugs</CardTitle>
 *         <CardDescription>Analyze recent commits…</CardDescription>
 *       </CardHeader>
 *       <CardFooter><CardButton>Run</CardButton></CardFooter>
 *     </Card>
 *   </CardGroup>
 *
 *   <CardGroup orientation="inline">           one surface, rows divided by hairlines
 *     <Card>
 *       <CardMedia icon="bolt" />
 *       <CardHeader>
 *         <CardTitle>Fluid motion</CardTitle>
 *         <CardDescription>…</CardDescription>
 *       </CardHeader>
 *       <CardFooter><CardButton>Connect</CardButton></CardFooter>
 *     </Card>
 *   </CardGroup>
 *
 * The parts read the group's orientation from context, so the same
 * markup is a stacked card in a grid and a row in an inline list:
 * media becomes a leading tile, the header takes the middle, the
 * footer moves to the trailing edge. Card itself lives in
 * primitives.tsx and does the same. Icons are furniture (IconTile):
 * ink on inset, accent only on the one card a view leads with.
 * ───────────────────────────────────────────────────────── */
const COLUMNS: Record<1 | 2 | 3 | 4, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
};

export function CardGroup({
  orientation = "grid",
  columns = 2,
  className = "",
  children,
}: {
  /** grid: separate surfaces in columns. inline: one surface, rows divided by hairlines */
  orientation?: "grid" | "inline";
  columns?: 1 | 2 | 3 | 4;
  className?: string;
  children: ReactNode;
}) {
  const inline = orientation === "inline";
  return (
    <CardGroupContext.Provider value={{ inline }}>
      <div
        role={inline ? "list" : undefined}
        className={
          inline
            ? `flex w-full flex-col divide-y divide-line overflow-hidden rounded-card bg-surface shadow-card ${className}`
            : `grid w-full gap-3.5 ${COLUMNS[columns]} ${className}`
        }
      >
        {children}
      </div>
    </CardGroupContext.Provider>
  );
}

function useInline() {
  return Boolean(useContext(CardGroupContext)?.inline);
}

/** title + description (+ media, in a grid) */
export function CardHeader({ className = "", children }: { className?: string; children: ReactNode }) {
  const inline = useInline();
  return <div className={`${inline ? "flex min-w-0 flex-1 flex-col gap-0.5" : "flex flex-col gap-3 p-5"} ${className}`}>{children}</div>;
}

/** an icon tile, or a picture: full-bleed at the top of a grid card, a thumbnail in a row */
export function CardMedia({
  icon,
  tone = "neutral",
  src,
  alt = "",
  className = "",
}: {
  icon?: IconName;
  tone?: IconTileTone;
  src?: string;
  alt?: string;
  className?: string;
}) {
  const inline = useInline();
  if (src) {
    return inline ? (
      <img src={src} alt={alt} className={`size-9 shrink-0 rounded-control object-cover ${className}`} />
    ) : (
      <img src={src} alt={alt} className={`-mx-5 -mt-5 mb-1 aspect-video w-[calc(100%+var(--spacing)*10)] max-w-none object-cover ${className}`} />
    );
  }
  if (!icon) return null;
  return <IconTile icon={icon} tone={tone} className={className} />;
}

export function CardTitle({ className = "", children }: { className?: string; children: ReactNode }) {
  const inline = useInline();
  return <h3 className={`${inline ? "truncate text-caption font-medium" : "text-body font-semibold"} text-ink ${className}`}>{children}</h3>;
}

export function CardDescription({ className = "", children }: { className?: string; children: ReactNode }) {
  const inline = useInline();
  return <p className={`${inline ? "truncate text-small" : "text-caption"} text-ink-3 ${className}`}>{children}</p>;
}

/** actions: at the bottom of a grid card, at the trailing edge of a row */
export function CardFooter({ className = "", children }: { className?: string; children: ReactNode }) {
  const inline = useInline();
  return <div className={`${inline ? "ml-auto flex shrink-0 items-center gap-1" : "mt-auto flex items-center gap-2 px-5 pb-5"} ${className}`}>{children}</div>;
}

/** the quiet card action: ghost in a row, secondary on a surface; pass `variant` for the one accent CTA */
export function CardButton({
  variant,
  children,
  ...rest
}: { variant?: ButtonVariant; children: ReactNode } & Omit<Parameters<typeof Button>[0], "variant" | "size" | "children">) {
  const inline = useInline();
  return (
    <Button variant={variant ?? (inline ? "ghost" : "secondary")} size="sm" {...rest}>
      {children}
    </Button>
  );
}
