"use client";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useModalLayer } from "./hooks";
import { Icon, Shortcut, type IconName } from "./primitives";
/* ─────────────────────────────────────────────────────────
 * COMMAND PALETTE — everything in the app, one keystroke away
 * ⌘K opens it (useCommandPalette wires the key); type to filter
 * pages, records and actions; arrows move, Enter picks, Escape
 * closes. Groups keep their order; the first group can be
 * "Recent", which is what an empty query shows.
 *
 * It sits high on the scrim rather than centred, the way a
 * launcher does, so the list can grow downward without the box
 * jumping. No title bar: the field is the title. Rows are 40px,
 * an icon, the label, a hint in ink-3, a keycap when the
 * command has one. The active row is a flat bg-hover-2 fill,
 * the same selection the rails use (rule 14). Filtering is
 * plain: every word of the query must appear in the label or
 * the hint; a palette that guesses is worse than one that
 * shows nothing and says so.
 * ───────────────────────────────────────────────────────── */
export type Command = {
  key: string;
  label: string;
  /** where it lives or what it does: "Clients", "Open in a new tab" */
  hint?: string;
  icon?: IconName;
  /** its keyboard shortcut, shown as keycaps */
  keys?: string[];
  /** anything the app needs back in onSelect: a route, a record */
  data?: unknown;
};
export type CommandGroup = { key: string; label: string; items: Command[] };

export const DEFAULT_COMMAND_GROUPS: CommandGroup[] = [
  {
    key: "recent", label: "Recent",
    items: [
      { key: "northwind", label: "Northwind Bank", hint: "Client", icon: "building" },
      { key: "inv-0231", label: "INV-0231 · Northwind Bank", hint: "Invoice · ETB 362,000", icon: "receipt" },
    ],
  },
  {
    key: "pages", label: "Pages",
    items: [
      { key: "overview", label: "Overview", hint: "Dashboard", icon: "home", keys: ["G", "O"] },
      { key: "proposals", label: "Proposals", hint: "12 open", icon: "file", keys: ["G", "P"] },
      { key: "invoices", label: "Invoices", hint: "This quarter", icon: "receipt", keys: ["G", "I"] },
      { key: "people", label: "People", hint: "8 in the studio", icon: "users" },
      { key: "settings", label: "Settings", icon: "gear", keys: ["⌘", ","] },
    ],
  },
  {
    key: "clients", label: "Clients",
    items: [
      { key: "selam", label: "Selam Coffee", hint: "Menu board app", icon: "building" },
      { key: "creamery", label: "Creamery", hint: "Brand and site", icon: "building" },
      { key: "addis-yoga", label: "Addis Yoga", hint: "Booking site", icon: "building" },
    ],
  },
  {
    key: "actions", label: "Actions",
    items: [
      { key: "new-proposal", label: "New proposal", icon: "plus", keys: ["N"] },
      { key: "new-invoice", label: "New invoice", icon: "receipt", keys: ["I"] },
      { key: "theme", label: "Switch theme", hint: "Light or dark", icon: "moon", keys: ["⌘", "J"] },
      { key: "signout", label: "Sign out", icon: "sign-out" },
    ],
  },
];

const matches = (item: Command, query: string) => {
  const hay = `${item.label} ${item.hint ?? ""}`.toLowerCase();
  return query.toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
};

