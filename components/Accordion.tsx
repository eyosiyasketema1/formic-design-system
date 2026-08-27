"use client";
import { useId, useState, type ReactNode } from "react";
import { Disclosure, Icon } from "./primitives";
/* ─────────────────────────────────────────────────────────
 * ACCORDION
 * Stacked disclosure rows on a card — single-open by default,
 * multiple with a prop. Built on the Disclosure primitive, so
 * closed content is inert and the motion is the house easing.
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
  className = "",
}: {
  /** the rows; defaults to demo content */
  items?: AccordionItem[];
  /** allow several rows open at once */
  multiple?: boolean;
  defaultOpen?: string[];
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
  return (
    <div className={`w-full overflow-hidden rounded-card bg-surface shadow-card ${className}`}>
      {items.map((item) => {
        const open = openKeys.includes(item.key);
        const headerId = `${id}-header-${item.key}`;
        const panelId = `${id}-panel-${item.key}`;
        return (
          <div key={item.key} className="border-b border-line last:border-0">
            <h3>
              <button
                type="button"
                id={headerId}
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => toggle(item.key)}
                className="flex h-11 w-full items-center justify-between gap-3 px-4 text-left text-body font-medium text-ink transition-colors duration-150 hover:bg-hover"
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
                className="px-4 pb-3.5 text-body leading-relaxed text-ink-2"
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
