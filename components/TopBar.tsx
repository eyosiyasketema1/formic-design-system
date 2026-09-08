"use client";
import type { ReactNode } from "react";
import Input from "./Input";
import DropdownMenu, { type MenuEntry } from "./DropdownMenu";
import { Avatar, Icon, IconButton, Tooltip, type AvatarKind } from "./primitives";
import { FORMIC_CONFIG } from "./config";
/* ─────────────────────────────────────────────────────────
 * TOP BAR — the strip above a page when the rail carries no user
 * The page's title on the left (with an optional trigger before it),
 * and on the right the things a person reaches for from anywhere:
 * search, the theme, notifications, and their account. Pairs with
 * AppSidebar (which then keeps its user row off) for the "rail plus
 * bar" shell; the inset and edge rails do not need it, their user
 * sits at the foot of the rail.
 *
 * One line, 56px, hairline below, on --canvas so the page reads as
 * one surface with it. Fluid: the search field gives way first.
 * ───────────────────────────────────────────────────────── */
export type TopBarUser = { name: string; src?: string; kind?: AvatarKind };
const DEFAULT_USER_MENU: MenuEntry[] = [
  { key: "profile", label: "Profile", icon: "user" },
  { key: "settings", label: "Settings", icon: "gear" },
  { type: "divider" },
  { key: "signout", label: "Sign out", icon: "sign-out" },
];

export default function TopBar({
  title = "Overview",
  leading,
  search = true,
  searchPlaceholder = "Search…",
  onSearch,
  theme,
  onTheme,
  notifications = 0,
  onNotifications,
  user = { name: "Eyosiyas Ketema" },
  userMenu = DEFAULT_USER_MENU,
  onUserAction,
  actions,
  className = "",
}: {
  title?: ReactNode;
  /** a trigger before the title: a ProjectSidebarTrigger, a back button */
  leading?: ReactNode;
  /** the search field; false to drop it */
  search?: boolean;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  /** the current theme; with onTheme the bar shows the switch */
  theme?: "light" | "dark";
  onTheme?: () => void;
  /** unread count; 0 shows a quiet bell, none hides it */
  notifications?: number | null;
  onNotifications?: () => void;
  /** the account avatar and its menu; null hides it */
  user?: TopBarUser | null;
  userMenu?: MenuEntry[];
  onUserAction?: (key: string) => void;
  /** anything else on the right, before the account */
  actions?: ReactNode;
  className?: string;
}) {
  const ctl = "size-9 rounded-control bg-surface text-ink-2 shadow-btn transition-colors duration-150 hover:bg-hover hover:text-ink";
  return (
    <header className={`flex h-14 w-full shrink-0 items-center gap-3 border-b border-line bg-canvas px-4 sm:px-6 ${className}`}>
      {leading}
      <h1 className="min-w-0 flex-1 truncate text-heading font-semibold tracking-tight text-ink">{title}</h1>
      <div className="flex shrink-0 items-center gap-2">
        {search && (
          <Input
            size="sm"
            leadingIcon="search"
            placeholder={searchPlaceholder}
            aria-label="Search"
            onChange={(event) => onSearch?.(event.target.value)}
            width="hidden w-56 md:flex lg:w-72"
          />
        )}
        {actions}
        {onTheme && (
          <Tooltip label={theme === "dark" ? "Light mode" : "Dark mode"}>
            <IconButton label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} onClick={onTheme} className={ctl}>
              <Icon name={theme === "dark" ? "sun" : "moon"} size={16} strokeWidth={1.8} />
            </IconButton>
          </Tooltip>
        )}
        {notifications !== null && (
          <Tooltip label={notifications ? `${notifications} unread` : "Notifications"}>
            <span className="relative inline-flex">
              <IconButton label={notifications ? `Notifications, ${notifications} unread` : "Notifications"} onClick={onNotifications} className={ctl}>
                <Icon name="bell" size={16} strokeWidth={1.8} />
              </IconButton>
              {notifications > 0 && <span aria-hidden className="pointer-events-none absolute top-2 right-2 size-2 rounded-full bg-accent ring-2 ring-canvas" />}
            </span>
          </Tooltip>
        )}
        {user && (
          <DropdownMenu align="end" menuWidth={220} items={userMenu} onSelect={(key) => onUserAction?.(key)}>
            <button type="button" aria-label="Open account menu" className="corner-smooth flex size-9 items-center justify-center rounded-control bg-surface shadow-btn transition-colors duration-150 hover:bg-hover">
              <Avatar name={user.name} src={user.src} kind={user.kind ?? FORMIC_CONFIG.avatar} size="md" />
            </button>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
