"use client";
import { useState, type ReactNode } from "react";
import { Avatar, Badge, Icon, IconButton, IconTile, Progress, RadioCheck, Tooltip, type AvatarKind, type BadgeTone, type IconName } from "./primitives";
import Pagination from "./Pagination";
import EmptyState from "./EmptyState";
/* ─────────────────────────────────────────────────────────
 * DATA TABLE — the records list every admin screen has
 * A toolbar above (search, filters, the one accent action),
 * a header row, rows with a select box, and a footer that says
 * where you are and pages. Columns are declared, cells are
 * whatever you render: the PersonCell / ProgressCell / IconCell
 * helpers cover the common ones (a who with an avatar, a bar
 * with its fraction, an icon tile with a name and a detail),
 * and Badge / BrandLogo / Delta drop straight in.
 *
 * Selection is controlled or uncontrolled; the header box goes
 * mixed when some rows are picked. Wide tables scroll inside
 * their own region (rule 15); the first column stays readable
 * because everything else can scroll away from it.
 * ───────────────────────────────────────────────────────── */
export type DataColumn<T> = {
  key: string;
  header: ReactNode;
  /** render the cell; defaults to the row's field of the same key */
  render?: (row: T) => ReactNode;
  align?: "start" | "center" | "end";
  /** a CSS width for the column, e.g. "40%" or "160px" */
  width?: string;
  /** muted ink for a secondary column (dates, plans) */
  muted?: boolean;
};

export type DataTableProps<T extends { id: string }> = {
  columns: DataColumn<T>[];
  rows: T[];
  /** a select box per row and one in the header */
  selectable?: boolean;
  selected?: string[];
  defaultSelected?: string[];
  onSelectedChange?: (ids: string[]) => void;
  /** a per-row trailing actions cell */
  actions?: (row: T) => ReactNode;
  /** above the header: search, filters, the primary action */
  toolbar?: ReactNode;
  /** rows per page; with `total` the footer says "Showing 1 to 5 of 25" and pages */
  pageSize?: number;
  total?: number;
  page?: number;
  defaultPage?: number;
  onPageChange?: (page: number) => void;
  /** what an empty page shows; an EmptyState by default, pass one with the right kind and action */
  empty?: ReactNode;
  /** accessible name of the table */
  label?: string;
  onRowClick?: (row: T) => void;
  className?: string;
};

const ALIGN = { start: "text-left", center: "text-center", end: "text-right" } as const;

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  selectable = false,
  selected,
  defaultSelected = [],
  onSelectedChange,
  actions,
  toolbar,
  pageSize,
  total,
  page,
  defaultPage = 1,
  onPageChange,
  empty = <EmptyState size="sm" />,
  label = "Records",
  onRowClick,
  className = "",
}: DataTableProps<T>) {
  const [internalSel, setInternalSel] = useState<string[]>(defaultSelected);
  const [internalPage, setInternalPage] = useState(defaultPage);
  const picked = selected ?? internalSel;
  const setPicked = (ids: string[]) => { if (selected === undefined) setInternalSel(ids); onSelectedChange?.(ids); };
  const current = page ?? internalPage;
  const setPage = (p: number) => { if (page === undefined) setInternalPage(p); onPageChange?.(p); };

  const allOn = rows.length > 0 && rows.every((r) => picked.includes(r.id));
  const someOn = !allOn && rows.some((r) => picked.includes(r.id));
  const toggleAll = () => setPicked(allOn ? picked.filter((id) => !rows.some((r) => r.id === id)) : Array.from(new Set([...picked, ...rows.map((r) => r.id)])));
  const toggle = (id: string) => setPicked(picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id]);

  const count = total ?? rows.length;
  const size = pageSize ?? Math.max(rows.length, 1);
  const pageCount = Math.max(1, Math.ceil(count / size));
  const from = count === 0 ? 0 : (current - 1) * size + 1;
  const to = Math.min(count, from + rows.length - 1);

  const box = (on: boolean, mixed: boolean, onClick: () => void, name: string) => (
    <button
      type="button"
      role="checkbox"
      aria-checked={mixed ? "mixed" : on}
      aria-label={name}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="flex size-6 items-center justify-center rounded-sm"
    >
      <RadioCheck type="check" on={on} mixed={mixed} />
    </button>
  );

  return (
    <div className={`flex w-full flex-col rounded-card bg-surface shadow-card ${className}`}>
      {toolbar && <div className="flex flex-wrap items-center gap-2 border-b border-line p-4">{toolbar}</div>}
      <div role="region" aria-label={`${label}, scrollable`} tabIndex={0} className="overflow-x-auto rounded-b-card">
        <table className="w-full border-collapse text-caption">
          <thead>
            <tr className="border-b border-line">
              {selectable && <th scope="col" className="w-10 px-4 py-3">{box(allOn, someOn, toggleAll, allOn ? "Deselect all rows" : "Select all rows")}</th>}
              {columns.map((c) => (
                <th key={c.key} scope="col" style={{ width: c.width }} className={`px-4 py-3 text-small font-medium whitespace-nowrap text-ink-3 ${ALIGN[c.align ?? "start"]}`}>{c.header}</th>
              ))}
              {actions && <th scope="col" className="px-4 py-3 text-right text-small font-medium text-ink-3">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0)} className="p-0">{typeof empty === "string" ? <p className="px-4 py-10 text-center text-caption text-ink-2">{empty}</p> : empty}</td></tr>
            )}
            {rows.map((row) => {
              const on = picked.includes(row.id);
              return (
                <tr
                  key={row.id}
                  aria-selected={selectable ? on : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`border-b border-line last:border-b-0 transition-colors duration-150 ${on ? "bg-hover" : "hover:bg-hover"} ${onRowClick ? "cursor-pointer" : ""}`}
                >
                  {selectable && <td className="px-4 py-3">{box(on, false, () => toggle(row.id), on ? "Deselect row" : "Select row")}</td>}
                  {columns.map((c) => (
                    <td key={c.key} className={`px-4 py-3 align-middle whitespace-nowrap ${c.muted ? "text-ink-3" : "text-ink"} ${ALIGN[c.align ?? "start"]}`}>
                      {c.render ? c.render(row) : ((row as Record<string, unknown>)[c.key] as ReactNode)}
                    </td>
                  ))}
                  {actions && <td className="px-4 py-3 text-right"><span className="inline-flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>{actions(row)}</span></td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {pageSize && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
          <span className="text-caption text-ink-3 tabular-nums">Showing {from} to {to} of {count} entries</span>
          {pageCount > 1 && <div className="ml-auto flex"><Pagination pageCount={pageCount} page={current} onChange={setPage} /></div>}
        </div>
      )}
    </div>
  );
}

/* ── cells ─────────────────────────────────────────────── */
/* A who: avatar, name, a detail under it. */
export function PersonCell({ name, detail, src, kind }: { name: string; detail?: string; src?: string; kind?: AvatarKind }) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <Avatar name={name} src={src} kind={kind} size="lg" />
      <span className="min-w-0">
        <span className="block truncate text-caption font-medium text-ink">{name}</span>
        {detail && <span className="block truncate text-small text-ink-3">{detail}</span>}
      </span>
    </span>
  );
}

