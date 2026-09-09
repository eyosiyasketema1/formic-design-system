"use client";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useAnchoredLayer } from "./hooks";
import { Chip, Icon, OptionRow, Popover } from "./primitives";
/* ─────────────────────────────────────────────────────────
 * TAG INPUT — several values in one field
 * Labels on a project, skills on a person, recipients on an invoice:
 * each one a chip inside the field, the caret after the last. Enter,
 * comma or Tab keep what was typed; Backspace on an empty caret
 * marks the last chip, a second Backspace removes it; each chip has
 * its own x. Duplicates are ignored, case aside. With `suggestions`
 * a listbox opens under the field as the reader types, showing the
 * ones not yet chosen; arrows and Enter pick. `max` stops the field
 * when it is full and says so.
 *
 * The field is Input's field grown to wrap (min-h, not h), the chips
 * are the system's inset Chip, and the listbox is Select's, so it sits
 * in a form beside the other three without a seam.
 * Works inside Field, which injects id / aria-describedby / invalid.
 * ───────────────────────────────────────────────────────── */
export type TagInputSize = "sm" | "md";
const MIN_HEIGHTS: Record<TagInputSize, string> = { sm: "min-h-8 py-1", md: "min-h-9 py-1" };

export const DEFAULT_TAGS = ["brand", "web", "retainer"];
export const DEFAULT_TAG_SUGGESTIONS = ["brand", "web", "print", "retainer", "motion", "packaging", "signage", "photography", "copy", "launch"];

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export default function TagInput({
  value,
  defaultValue = DEFAULT_TAGS,
  onChange,
  suggestions = DEFAULT_TAG_SUGGESTIONS,
  allowCustom = true,
  max,
  validate,
  placeholder = "Add a tag…",
  size = "md",
  width = "w-full",
  invalid = false,
  disabled = false,
  className = "",
  id,
  "aria-labelledby": labelledBy,
  "aria-describedby": describedBy,
}: {
  /** controlled tags; omit and use defaultValue for uncontrolled */
  value?: string[];
  defaultValue?: string[];
  onChange?: (tags: string[]) => void;
  /** offered under the field as the reader types; the chosen ones are left out */
  suggestions?: string[];
  /** typed text that matches no suggestion may still be kept */
  allowCustom?: boolean;
  /** the most tags the field takes */
  max?: number;
  /** returns a reason a tag cannot be added, or nothing */
  validate?: (tag: string) => string | undefined;
  placeholder?: string;
  size?: TagInputSize;
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
  const [own, setOwn] = useState<string[]>(defaultValue);
  const tags = value ?? own;
  const [query, setQuery] = useState("");
  const [marked, setMarked] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { open, setOpen, position, anchorRef, openAt } = useAnchoredLayer<HTMLSpanElement>(listboxId);
  const full = max !== undefined && tags.length >= max;

  const q = query.trim().toLowerCase();
  const shown = useMemo(
    () => suggestions.filter((s) => !tags.some((t) => same(t, s)) && (!q || s.toLowerCase().includes(q))),
    [suggestions, tags, q],
  );
  const exact = shown.find((s) => s.toLowerCase() === q);
  const customRow = allowCustom && q.length > 0 && !exact && !tags.some((t) => same(t, query));
  const rows = customRow ? shown.length + 1 : shown.length;

  const set = (next: string[]) => { if (value === undefined) setOwn(next); onChange?.(next); };
  const add = (raw: string) => {
    const tag = raw.trim();
    if (!tag || full) return;
    if (tags.some((t) => same(t, tag))) { setQuery(""); return; }
    const why = validate?.(tag);
    if (why) { setReason(why); return; }
    set([...tags, tag]);
    setQuery("");
    setReason(null);
    setOpen(false);
  };
  const remove = (index: number) => { set(tags.filter((_, i) => i !== index)); setMarked(false); inputRef.current?.focus(); };
  const show = () => {
    if (disabled || full || rows === 0) { setOpen(false); return; }
    openAt({ estimatedHeight: Math.min(rows, 7) * 32 + 8, matchWidth: true });
    setActive(0);
  };
  const pick = (index: number) => {
    if (customRow && index === shown.length) add(query);
    else if (shown[index]) add(shown[index]);
    inputRef.current?.focus();
  };
  useEffect(() => { if (open && rows === 0) setOpen(false); }, [open, rows, setOpen]);
  useEffect(() => { setActive((i) => Math.min(i, Math.max(0, rows - 1))); }, [rows]);
  useEffect(() => {
    if (!open) return;
    document.getElementById(`${listboxId}-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [open, active, listboxId]);

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && query === "" && tags.length > 0) {
      event.preventDefault();
      if (marked) remove(tags.length - 1); else setMarked(true);
      return;
    }
    if (marked) setMarked(false);
    if (event.key === "ArrowDown") { event.preventDefault(); if (!open) show(); else setActive((i) => Math.min(i + 1, rows - 1)); }
    else if (event.key === "ArrowUp") { event.preventDefault(); if (open) setActive((i) => Math.max(i - 1, 0)); }
    else if (event.key === "Enter" || event.key === ",") {
      if (open && rows > 0) { event.preventDefault(); pick(active); }
      else if (query.trim()) { event.preventDefault(); if (allowCustom) add(query); }
      else if (event.key === ",") event.preventDefault();
    }
    else if (event.key === "Tab") { if (query.trim() && allowCustom) { add(query); } if (open) setOpen(false); }
    else if (event.key === "Escape") { if (open) { event.preventDefault(); setOpen(false); } else if (query) { event.preventDefault(); setQuery(""); } }
  };

  const chipSize = size === "sm" ? "sm" : "md";
  return (
    <>
      <span
        ref={anchorRef}
        data-invalid={invalid || reason ? true : undefined}
        onClick={() => inputRef.current?.focus()}
        className={`primitive-field flex ${width} cursor-text flex-wrap items-center gap-1.5 rounded-control border border-line bg-field px-2 transition-opacity duration-150 ${disabled ? "opacity-60" : ""} ${MIN_HEIGHTS[size]} ${className}`}
      >
        {tags.map((tag, index) => (
          <Chip key={tag} tone="inset" size={chipSize} className={`max-w-full ${marked && index === tags.length - 1 ? "bg-hover-2 text-ink" : ""}`}>
            <span className="min-w-0 truncate">{tag}</span>
            {!disabled && (
              <button
                type="button"
                tabIndex={-1}
                aria-label={`Remove ${tag}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={(event) => { event.stopPropagation(); remove(index); }}
                className="-mr-0.5 flex size-4 shrink-0 items-center justify-center rounded-[3px] text-ink-3 transition-colors duration-150 hover:bg-hover-2 hover:text-ink"
              >
                <Icon name="close" size={10} strokeWidth={2.4} />
              </button>
            )}
          </Chip>
        ))}
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          autoComplete="off"
          spellCheck={false}
          disabled={disabled || full}
          value={query}
          placeholder={full ? `Up to ${max}` : tags.length === 0 ? placeholder : ""}
          size={Math.max(4, (full ? `Up to ${max}` : query || (tags.length === 0 ? placeholder : "")).length + 1)}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={open ? listboxId : undefined}
          aria-activedescendant={open && rows > 0 ? `${listboxId}-${active}` : undefined}
          aria-labelledby={labelledBy}
          aria-describedby={reason ? `${autoId}-reason` : describedBy}
          aria-invalid={invalid || !!reason || undefined}
          onChange={(event) => { setQuery(event.target.value); setReason(null); setMarked(false); if (!open) show(); }}
          onBlur={() => { if (open) setOpen(false); if (marked) setMarked(false); }}
          onKeyDown={onKeyDown}
          className="h-6 min-w-0 flex-1 bg-transparent px-1 text-body text-ink outline-none placeholder:text-ink-3"
        />
        {max !== undefined && !full && tags.length > 0 && <span className="ml-auto shrink-0 pr-1 text-small tabular-nums text-ink-3">{tags.length}/{max}</span>}
      </span>
      {reason && <p id={`${autoId}-reason`} role="alert" className="mt-1.5 text-small text-red">{reason}</p>}
      {open && position && rows > 0 && (
        <Popover x={position.x} top={position.top} bottom={position.bottom} width={position.width} id={listboxId} role="listbox" className="max-h-60 overflow-y-auto p-1" onClose={() => setOpen(false)}>
          {shown.map((s, index) => (
            <OptionRow key={s} id={`${listboxId}-${index}`} active={index === active} onHover={() => setActive(index)} onPick={() => pick(index)}>{s}</OptionRow>
          ))}
          {customRow && (
            <OptionRow id={`${listboxId}-${shown.length}`} active={active === shown.length} icon="plus" onHover={() => setActive(shown.length)} onPick={() => pick(shown.length)}>
              Add “{query.trim()}”
            </OptionRow>
          )}
        </Popover>
      )}
    </>
  );
}
