"use client";
import { useMemo, useState, type ReactNode } from "react";
import Button from "./Button";
import EmptyState from "./EmptyState";
import Tabs from "./Tabs";
import { Avatar, Badge, Icon, IconButton, IconTile, Tooltip, type IconName } from "./primitives";
/* ─────────────────────────────────────────────────────────
 * NOTIFICATION LIST — what happened while the reader was away
 * The panel behind the bell: a header with the unread count and a
 * way to clear it, All and Unread, then rows grouped by when. A row
 * is who or what (an avatar for a person, an ink tile for the
 * system or an agent), one line saying what happened, a second line
 * of detail when there is one, the time on the right, and, when the
 * event is waiting on the reader, its actions inline (Approve,
 * Decline) so the answer does not need another page.
 *
 * Unread is a small accent dot on the avatar and a medium title, nothing
 * more: twenty new things should not be twenty tinted rows. Opening
 * a row marks it read; each row has a quiet Dismiss on hover. The
 * frame is the system's surface card so it sits in a Popover or a
 * Drawer as it is; `frame="plain"` drops the card for a page.
 * ───────────────────────────────────────────────────────── */
export type NotificationKind = "mention" | "approval" | "invoice" | "agent" | "system" | "comment";
export type NotificationAction = { label: string; onClick: () => void; /** the one accent action in the row */ primary?: boolean };
export type Notification = {
  id: string;
  /** what happened, in one line; a name in it may be bold */
  title: ReactNode;
  /** the detail: the comment, the amount, the file */
  body?: ReactNode;
  /** as the reader reads it: "2m", "Yesterday, 16:40" */
  time: string;
  /** which day group the row belongs to: Today, Yesterday, Earlier */
  section?: string;
  read?: boolean;
  kind?: NotificationKind;
  /** overrides the kind's icon */
  icon?: IconName;
  /** the person it came from; shown as their avatar instead of the tile */
  actor?: { name: string; src?: string };
  /** inline answers, for an event waiting on the reader */
  actions?: NotificationAction[];
};

const KIND_ICON: Record<NotificationKind, IconName> = { mention: "message-question", approval: "circle-check", invoice: "receipt", agent: "sparkles", system: "info", comment: "lines" };

export const DEFAULT_NOTIFICATIONS: Notification[] = [
  { id: "n1", kind: "approval", section: "Today", time: "12m", actor: { name: "Sara Haile" }, title: <><strong className="font-semibold">Sara Haile</strong> asked for changes on the Creamery menu board</>, body: "“Can the pistachio price sit on its own line? It reads as part of the name.”", actions: [{ label: "Reply", onClick: () => {} }, { label: "Open board", onClick: () => {}, primary: true }] },
  { id: "n2", kind: "invoice", section: "Today", time: "1h", title: <>Invoice <strong className="font-semibold">INV-0231</strong> was paid by Northwind Bank</>, body: "ETB 362,000 · phase one of two" },
  { id: "n3", kind: "agent", section: "Today", time: "3h", title: "The weekly summary went out to four clients", body: "Selam Coffee, Creamery, Addis Yoga, Habesha Textiles" },
  { id: "n4", kind: "mention", section: "Yesterday", time: "Yesterday, 16:40", read: true, actor: { name: "Hanna Bekele" }, title: <><strong className="font-semibold">Hanna Bekele</strong> mentioned you in Northwind brand refresh</>, body: "“@Eyosiyas the second mark reads better at 16px, agree?”" },
  { id: "n5", kind: "approval", section: "Yesterday", time: "Yesterday, 09:12", read: true, actor: { name: "Abebe Worku" }, title: <><strong className="font-semibold">Abebe Worku</strong> approved the Northwind proposal</>, body: "ETB 724,000 over two phases" },
  { id: "n6", kind: "system", section: "Earlier", time: "Mon", read: true, title: "Storage is 80% full", body: "Archive finished projects to make room, or add space in Settings." },
];

