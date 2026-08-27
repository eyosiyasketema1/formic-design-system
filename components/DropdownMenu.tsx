"use client";
import {
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useState,
  type ReactElement,
} from "react";
import { useAnchoredLayer } from "./hooks";
import { Icon, Popover, type IconName } from "./primitives";
/* ─────────────────────────────────────────────────────────
 * DROPDOWN MENU
 * The standard action menu. Wrap any trigger element — it
 * gets onClick + menu aria injected. The menu portals via
 * Popover on the shared anchored-layer engine; keyboard
 * drives an active item through aria-activedescendant while
 * focus stays on the trigger. (Bespoke menus like the
 * workspace switcher stay local by design.)
 * ───────────────────────────────────────────────────────── */
export type MenuAction = {
  type?: "item";
  key: string;
  label: string;
  icon?: IconName;
  /** destructive styling (red) */
  danger?: boolean;
  disabled?: boolean;
};
export type MenuEntry = MenuAction | { type: "divider" };
const DEFAULT_ITEMS: MenuEntry[] = [
  { key: "edit", label: "Edit flavor", icon: "edit" },
  { key: "duplicate", label: "Duplicate", icon: "copy" },
  { type: "divider" },
  { key: "retire", label: "Retire flavor", icon: "close", danger: true },
];
const isAction = (entry: MenuEntry): entry is MenuAction => entry.type !== "divider";
export default function DropdownMenu({
  items = DEFAULT_ITEMS,
  onSelect,
  align = "start",
  menuWidth = 224,
  children,
}: {
  /** actions and dividers; defaults to demo content */
  items?: MenuEntry[];
  onSelect?: (key: string) => void;
  /** which trigger edge the menu aligns to */
  align?: "start" | "end";
  menuWidth?: number;
  /** the trigger element — receives onClick and menu aria */
  children: ReactElement;
}) {
  const menuId = `${useId()}-menu`;
  const [active, setActive] = useState(0);
  const { open, setOpen, position, anchorRef, openAt } =
    useAnchoredLayer<HTMLSpanElement>(menuId);
  const enabled = items
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => isAction(entry) && !entry.disabled)
    .map(({ index }) => index);
  const openMenu = () => {
    if (enabled.length === 0) return;
    if (!openAt({ estimatedHeight: items.length * 32 + 8, width: menuWidth, align })) return;
    setActive(enabled[0]);
  };
  const focusTrigger = () =>
    anchorRef.current?.querySelector<HTMLElement>("button, a, [tabindex]")?.focus();
  const choose = (entry: MenuEntry) => {
    if (!isAction(entry) || entry.disabled) return;
    onSelect?.(entry.key);
    setOpen(false);
    focusTrigger();
  };
  const step = (direction: 1 | -1) =>
    setActive((current) => {
      const at = enabled.indexOf(current);
      return enabled[Math.max(0, Math.min(enabled.length - 1, at + direction))] ?? current;
    });
  /* keep the keyboard-active item visible in long menus */
  useEffect(() => {
    if (!open) return;
    document.getElementById(`${menuId}-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [open, active, menuId]);
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        openMenu();
      }
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      step(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      step(-1);
    } else if (event.key === "Home") {
      event.preventDefault();
      setActive(enabled[0]);
    } else if (event.key === "End") {
      event.preventDefault();
      setActive(enabled[enabled.length - 1]);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      choose(items[active]);
    } else if (event.key === "Escape") {
      event.preventDefault(); /* innermost layer consumes the Escape */
      setOpen(false);
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  };
  const childProps = isValidElement(children)
    ? (children.props as Record<string, unknown>)
    : {};
  const trigger = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        /* chain, don't overwrite, the trigger's own handlers */
        onClick: (event: React.MouseEvent) => {
          (childProps.onClick as ((e: React.MouseEvent) => void) | undefined)?.(event);
          if (open) setOpen(false);
          else openMenu();
        },
        onKeyDown: (event: React.KeyboardEvent) => {
          (childProps.onKeyDown as ((e: React.KeyboardEvent) => void) | undefined)?.(event);
          onKeyDown(event);
        },
        "aria-haspopup": "menu",
        "aria-expanded": open,
        "aria-controls": open ? menuId : undefined,
        /* activedescendant on the focused trigger — accepted deviation from
           the APG roving-focus menu pattern; see QA-REPORT.md */
        "aria-activedescendant": open ? `${menuId}-${active}` : undefined,
      })
    : children;
  return (
    <>
      <span ref={anchorRef} className="inline-flex">
        {trigger}
      </span>
      {open && position && (
        <Popover
          x={position.x}
          top={position.top}
          bottom={position.bottom}
          width={position.width}
          id={menuId}
          role="menu"
          className="max-h-72 overflow-y-auto p-1"
          onClose={() => setOpen(false)}
        >
          {items.map((entry, index) =>
            isAction(entry) ? (
              <div
                key={entry.key}
                id={`${menuId}-${index}`}
                role="menuitem"
                aria-disabled={entry.disabled || undefined}
                onMouseEnter={entry.disabled ? undefined : () => setActive(index)}
                /* prevent the mousedown from stealing focus off the trigger */
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(entry)}
                className={`flex h-8 items-center gap-2 rounded-sm px-2 text-body transition-colors duration-150 ${
                  entry.disabled
                    ? "cursor-default text-ink-3 opacity-60"
                    : `cursor-pointer ${entry.danger ? "text-red" : "text-ink"} ${
                        index === active ? "bg-hover" : ""
                      }`
                }`}
              >
                {entry.icon && (
                  <Icon
                    name={entry.icon}
                    size={14}
                    strokeWidth={2}
                    className={`shrink-0 ${entry.danger ? "text-red" : "text-ink-2"}`}
                  />
                )}
                <span className="min-w-0 flex-1 truncate">{entry.label}</span>
              </div>
            ) : (
              <div key={`divider-${index}`} role="separator" className="my-1 h-px bg-line" />
            ),
          )}
        </Popover>
      )}
    </>
  );
}