/* An icon (or any tile — a BrandLogo in a span) with a name and a detail. */
export function IconCell({ icon, tile, name, detail }: { icon?: IconName; tile?: ReactNode; name: string; detail?: string }) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      {tile ?? (icon && <IconTile icon={icon} />)}
      <span className="min-w-0">
        <span className="block truncate text-caption font-medium text-ink">{name}</span>
        {detail && <span className="block truncate text-small text-ink-3">{detail}</span>}
      </span>
    </span>
  );
}

/* A bar with its percent before and its fraction after. */
export function ProgressCell({ value, max = 100, label }: { value: number; max?: number; label: string }) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <span className="flex items-center gap-2.5">
      <span className="w-9 shrink-0 text-right text-small text-ink-3 tabular-nums">{pct}%</span>
      <Progress value={value} max={max} label={label} tone="ink" className="min-w-16 flex-1" />
      <span className="shrink-0 text-caption text-ink tabular-nums">{value}/{max}</span>
    </span>
  );
}

/* A number with the icon that says what it counts: 14 people, 23 lessons. */
export function CountCell({ icon, value, label }: { icon: IconName; value: number | string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-caption text-ink tabular-nums" aria-label={`${value} ${label}`}>
      <Icon name={icon} size={15} strokeWidth={2} className="text-ink-3" />
      {value}
    </span>
  );
}

/* A state as a pill. */
export function StatusCell({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return <Badge tone={tone}>{children}</Badge>;
}

/* The standard trailing trio: view, delete, more. Pass your own handlers. */
export function RowActions({ onView, onDelete, onMore }: { onView?: () => void; onDelete?: () => void; onMore?: () => void }) {
  const cls = "size-7 rounded-sm text-ink-3 transition-colors duration-150 hover:bg-hover hover:text-ink";
  return (
    <>
      {onView && <Tooltip label="View"><IconButton label="View" onClick={onView} className={cls}><Icon name="eye" size={15} /></IconButton></Tooltip>}
      {onDelete && <Tooltip label="Delete"><IconButton label="Delete" onClick={onDelete} className={`${cls} hover:text-red`}><Icon name="trash" size={15} /></IconButton></Tooltip>}
      {onMore && <Tooltip label="More"><IconButton label="More" onClick={onMore} className={cls}><Icon name="dots-vertical" size={15} /></IconButton></Tooltip>}
    </>
  );
}
