"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import DropdownMenu, { type MenuEntry } from "./DropdownMenu";
import { Avatar, Disclosure, Icon, IconButton, Tooltip, type AvatarKind, type IconName } from "./primitives";
import { FORMIC_CONFIG } from "./config";
/* ─────────────────────────────────────────────────────────
 * PROJECT SIDEBAR — the third rail
 * SidebarNav is the chat rail, AppSidebar the dashboard menu.
 * This is the workspace rail of a tool that holds things —
 * projects, documents, sites: a workspace switcher, a search
 * field with its shortcut, a "New" row, collapsible groups
 * with a per-group add action, rows with a status dot and a
 * hover-revealed "more" menu, and an account row with its own
 * menu plus two quiet icon actions.
 *
 * Two layouts, both on --sidebar (rule 14):
 *   edge   the rail is the window's left edge, hairline on the right
 *   inset  the whole window is --sidebar and the page sits in a
 *          rounded surface card beside the rail (ProjectInset)
 *
 * Rows are 32px on a tight rhythm; icons sit on one leading axis
 * (16px in), trailing actions on one trailing axis, so the
 * switcher tile, the search icon, the row dots and the avatar
 * all line up; the switcher chevron, the shortcut chip and the row
 * menus share the trailing axis, and the account row's chevron
 * yields it to the two footer actions. The app owns open / closed through
 * useProjectSidebar(); ProjectSidebarTrigger is the button for it.
 * ───────────────────────────────────────────────────────── */
export type ProjectStatus = "unread" | "live" | "error";
export type ProjectItem = { key: string; label: string; status?: ProjectStatus };
export type ProjectGroup = {
  key: string;
  label: string;
  items: ProjectItem[];
  /** shown as a "+" beside the label; called with the group key */
  onAdd?: (group: string) => void;
};
export type ProjectWorkspace = { key: string; name: string; /** a letter in an ink tile */ monogram?: string };

const DEFAULT_WORKSPACES: ProjectWorkspace[] = [
  { key: "formic", name: "Formic Studio", monogram: "F" },
  { key: "turumba", name: "Turumba", monogram: "T" },
];
const DEFAULT_GROUPS: ProjectGroup[] = [
  {
    key: "sites", label: "Client sites",
    items: [
      { key: "abyssinia", label: "Abyssinia Bank redesign", status: "unread" },
      { key: "gcm", label: "GCM annual report", status: "live" },
      { key: "turumba-site", label: "Turumba marketing site" },
      { key: "menu", label: "Creamery menu board", status: "error" },
    ],
  },
  {
    key: "internal", label: "Internal",
    items: [
      { key: "ds", label: "Design system" },
      { key: "brand", label: "Brand book 2026" },
    ],
  },
];
const DEFAULT_ITEM_ACTIONS: MenuEntry[] = [
  { key: "rename", label: "Rename", icon: "edit" },
  { key: "share", label: "Share", icon: "link" },
  { type: "divider" },
  { key: "archive", label: "Archive", icon: "archive" },
];
const DEFAULT_USER_MENU: MenuEntry[] = [
  { key: "profile", label: "Profile", icon: "user" },
  { key: "settings", label: "Settings", icon: "gear" },
  { type: "divider" },
  { key: "sign-out", label: "Sign out", icon: "sign-out" },
];
const STATUS: Record<ProjectStatus, { dot: string; text: string }> = {
  unread: { dot: "bg-accent", text: "unread" },
  live: { dot: "bg-green", text: "live" },
  error: { dot: "bg-red", text: "needs attention" },
};
/* the shared row: 32px, icon on the leading axis, label, trailing slot */
const ROW = "group/row relative flex h-8 w-full min-w-0 items-center gap-2 rounded-control pr-1.5 pl-2 text-caption transition-colors duration-150";
const ROW_REST = "text-ink-2 hover:bg-hover hover:text-ink";
const ROW_ON = "bg-hover-2 font-medium text-ink";
/* a shortcut chip that appears on hover / focus of its row */
function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="pointer-events-none font-mono text-tiny text-ink-3 opacity-0 transition-opacity duration-150 group-hover/row:opacity-100 group-focus-within/row:opacity-100 [@media(hover:none)]:opacity-100">
      {children}
    </kbd>
  );
}

export function ProjectSidebarTrigger({ open, toggle, className = "" }: { open: boolean; toggle: () => void; className?: string }) {
  return (
    <Tooltip label={open ? "Hide sidebar" : "Show sidebar"}>
      <IconButton label={open ? "Hide sidebar" : "Show sidebar"} aria-expanded={open} onClick={toggle} className={`size-7 text-ink-3 hover:bg-hover hover:text-ink ${className}`}>
        <Icon name="sidebar" size={16} strokeWidth={1.8} />
      </IconButton>
    </Tooltip>
  );
}

