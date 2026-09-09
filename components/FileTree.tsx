"use client";
import { useMemo, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Icon, type IconName } from "./primitives";
/* ─────────────────────────────────────────────────────────
 * FILE TREE — the files an agent touched, where they live
 * Folders open and close, files select, and a dot on a row says
 * what happened to it: added, modified, deleted. The rows are the
 * rails' rows (28px, flat bg-hover-2 selection, ink icon), indented
 * 16px a level, so a tree beside a Terminal and a DiffTable reads
 * as one tool. Keyboard: up and down move, right opens a folder,
 * left closes it or climbs, Enter and Space select.
 *
 * Status dots are the three semantic colours because a file's
 * state is a state, not a category (rule 16 allows exactly this);
 * everything else stays ink.
 * ───────────────────────────────────────────────────────── */
export type FileStatus = "added" | "modified" | "deleted";
export type FileNode = {
  name: string;
  /** a folder has children (empty is fine); a file has none */
  children?: FileNode[];
  status?: FileStatus;
  /** a short note at the end of the row: "+12 −3", "2 KB" */
  meta?: string;
  /** overrides the icon picked from the extension */
  icon?: IconName;
  /** open on mount; folders are closed by default except the ones on the path to `selected` */
  open?: boolean;
};

export const DEFAULT_FILE_TREE: FileNode[] = [
  {
    name: "src", open: true, children: [
      {
        name: "formic", children: [
          { name: "components", children: [{ name: "Panel.tsx" }, { name: "StatCard.tsx" }, { name: "charts.tsx" }] },
          { name: "styles", children: [{ name: "tokens.css" }, { name: "themes.css" }] },
        ],
      },
      {
        name: "pages", open: true, children: [
          { name: "Dashboard.tsx", status: "modified", meta: "+74 −41" },
          { name: "Invoices.tsx", status: "added", meta: "+118" },
          { name: "Welcome.tsx", status: "deleted", meta: "−56" },
        ],
      },
      { name: "App.tsx", status: "modified", meta: "+3 −1" },
      { name: "index.css" },
    ],
  },
  { name: "formic.config.json", status: "modified", meta: "+1 −1" },
  { name: "package.json" },
  { name: "README.md" },
];

const STATUS_DOT: Record<FileStatus, string> = { added: "bg-green", modified: "bg-orange", deleted: "bg-red" };
const STATUS_TEXT: Record<FileStatus, string> = { added: "added", modified: "modified", deleted: "deleted" };

const fileIcon = (name: string): IconName => {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext)) return "image";
  if (["mp4", "mov", "webm"].includes(ext)) return "video";
  if (["ts", "tsx", "js", "jsx", "py", "css", "html", "json", "sh"].includes(ext)) return "code";
  return "file";
};

type Row = { node: FileNode; path: string; depth: number; folder: boolean };

