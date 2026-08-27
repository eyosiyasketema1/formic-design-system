"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon, IconButton } from "./primitives";
/* ─────────────────────────────────────────────────────────
 * MODAL
 * Portal dialog on the system scrim: focus is trapped while
 * open and restored on close, the page behind stops
 * scrolling, and Escape / backdrop click dismiss (unless
 * dismissible is off — e.g. a required decision).
 * ───────────────────────────────────────────────────────── */
export type ModalSize = "sm" | "md" | "lg";
const MODAL_WIDTHS: Record<ModalSize, string> = {
  sm: "max-w-80",
  md: "max-w-105",
  lg: "max-w-130",
};
const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
/* one shared scroll lock so stacked modals don't unlock early */
let scrollLocks = 0;
let previousOverflow = "";
const lockScroll = () => {
  if (scrollLocks === 0) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  scrollLocks += 1;
};
const unlockScroll = () => {
  scrollLocks = Math.max(0, scrollLocks - 1);
  if (scrollLocks === 0) document.body.style.overflow = previousOverflow;
};
export default function Modal({
  open,
  onClose,
  title,
  size = "md",
  dismissible = true,
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  size?: ModalSize;
  /** allow Escape / backdrop / × to close */
  dismissible?: boolean;
  /** action row rendered below the body (usually Buttons) */
  footer?: ReactNode;
  children: ReactNode;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    restoreRef.current = document.activeElement as HTMLElement | null;
    const focusables = () =>
      Array.from(dialog?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    (focusables()[0] ?? dialog)?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && dismissible) {
        /* an open popover layer (Select listbox, menu) owns this Escape —
           only the innermost layer dismisses (WAI-ARIA dialog pattern) */
        if (event.defaultPrevented || document.querySelector("[data-popover-layer]")) return;
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      /* trap Tab inside the dialog */
      const list = focusables();
      if (list.length === 0) {
        event.preventDefault();
        return;
      }
      const first = list[0];
      const last = list[list.length - 1];
      const activeElement = document.activeElement;
      if (!dialog?.contains(activeElement)) {
        /* focus escaped (e.g. focused node was removed) — pull it back */
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && (activeElement === first || activeElement === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    lockScroll();
    return () => {
      document.removeEventListener("keydown", onKey);
      unlockScroll();
      restoreRef.current?.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-trap only on open/close
  }, [open]);
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "var(--scrim)", animation: "fade-in 150ms ease-out both" }}
      onMouseDown={(event) => {
        if (dismissible && event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`flex max-h-full w-full flex-col overflow-hidden rounded-card bg-surface shadow-overlay outline-none ${MODAL_WIDTHS[size]}`}
        style={{ animation: "pop-in 220ms var(--ease-out-quint) both" }}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line py-3 pr-3 pl-4">
          <h2 id={titleId} className="min-w-0 truncate text-title font-semibold text-ink">
            {title}
          </h2>
          {dismissible && (
            <IconButton
              label="Close dialog"
              onClick={onClose}
              className="text-ink-3 hover:bg-hover hover:text-ink"
            >
              <Icon name="close" size={14} strokeWidth={2.2} />
            </IconButton>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3.5 text-body leading-relaxed text-ink-2">
          {children}
        </div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-line px-4 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