/* the page beside an inset rail: a surface card with a hairline, on --sidebar */
export function ProjectInset({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <main className={`m-2 ml-0 flex min-w-0 flex-1 flex-col overflow-y-auto rounded-card bg-surface shadow-card ${className}`}>
      {children}
    </main>
  );
}

export default function ProjectSidebar({
  workspaces = DEFAULT_WORKSPACES,
  workspace,
  onWorkspace,
  groups = DEFAULT_GROUPS,
  active,
  onSelect,
  onNew,
  newLabel = "New project",
  search = "",
  onSearch,
  itemActions = DEFAULT_ITEM_ACTIONS,
  onItemAction,
  user = { name: "Eyosiyas Ketema" },
  userMenu = DEFAULT_USER_MENU,
  onUserAction,
  onSettings,
  onTheme,
  theme = "light",
  layout = "edge",
  open = true,
  className = "",
}: {
  workspaces?: ProjectWorkspace[];
  /** key of the current workspace (omit = first) */
  workspace?: string;
  onWorkspace?: (key: string) => void;
  groups?: ProjectGroup[];
  /** key of the current item; `null` for none (omit = first) */
  active?: string | null;
  onSelect?: (key: string) => void;
  onNew?: () => void;
  newLabel?: string;
  search?: string;
  onSearch?: (value: string) => void;
  /** the "more" menu on every row */
  itemActions?: MenuEntry[];
  onItemAction?: (item: string, action: string) => void;
  user?: { name: string; src?: string; kind?: AvatarKind } | null;
  userMenu?: MenuEntry[];
  onUserAction?: (key: string) => void;
  /** the two quiet footer actions; omit either to hide it */
  onSettings?: () => void;
  onTheme?: () => void;
  theme?: "light" | "dark";
  layout?: "edge" | "inset";
  /** the app owns this (see useProjectSidebar); false unmounts the rail */
  open?: boolean;
  className?: string;
}) {
  const currentWs = workspaces.find((w) => w.key === workspace) ?? workspaces[0];
  const current = active === null ? undefined : (active ?? groups[0]?.items[0]?.key);
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  const searchRef = useRef<HTMLInputElement>(null);
  /* ⌘K / Ctrl+K focuses the search, the way the chip promises */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  if (!open) return null;
  const inset = layout === "inset";
  return (
    <aside
      aria-label="Workspace"
      className={`flex h-full w-64 shrink-0 flex-col gap-3 overflow-hidden bg-sidebar px-2 py-2 ${inset ? "" : "border-r border-line"} ${className}`}
    >
      {/* header: workspace switcher, then search + New as one block */}
      <div className="flex flex-col gap-2">
        <DropdownMenu
          align="start"
          menuWidth={240}
          items={[
            ...workspaces.map((w) => ({ key: w.key, label: w.name, icon: (w.key === currentWs?.key ? "check" : undefined) as IconName | undefined })),
            { type: "divider" as const },
            { key: "new-workspace", label: "New workspace", icon: "plus" as IconName },
          ]}
          onSelect={(key) => onWorkspace?.(key)}
        >
          <button type="button" className={`${ROW} ${ROW_REST} corner-smooth`}>
            <span aria-hidden className="flex size-5 shrink-0 items-center justify-center rounded-sm bg-ink text-micro font-semibold text-canvas">
              {currentWs?.monogram ?? currentWs?.name.charAt(0)}
            </span>
            <span className="min-w-0 flex-1 truncate text-left font-medium text-ink">{currentWs?.name}</span>
            <Icon name="chevron" size={14} strokeWidth={2} className="shrink-0 text-ink-3" />
          </button>
        </DropdownMenu>
        <div className="flex flex-col gap-0.5">
          <label className="group/row primitive-field corner-smooth relative flex h-8 items-center gap-2 rounded-control bg-field pr-1.5 pl-2 text-caption">
            <Icon name="search" size={16} strokeWidth={1.8} className="shrink-0 text-ink-3" />
            <input
              ref={searchRef}
              type="search"
              value={search}
              onChange={(event) => onSearch?.(event.target.value)}
              placeholder="Search…"
              aria-label="Search"
              className="min-w-0 flex-1 bg-transparent text-caption text-ink outline-none placeholder:text-ink-3"
            />
            <Kbd>⌘K</Kbd>
          </label>
          <button type="button" onClick={onNew} className={`${ROW} ${ROW_REST} corner-smooth`}>
            <Icon name="plus" size={16} strokeWidth={1.8} className="shrink-0" />
            <span className="min-w-0 flex-1 truncate text-left">{newLabel}</span>
            <Kbd>⇧⌘N</Kbd>
          </button>
        </div>
      </div>

      {/* groups */}
      <nav aria-label="Projects" className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        {groups.map((g) => {
          const isOpen = !closed[g.key];
          return (
            <section key={g.key} aria-label={g.label}>
              <div className="group/row flex h-7 items-center gap-1 pr-1 pl-2">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setClosed((c) => ({ ...c, [g.key]: isOpen }))}
                  className="flex h-7 min-w-0 flex-1 items-center gap-1 rounded-sm text-left font-mono text-micro tracking-wide text-ink-3 uppercase transition-colors duration-150 hover:text-ink"
                >
                  <span className="truncate">{g.label}</span>
                  <Icon name="chevron" size={12} strokeWidth={2} className={`shrink-0 transition-transform duration-300 ${isOpen ? "" : "-rotate-90"}`} style={{ transitionTimingFunction: "var(--ease-out-quint)" }} />
                </button>
                {g.onAdd && (
                  <Tooltip label={`Add to ${g.label}`}>
                    <IconButton label={`Add to ${g.label}`} onClick={() => g.onAdd?.(g.key)} className="size-6 text-ink-3 opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 hover:bg-hover hover:text-ink [@media(hover:none)]:opacity-100">
                      <Icon name="plus" size={14} strokeWidth={2} />
                    </IconButton>
                  </Tooltip>
                )}
              </div>
              <Disclosure open={isOpen}>
                <ul className="flex flex-col gap-px pt-0.5">
                  {g.items.map((item) => {
                    const on = item.key === current;
                    const status = item.status ? STATUS[item.status] : null;
                    return (
                      <li key={item.key} className={`${ROW} ${on ? ROW_ON : ROW_REST} corner-smooth`}>
                        {/* the row itself is the page link; the menu is a sibling so
                            neither nests a button in a button */}
                        <button type="button" aria-current={on ? "page" : undefined} onClick={() => onSelect?.(item.key)} className="absolute inset-0 rounded-control" aria-label={item.label}>
                          <span className="sr-only">{item.label}</span>
                        </button>
                        <span aria-hidden className="relative flex size-4 shrink-0 items-center justify-center">
                          <span className={`size-1.5 rounded-full ${status ? status.dot : "bg-ink-3"}`} />
                        </span>
                        <span className="pointer-events-none relative min-w-0 flex-1 truncate">
                          {item.label}
                          {status && <span className="sr-only">, {status.text}</span>}
                        </span>
                        <span className="relative shrink-0">
                          <DropdownMenu align="end" menuWidth={200} items={itemActions} onSelect={(key) => onItemAction?.(item.key, key)}>
                            <IconButton label={`More for ${item.label}`} className="size-6 text-ink-3 opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 aria-expanded:opacity-100 hover:bg-hover-2 hover:text-ink [@media(hover:none)]:opacity-100">
                              <Icon name="dots-vertical" size={14} strokeWidth={2} />
                            </IconButton>
                          </DropdownMenu>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </Disclosure>
            </section>
          );
        })}
      </nav>

      {/* footer: account menu + two quiet actions */}
      {user && (
        <div className="flex items-center gap-1 border-t border-line pt-2">
          <DropdownMenu align="start" menuWidth={240} items={userMenu} onSelect={(key) => onUserAction?.(key)}>
            <button type="button" aria-label="Open account menu" className={`${ROW} ${ROW_REST} corner-smooth min-w-0 flex-1`}>
              <Avatar name={user.name} src={user.src} kind={user.kind ?? FORMIC_CONFIG.avatar} size="sm" className="-ml-0.5" />
              <span className="min-w-0 flex-1 truncate text-left font-medium text-ink">{user.name}</span>
              <Icon name="sort" size={14} strokeWidth={2} className="shrink-0 text-ink-3" />
            </button>
          </DropdownMenu>
          {onSettings && (
            <Tooltip label="Settings">
              <IconButton label="Settings" onClick={onSettings} className="text-ink-3 hover:bg-hover hover:text-ink">
                <Icon name="gear" size={15} strokeWidth={1.8} />
              </IconButton>
            </Tooltip>
          )}
          {onTheme && (
            <Tooltip label={theme === "dark" ? "Light mode" : "Dark mode"}>
              <IconButton label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} onClick={onTheme} className="text-ink-3 hover:bg-hover hover:text-ink">
                <Icon name={theme === "dark" ? "sun" : "moon"} size={15} strokeWidth={1.8} />
              </IconButton>
            </Tooltip>
          )}
        </div>
      )}
    </aside>
  );
}

/* open state for the shell: `const bar = useProjectSidebar();` then
   <ProjectSidebar open={bar.open} /> and <ProjectSidebarTrigger {...bar} /> */
export function useProjectSidebar(defaultOpen = true) {
  const [open, setOpen] = useState(defaultOpen);
  return { open, setOpen, toggle: () => setOpen((o) => !o) };
}
