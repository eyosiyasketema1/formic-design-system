"use client";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useAnchoredLayer } from "./hooks";
import { Icon, IconButton, OptionRow, Popover, Spinner, type IconName } from "./primitives";
/* ─────────────────────────────────────────────────────────
 * COMBOBOX — a field that types to find
 * Select is for a handful of choices the reader can see at once;
 * this is for a list too long to scan: clients, people, cities,
 * models. The reader types, the list narrows, an arrow and Enter
 * pick. It is Input's field with Select's listbox, so it lines up
 * with both in a form.
 *
 * Typing narrows to options whose label (or hint) contains the
 * query; `filter` replaces that. Enter on a match picks it; with
 * `allowCustom` Enter on no match keeps what was typed as a value
 * of its own (a new tag, an email not in the book). Escape closes
 * and puts the chosen label back; blur does the same, so the field
 * never shows a query that is not a value. The x clears.
 * Works inside Field, which injects id / aria-describedby / invalid.
 * ───────────────────────────────────────────────────────── */
export type ComboboxOption = {
  value: string;
  label: string;
  /** a quiet note after the label: a city, a role, a count */
  hint?: string;
  swatch?: string;
  icon?: IconName;
  disabled?: boolean;
};
export type ComboboxSize = "sm" | "md";
const HEIGHTS: Record<ComboboxSize, string> = { sm: "h-8", md: "h-9" };

export const DEFAULT_COMBOBOX_OPTIONS: ComboboxOption[] = [
  { value: "northwind", label: "Northwind Bank", hint: "Addis Ababa" },
  { value: "creamery", label: "Creamery", hint: "Addis Ababa" },
  { value: "selam", label: "Selam Coffee", hint: "Hawassa" },
  { value: "addis-yoga", label: "Addis Yoga", hint: "Addis Ababa" },
  { value: "habesha", label: "Habesha Textiles", hint: "Bahir Dar" },
  { value: "lucy", label: "Lucy Tours", hint: "Lalibela" },
  { value: "blue-nile", label: "Blue Nile Press", hint: "Bahir Dar" },
  { value: "entoto", label: "Entoto Trail Runs", hint: "Addis Ababa" },
];

const contains = (text: string | undefined, q: string) => !!text && text.toLowerCase().includes(q);

