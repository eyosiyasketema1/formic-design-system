"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Icon, IconButton, type IconName } from "./primitives";
/* ─────────────────────────────────────────────────────────
 * TOAST
 * App-level notifications. Wrap the app in <ToastProvider>,
 * then fire from anywhere:
 *
 *   const toast = useToast();
 *   toast({ tone: "success", title: "Flavor saved" });
 *
 * Toasts stack bottom-right, auto-dismiss (hover pauses the
 * timer), announce politely — errors announce assertively.
 * ───────────────────────────────────────────────────────── */
export type ToastTone = "neutral" | "success" | "error";
export type ToastOptions = {
  title: string;
  description?: string;
  tone?: ToastTone;
  /** auto-dismiss delay in ms */
  duration?: number;
  /** one optional action — clicking it also dismisses */
  action?: { label: string; onClick: () => void };
};
type ToastItem = ToastOptions & { id: number; leaving: boolean };
const DEFAULT_DURATION = 4500;
const EXIT_MS = 160;
const MAX_STACK = 5;
const TONE_ICONS: Record<Exclude<ToastTone, "neutral">, { name: IconName; className: string }> = {
  success: { name: "circle-check", className: "text-green" },
  error: { name: "alert", className: "text-red" },
};
const ToastContext = createContext<((options: ToastOptions) => void) | null>(null);
export function useToast() {
  const toast = useContext(ToastContext);
  if (!toast) throw new Error("useToast must be used inside <ToastProvider>");
  return toast;
}
function ToastCard({
  item,
  onDismiss,
  onHold,
  onRelease,
}: {
  item: ToastItem;
  onDismiss: () => void;
  onHold: () => void;
  onRelease: () => void;
}) {
  const tone = item.tone ?? "neutral";
  const icon = tone === "neutral" ? null : TONE_ICONS[tone];
  return (
    /* announcements come from the provider's always-mounted live
       regions — a role on this freshly-inserted node is unreliable */
    <div
      onMouseEnter={onHold}
      onMouseLeave={onRelease}
      onFocus={onHold}
      onBlur={onRelease}
      className="pointer-events-auto flex items-start gap-2.5 rounded-md bg-surface p-3 shadow-overlay"
      style={
        item.leaving
          ? {
              opacity: 0,
              transform: "translateY(6px)",
              transition: "opacity 150ms ease-out, transform 150ms ease-out",
            }
          : { animation: "fade-up 250ms var(--ease-out-quint) both" }
      }
    >
      {icon && (
        <Icon name={icon.name} size={16} strokeWidth={2} className={`mt-px shrink-0 ${icon.className}`} />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-caption font-medium text-ink">{item.title}</p>
        {item.description && <p className="mt-0.5 text-small text-ink-2">{item.description}</p>}
        {item.action && (
          <button
            type="button"
            onClick={() => {
              item.action?.onClick();
              onDismiss();
            }}
            className="animated-underline mt-0.5 flex h-6 items-center text-small font-medium text-accent"
          >
            {item.action.label}
          </button>
        )}
      </div>
      <IconButton
        label="Dismiss notification"
        onClick={onDismiss}
        className="-mt-1 -mr-1 text-ink-3 hover:bg-hover hover:text-ink"
      >
        <Icon name="close" size={12} strokeWidth={2.2} />
      </IconButton>
    </div>
  );
}
export default function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  /* always-mounted announcers — reliable where per-card roles aren't */
  const [politeMessage, setPoliteMessage] = useState("");
  const [assertiveMessage, setAssertiveMessage] = useState("");
  const idRef = useRef(0);
  const timersRef = useRef(new Map<number, number>());
  const clearTimer = useCallback((id: number) => {
    const timer = timersRef.current.get(id);
    if (timer) window.clearTimeout(timer);
    timersRef.current.delete(id);
  }, []);
  useEffect(
    () => () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      timersRef.current.clear();
    },
    [],
  );
  const dismiss = useCallback((id: number) => {
    clearTimer(id);
    setToasts((current) =>
      current.map((item) => (item.id === id ? { ...item, leaving: true } : item)),
    );
    window.setTimeout(
      () => setToasts((current) => current.filter((item) => item.id !== id)),
      EXIT_MS,
    );
  }, [clearTimer]);
  const schedule = useCallback(
    (id: number, duration: number) => {
      timersRef.current.set(id, window.setTimeout(() => dismiss(id), duration));
    },
    [dismiss],
  );
  const toast = useCallback(
    (options: ToastOptions) => {
      const id = ++idRef.current;
      setToasts((current) => {
        const next = [...current, { ...options, id, leaving: false }];
        /* evicted toasts must not leave timers behind */
        next.slice(0, Math.max(0, next.length - MAX_STACK)).forEach((evicted) => clearTimer(evicted.id));
        return next.slice(-MAX_STACK);
      });
      schedule(id, options.duration ?? DEFAULT_DURATION);
      const message = options.description ? `${options.title}. ${options.description}` : options.title;
      if (options.tone === "error") setAssertiveMessage(message);
      else setPoliteMessage(message);
    },
    [schedule, clearTimer],
  );
  return (
    <ToastContext.Provider value={toast}>
      {children}
      {typeof document !== "undefined" &&
        createPortal(
          <div
            aria-label="Notifications"
            /* pointer-events pass through the empty stack area;
               z-[60] keeps toasts above the modal scrim (z-50) */
            className="pointer-events-none fixed right-4 bottom-4 z-[60] flex w-80 max-w-[calc(100vw-32px)] flex-col gap-2"
          >
            <span className="sr-only" role="status" aria-live="polite">{politeMessage}</span>
            <span className="sr-only" role="alert" aria-live="assertive">{assertiveMessage}</span>
            {toasts.map((item) => (
              <ToastCard
                key={item.id}
                item={item}
                onDismiss={() => dismiss(item.id)}
                onHold={() => {
                  const timer = timersRef.current.get(item.id);
                  if (timer) window.clearTimeout(timer);
                }}
                onRelease={() => {
                  if (!item.leaving) schedule(item.id, item.duration ?? DEFAULT_DURATION);
                }}
              />
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}