export default function NotificationList({
  notifications,
  defaultNotifications = DEFAULT_NOTIFICATIONS,
  onRead,
  onOpen,
  onDismiss,
  title = "Notifications",
  filterable = true,
  frame = "panel",
  maxHeight = "max-h-120",
  emptyTitle = "You're caught up",
  emptyDescription = "New mentions, approvals and invoices land here.",
  className = "",
}: {
  /** controlled rows; read state and dismissals come back through onRead / onDismiss */
  notifications?: Notification[];
  defaultNotifications?: Notification[];
  /** called with the ids that became read: one on open, all on Mark all read */
  onRead?: (ids: string[]) => void;
  onOpen?: (notification: Notification) => void;
  onDismiss?: (id: string) => void;
  title?: string;
  /** the All / Unread switch */
  filterable?: boolean;
  /** panel: the surface card, for a popover or drawer; plain: rows only, for a page */
  frame?: "panel" | "plain";
  /** a Tailwind max-height class; the rows scroll inside it */
  maxHeight?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}) {
  const [own, setOwn] = useState(defaultNotifications);
  const rows = notifications ?? own;
  const [tab, setTab] = useState<"all" | "unread">("all");
  const unread = rows.filter((n) => !n.read);
  const shown = tab === "unread" ? unread : rows;
  const markRead = (ids: string[]) => {
    if (ids.length === 0) return;
    if (notifications === undefined) setOwn((list) => list.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n)));
    onRead?.(ids);
  };
  const dismiss = (id: string) => {
    if (notifications === undefined) setOwn((list) => list.filter((n) => n.id !== id));
    onDismiss?.(id);
  };
  const open = (n: Notification) => { if (!n.read) markRead([n.id]); onOpen?.(n); };
  const groups = useMemo(() => {
    const out: { section: string | undefined; items: Notification[] }[] = [];
    shown.forEach((n) => {
      const last = out[out.length - 1];
      if (last && last.section === n.section) last.items.push(n); else out.push({ section: n.section, items: [n] });
    });
    return out;
  }, [shown]);

  return (
    <section aria-label={title} className={`flex w-full min-w-0 flex-col ${frame === "panel" ? "overflow-hidden rounded-card bg-surface shadow-card" : ""} ${className}`}>
      <header className={`flex items-center justify-between gap-3 ${frame === "panel" ? "px-4 pt-3 pb-2" : "pb-2"}`}>
        <span className="flex min-w-0 items-center gap-2">
          <h2 className="truncate text-caption font-semibold text-ink">{title}</h2>
          {unread.length > 0 && <Badge tone="neutral">{unread.length} new</Badge>}
        </span>
        {unread.length > 0 && <Button variant="ghost" size="xs" onClick={() => markRead(unread.map((n) => n.id))}>Mark all read</Button>}
      </header>
      {filterable && (
        <div className={frame === "panel" ? "px-3 pb-1" : "pb-1"}>
          <Tabs variant="subtle" value={tab} onChange={(key) => setTab(key as "all" | "unread")} tabs={[{ key: "all", label: "All" }, { key: "unread", label: unread.length ? `Unread · ${unread.length}` : "Unread" }]} />
        </div>
      )}
      <div className={`min-h-0 overflow-y-auto ${maxHeight} ${frame === "panel" ? "border-t border-line" : ""}`}>
        {shown.length === 0 ? (
          <EmptyState size="sm" icon="inbox" title={emptyTitle} description={tab === "unread" && rows.length ? "Everything here has been read." : emptyDescription} />
        ) : (
          groups.map((group, gi) => (
            <div key={group.section ?? gi}>
              {group.section && <p className={`sticky top-0 z-10 pt-3 pb-1 font-mono text-micro tracking-wide text-ink-3 uppercase ${frame === "panel" ? "bg-surface px-4" : "bg-canvas px-1"}`}>{group.section}</p>}
              <ul className="flex flex-col">
                {group.items.map((n) => (
                  <li key={n.id} className="group/row relative">
                    <div
                      role={onOpen ? "button" : undefined}
                      tabIndex={onOpen ? 0 : undefined}
                      onClick={onOpen ? () => open(n) : undefined}
                      onKeyDown={onOpen ? (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(n); } } : undefined}
                      className={`flex w-full items-start gap-3 py-3 text-left transition-colors duration-150 ${onOpen ? "cursor-pointer hover:bg-hover" : ""} ${frame === "panel" ? "px-4" : "rounded-md px-3"}`}
                    >
                      <span className="relative shrink-0">
                        {n.actor ? <Avatar name={n.actor.name} src={n.actor.src} size="lg" /> : <IconTile size="lg" icon={n.icon ?? KIND_ICON[n.kind ?? "system"]} />}
                        {!n.read && <span aria-hidden className="absolute -top-0.5 -left-0.5 size-2.5 rounded-full bg-accent ring-2 ring-surface" />}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className={`text-caption leading-snug text-ink ${n.read ? "" : "font-medium"}`}>
                          {!n.read && <span className="sr-only">Unread: </span>}
                          {n.title}
                        </span>
                        {n.body && <span className="line-clamp-2 text-small leading-snug text-ink-2">{n.body}</span>}
                        {n.actions && n.actions.length > 0 && (
                          <span className="mt-1.5 flex flex-wrap gap-1.5" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
                            {n.actions.map((a) => (
                              <Button key={a.label} size="xs" variant={a.primary ? "accent-soft" : "secondary"} onClick={() => { markRead([n.id]); a.onClick(); }}>{a.label}</Button>
                            ))}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 pt-0.5 text-small tabular-nums text-ink-3 group-hover/row:opacity-0 group-focus-within/row:opacity-0">{n.time}</span>
                    </div>
                    <span className="absolute top-2.5 right-3 flex items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover/row:opacity-100 group-focus-within/row:opacity-100">
                      {!n.read && (
                        <Tooltip label="Mark read">
                          <IconButton label="Mark read" onClick={() => markRead([n.id])} className="text-ink-3 hover:bg-hover-2 hover:text-ink"><Icon name="check" size={13} strokeWidth={2.2} /></IconButton>
                        </Tooltip>
                      )}
                      <Tooltip label="Dismiss">
                        <IconButton label="Dismiss" onClick={() => dismiss(n.id)} className="text-ink-3 hover:bg-hover-2 hover:text-ink"><Icon name="close" size={13} strokeWidth={2.2} /></IconButton>
                      </Tooltip>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