export default function CommandPalette({
  open,
  onClose,
  groups = DEFAULT_COMMAND_GROUPS,
  placeholder = "Search pages, clients and actions…",
  emptyLabel = "Nothing matches",
  onSelect,
  search,
  footer = true,
}: {
  open: boolean;
  onClose: () => void;
  groups?: CommandGroup[];
  placeholder?: string;
  /** shown when the query matches nothing, followed by the query */
  emptyLabel?: ReactNode;
  onSelect?: (item: Command, group: CommandGroup) => void;
  /** replaces the built-in word match: return the groups to show for a query (an app with its own index or a server search) */
  search?: (query: string) => CommandGroup[];
  /** the keycap legend at the foot */
  footer?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const labelId = useId();
  useModalLayer(dialogRef, open, { onClose });
  useEffect(() => {
    if (!open) return;
    setQuery(""); setCursor(0);
    const t = window.setTimeout(() => inputRef.current?.focus(), 40);
    return () => window.clearTimeout(t);
  }, [open]);
  const rows = useMemo(() => {
    const q = query.trim();
    if (search) return search(q).flatMap((g) => g.items.map((i) => ({ item: i, group: g })));
    const visible = q ? groups.filter((g) => g.key !== "recent") : groups;
    return visible.flatMap((g) => g.items.filter((i) => !q || matches(i, q)).map((i) => ({ item: i, group: g })));
  }, [groups, query, search]);
  useEffect(() => { setCursor(0); }, [query]);
  useEffect(() => {
    document.getElementById(`${listId}-${cursor}`)?.scrollIntoView({ block: "nearest" });
  }, [cursor, listId]);
  const pick = (index: number) => {
    const row = rows[index];
    if (!row) return;
    onClose();
    onSelect?.(row.item, row.group);
  };
  const onKey = (event: ReactKeyboardEvent) => {
    if (event.key === "ArrowDown") { event.preventDefault(); setCursor((c) => Math.min(rows.length - 1, c + 1)); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setCursor((c) => Math.max(0, c - 1)); }
    else if (event.key === "Enter") { event.preventDefault(); pick(cursor); }
  };
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh] pb-4"
      style={{ background: "var(--scrim)", animation: "fade-in 150ms ease-out both" }}
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
        tabIndex={-1}
        className="flex max-h-full w-full max-w-130 flex-col overflow-hidden rounded-card bg-surface shadow-overlay outline-none"
        style={{ animation: "pop-in 220ms var(--ease-out-quint) both" }}
      >
        <label htmlFor={`${listId}-input`} id={labelId} className="flex h-12 shrink-0 items-center gap-3 border-b border-line px-4">
          <Icon name="search" size={16} strokeWidth={2} className="shrink-0 text-ink-3" />
          <input
            ref={inputRef}
            id={`${listId}-input`}
            type="text"
            role="combobox"
            aria-expanded
            aria-controls={listId}
            aria-activedescendant={rows.length ? `${listId}-${cursor}` : undefined}
            aria-autocomplete="list"
            autoComplete="off"
            spellCheck={false}
            value={query}
            placeholder={placeholder}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKey}
            className="min-w-0 flex-1 bg-transparent text-body text-ink outline-none placeholder:text-ink-3"
          />
          <Shortcut keys={["Esc"]} />
        </label>
        <ul id={listId} role="listbox" aria-labelledby={labelId} className="min-h-0 flex-1 overflow-y-auto p-2">
          {rows.length === 0 && (
            <li className="px-3 py-8 text-center text-caption text-ink-2">{emptyLabel}{query.trim() ? <> &ldquo;{query.trim()}&rdquo;</> : null}</li>
          )}
          {rows.map((row, i) => {
            const first = i === 0 || rows[i - 1].group.key !== row.group.key;
            return (
              <li key={`${row.group.key}-${row.item.key}`} role="presentation">
                {first && <p className={`px-3 pb-1 text-micro font-medium tracking-wide text-ink-3 uppercase ${i === 0 ? "pt-1" : "pt-3"}`}>{row.group.label}</p>}
                <div
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === cursor}
                  onMouseEnter={() => setCursor(i)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => pick(i)}
                  className={`corner-smooth flex h-10 cursor-pointer items-center gap-3 rounded-control px-3 transition-colors duration-150 ${i === cursor ? "bg-hover-2 text-ink" : "text-ink-2"}`}
                >
                  <Icon name={row.item.icon ?? "chevron-right"} size={15} strokeWidth={2} className={`shrink-0 ${i === cursor ? "text-ink" : "text-ink-3"}`} />
                  <span className="min-w-0 flex-1 truncate text-caption font-medium text-ink">{row.item.label}</span>
                  {row.item.hint && <span className="min-w-0 max-w-[40%] truncate text-small text-ink-3">{row.item.hint}</span>}
                  {row.item.keys ? <Shortcut keys={row.item.keys} /> : i === cursor ? <Shortcut keys={["↵"]} /> : null}
                </div>
              </li>
            );
          })}
        </ul>
        {footer && (
          <div className="flex shrink-0 items-center gap-5 border-t border-line px-4 py-2.5 text-small text-ink-3">
            <span className="flex items-center gap-2"><Shortcut keys={["↑", "↓"]} /> move</span>
            <span className="flex items-center gap-2"><Shortcut keys={["↵"]} /> open</span>
            <span className="flex items-center gap-2"><Shortcut keys={["Esc"]} /> close</span>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

/** ⌘K / Ctrl+K opens, Escape closes; returns the open state and its setters */
export function useCommandPalette(key = "k") {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === key) {
        event.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [key]);
  return { open, setOpen, show: () => setOpen(true), close: () => setOpen(false) };
}