export default function Combobox({
  options = DEFAULT_COMBOBOX_OPTIONS,
  value,
  defaultValue,
  onChange,
  onQueryChange,
  filter,
  allowCustom = false,
  placeholder = "Type to find…",
  emptyMessage = "Nothing matches",
  leadingIcon,
  loading = false,
  size = "md",
  width = "w-full",
  invalid = false,
  disabled = false,
  className = "",
  id,
  "aria-labelledby": labelledBy,
  "aria-describedby": describedBy,
}: {
  options?: ComboboxOption[];
  /** controlled value; omit and use defaultValue for uncontrolled */
  value?: string | null;
  defaultValue?: string | null;
  onChange?: (value: string | null, option?: ComboboxOption) => void;
  /** the query as it is typed, for fetching options from a server */
  onQueryChange?: (query: string) => void;
  /** replaces the built-in contains filter; return the options to show */
  filter?: (query: string, options: ComboboxOption[]) => ComboboxOption[];
  /** Enter on no match keeps the typed text as the value */
  allowCustom?: boolean;
  placeholder?: string;
  emptyMessage?: string;
  leadingIcon?: IconName;
  /** options are being fetched: a spinner in the field, and the list says so */
  loading?: boolean;
  size?: ComboboxSize;
  /** a Tailwind width class */
  width?: string;
  invalid?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
} = {}) {
  const autoId = useId();
  const inputId = id ?? `${autoId}-input`;
  const listboxId = `${autoId}-listbox`;
  const [own, setOwn] = useState<string | null>(defaultValue ?? null);
  const current = value !== undefined ? value : own;
  const selected = options.find((o) => o.value === current);
  const labelOf = (v: string | null) => options.find((o) => o.value === v)?.label ?? v ?? "";
  const [query, setQuery] = useState(() => labelOf(current));
  const [typed, setTyped] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [active, setActive] = useState(0);
  const { open, setOpen, position, anchorRef, openAt } = useAnchoredLayer<HTMLSpanElement>(listboxId);

  /* a controlled value changing from outside updates the text */
  useEffect(() => { if (!typed) setQuery(labelOf(current)); }, [current]); // eslint-disable-line react-hooks/exhaustive-deps

  const q = query.trim().toLowerCase();
  const shown = useMemo(() => {
    if (!typed || !q) return options;
    if (filter) return filter(query, options);
    return options.filter((o) => contains(o.label, q) || contains(o.hint, q));
  }, [typed, q, query, options, filter]);
  const exact = shown.find((o) => o.label.toLowerCase() === q);
  const customRow = allowCustom && typed && q.length > 0 && !exact;
  const rows = customRow ? shown.length + 1 : shown.length;

  const show = () => {
    if (disabled) return;
    openAt({ estimatedHeight: Math.min(Math.max(rows, 1), 7) * 32 + 8, matchWidth: true });
    setActive(Math.max(0, shown.findIndex((o) => o.value === current)));
  };
  const settle = (next: string | null, option?: ComboboxOption) => {
    if (value === undefined) setOwn(next);
    onChange?.(next, option);
    setQuery(option?.label ?? next ?? "");
    setTyped(false);
    setOpen(false);
  };
  const pick = (index: number) => {
    if (customRow && index === shown.length) { settle(query.trim()); return; }
    const option = shown[index];
    if (!option || option.disabled) return;
    settle(option.value, option);
  };
  const revert = () => { setQuery(labelOf(current)); setTyped(false); setOpen(false); };
  const clear = () => { settle(null); inputRef.current?.focus(); };

  useEffect(() => {
    if (!open) return;
    document.getElementById(`${listboxId}-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [open, active, listboxId]);
  /* keep the active row inside the list as it narrows */
  useEffect(() => { setActive((i) => Math.min(i, Math.max(0, rows - 1))); }, [rows]);

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") { event.preventDefault(); if (!open) show(); else setActive((i) => Math.min(i + 1, rows - 1)); }
    else if (event.key === "ArrowUp") { event.preventDefault(); if (!open) show(); else setActive((i) => Math.max(i - 1, 0)); }
    else if (event.key === "Home" && open) { event.preventDefault(); setActive(0); }
    else if (event.key === "End" && open) { event.preventDefault(); setActive(rows - 1); }
    else if (event.key === "Enter") { if (open && rows > 0) { event.preventDefault(); pick(active); } else if (allowCustom && typed && q) { event.preventDefault(); settle(query.trim()); } }
    else if (event.key === "Escape") { if (open || typed) { event.preventDefault(); revert(); } }
    else if (event.key === "Tab") { if (open) setOpen(false); if (typed) revert(); }
  };

  return (
    <>
      <span
        ref={anchorRef}
        data-invalid={invalid || undefined}
        onClick={() => { inputRef.current?.focus(); if (!open) show(); }}
        className={`primitive-field flex ${width} cursor-text items-center gap-2 rounded-control border border-line bg-field px-3 transition-opacity duration-150 ${disabled ? "opacity-60" : ""} ${HEIGHTS[size]} ${className}`}
      >
        {selected?.swatch ? <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: selected.swatch }} />
          : (selected?.icon ?? leadingIcon) && <Icon name={selected?.icon ?? leadingIcon!} size={14} strokeWidth={2} className="shrink-0 text-ink-3" />}
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          autoComplete="off"
          spellCheck={false}
          disabled={disabled}
          value={query}
          placeholder={placeholder}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={open ? listboxId : undefined}
          aria-activedescendant={open && rows > 0 ? `${listboxId}-${active}` : undefined}
          aria-labelledby={labelledBy}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          onChange={(event) => { setQuery(event.target.value); setTyped(true); setActive(0); onQueryChange?.(event.target.value); if (!open) show(); }}
          onBlur={() => { if (typed) { if (allowCustom && q) settle(query.trim()); else revert(); } }}
          onKeyDown={onKeyDown}
          className="min-w-0 flex-1 bg-transparent text-body text-ink outline-none placeholder:text-ink-3"
        />
        {loading ? <Spinner size={12} className="shrink-0 text-ink-3" />
          : current ? (
            <IconButton label="Clear" onClick={clear} onMouseDown={(event: MouseEvent) => event.preventDefault()} className="-mr-1.5 size-6 shrink-0 text-ink-3 hover:bg-hover hover:text-ink" tabIndex={-1}>
              <Icon name="close" size={12} strokeWidth={2.2} />
            </IconButton>
          ) : <Icon name="chevron" size={14} strokeWidth={2} className={`shrink-0 text-ink-3 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />}
      </span>
      {open && position && (
        <Popover x={position.x} top={position.top} bottom={position.bottom} width={position.width} id={listboxId} role="listbox" className="max-h-60 overflow-y-auto p-1" onClose={() => setOpen(false)}>
          {loading && shown.length === 0 ? (
            <p className="flex h-8 items-center gap-2 px-2 text-caption text-ink-3"><Spinner size={12} /> Looking…</p>
          ) : rows === 0 ? (
            <p className="flex h-8 items-center px-2 text-caption text-ink-3">{emptyMessage}</p>
          ) : (
            <>
              {shown.map((option, index) => (
                <OptionRow key={option.value} id={`${listboxId}-${index}`} active={index === active} selected={option.value === current} disabled={option.disabled} swatch={option.swatch} icon={option.icon} hint={option.hint} onHover={() => setActive(index)} onPick={() => pick(index)}>
                  {option.label}
                </OptionRow>
              ))}
              {customRow && (
                <OptionRow id={`${listboxId}-${shown.length}`} active={active === shown.length} icon="plus" onHover={() => setActive(shown.length)} onPick={() => pick(shown.length)}>
                  Use “{query.trim()}”
                </OptionRow>
              )}
            </>
          )}
        </Popover>
      )}
    </>
  );
}
