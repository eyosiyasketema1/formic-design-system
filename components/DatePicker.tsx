"use client";
import { useId, useState, type ReactNode, type RefObject } from "react";
import Calendar from "./Calendar";
import { useAnchoredLayer, type AnchoredPosition } from "./hooks";
import { Icon, IconButton, Popover } from "./primitives";
/* ─────────────────────────────────────────────────────────
 * DATE PICKER
 * Calendar in a Popover behind a quiet field trigger. Focus
 * moves into the grid while open; Escape and Tab-out close
 * and refocus the trigger. Works inside Field.
 *
 * PickerField is the shared trigger + popover shell — used
 * here and by DateRangePicker (extraction rule: one copy).
 * ───────────────────────────────────────────────────────── */
export type DatePickerSize = "sm" | "md";
const PICKER_HEIGHTS: Record<DatePickerSize, string> = { sm: "h-8", md: "h-9" };
export function PickerField({
  triggerId,
  layerId,
  size = "md",
  invalid = false,
  disabled = false,
  clearable = false,
  clearLabel = "Clear",
  label,
  placeholder,
  describedBy,
  labelledBy,
  open,
  position,
  anchorRef,
  onOpen,
  onClose,
  onClear,
  className = "",
  children,
}: {
  triggerId: string;
  layerId: string;
  size?: DatePickerSize;
  invalid?: boolean;
  disabled?: boolean;
  clearable?: boolean;
  clearLabel?: string;
  /** formatted value — null renders the placeholder */
  label: string | null;
  placeholder: string;
  describedBy?: string;
  labelledBy?: string;
  open: boolean;
  position: AnchoredPosition | null;
  anchorRef: RefObject<HTMLButtonElement | null>;
  onOpen: () => void;
  /** close the layer; refocus the trigger when asked */
  onClose: (refocus: boolean) => void;
  onClear: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span className={`relative flex w-full items-center ${className}`}>
      <button
        ref={anchorRef}
        type="button"
        id={triggerId}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? layerId : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        aria-labelledby={labelledBy}
        data-invalid={invalid || undefined}
        onClick={() => (open ? onClose(false) : onOpen())}
        onKeyDown={(event) => {
          if (!open && ["ArrowDown", "Enter", " "].includes(event.key)) {
            event.preventDefault();
            onOpen();
          }
        }}
        className={`primitive-field flex w-full items-center gap-2 rounded-control border border-line bg-field px-3 text-left transition-opacity duration-150 disabled:opacity-60 ${PICKER_HEIGHTS[size]} ${clearable && label ? "pr-9" : ""}`}
      >
        <Icon name="calendar" size={14} strokeWidth={2} className="shrink-0 text-ink-3" />
        <span className={`min-w-0 flex-1 truncate text-body ${label ? "text-ink" : "text-ink-3"}`}>
          {label ?? placeholder}
        </span>
      </button>
      {clearable && label && !disabled && (
        <IconButton
          label={clearLabel}
          onClick={onClear}
          className="absolute right-1.5 text-ink-3 hover:bg-hover hover:text-ink"
        >
          <Icon name="close" size={12} strokeWidth={2.2} />
        </IconButton>
      )}
      {open && position && (
        <Popover
          x={position.x}
          top={position.top}
          bottom={position.bottom}
          width={position.width}
          id={layerId}
          role="dialog"
          className="p-3"
          onClose={() => onClose(true)}
        >
          {/* Tab past the grid's edge leaves the dialog — close it then */}
          <div
            onBlur={(event) => {
              const next = event.relatedTarget as Node | null;
              if (next && !event.currentTarget.contains(next) && next !== anchorRef.current)
                onClose(false);
            }}
          >
            {children}
          </div>
        </Popover>
      )}
    </span>
  );
}
export default function DatePicker({
  value,
  defaultValue,
  onChange,
  placeholder = "Pick a date…",
  min,
  max,
  size = "md",
  weekStartsOn = 1,
  invalid = false,
  disabled = false,
  clearable = false,
  className = "",
  id,
  "aria-describedby": describedBy,
  "aria-labelledby": labelledBy,
}: {
  /** controlled selection — omit and use defaultValue for uncontrolled */
  value?: Date | null;
  defaultValue?: Date | null;
  onChange?: (date: Date | null) => void;
  placeholder?: string;
  min?: Date;
  max?: Date;
  size?: DatePickerSize;
  /** 0 = Sunday, 1 = Monday */
  weekStartsOn?: 0 | 1;
  /** error styling — set automatically by Field when it has an error */
  invalid?: boolean;
  disabled?: boolean;
  /** show a clear control when a date is set */
  clearable?: boolean;
  className?: string;
  id?: string;
  "aria-describedby"?: string;
  "aria-labelledby"?: string;
} = {}) {
  const autoId = useId();
  const triggerId = id ?? `${autoId}-trigger`;
  const layerId = `${autoId}-calendar`;
  const [internal, setInternal] = useState<Date | null>(defaultValue ?? null);
  const selected = value !== undefined ? value : internal;
  const { open, setOpen, position, anchorRef, openAt } =
    useAnchoredLayer<HTMLButtonElement>(layerId);
  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) anchorRef.current?.focus();
  };
  const choose = (date: Date) => {
    if (value === undefined) setInternal(date);
    onChange?.(date);
    close(true);
  };
  const clear = () => {
    if (value === undefined) setInternal(null);
    onChange?.(null);
    anchorRef.current?.focus();
  };
  const formatted = selected
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(selected)
    : null;
  return (
    <PickerField
      triggerId={triggerId}
      layerId={layerId}
      size={size}
      invalid={invalid}
      disabled={disabled}
      clearable={clearable}
      clearLabel="Clear date"
      label={formatted}
      placeholder={placeholder}
      describedBy={describedBy}
      labelledBy={labelledBy}
      open={open}
      position={position}
      anchorRef={anchorRef}
      onOpen={() => openAt({ estimatedHeight: 316, width: 272 })}
      onClose={close}
      onClear={clear}
      className={className}
    >
      <Calendar
        autoFocus
        value={selected}
        onChange={choose}
        min={min}
        max={max}
        weekStartsOn={weekStartsOn}
      />
    </PickerField>
  );
}
