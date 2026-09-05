"use client";
import { useState, type ReactNode } from "react";
import { Avatar, GlideMenu, Icon, IconButton, Tooltip, type IconName } from "./primitives";
/* ─────────────────────────────────────────────────────────
 * APP SIDEBAR — the menu rail for dashboards and admin apps
 * SidebarNav is the chat rail (workspace switcher, searchable
 * history). This is the other kind: grouped navigation with
 * counts, a workspace mark at the top, an account row at the
 * bottom. Two variants, both on --sidebar (rule 14):
 *
 *   expanded  240px, icon + label + count, section titles
 *   rail       56px, icons only, labels as tooltips
 *
 * `collapsible` adds the control that flips between them; the
 * app owns the state through `variant` / `onVariantChange`, or
 * the sidebar keeps it itself when those are omitted. Fills its
 * parent's height: mount it in a `flex h-dvh` shell.
 * ───────────────────────────────────────────────────────── */
export type AppSidebarItem = { key: string; label: string; icon: IconName; count?: string };
export type AppSidebarSection = { title?: string; items: AppSidebarItem[] };
export type AppSidebarVariant = "expanded" | "rail";

const DEFAULT_WORKSPACE = { name: "Formic Studio", monogram: "F" };
const DEFAULT_SECTIONS: AppSidebarSection[] = [
  {
    items: [
      { key: "overview", label: "Overview", icon: "home" },
      { key: "reports", label: "Reports", icon: "chart", count: "12" },
      { key: "records", label: "Records", icon: "file" },
    ],
  },
  {
    title: "Workspace",
    items: [
      { key: "people", label: "People", icon: "user-add", count: "8" },
      { key: "integrations", label: "Integrations", icon: "layers" },
      { key: "notifications", label: "Notifications", icon: "bell", count: "3" },
      { key: "settings", label: "Settings", icon: "gear" },
    ],
  },
];
const DEFAULT_USER = { name: "Samson Usmael", detail: "Admin" };

