"use client";
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Icon, type IconName } from "./primitives";
/* ─────────────────────────────────────────────────────────
 * TABS
 * APG tablist: roving tabindex, arrow keys with automatic
 * activation, Home/End. The underline slides to the active
 * tab with the house easing; the list scrolls on narrow
 * viewports instead of wrapping.
 * ───────────────────────────────────────────────────────── */
export type TabItem = { key: string; label: string; icon?: IconName; content?: ReactNode };
const DEFAULT_TABS: TabItem[] = [
  {
    key: "overview",
    label: "Overview",
    content: "Pistachio leads the weekend menu — sales up 23% with the best margin on the board.",
  },
  {
    key: "batches",
    label: "Batches",
    content: "Two batches churned Friday night; the second finishes setting by Saturday open.",
  },
  {
    key: "suppliers",
    label: "Suppliers",
    content: "Maple Orbit covers the base; Aurora Scoops is on standby for the waffle special.",
  },
];
export default function Tabs({
  tabs = DEFAULT_TABS,
  value,
  defaultValue,
  onChange,
  className = "",
}: {
  /** the tab set; defaults to demo content */
  tabs?: TabItem[];
  /** controlled active key — omit and use defaultValue for uncontrolled */
  value?: string;
  defaultValue?: string;
  onChange?: (key: string) => void;
  className?: string;
} = {}) {
  const id = useId();
  const [internal, setInternal] = useState(defaultValue ?? tabs[0]?.key);
  const activeKey = value !== undefined ? value : internal;
  const active = tabs.find((tab) => tab.key === activeKey);
  const listRef = useRef<HTMLDivElement>(null);
  const [bar, setBar] = useState<{ left: number; width: number } | null>(null);
  const tabId = (key: string) => `${id}-tab-${key}`;
  const panelId = (key: string) => `${id}-panel-${key}`;
  const select = (key: string, focus = false) => {
    if (value === undefined) setInternal(key);
    onChange?.(key);
    if (focus) document.getElementById(tabId(key))?.focus();
  };
  const measure = () => {
    const el = activeKey === undefined ? null : document.getElementById(tabId(activeKey));
    if (el) setBar({ left: el.offsetLeft, width: el.offsetWidth });
  };
  useLayoutEffect(measure, [activeKey, tabs]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-measure callback reads fresh state
  }, [activeKey]);
  const onKeyDown = (event: React.KeyboardEvent) => {
    const index = tabs.findIndex((tab) => tab.key === activeKey);
    if (index < 0) return;
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    select(tabs[next].key, true);
  };
  return (
    <div className={`w-full ${className}`}>
      <div
        ref={listRef}
        role="tablist"
        onKeyDown={onKeyDown}
        className="relative flex items-center gap-1 overflow-x-auto border-b border-line [scrollbar-width:none]"
      >
        {tabs.map((tab) => {
          const isActive = tab.key === activeKey;
          return (
            <button
              key={tab.key}
              id={tabId(tab.key)}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={tab.content !== undefined ? panelId(tab.key) : undefined}
              tabIndex={isActive ? 0 : -1}
              onClick={() => select(tab.key)}
              className={`flex h-9 shrink-0 items-center gap-1.5 px-2.5 text-caption font-medium whitespace-nowrap transition-colors duration-150 ${
                isActive ? "text-ink" : "text-ink-3 hover:text-ink-2"
              }`}
            >
              {tab.icon && <Icon name={tab.icon} size={14} strokeWidth={2} />}
              {tab.label}
            </button>
          );
        })}
        {bar && (
          <span
            aria-hidden
            className="absolute bottom-0 h-0.5 rounded-full bg-ink"
            style={{
              left: bar.left,
              width: bar.width,
              transition: "left 250ms var(--ease-out-quint), width 250ms var(--ease-out-quint)",
            }}
          />
        )}
      </div>
      {active?.content !== undefined && (
        <div
          key={active.key}
          role="tabpanel"
          id={panelId(active.key)}
          aria-labelledby={tabId(active.key)}
          tabIndex={0}
          className="pt-3 text-body leading-relaxed text-ink-2"
          style={{ animation: "fade-in 200ms ease-out both" }}
        >
          {active.content}
        </div>
      )}
    </div>
  );
}
