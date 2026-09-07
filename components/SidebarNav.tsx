"use client";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { FORMIC_CONFIG } from "./config";
import { createPortal } from "react-dom";
import { Avatar, GlideMenu, Icon, type AvatarKind, type IconName } from "./primitives";
import { FormicMark } from "./brand";
/* ─────────────────────────────────────────────────────────
 * SIDEBAR NAV
 * Shared by the design-system preview and the harness shell:
 * compact workspace switcher, primary navigation, searchable
 * chat history, and a collapse that preserves icon alignment.
 *
 * Requires styles/sidebar.css (included by styles/formic.css).
 * Fills its parent: mount it inside a `flex h-dvh` shell next to a
 * `min-w-0 flex-1 overflow-y-auto` main column.
 * ───────────────────────────────────────────────────────── */
export type SidebarWorkspace = { name: string; monogram: string; /** replaces the Formic mark */ logo?: ReactNode };
const DEFAULT_WORKSPACE: SidebarWorkspace = { name: "Formic Studio", monogram: "F" };
export type SidebarNavItem = { key: string; label: string; icon: IconName; count?: string };
const DEFAULT_NAV_ITEMS: SidebarNavItem[] = [
  { key: "projects", label: "Projects", icon: "folder", count: "6" },
  { key: "agents", label: "Agents", icon: "sparkles" },
];
export type SidebarRecent = {
  id: string;
  label: string;
  prompt?: string;
};
const DEFAULT_RECENTS: SidebarRecent[] = [
  { id: "northwind", label: "Northwind pitch deck" },
  { id: "report", label: "Annual report copy pass" },
  { id: "creamery", label: "Creamery menu board sizes" },
  { id: "brand", label: "Brand book 2026 outline" },
  { id: "invoice", label: "Invoice reminder to Selam Coffee" },
  { id: "hours", label: "Hours by team, this month" },
  { id: "alt", label: "Alt text for the annual report" },
  { id: "agent", label: "Copywriter agent prompts" },
];
type SidebarNavProps = {
  /** start collapsed to the icon rail; defaults to formic.config.json's sidebarState */
  defaultCollapsed?: boolean;
  activeTitle?: string | null;
  className?: string;
  /** stretch to the parent's height (default). `false` gives a fixed 600px demo height for galleries. */
  fill?: boolean;
  onNewChat?: () => void;
  onPick?: (id: string, label: string, prompt?: string) => void;
  /** controlled primary-nav selection (e.g. "home" | "invite") */
  activeNav?: string;
  onNavigate?: (key: string) => void;
  /** the account row at the foot; the avatar follows formic.config.json */
  user?: { name: string; src?: string; kind?: AvatarKind };
  /** the account row was pressed */
  onFooterClick?: () => void;
  workspace?: SidebarWorkspace;
  navItems?: SidebarNavItem[];
  recents?: SidebarRecent[];
};
const DEFAULT_USER = { name: "Eyosiyas Ketema" };
const SIDEBAR_MOTION = {
  expandedWidth: 224,
  collapsedWidth: 52,
  duration: 280,
  copyDuration: 180,
  copyOffset: 8,
  easing: "var(--ease-out-quint)",
};
/* ─────────────────────────────────────────────────────────
 * CHAT SEARCH STORYBOARD
 *
 *   0ms   search is triggered; Chats label begins fading
 *   0ms   field grows right → left from the search control
 * 180ms   field fills the row; cursor is focused and ready
 * ───────────────────────────────────────────────────────── */
