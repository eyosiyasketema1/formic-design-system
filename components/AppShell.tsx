"use client";
import type { ReactNode } from "react";
import AppSidebar, { DEFAULT_SECTIONS, type AppSidebarSection, type AppSidebarUser, type AppSidebarWorkspace } from "./AppSidebar";
import ProjectSidebar, { ProjectInset, ProjectSidebarTrigger, useProjectSidebar, type ProjectGroup } from "./ProjectSidebar";
import TopBar from "./TopBar";
import { FORMIC_CONFIG, type FormicConfig } from "./config";
import { useTheme } from "./hooks";
/* ─────────────────────────────────────────────────────────
 * APP SHELL — the rail the config chose, with the page beside it
 * One component instead of four layouts to remember. The rail is a
 * placement, never a different app: every shell shows the same
 * navigation (`sections`, or AppSidebar's default), so switching the
 * config from full to inset moves the nav, it does not replace it. It reads
 * `sidebar` and `sidebarState` from formic.config.json (through
 * config.ts) and mounts the matching shell:
 *
 *   full    AppSidebar, expanded or collapsed to an icon rail
 *   inset   ProjectSidebar with the page as a surface card beside it
 *   edge    ProjectSidebar with a hairline edge, the page flat beside it
 *   topbar  AppSidebar without its user row, plus a TopBar above the page
 *
 * The page header (title, caption, actions) is rendered here too, so
 * it lands in the TopBar when there is one and above the content
 * otherwise; a page passes them as props and writes no <h1> of its
 * own. Content is wrapped in `.page-content`, so the layout choice
 * (compact / medium / full) applies. Change the config, run the
 * script, and every page moves to the new rail; nothing to rewrite.
 * ───────────────────────────────────────────────────────── */
export type AppShellRail = FormicConfig["sidebar"];

const toGroups = (sections: AppSidebarSection[]): ProjectGroup[] =>
  sections.map((section, index) => ({
    key: section.title ? section.title.toLowerCase().replace(/\s+/g, "-") : `group-${index}`,
    label: section.title ?? "Pages",
    items: section.items.map((item) => ({
      key: item.key,
      label: item.label,
      icon: item.icon,
      children: item.children?.map((child) => ({ key: child.key, label: child.label })),
    })),
  }));

export default function AppShell({
  rail = FORMIC_CONFIG.sidebar,
  sections,
  active,
  onSelect,
  workspace,
  user,
  title,
  caption,
  actions,
  theme,
  onTheme,
  notifications,
  onSearch,
  padding = true,
  fill = true,
  className = "",
  children,
}: {
  /** which shell; defaults to the config, a prop still wins */
  rail?: AppShellRail;
  /** the navigation, in AppSidebar's shape; the project rails read the same list */
  sections?: AppSidebarSection[];
  /** key of the current page */
  active?: string | null;
  onSelect?: (key: string) => void;
  workspace?: AppSidebarWorkspace;
  /** the account; null hides it everywhere */
  user?: AppSidebarUser | null;
  /** the page header: in the TopBar when there is one, above the content otherwise */
  title?: ReactNode;
  caption?: ReactNode;
  actions?: ReactNode;
  /** the theme switch beside the profile (or in the TopBar). Omit both and the shell manages the theme itself through useTheme; give both to drive it from the app */
  theme?: "light" | "dark";
  onTheme?: () => void;
  /** unread count for the TopBar's bell */
  notifications?: number;
  onSearch?: (query: string) => void;
  /** page padding around the content; false when the page draws its own */
  padding?: boolean;
  /** the viewport height (h-dvh); false fills the parent instead, for a shell inside a frame */
  fill?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const project = useProjectSidebar(FORMIC_CONFIG.sidebarState === "expanded");
  const own = useTheme();
  const themeNow = theme ?? own.theme;
  const onThemeNow = onTheme ?? own.toggle;
  const isProject = rail === "inset" || rail === "edge";
  const isTopBar = rail === "topbar";
  const header = (title || actions) && !isTopBar && (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <div className="min-w-0">
          {title && <h1 className="truncate text-display font-semibold tracking-tight text-ink">{title}</h1>}
          {caption && <p className="mt-0.5 text-caption text-ink-2">{caption}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
  const content = (
    <div className={`page-content flex min-w-0 flex-col gap-6 ${padding ? "p-6 sm:p-8" : ""}`}>
      {header}
      {isTopBar && caption && <p className="-mt-3 text-caption text-ink-2">{caption}</p>}
      {children}
    </div>
  );
  const height = fill ? "h-dvh" : "h-full";
  /* the project rails' trigger: a slim strip in the page's top-left corner,
     where every app keeps it, never beside a title the layout may centre */
  const trigger = isProject && (
    <div className="-mb-3 flex h-9 shrink-0 items-center px-2 pt-1">
      <ProjectSidebarTrigger open={project.open} toggle={project.toggle} />
    </div>
  );

  if (isProject) {
    return (
      <div className={`flex ${height} min-w-0 ${rail === "inset" ? "bg-sidebar" : ""} ${className}`}>
        <ProjectSidebar
          layout={rail}
          open={project.open}
          groups={toGroups(sections ?? DEFAULT_SECTIONS)}
          active={active}
          onSelect={onSelect}
          user={user}
          theme={themeNow}
          onTheme={onThemeNow}
          onSearch={onSearch}
        />
        {/* the rail's trigger sits in the page's top-left corner, where every
            app keeps it, not beside a title that may be centred by the layout */}
        {rail === "inset"
          ? <ProjectInset>{trigger}{content}</ProjectInset>
          : <main className="min-w-0 flex-1 overflow-y-auto">{trigger}{content}</main>}
      </div>
    );
  }
  return (
    <div className={`flex ${height} min-w-0 ${className}`}>
      <AppSidebar
        sections={sections}
        active={active}
        onSelect={onSelect}
        workspace={workspace}
        user={isTopBar ? null : user}
        header={isTopBar ? "bar" : "plain"}
        theme={isTopBar ? undefined : themeNow}
        onTheme={isTopBar ? undefined : onThemeNow}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        {isTopBar && (
          <TopBar
            title={title}
            theme={themeNow}
            onTheme={onThemeNow}
            notifications={notifications}
            user={user === null ? null : user ? { name: user.name, src: user.src, kind: user.kind } : undefined}
            onSearch={onSearch}
            actions={actions}
          />
        )}
        <main className="min-w-0 flex-1 overflow-y-auto">{content}</main>
      </div>
    </div>
  );
}
