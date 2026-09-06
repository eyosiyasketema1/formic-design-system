"use client";
import { useId, useState, type ReactNode } from "react";
import { Disclosure, Icon } from "./primitives";
/* ─────────────────────────────────────────────────────────
 * ACCORDION
 * Stacked disclosure rows on a card — single-open by default,
 * multiple with a prop. Built on the Disclosure primitive, so
 * closed content is inert and the motion is the house easing.
 *
 * Two looks. `card` (default): rows on a surface divided by
 * hairlines, for FAQs and settings. `grouped`: no card, rows are
 * rounded pills on the page like a menu; the row under the
 * pointer tints, and an open item tints too — the whole item
 * (row and panel as one block, `highlight="item"`) or only its
 * row while hovered (`highlight="trigger"`).
 * ───────────────────────────────────────────────────────── */
export type AccordionItem = { key: string; title: string; content: ReactNode };
const DEFAULT_ITEMS: AccordionItem[] = [
  {
    key: "restock",
    title: "How does auto-restock work?",
    content:
      "When a base ingredient dips below two days of cover, the system drafts a supplier order and holds it for approval. Nothing ships without a yes.",
  },
  {
    key: "seasonal",
    title: "When do seasonal flavors rotate?",
    content:
      "Seasonal slots review every six weeks. Flavors trending under 4% of sales rotate out; the recommendation card proposes the replacement.",
  },
  {
    key: "suppliers",
    title: "Can one flavor use two suppliers?",
    content:
      "Yes — set a primary and a standby. The standby activates automatically when the primary misses a delivery window.",
  },
];
export default function Accordion({
  items = DEFAULT_ITEMS,
  multiple = false,
  defaultOpen = [],
  variant = "card",
  highlight = "item",
  className = "",
}: {
  /** the rows; defaults to demo content */
  items?: AccordionItem[];
  /** allow several rows open at once */
  multiple?: boolean;
  defaultOpen?: string[];
  /** card: rows on a surface. grouped: rounded rows on the page, no card */
  variant?: "card" | "grouped";
  /** grouped only: what an open item tints, the whole item or just its row on hover */
  highlight?: "item" | "trigger";
  className?: string;
} = {}) {
  const id = useId();
  const [openKeys, setOpenKeys] = useState<string[]>(defaultOpen);
  const toggle = (key: string) => {
    setOpenKeys((current) => {
      if (current.includes(key)) return current.filter((entry) => entry !== key);
      return multiple ? [...current, key] : [key];
    });
  };
  const grouped = variant === "grouped";
  return (
    <div className={grouped ? `flex w-full flex-col gap-0.5 ${className}` : `w-full overflow-hidden rounded-card bg-surface shadow-card ${className}`}>
      {items.map((item) => {
        const open = openKeys.includes(item.key);
        const headerId = `${id}-header-${item.key}`;
        const panelId = `${id}-panel-${item.key}`;
        const itemTint = grouped && highlight === "item" && open;
        return (
          <div key={item.key} className={grouped ? `corner-smooth rounded-control transition-colors duration-150 ${itemTint ? "bg-hover" : ""}` : "border-b border-line last:border-0"}>
            <h3>
              <button
                type="button"
                id={headerId}
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => toggle(item.key)}
                className={`flex w-full items-center justify-between gap-3 text-left text-body font-medium text-ink transition-colors duration-150 ${
                  grouped ? `corner-smooth h-9 rounded-control px-3 ${itemTint ? "" : "hover:bg-hover"}` : "h-11 px-4 hover:bg-hover"
                }`}
              >
                <span className="min-w-0 truncate">{item.title}</span>
                <Icon
                  name="chevron"
                  size={14}
                  strokeWidth={2}
                  className={`shrink-0 text-ink-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                  style={{ transitionTimingFunction: "var(--ease-out-quint)" }}
                />
              </button>
            </h3>
            <Disclosure open={open} duration={260}>
              <div
                id={panelId}
                role="region"
                aria-labelledby={headerId}
                className={`text-body leading-relaxed text-ink-2 ${grouped ? "px-3 pb-3" : "px-4 pb-3.5"}`}
              >
                {item.content}
              </div>
            </Disclosure>
          </div>
        );
      })}
    </div>
  );
}
