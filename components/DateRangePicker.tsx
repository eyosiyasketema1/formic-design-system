"use client";
import { useId, useState } from "react";
import Calendar, { type DateRange } from "./Calendar";
import { PickerField, type DatePickerSize } from "./DatePicker";
import { useAnchoredLayer } from "./hooks";
/* ─────────────────────────────────────────────────────────
 * DATE RANGE PICKER
 * DatePicker's sibling for spans: pick a start, preview the
 * band, pick the end — the popover closes when the range
 * completes. Label renders through Intl.formatRange. Shares
 * the PickerField shell; works inside Field.
 * ───────────────────────────────────────────────────────── */
const EMPTY: DateRange = { from: null, to: null };
export default function DateRangePicker({
  value,
  defaultValue,
  onChange,
  placeholder = "Pick a date range…",
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
  /** controlled range — omit and use defaultValue for uncontrolled */
  value?: DateRange;
  defaultValue?: DateRange;
  /** fires on each pick; `to` is null until the range completes */
  onChange?: (range: DateRange) => void;
  placeholder?: string;
  min?: Date;
  max?: Date;
  size?: DatePickerSize;
  /** 0 = Sunday, 1 = Monday */
  weekStartsOn?: 0 | 1;
  /** error styling — set automatically by Field when it has an error */
  invalid?: boolean;
  disabled?: boolean;
  /** show a clear control when a range is set */
  clearable?: boolean;
  className?: string;
  id?: string;
  "aria-describedby"?: string;
  "aria-labelledby"?: string;
} = {}) {
  const autoId = useId();
  const triggerId = id ?? `${autoId}-trigger`;
  const layerId = `${autoId}-calendar`;
  const [internal, setInternal] = useState<DateRange>(defaultValue ?? EMPTY);
  const range = value !== undefined ? value : internal;
  const { open, setOpen, position, anchorRef, openAt } =
    useAnchoredLayer<HTMLButtonElement>(layerId);
  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) anchorRef.current?.focus();
  };
  const handleRange = (next: DateRange) => {
    if (value === undefined) setInternal(next);
    onChange?.(next);
    if (next.from && next.to) close(true);
  };
  const clear = () => {
    if (value === undefined) setInternal(EMPTY);
    onChange?.(EMPTY);
    anchorRef.current?.focus();
  };
  const format = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });
  const label =
    range.from && range.to
      ? typeof format.formatRange === "function"
        ? format.formatRange(range.from, range.to)
        : `${format.format(range.from)} – ${format.format(range.to)}`
      : range.from
        ? `${format.format(range.from)} – …`
        : null;
  return (
    <PickerField
      triggerId={triggerId}
      layerId={layerId}
      size={size}
      invalid={invalid}
      disabled={disabled}
      clearable={clearable}
      clearLabel="Clear date range"
      label={label}
      placeholder={placeholder}
      describedBy={describedBy}
      labelledBy={labelledBy}
      open={open}
      position={position}
      anchorRef={anchorRef}
      onOpen={() => openAt({ estimatedHeight: 316, width: 248 })}
      onClose={close}
      onClear={clear}
      className={className}
    >
      <Calendar
        autoFocus
        mode="range"
        rangeValue={range}
        onRangeChange={handleRange}
        min={min}
        max={max}
        weekStartsOn={weekStartsOn}
      />
    </PickerField>
  );
}
