"use client";
import { useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useModalLayer } from "./hooks";
import { Icon, IconButton } from "./primitives";
/* ─────────────────────────────────────────────────────────
 * DRAWER
 * Side panel on the system scrim — same machinery as Modal
 * (useModalLayer: focus trap + restore, layered Escape,
 * scroll lock) but sliding from an edge and full height.
 * ───────────────────────────────────────────────────────── */
export default function Drawer({
  open,
  onClose,
  title,
  side = "right",
  dismissible = true,
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  side?: "right" | "left";
  /** allow Escape / backdrop / × to close */
  dismissible?: boolean;
  /** action row pinned below the body (usually Buttons) */
  footer?: ReactNode;
  children: ReactNode;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  useModalLayer(panelRef, open, { onClose, closeOnEscape: dismissible });
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div
      className="fixed inset-0 z-50"
      style={{ background: "var(--scrim)", animation: "fade-in 150ms ease-out both" }}
      onMouseDown={(event) => {
        if (dismissible && event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`fixed inset-y-0 flex w-full max-w-95 flex-col overflow-hidden bg-surface shadow-overlay outline-none ${
          side === "right" ? "right-0" : "left-0"
        }`}
        style={{
          animation: `${side === "right" ? "drawer-in-right" : "drawer-in-left"} 280ms var(--ease-out-quint) both`,
        }}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line py-3 pr-3 pl-4">
          <h2 id={titleId} className="min-w-0 truncate text-title font-semibold text-ink">
            {title}
          </h2>
          {dismissible && (
            <IconButton
              label="Close panel"
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