export default function AppSidebar({
  workspace = DEFAULT_WORKSPACE,
  sections = DEFAULT_SECTIONS,
  active,
  onSelect,
  variant,
  defaultVariant = "expanded",
  onVariantChange,
  collapsible = true,
  user = DEFAULT_USER,
  footer,
  className = "",
}: {
  workspace?: { name: string; monogram: string };
  sections?: AppSidebarSection[];
  /** key of the current page; `null` for none (omit = first item) */
  active?: string | null;
  onSelect?: (key: string) => void;
  /** controlled variant; omit to let the sidebar manage it */
  variant?: AppSidebarVariant;
  defaultVariant?: AppSidebarVariant;
  onVariantChange?: (next: AppSidebarVariant) => void;
  /** show the expand / collapse control */
  collapsible?: boolean;
  /** account row at the bottom; pass `null` to omit */
  user?: { name: string; detail?: string; src?: string } | null;
  /** replaces the account row entirely */
  footer?: ReactNode;
  className?: string;
}) {
  const [own, setOwn] = useState<AppSidebarVariant>(defaultVariant);
  const mode = variant ?? own;
  const rail = mode === "rail";
  const flip = () => {
    const next: AppSidebarVariant = rail ? "expanded" : "rail";
    if (variant === undefined) setOwn(next);
    onVariantChange?.(next);
  };
  /* A controlled variant with no handler cannot flip, so the control is
     not drawn rather than drawn dead. */
  const canFlip = collapsible && (variant === undefined || Boolean(onVariantChange));
  const current = active === null ? undefined : (active ?? sections[0]?.items[0]?.key);

  /* One row, both variants: in the rail the label and count are not
     rendered at all (a tooltip carries the name), so the icon square is
     the whole hit area and stays exactly where it was — collapsing never
     shifts the icons. */
  const row = (item: AppSidebarItem) => {
    const on = item.key === current;
    const button = (
      <button
        key={item.key}
        type="button"
        data-menu-row
        aria-current={on ? "page" : undefined}
        aria-label={rail ? item.label : undefined}
        onClick={() => onSelect?.(item.key)}
        className={`relative z-10 flex h-9 w-full items-center rounded-control transition-colors duration-150
          ${rail ? "justify-center" : "gap-2.5 px-2.5"}
          ${on ? "bg-hover-2 text-ink" : "text-ink-2 hover:text-ink"}`}
      >
        <Icon name={item.icon} size={16} strokeWidth={2} className="shrink-0" />
        {!rail && <span className="min-w-0 flex-1 truncate text-left text-body font-medium">{item.label}</span>}
        {!rail && item.count && <span className="shrink-0 text-small font-medium text-ink-3 tabular-nums">{item.count}</span>}
      </button>
    );
    return rail ? <Tooltip key={item.key} label={item.label}>{button}</Tooltip> : button;
  };

  return (
    <aside
      aria-label="Primary"
      data-variant={mode}
      className={`flex h-full shrink-0 flex-col border-r border-line bg-sidebar transition-[width] duration-300 ${rail ? "w-14" : "w-60"} ${className}`}
      style={{ transitionTimingFunction: "var(--ease-out-quint)" }}
    >
      {/* workspace mark + collapse control share one row */}
      <div className={`flex h-14 shrink-0 items-center ${rail ? "justify-center" : "gap-2 px-3"}`}>
        <span className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-ink text-small font-semibold text-canvas">
          {workspace.monogram}
        </span>
        {!rail && <span className="min-w-0 flex-1 truncate text-body font-semibold text-ink">{workspace.name}</span>}
        {!rail && canFlip && (
          <IconButton label="Collapse sidebar" onClick={flip} className="text-ink-3 hover:bg-hover-2 hover:text-ink">
            <Icon name="sidebar" size={15} strokeWidth={2} />
          </IconButton>
        )}
      </div>

      <nav className={`min-h-0 flex-1 overflow-y-auto ${rail ? "px-2" : "px-2.5"}`}>
        {sections.map((section, si) => (
          <div key={section.title ?? si} className={si ? "mt-4" : ""}>
            {section.title && !rail && (
              <p className="mb-1 px-2.5 text-micro font-medium tracking-wide text-ink-3 uppercase">{section.title}</p>
            )}
            {section.title && rail && si > 0 && <div className="mx-2 mb-2 border-t border-line" />}
            <GlideMenu className="flex flex-col gap-0.5" highlightClassName="inset-x-0 rounded-control bg-hover">
              {section.items.map(row)}
            </GlideMenu>
          </div>
        ))}
      </nav>

      <div className={`mt-auto shrink-0 border-t border-line ${rail ? "flex flex-col items-center gap-1 py-2" : "p-2.5"}`}>
        {rail && canFlip && (
          <IconButton label="Expand sidebar" onClick={flip} className="size-9 text-ink-3 hover:bg-hover-2 hover:text-ink">
            <Icon name="sidebar" size={15} strokeWidth={2} className="rotate-180" />
          </IconButton>
        )}
        {footer !== undefined ? footer : user && (
          rail ? (
            <Tooltip label={user.name}>
              <button type="button" aria-label={user.name} className="flex size-9 items-center justify-center rounded-control hover:bg-hover-2">
                <Avatar name={user.name} src={user.src} size="sm" />
              </button>
            </Tooltip>
          ) : (
            <button type="button" className="flex h-10 w-full items-center gap-2.5 rounded-control px-2 text-left hover:bg-hover-2">
              <Avatar name={user.name} src={user.src} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-caption font-medium text-ink">{user.name}</span>
                {user.detail && <span className="block truncate text-small text-ink-3">{user.detail}</span>}
              </span>
              <Icon name="ellipsis" size={14} strokeWidth={2} className="shrink-0 text-ink-3" />
            </button>
          )
        )}
      </div>
    </aside>
  );
}
