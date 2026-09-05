"use client";
import { useEffect, useId, useState } from "react";
import { useAnchoredLayer } from "./hooks";
import { Icon, Popover } from "./primitives";
/* ─────────────────────────────────────────────────────────
 * SELECT
 * A combobox on the quiet field style. The listbox portals
 * through Popover (viewport-clamped, matches the trigger's
 * width) and keyboard drives an active option through
 * aria-activedescendant — focus never leaves the trigger.
 * Works inside Field, which injects id / aria-describedby /
 * invalid.
 * ───────────────────────────────────────────────────────── */
export type SelectOption = { value: string; label: string };
export type SelectSize = "sm" | "md";
const SELECT_HEIGHTS: Record<SelectSize, string> = { sm: "h-8", md: "h-9" };
const DEFAULT_OPTIONS: SelectOption[] = [
  { value: "pistachio", label: "Pistachio" },
  { value: "vanilla", label: "Vanilla Bean" },
  { value: "rocky", label: "Rocky Road" },
  { value: "mint", label: "Mint Chip" },
];
export default function Select({
  options = DEFAULT_OPTIONS,
  value,
  defaultValue,
  onChange,
  placeholder = "Select…",
  size = "md",
  width = "w-full",
  invalid = false,
  disabled = false,
  className = "",
  id,
  "aria-describedby": describedBy,
}: {
  /** the choices; defaults to demo content */
  options?: SelectOption[];
  /** controlled value — omit and use defaultValue for uncontrolled */
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  size?: SelectSize;
  /** error styling — set automatically by Field when it has an error */
  invalid?: boolean;
  disabled?: boolean;
  /** a Tailwind width class; `w-full` for forms, `w-40` and the like inside a FilterBar or toolbar */
  width?: string;
  className?: string;
  id?: string;
  "aria-describedby"?: string;
} = {}) {
  const autoId = useId();
  const triggerId = id ?? `${autoId}-trigger`;
  const listboxId = `${autoId}-listbox`;
  const [internal, setInternal] = useState(defaultValue);
  const selectedValue = value !== undefined ? value : internal;
  const selected = options.find((option) => option.value === selectedValue);
  const [active, setActive] = useState(0);
  /* anchored-layer engine: position/clamp/flip + outside/scroll/resize close */
  const { open, setOpen, position, anchorRef: triggerRef, openAt } =
    useAnchoredLayer<HTMLButtonElement>(listboxId);
  const openMenu = () => {
    if (options.length === 0) return;
    if (!openAt({ estimatedHeight: Math.min(options.length, 7) * 32 + 8, matchWidth: true }))
      return;
    const selectedIndex = options.findIndex((option) => option.value === selectedValue);
    setActive(Math.max(0, selectedIndex));
  };
  const choose = (option?: SelectOption) => {
    if (!option) return;
    if (value === undefined) setInternal(option.value);
    onChange?.(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  };
  /* keep the keyboard-active option visible in long lists */
  useEffect(() => {
    if (!open) return;
    document.getElementById(`${listboxId}-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [open, active, listboxId]);
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        openMenu();
      }
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => Math.min(index + 1, options.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === "Home") {
      event.preventDefault();
      setActive(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActive(options.length - 1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      choose(options[active]);
    } else if (event.key === "Escape") {
      event.preventDefault(); /* innermost layer consumes the Escape */
      setOpen(false);
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  };
  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        id={triggerId}
        disabled={disabled}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={open ? `${listboxId}-${active}` : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        data-invalid={invalid || undefined}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
        className={`primitive-field flex ${width} items-center gap-2 rounded-control border border-line bg-field px-3 text-left transition-opacity duration-150 disabled:opacity-60 ${SELECT_HEIGHTS[size]} ${className}`}
      >
        <span className={`min-w-0 flex-1 truncate text-body ${selected ? "text-ink" : "text-ink-3"}`}>
          {selected ? selected.label : placeholder}
        </span>
        <Icon
          name="chevron"
          size={14}
          strokeWidth={2}
          className={`shrink-0 text-ink-3 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && position && (
        <Popover
          x={position.x}
          top={position.top}
          bottom={position.bottom}
          width={position.width}
          id={listboxId}
          role="listbox"
          className="max-h-60 overflow-y-auto p-1"
          onClose={() => setOpen(false)}
        >
          {options.map((option, index) => (
            <div
              key={option.value}
              id={`${listboxId}-${index}`}
              role="option"
              aria-selected={option.value === selectedValue}
              onMouseEnter={() => setActive(index)}
              /* prevent the mousedown from stealing focus off the trigger */
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(option)}
              className={`flex h-8 cursor-pointer items-center gap-2 rounded-sm px-2 text-body text-ink transition-colors duration-150 ${
                index === active ? "bg-hover" : ""
              }`}
            >
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
              {option.value === selectedValue && (
                <Icon name="check" size={14} strokeWidth={2.2} className="shrink-0 text-ink" />
              )}
            </div>
          ))}
        </Popover>
      )}
    </>
  );
}
