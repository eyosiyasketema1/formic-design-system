"use client";
import type { ReactNode } from "react";
import AppSidebar, { DEFAULT_SECTIONS, type AppSidebarSection, type AppSidebarUser, type AppSidebarWorkspace } from "./AppSidebar";
import ProjectSidebar, { ProjectInset, ProjectSidebarTrigger, useProjectSidebar, type ProjectGroup } from "./ProjectSidebar";
import TopBar from "./TopBar";
import { FORMIC_CONFIG, type FormicConfig } from "./config";
import { useTheme } from "./hooks";
import { Icon, IconButton, Tooltip } from "./primitives";
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
 *   none    no rail: a slim header strip with the title, the actions and
 *           the theme switch, for a page that stands alone (sign-in,
 *           onboarding, a public form). `none` is a prop, never a config
 *           value: the config says what the app's rail looks like, the
 *           page's kind says whether it has one.
 *
 * Every page goes through this shell, so the theme switch is in the
 * same corner on every page: beside the profile on a rail, in the
 * TopBar, or at the right of the header strip when there is no rail.
 *
 * The page header (title, caption, actions) is rendered here too, so
 * it lands in the TopBar when there is one and above the content
 * otherwise; a page passes them as props and writes no <h1> of its
 * own. Content is wrapped in `.page-content`, so the layout choice
 * (compact / medium / full) applies. Change the config, run the
 * script, and every page moves to the new rail; nothing to rewrite.
 * ───────────────────────────────────────────────────────── */
export type AppShellRail = FormicConfig["sidebar"] | "none";

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
  /** which shell; defaults to the config, a prop still wins. `none` is a standalone page: header strip, no rail */
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
  const isBare = rail === "none";
  const header = (title || actions) && !isTopBar && !isBare && (
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

  if (isBare) {
    return (
      <div className={`flex ${height} min-w-0 flex-col ${className}`}>
        {/* the strip: what the TopBar is to a rail, for a page with none */}
        <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-line bg-surface px-4">
          <div className="flex min-w-0 items-baseline gap-2">
            {title && <h1 className="truncate text-lead font-semibold tracking-tight text-ink">{title}</h1>}
            {caption && <p className="hidden truncate text-caption text-ink-3 sm:block">{caption}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {actions}
            <Tooltip label={themeNow === "dark" ? "Light mode" : "Dark mode"}>
              <IconButton label={themeNow === "dark" ? "Switch to light mode" : "Switch to dark mode"} onClick={onThemeNow} className="text-ink-3 hover:bg-hover hover:text-ink">
                <Icon name={themeNow === "dark" ? "sun" : "moon"} size={15} strokeWidth={1.8} />
              </IconButton>
            </Tooltip>
          </div>
        </header>
        <main className="min-w-0 flex-1 overflow-y-auto">{content}</main>
      </div>
    );
  }
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
