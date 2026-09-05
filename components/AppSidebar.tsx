"use client";
import { useEffect, useId, useState, type ReactNode } from "react";
import { Avatar, Disclosure, GlideMenu, Icon, IconButton, Popover, Tooltip, type IconName } from "./primitives";
import { FormicMark } from "./brand";
import { FORMIC_CONFIG } from "./config";
/* ─────────────────────────────────────────────────────────
 * APP SIDEBAR — the menu rail for dashboards and admin apps
 * SidebarNav is the chat rail (workspace switcher, searchable
 * history). This is the other kind: grouped navigation with
 * counts and sub-menus, a workspace mark at the top, an account
 * row at the bottom. Two variants, both on --sidebar (rule 14):
 *
 *   expanded  240px, icon + label + count, section titles,
 *             sub-menus open in place under their parent
 *   rail       56px, icons only, labels as tooltips,
 *             sub-menus open as a flyout beside the icon
 *
 * `submenus="none"` makes it flat: every item is a page, a
 * parent's `children` are ignored, no chevrons, no flyouts —
 * for apps whose sections live inside the page (tabs) rather
 * than in the rail.
 *
 * The collapse / expand control lives in the header in both
 * variants, so it is always in the same place. The app owns the
 * variant through `variant` / `onVariantChange`, or the sidebar
 * keeps it itself when those are omitted. Fills its parent's
 * height: mount it in a `flex h-dvh` shell.
 * ───────────────────────────────────────────────────────── */
export type AppSidebarItem = {
  key: string;
  label: string;
  icon: IconName;
  count?: string;
  /** sub-menu; a parent with children is a group, not a page */
  children?: { key: string; label: string; count?: string }[];
};
export type AppSidebarSection = { title?: string; items: AppSidebarItem[] };
export type AppSidebarVariant = "expanded" | "rail";