const CHAT_SEARCH_MOTION = {
  duration: 180,
  closedWidth: 28,
  easing: "var(--ease-out-quint)",
};
function GlideGroup({ children }: { children: ReactNode }) {
  return (
    <GlideMenu
      rowSelector="[data-row]"
      highlightClassName="sidebar-glide-highlight rounded-chip bg-hover-2"
      className="group/glide flex flex-col gap-px"
    >
      {children}
    </GlideMenu>
  );
}
function RailButton({
  icon,
  label,
  active = false,
  count,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
  count?: string;
  onClick?: () => void;
}) {
  return (
    <button
      data-row
      type="button"
      onClick={onClick}
      className={`sidebar-row relative z-10 mx-2 flex h-8 items-center rounded-control px-2 text-left
        transition-[width,background-color,color,transform] duration-150 active:scale-[0.98]
        ${active ? "bg-hover-2 group-hover/glide:bg-transparent" : ""}`}
    >
      <span className={`flex size-5 shrink-0 items-center justify-center ${active ? "text-ink" : "text-ink-2"}`}>
        {icon}
      </span>
      <span className={`sidebar-copy ml-1.5 min-w-0 flex-1 truncate text-caption ${active ? "font-medium text-ink" : "text-ink-2"}`}>
        {label}
      </span>
      {count && (
        <span className="sidebar-copy mr-2 shrink-0 text-small font-medium tabular-nums text-ink-3">
          {count}
        </span>
      )}
    </button>
  );
}
function WorkspaceMenu({
  workspace,
  position,
  onClose,
}: {
  workspace: SidebarWorkspace;
  position: { top: number; left: number };
  onClose: () => void;
}) {
  return createPortal(
    <div
      data-workspace-menu
      className="fixed z-50 w-64 rounded-card bg-surface p-1.5 shadow-overlay"
      style={{
        top: position.top,
        left: position.left,
        animation: "pop-in 180ms var(--ease-out-quint) both",
        transformOrigin: "top left",
      }}
    >
      <GlideMenu className="flex flex-col gap-px" highlightClassName="inset-x-0 rounded-control bg-hover-2">
        <button
          data-menu-row
          type="button"
          onClick={onClose}
          className="relative z-10 flex h-10 w-full items-center gap-1.5 rounded-control px-2 text-left"
        >
          <span className="flex size-6 shrink-0 items-center justify-center rounded-chip bg-ink text-tiny font-semibold text-surface">
            {workspace.monogram}
          </span>
          <span className="min-w-0 flex-1 truncate text-body font-medium text-ink">{workspace.name}</span>
          <span className="shrink-0 text-ink"><Icon name="check" size={18} strokeWidth={2.2} /></span>
        </button>
        <div className="my-1 h-px bg-line" />
        {([
          { label: "New workspace", icon: "plus" },
          { label: "Workspace settings", icon: "gear" },
          { label: "Invite team members", icon: "user-add" },
        ] as { label: string; icon: IconName }[]).map((item) => (
          <button
            key={item.label}
            data-menu-row
            type="button"
            onClick={onClose}
            className="relative z-10 flex h-9 w-full items-center gap-1.5 rounded-control px-2 text-left"
          >
            <span className="flex size-5 shrink-0 items-center justify-center text-ink-2"><Icon name={item.icon} size={16} strokeWidth={2} /></span>
            <span className="min-w-0 flex-1 truncate text-body text-ink">{item.label}</span>
          </button>
        ))}
        <div className="my-1 h-px bg-line" />
        <button
          data-menu-row
          type="button"
          onClick={onClose}
          className="relative z-10 flex h-9 w-full items-center gap-1.5 rounded-control px-2 text-left"
        >
          <span className="flex size-5 shrink-0 items-center justify-center text-ink-2"><Icon name="sign-out" size={16} strokeWidth={2} /></span>
          <span className="min-w-0 flex-1 truncate text-body text-ink">Sign out</span>
        </button>
      </GlideMenu>
    </div>,
    document.body,
  );
}
export default function SidebarNav({
  activeTitle,
  className = "",
  fill = true,
  onNewChat,
  onPick,
  activeNav,
  onNavigate,
  user = DEFAULT_USER,
  onFooterClick,
  workspace = DEFAULT_WORKSPACE,
  navItems = DEFAULT_NAV_ITEMS,
  recents = DEFAULT_RECENTS,
  defaultCollapsed = FORMIC_CONFIG.sidebarState === "rail",
}: SidebarNavProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [internalNav, setInternalNav] = useState("chats");
  const currentNav = activeNav ?? internalNav;
  const selectNav = (key: string) => {
    setInternalNav(key);
    onNavigate?.(key);
  };
  const [demoActiveTitle, setDemoActiveTitle] = useState<string | null>(null);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [workspacePosition, setWorkspacePosition] = useState({ top: 0, left: 0 });
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const workspaceButtonRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const searchTriggerRef = useRef<HTMLButtonElement>(null);
  const selectedTitle = activeTitle === undefined ? demoActiveTitle : activeTitle;
  const visibleRecents = recents.filter((item) => item.label.toLowerCase().includes(query.trim().toLowerCase()));
  useEffect(() => {
    if (!workspaceOpen) return;
    const close = (event: PointerEvent) => {
      const target = event.target as Element;
      if (!target.closest("[data-workspace-trigger]") && !target.closest("[data-workspace-menu]")) {
        setWorkspaceOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setWorkspaceOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [workspaceOpen]);
  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);
  const closeSearch = () => {
    setSearchOpen(false);
    setQuery("");
    searchTriggerRef.current?.focus();
  };
  const collapse = () => {
    setCollapsed(true);
    setWorkspaceOpen(false);
    setSearchOpen(false);
    setQuery("");
  };
  return (
    <aside
      data-sidebar-collapsed={collapsed}
      aria-label="Workspace navigation"
      className={`relative flex shrink-0 overflow-hidden border-r border-line bg-sidebar transition-[width] ${fill ? "h-full" : "h-[600px]"} ${className}`}
      style={{
        width: collapsed ? SIDEBAR_MOTION.collapsedWidth : SIDEBAR_MOTION.expandedWidth,
        transitionDuration: `${SIDEBAR_MOTION.duration}ms`,
        transitionTimingFunction: SIDEBAR_MOTION.easing,
        "--sidebar-copy-duration": `${SIDEBAR_MOTION.copyDuration}ms`,
        "--sidebar-copy-offset": `${SIDEBAR_MOTION.copyOffset}px`,
        "--sidebar-easing": SIDEBAR_MOTION.easing,
      } as CSSProperties}
    >
      <div className="flex min-h-0 w-[224px] shrink-0 flex-col pb-2">
        <div className="relative mb-2.5 h-10 shrink-0">
          <button
            ref={workspaceButtonRef}
            data-workspace-trigger
            type="button"
            aria-expanded={workspaceOpen}
            aria-hidden={collapsed}
            tabIndex={collapsed ? -1 : 0}
            onClick={() => {
              if (!workspaceOpen && workspaceButtonRef.current) {
                const rect = workspaceButtonRef.current.getBoundingClientRect();
                setWorkspacePosition({ top: rect.bottom + 6, left: rect.left });
              }
              setWorkspaceOpen((open) => !open);
            }}
            className="sidebar-workspace-control absolute left-2 top-1 flex h-8 w-[164px] items-center rounded-control px-2 text-left hover:bg-hover-2 active:scale-[0.99]"
          >
            <span className="sidebar-logo flex size-5 shrink-0 items-center justify-center text-accent">
              {workspace.logo ?? <FormicMark size={18} className="text-accent" />}
            </span>
            <span className="sidebar-copy ml-1.5 min-w-0 flex-1 truncate text-caption font-medium text-ink">
              {workspace.name}
            </span>
            <span className="sidebar-copy ml-1 flex shrink-0 text-ink-3">
              <Icon name="chevron" size={16} strokeWidth={2} />
            </span>
          </button>
          {workspaceOpen && <WorkspaceMenu workspace={workspace} position={workspacePosition} onClose={() => setWorkspaceOpen(false)} />}
          <button
            type="button"
            aria-label="Collapse sidebar"
            aria-hidden={collapsed}
            tabIndex={collapsed ? -1 : 0}
            onClick={collapse}
            className="sidebar-collapse-control absolute right-2 top-1 flex size-8 items-center justify-center rounded-control text-ink-3 hover:bg-hover-2 hover:text-ink"
          >
            <Icon name="sidebar" size={18} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            aria-label="Expand sidebar"
            aria-hidden={!collapsed}
            tabIndex={collapsed ? 0 : -1}
            onClick={() => setCollapsed(false)}
            className="sidebar-expand-control absolute left-2 top-0.5 flex size-9 items-center justify-center rounded-control text-ink-3 hover:bg-hover-2 hover:text-ink"
          >
            <Icon name="sidebar" size={18} strokeWidth={1.8} className="rotate-180" />
          </button>
        </div>
        <GlideGroup>
          <RailButton
            icon={<Icon name="edit" size={18} strokeWidth={1.8} />}
            label="New chat"
            onClick={() => {
              if (activeTitle === undefined) setDemoActiveTitle(null);
              selectNav("chats");
              onNewChat?.();
            }}
          />
          {navItems.map((item) => (
            <RailButton
              key={item.key}
              icon={<Icon name={item.icon} size={18} strokeWidth={1.8} />}
              label={item.label}
              count={item.count}
              active={currentNav === item.key}
              onClick={() => selectNav(item.key)}
            />
          ))}
        </GlideGroup>
        <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
          <div className="sidebar-copy relative mx-2 mb-1 h-8">
            <div
              aria-hidden={searchOpen}
              className={`absolute inset-0 flex items-center gap-1 px-2 font-mono text-micro tracking-wide text-ink-3 uppercase transition-[opacity,transform] ${searchOpen ? "pointer-events-none -translate-x-1 opacity-0" : "translate-x-0 opacity-100"}`}
              style={{ transitionDuration: `${CHAT_SEARCH_MOTION.duration}ms`, transitionTimingFunction: CHAT_SEARCH_MOTION.easing }}
            >
              <span>Chats</span>
              <Icon name="chevron" size={12} strokeWidth={2} />
            </div>
            <button
              ref={searchTriggerRef}
              type="button"
              aria-label="Search chats"
              aria-expanded={searchOpen}
              aria-hidden={collapsed || searchOpen}
              tabIndex={collapsed || searchOpen ? -1 : 0}
              onClick={() => setSearchOpen(true)}
              className={`absolute right-0 top-0 z-10 flex size-8 items-center justify-center rounded-control text-ink-3 transition-[opacity,background-color,color,transform] hover:bg-hover-2 hover:text-ink active:scale-[0.96] ${searchOpen ? "pointer-events-none opacity-0" : "opacity-100"}`}
              style={{ transitionDuration: `${CHAT_SEARCH_MOTION.duration}ms` }}
            >
              <Icon name="search" size={16} strokeWidth={2} />
            </button>
            <div
              className={`absolute right-0 top-0 z-20 flex h-8 items-center overflow-hidden rounded-control bg-field text-ink-3 shadow-hairline transition-[width,opacity] focus-within:text-ink-2 ${searchOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
              style={{
                width: searchOpen ? "100%" : CHAT_SEARCH_MOTION.closedWidth,
                transitionDuration: `${CHAT_SEARCH_MOTION.duration}ms`,
                transitionTimingFunction: CHAT_SEARCH_MOTION.easing,
              }}
            >
              <span className="ml-2 flex shrink-0 items-center justify-center">
                <Icon name="search" size={15} strokeWidth={2} />
              </span>
              <input
                ref={searchRef}
                tabIndex={searchOpen ? 0 : -1}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") closeSearch();
                }}
                placeholder="Search chats"
                aria-label="Search chat history"
                className="ml-1.5 min-w-0 flex-1 bg-transparent text-caption text-ink outline-none placeholder:text-ink-3"
              />
              <button
                type="button"
                aria-label="Close chat search"
                aria-hidden={!searchOpen}
                tabIndex={searchOpen ? 0 : -1}
                onClick={closeSearch}
                className="flex size-8 shrink-0 items-center justify-center rounded-control text-ink-3 transition-[background-color,color,transform] duration-150 hover:bg-hover-2 hover:text-ink active:scale-[0.96]"
              >
                <Icon name="close" size={16} strokeWidth={2} />
              </button>
            </div>
          </div>
          <GlideGroup>
            {visibleRecents.map((item) => {
              const active = item.label === selectedTitle;
              return (
                <button
                  key={item.id}
                  data-row
                  type="button"
                  title={item.label}
                  aria-hidden={collapsed}
                  tabIndex={collapsed ? -1 : 0}
                  onClick={() => {
                    selectNav("chats");
                    if (activeTitle === undefined) setDemoActiveTitle(item.label);
                    onPick?.(item.id, item.label, item.prompt);
                  }}
                  className={`sidebar-row relative z-10 mx-2 flex h-8 items-center rounded-control px-2 text-left transition-[width,background-color,color,transform] duration-150 active:scale-[0.98] ${
                    active ? "bg-hover-2 group-hover/glide:bg-transparent" : ""
                  }`}
                >
                  <span className={`sidebar-copy min-w-0 flex-1 truncate text-caption ${active ? "font-medium text-ink" : "text-ink-2"}`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
            {query && visibleRecents.length === 0 && (
              <div className="sidebar-copy mx-2 px-2 py-2 text-caption text-ink-3">No chats found</div>
            )}
          </GlideGroup>
        </div>
        <div className="mx-2 mt-3 w-[208px] border-t border-line pt-2">
          <button
            type="button"
            aria-label="Open account menu"
            onClick={onFooterClick}
            className="flex h-8 w-full items-center gap-2 rounded-control px-2 text-left transition-colors duration-150 hover:bg-hover"
          >
            <Avatar name={user.name} src={user.src} kind={user.kind ?? FORMIC_CONFIG.avatar} size="sm" className="shrink-0" />
            <span className="sidebar-copy min-w-0 flex-1 truncate text-caption font-medium text-ink">{user.name}</span>
            <span className="sidebar-copy shrink-0 text-ink-3"><Icon name="sort" size={14} strokeWidth={2} /></span>
          </button>
        </div>
      </div>
    </aside>
  );
}
