"use client";
import { useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useModalLayer } from "./hooks";
import { Icon, IconButton } from "./primitives";
/* ─────────────────────────────────────────────────────────
 * MODAL
 * Portal dialog on the system scrim: focus is trapped while
 * open and restored on close, the page behind stops
 * scrolling, and Escape / backdrop click dismiss (unless
 * dismissible is off — e.g. a required decision).
 * ───────────────────────────────────────────────────────── */
export type ModalSize = "sm" | "md" | "lg" | "xl";
const MODAL_WIDTHS: Record<ModalSize, string> = {
  sm: "max-w-80",
  md: "max-w-105",
  lg: "max-w-130",
  xl: "max-w-170",
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
  /* focus trap + restore, layered Escape, scroll lock — shared with Drawer */
  useModalLayer(dialogRef, open, { onClose, closeOnEscape: dismissible });
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
