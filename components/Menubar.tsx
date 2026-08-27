"use client";
import DropdownMenu, { type MenuEntry } from "./DropdownMenu";
/* ─────────────────────────────────────────────────────────
 * MENUBAR
 * A horizontal bar of action menus, each a DropdownMenu.
 * Deliberately simpler than the APG menubar pattern: triggers
 * are plain tab-reachable buttons and each open menu is fully
 * keyboard-driven; arrow keys do not move between closed
 * menus (accepted trade-off, documented).
 * ───────────────────────────────────────────────────────── */
export type MenubarMenu = { key: string; label: string; items: MenuEntry[] };
const DEFAULT_MENUS: MenubarMenu[] = [
  {
    key: "flavors",
    label: "Flavors",
    items: [
      { key: "new", label: "New flavor", icon: "plus" },
      { key: "edit", label: "Edit selected", icon: "edit" },
      { type: "divider" },
      { key: "retire", label: "Retire selected", icon: "close", danger: true },
    ],
  },
  {
    key: "batches",
    label: "Batches",
    items: [
      { key: "queue", label: "Queue batch", icon: "plus" },
      { key: "history", label: "Batch history", icon: "clock" },
    ],
  },
  {
    key: "suppliers",
    label: "Suppliers",
    items: [
      { key: "invite", label: "Invite supplier", icon: "user-add" },
      { key: "prices", label: "Price sync", icon: "retry" },
      { key: "export", label: "Export list", icon: "upload", disabled: true },
    ],
  },
];
export default function Menubar({
  menus = DEFAULT_MENUS,
  onSelect,
  className = "",
}: {
  /** the menus, left to right; defaults to demo content */
  menus?: MenubarMenu[];
  /** called with (menuKey, itemKey) on any selection */
  onSelect?: (menuKey: string, itemKey: string) => void;
  className?: string;
} = {}) {
  return (
    <nav
      aria-label="Application menus"
      className={`flex w-fit max-w-full items-center gap-0.5 overflow-x-auto rounded-control bg-surface p-1 shadow-btn [scrollbar-width:none] ${className}`}
    >
      {menus.map((menu) => (
        <DropdownMenu
          key={menu.key}
          items={menu.items}
          onSelect={(itemKey) => onSelect?.(menu.key, itemKey)}
        >
          <button
            type="button"
            className="flex h-7 shrink-0 items-center rounded-sm px-2.5 text-caption font-medium text-ink-2 transition-colors duration-150 hover:bg-hover hover:text-ink aria-expanded:bg-hover aria-expanded:text-ink"
          >
            {menu.label}
          </button>
        </DropdownMenu>
      ))}
    </nav>
  );
}