export type AppSidebarWorkspace = { name: string; /** a letter in an ink square */ monogram?: string; /** replaces the monogram — the Formic mark by default */ logo?: ReactNode };
const DEFAULT_WORKSPACE: AppSidebarWorkspace = { name: "Formic Studio", logo: <FormicMark size={22} className="text-accent" /> };
const DEFAULT_SECTIONS: AppSidebarSection[] = [
  {
    items: [
      { key: "overview", label: "Overview", icon: "home" },
      {
        key: "reports", label: "Reports", icon: "chart", count: "12",
        children: [
          { key: "reports-sales", label: "Sales", count: "5" },
          { key: "reports-customers", label: "Customers", count: "4" },
          { key: "reports-products", label: "Products", count: "3" },
        ],
      },
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
export type AppSidebarUser = { name: string; detail?: string; src?: string; /** drawn face instead of initials when there is no photo */ doodle?: boolean };
const DEFAULT_USER: AppSidebarUser = { name: "Eyosiyas Ketema", detail: "Admin" };

export default function AppSidebar({
  workspace = DEFAULT_WORKSPACE,
  sections = DEFAULT_SECTIONS,
  active,
  onSelect,
  variant,
  defaultVariant = FORMIC_CONFIG.sidebar,
  onVariantChange,
  collapsible = true,
  submenus = "nested",
  user = DEFAULT_USER,
  footer,
  className = "",
}: {
  workspace?: AppSidebarWorkspace;
  sections?: AppSidebarSection[];
  /** key of the current page (a child key selects its parent too); `null` for none (omit = first item) */
  active?: string | null;
  onSelect?: (key: string) => void;
  /** controlled variant; omit to let the sidebar manage it */
  variant?: AppSidebarVariant;
  defaultVariant?: AppSidebarVariant;
  onVariantChange?: (next: AppSidebarVariant) => void;
  /** show the expand / collapse control */
  collapsible?: boolean;
  /** "nested" (default): groups open in place / as a flyout. "none": flat, children ignored, every item is a page */
  submenus?: "nested" | "none";
  /** account row at the bottom; pass `null` to omit */
  user?: AppSidebarUser | null;
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
  const parentOf = (key: string | undefined) =>
    sections.flatMap((s) => s.items).find((i) => i.children?.some((c) => c.key === key))?.key;
  const activeParent = parentOf(current);

  /* Expanded: which groups are open. The active child's group starts open. */
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => (activeParent ? { [activeParent]: true } : {}));
  useEffect(() => {
    if (activeParent) setOpenGroups((o) => (o[activeParent] ? o : { ...o, [activeParent]: true }));
  }, [activeParent]);
  const toggleGroup = (key: string) => setOpenGroups((o) => ({ ...o, [key]: !o[key] }));

  /* Rail: one flyout at a time, placed beside the icon that opened it. */
  const flyoutId = useId();
  const [flyout, setFlyout] = useState<{ key: string; x: number; top: number } | null>(null);
  useEffect(() => {
    if (!flyout) return;
    const onDown = (event: MouseEvent) => {
      const layer = document.getElementById(flyoutId);
      if (layer && !layer.contains(event.target as Node)) setFlyout(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [flyout, flyoutId]);
  useEffect(() => { if (!rail) setFlyout(null); }, [rail]);

  const pick = (key: string) => {
    setFlyout(null);
    onSelect?.(key);
  };

  /* Rail rows are fixed 36px squares, centred by their wrapper. They cannot
     be w-full: the Tooltip's anchor is an inline span, so w-full would fill
     nothing and the icon would sit at the left edge with a shrunken pill. */
  const rowClass = (on: boolean) =>
    `relative z-10 flex h-9 items-center rounded-control transition-colors duration-150 ${rail ? "w-9 justify-center" : "w-full gap-2.5 px-2.5"} ${on ? "bg-hover-2 text-ink" : "text-ink-2 hover:text-ink"}`;

  /* One row, both variants: in the rail the label and count are not
     rendered at all (a tooltip carries the name), so the icon square is
     the whole hit area and stays exactly where it was — collapsing never
     shifts the icons. */
  const row = (item: AppSidebarItem) => {
    const group = submenus === "nested" && Boolean(item.children?.length);
    const on = item.key === current || (group && item.key === activeParent);
    const expanded = Boolean(openGroups[item.key]);
    const onClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      if (!group) return pick(item.key);
      if (!rail) return toggleGroup(item.key);
      /* Anchor x to the aside's edge, not the 36px button, so the flyout
         clears the rail instead of overlapping it. */
      const r = event.currentTarget.getBoundingClientRect();
      const edge = event.currentTarget.closest("aside")?.getBoundingClientRect().right ?? r.right;
      setFlyout((f) => (f?.key === item.key ? null : { key: item.key, x: edge + 6, top: r.top }));
    };
    const button = (
      <button
        type="button"
        data-menu-row
        aria-current={!group && on ? "page" : undefined}
        aria-expanded={group ? (rail ? flyout?.key === item.key : expanded) : undefined}
        aria-haspopup={group && rail ? "menu" : undefined}
        aria-controls={group && rail && flyout?.key === item.key ? flyoutId : undefined}
        aria-label={rail ? item.label : undefined}
        onClick={onClick}
        className={rowClass(on)}
      >
        <Icon name={item.icon} size={16} strokeWidth={2} className="shrink-0" />
        {!rail && <span className="min-w-0 flex-1 truncate text-left text-body font-medium">{item.label}</span>}
        {!rail && item.count && <span className="shrink-0 text-small font-medium text-ink-3 tabular-nums">{item.count}</span>}
        {!rail && group && (
          <Icon name="chevron" size={14} strokeWidth={2} className={`shrink-0 text-ink-3 transition-transform duration-150 ${expanded ? "rotate-180" : ""}`} />
        )}
      </button>
    );
    const head = rail ? <Tooltip label={item.label}>{button}</Tooltip> : button;
    if (!group || rail) return <div key={item.key} className={rail ? "flex justify-center" : ""}>{head}</div>;
    return (
      <div key={item.key}>
        {head}
        <Disclosure open={expanded} duration={220}>
          {/* children sit on a hairline that starts under the parent's icon,
              so the indent reads as hierarchy rather than a second list */}
          <div className="mt-0.5 ml-4.5 flex flex-col gap-0.5 border-l border-line pl-3">
            {item.children!.map((child) => {
              const childOn = child.key === current;
              return (
                <button
                  key={child.key}
                  type="button"
                  data-menu-row
                  aria-current={childOn ? "page" : undefined}
                  onClick={() => pick(child.key)}
                  className={`relative z-10 flex h-8 w-full items-center gap-2 rounded-control px-2 transition-colors duration-150 ${childOn ? "bg-hover-2 text-ink" : "text-ink-2 hover:text-ink"}`}
                >
                  <span className="min-w-0 flex-1 truncate text-left text-caption font-medium">{child.label}</span>
                  {child.count && <span className="shrink-0 text-small text-ink-3 tabular-nums">{child.count}</span>}
                </button>
              );
            })}
          </div>
        </Disclosure>
      </div>
    );
  };

  const flyoutItem = flyout ? sections.flatMap((s) => s.items).find((i) => i.key === flyout.key) : undefined;

  return (
    <aside
      aria-label="Primary"
      data-variant={mode}
      className={`flex h-full shrink-0 flex-col border-r border-line bg-sidebar transition-[width] duration-300 ${rail ? "w-14" : "w-60"} ${className}`}
      style={{ transitionTimingFunction: "var(--ease-out-quint)" }}
    >
      {/* Header: workspace mark, and the collapse / expand control in the
          same place in both variants, so the eye knows where to go back. */}
      <div className={`flex shrink-0 ${rail ? "flex-col items-center gap-1 py-2.5" : "h-14 items-center gap-2 px-3"}`}>
        {workspace.logo ? (
          <span className="flex size-7 shrink-0 items-center justify-center">{workspace.logo}</span>
        ) : (
          <span className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-ink text-small font-semibold text-canvas">
            {workspace.monogram ?? workspace.name.slice(0, 1)}
          </span>
        )}
        {!rail && <span className="min-w-0 flex-1 truncate text-body font-semibold text-ink">{workspace.name}</span>}
        {canFlip && (
          rail ? (
            <Tooltip label="Expand sidebar">
              <IconButton label="Expand sidebar" onClick={flip} className="size-9 text-ink-3 hover:bg-hover-2 hover:text-ink">
                <Icon name="sidebar" size={15} strokeWidth={2} className="rotate-180" />
              </IconButton>
            </Tooltip>
          ) : (
            <IconButton label="Collapse sidebar" onClick={flip} className="text-ink-3 hover:bg-hover-2 hover:text-ink">
              <Icon name="sidebar" size={15} strokeWidth={2} />
            </IconButton>
          )
        )}
      </div>

      <nav className={`min-h-0 flex-1 overflow-y-auto ${rail ? "px-2" : "px-2.5"}`}>
        {sections.map((section, si) => (
          <div key={section.title ?? si} className={si ? "mt-4" : ""}>
            {section.title && !rail && (
              <p className="mb-1 px-2.5 text-micro font-medium tracking-wide text-ink-3 uppercase">{section.title}</p>
            )}
            {section.title && rail && si > 0 && <div className="mx-2 mb-2 border-t border-line" />}
            <GlideMenu className="flex flex-col gap-0.5" highlightClassName={rail ? "left-1/2 w-9 -translate-x-1/2 rounded-control bg-hover" : "inset-x-0 rounded-control bg-hover"}>
              {section.items.map(row)}
            </GlideMenu>
          </div>
        ))}
      </nav>

      {/* Rail flyout for a group: the sub-menu beside its icon */}
      {rail && flyout && flyoutItem?.children && (
        <Popover id={flyoutId} role="menu" x={flyout.x} top={flyout.top} className="w-52" onClose={() => setFlyout(null)}>
          <div className="p-1.5">
            <p className="px-2 pb-1 pt-1 text-micro font-medium tracking-wide text-ink-3 uppercase">{flyoutItem.label}</p>
            <GlideMenu className="flex flex-col gap-0.5" highlightClassName="inset-x-0 rounded-sm bg-hover">
              {flyoutItem.children.map((child) => {
                const childOn = child.key === current;
                return (
                  <button
                    key={child.key}
                    type="button"
                    role="menuitem"
                    data-menu-row
                    aria-current={childOn ? "page" : undefined}
                    onClick={() => pick(child.key)}
                    className={`relative z-10 flex h-8 w-full items-center gap-2 rounded-sm px-2 text-left transition-colors duration-150 ${childOn ? "bg-hover-2 text-ink" : "text-ink-2 hover:text-ink"}`}
                  >
                    <span className="min-w-0 flex-1 truncate text-caption font-medium">{child.label}</span>
                    {child.count && <span className="shrink-0 text-small text-ink-3 tabular-nums">{child.count}</span>}
                  </button>
                );
              })}
            </GlideMenu>
          </div>
        </Popover>
      )}

      <div className={`mt-auto shrink-0 border-t border-line ${rail ? "flex flex-col items-center py-2" : "p-2.5"}`}>
        {footer !== undefined ? footer : user && (
          rail ? (
            <Tooltip label={user.name}>
              <button type="button" aria-label={user.name} className="flex size-9 items-center justify-center rounded-control hover:bg-hover-2">
                <Avatar name={user.name} src={user.src} doodle={user.doodle} size="sm" />
              </button>
            </Tooltip>
          ) : (
            <button type="button" className="flex h-10 w-full items-center gap-2.5 rounded-control px-2 text-left hover:bg-hover-2">
              <Avatar name={user.name} src={user.src} doodle={user.doodle} size="sm" />
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