export default function FileTree({
  nodes = DEFAULT_FILE_TREE,
  selected,
  defaultSelected,
  onSelect,
  label = "Files",
  className = "",
}: {
  nodes?: FileNode[];
  /** the selected path, "src/pages/Dashboard.tsx"; controlled */
  selected?: string | null;
  defaultSelected?: string | null;
  onSelect?: (path: string, node: FileNode) => void;
  /** the tree's accessible name */
  label?: string;
  className?: string;
}) {
  const [ownSelected, setOwnSelected] = useState<string | null>(defaultSelected ?? null);
  const current = selected !== undefined ? selected : ownSelected;
  /* folders open on mount: their own `open`, plus the path down to the selection */
  const [openPaths, setOpenPaths] = useState<Set<string>>(() => {
    const set = new Set<string>();
    const walk = (list: FileNode[], base: string) => list.forEach((n) => {
      const path = base ? `${base}/${n.name}` : n.name;
      if (n.children && (n.open || (current && current.startsWith(path + "/")))) set.add(path);
      if (n.children) walk(n.children, path);
    });
    walk(nodes, "");
    return set;
  });
  const [focused, setFocused] = useState<string | null>(null);
  const rows = useMemo(() => {
    const out: Row[] = [];
    const walk = (list: FileNode[], base: string, depth: number) => list.forEach((n) => {
      const path = base ? `${base}/${n.name}` : n.name;
      const folder = Array.isArray(n.children);
      out.push({ node: n, path, depth, folder });
      if (folder && openPaths.has(path)) walk(n.children!, path, depth + 1);
    });
    walk(nodes, "", 0);
    return out;
  }, [nodes, openPaths]);
  const toggle = (path: string) => setOpenPaths((s) => { const next = new Set(s); if (next.has(path)) next.delete(path); else next.add(path); return next; });
  const choose = (row: Row) => {
    if (row.folder) { toggle(row.path); return; }
    if (selected === undefined) setOwnSelected(row.path);
    onSelect?.(row.path, row.node);
  };
  const focusRow = (path: string) => { setFocused(path); document.getElementById(`tree-${path}`)?.focus(); };
  const onKey = (event: ReactKeyboardEvent, row: Row, index: number) => {
    const { key } = event;
    if (key === "ArrowDown" && rows[index + 1]) { event.preventDefault(); focusRow(rows[index + 1].path); }
    else if (key === "ArrowUp" && rows[index - 1]) { event.preventDefault(); focusRow(rows[index - 1].path); }
    else if (key === "ArrowRight" && row.folder) { event.preventDefault(); if (!openPaths.has(row.path)) toggle(row.path); else if (rows[index + 1]) focusRow(rows[index + 1].path); }
    else if (key === "ArrowLeft") { event.preventDefault(); if (row.folder && openPaths.has(row.path)) toggle(row.path); else { const parent = rows.slice(0, index).reverse().find((r) => r.folder && row.path.startsWith(r.path + "/")); if (parent) focusRow(parent.path); } }
    else if (key === "Enter" || key === " ") { event.preventDefault(); choose(row); }
    else if (key === "Home" && rows[0]) { event.preventDefault(); focusRow(rows[0].path); }
    else if (key === "End") { event.preventDefault(); focusRow(rows[rows.length - 1].path); }
  };
  const tabStop = focused ?? current ?? rows[0]?.path;
  return (
    <ul role="tree" aria-label={label} className={`flex w-full min-w-0 flex-col ${className}`}>
      {rows.map((row, i) => {
        const open = row.folder && openPaths.has(row.path);
        const isSelected = row.path === current;
        return (
          <li key={row.path} role="treeitem" aria-expanded={row.folder ? open : undefined} aria-selected={row.folder ? undefined : isSelected} aria-level={row.depth + 1} className="list-none">
            <button
              id={`tree-${row.path}`}
              type="button"
              tabIndex={row.path === tabStop ? 0 : -1}
              onClick={() => choose(row)}
              onFocus={() => setFocused(row.path)}
              onKeyDown={(event) => onKey(event, row, i)}
              className={`corner-smooth flex h-7 w-full items-center gap-1.5 rounded-sm pr-2 text-left text-caption transition-colors duration-150 ${isSelected ? "bg-hover-2 font-medium text-ink" : "text-ink hover:bg-hover"} ${row.node.status === "deleted" ? "line-through decoration-ink-3" : ""}`}
              style={{ paddingLeft: `${8 + row.depth * 16}px` }}
            >
              <span className="flex size-4 shrink-0 items-center justify-center text-ink-3">
                {row.folder && <Icon name="chevron-right" size={12} strokeWidth={2} className={`transition-transform duration-150 ${open ? "rotate-90" : ""}`} />}
              </span>
              <Icon name={row.node.icon ?? (row.folder ? "folder" : fileIcon(row.node.name))} size={14} strokeWidth={1.8} className={`shrink-0 ${isSelected ? "text-ink" : "text-ink-2"}`} />
              <span className="min-w-0 flex-1 truncate">{row.node.name}</span>
              {row.node.meta && <span className="shrink-0 font-mono text-tiny tabular-nums text-ink-3">{row.node.meta}</span>}
              {row.node.status && <span className={`size-1.5 shrink-0 rounded-full ${STATUS_DOT[row.node.status]}`} role="img" aria-label={STATUS_TEXT[row.node.status]} />}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
