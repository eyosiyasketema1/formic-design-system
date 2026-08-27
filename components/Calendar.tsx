"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Icon, IconButton } from "./primitives";
/* ─────────────────────────────────────────────────────────
 * CALENDAR
 * Dependency-free month grid on the APG date-grid pattern:
 * roving focus, arrows move by day, PageUp / PageDown by
 * month, Home / End to the week's bounds, Enter / Space
 * selects. Month and weekday labels come from Intl, so the
 * host locale renders for free.
 * ───────────────────────────────────────────────────────── */
const atMidnight = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const sameDay = (a?: Date | null, b?: Date | null) =>
  !!a &&
  !!b &&
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();
export default function Calendar({
  value,
  defaultValue,
  onChange,
  min,
  max,
  weekStartsOn = 1,
  autoFocus = false,
  className = "",
}: {
  /** controlled selection — omit and use defaultValue for uncontrolled */
  value?: Date | null;
  defaultValue?: Date | null;
  onChange?: (date: Date) => void;
  /** earliest / latest selectable day (inclusive) */
  min?: Date;
  max?: Date;
  /** 0 = Sunday, 1 = Monday */
  weekStartsOn?: 0 | 1;
  /** focus the grid on mount (DatePicker's popover does this) */
  autoFocus?: boolean;
  className?: string;
} = {}) {
  const id = useId();
  const [internal, setInternal] = useState<Date | null>(defaultValue ?? null);
  const selected = value !== undefined ? value : internal;
  const [focusDate, setFocusDate] = useState<Date>(() => atMidnight(selected ?? new Date()));
  const shouldFocus = useRef(autoFocus);
  const year = focusDate.getFullYear();
  const month = focusDate.getMonth();
  const dayId = (date: Date) =>
    `${id}-${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  useEffect(() => {
    if (!shouldFocus.current) return;
    document.getElementById(dayId(focusDate))?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusDate]);
  const isDisabled = (date: Date) =>
    (min !== undefined && date < atMidnight(min)) || (max !== undefined && date > atMidnight(max));
  const moveDays = (days: number) => {
    shouldFocus.current = true;
    setFocusDate((current) => new Date(current.getFullYear(), current.getMonth(), current.getDate() + days));
  };
  const moveMonth = (delta: number, focusGrid: boolean) => {
    shouldFocus.current = focusGrid;
    setFocusDate((current) => {
      const lastOfTarget = new Date(current.getFullYear(), current.getMonth() + delta + 1, 0).getDate();
      return new Date(current.getFullYear(), current.getMonth() + delta, Math.min(current.getDate(), lastOfTarget));
    });
  };
  const select = (date: Date) => {
    if (isDisabled(date)) return;
    if (value === undefined) setInternal(date);
    onChange?.(date);
  };
  const onKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case "ArrowLeft": event.preventDefault(); moveDays(-1); break;
      case "ArrowRight": event.preventDefault(); moveDays(1); break;
      case "ArrowUp": event.preventDefault(); moveDays(-7); break;
      case "ArrowDown": event.preventDefault(); moveDays(7); break;
      case "PageUp": event.preventDefault(); moveMonth(-1, true); break;
      case "PageDown": event.preventDefault(); moveMonth(1, true); break;
      case "Home": {
        event.preventDefault();
        const column = (focusDate.getDay() - weekStartsOn + 7) % 7;
        moveDays(-column);
        break;
      }
      case "End": {
        event.preventDefault();
        const column = (focusDate.getDay() - weekStartsOn + 7) % 7;
        moveDays(6 - column);
        break;
      }
      case "Enter":
      case " ":
        event.preventDefault();
        select(focusDate);
        break;
    }
  };
  /* build the week rows for the focused month */
  const firstColumn = (new Date(year, month, 1).getDay() - weekStartsOn + 7) % 7;
  const total = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: firstColumn }, () => null),
    ...Array.from({ length: total }, (_, index) => new Date(year, month, index + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (Date | null)[][] = [];
  for (let index = 0; index < cells.length; index += 7) weeks.push(cells.slice(index, index + 7));
  const monthLabel = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(focusDate);
  const narrow = new Intl.DateTimeFormat(undefined, { weekday: "narrow" });
  const long = new Intl.DateTimeFormat(undefined, { weekday: "long" });
  /* Jan 7 2024 is a Sunday — a stable reference week */
  const weekdays = Array.from({ length: 7 }, (_, index) => {
    const reference = new Date(2024, 0, 7 + weekStartsOn + index);
    return { short: narrow.format(reference), full: long.format(reference) };
  });
  const today = atMidnight(new Date());
  return (
    <div className={`w-fit select-none ${className}`}>
      <div className="flex items-center justify-between gap-2 pb-2">
        <IconButton label="Previous month" onClick={() => moveMonth(-1, false)} className="text-ink-3 hover:bg-hover hover:text-ink">
          <Icon name="chevron-left" size={14} strokeWidth={2} />
        </IconButton>
        <span aria-live="polite" className="text-caption font-medium text-ink">
          {monthLabel}
        </span>
        <IconButton label="Next month" onClick={() => moveMonth(1, false)} className="text-ink-3 hover:bg-hover hover:text-ink">
          <Icon name="chevron-right" size={14} strokeWidth={2} />
        </IconButton>
      </div>
      <div role="grid" aria-label={monthLabel} onKeyDown={onKeyDown}>
        <div role="row" className="grid grid-cols-7 gap-1 pb-1">
          {weekdays.map((weekday, index) => (
            <span key={index} role="columnheader" aria-label={weekday.full} className="flex size-8 items-center justify-center text-micro font-medium text-ink-3 uppercase">
              <span aria-hidden>{weekday.short}</span>
            </span>
          ))}
        </div>
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} role="row" className="grid grid-cols-7 gap-1">
            {week.map((day, dayIndex) => {
              if (!day) return <span key={dayIndex} className="size-8" />;
              const isSelected = sameDay(day, selected);
              const isToday = sameDay(day, today);
              const dayDisabled = isDisabled(day);
              return (
                <button
                  key={dayIndex}
                  type="button"
                  role="gridcell"
                  id={dayId(day)}
                  aria-selected={isSelected}
                  aria-disabled={dayDisabled || undefined}
                  tabIndex={sameDay(day, focusDate) ? 0 : -1}
                  onClick={() => {
                    shouldFocus.current = true;
                    setFocusDate(day);
                    select(day);
                  }}
                  className={`flex size-8 items-center justify-center rounded-control text-caption tabular-nums transition-colors duration-150 ${
                    isSelected
                      ? "bg-ink font-medium text-canvas"
                      : dayDisabled
                        ? "cursor-default text-ink-3 opacity-40"
                        : "text-ink hover:bg-hover"
                  } ${isToday && !isSelected ? "font-medium shadow-hairline" : ""}`}
                  style={isSelected ? { boxShadow: "var(--highlight-raised)" } : undefined}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
