"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import { Icon, IconButton } from "./primitives";
/* ─────────────────────────────────────────────────────────
 * PRIVACY — mask sensitive values until the eye is opened
 * A dashboard is often open on a screen someone else can see.
 * Wrap a card in <PrivacyScope>, drop <PrivacyToggle/> where the
 * header wants the eye, and wrap each figure in <Masked>. Hidden
 * is the default on every visit, on purpose — that is the point,
 * so it is deliberately NOT remembered.
 *
 * Shape matters: the scope takes ordinary children, never a render
 * function, so it composes from a server component without the
 * props crossing the serialisation boundary.
 * ───────────────────────────────────────────────────────── */

const Ctx = createContext<{ shown: boolean; flip: () => void }>({ shown: false, flip: () => {} });

export function PrivacyScope({ children, defaultShown = false }: { children: ReactNode; defaultShown?: boolean }) {
  const [shown, setShown] = useState(defaultShown);
  return <Ctx.Provider value={{ shown, flip: () => setShown((s) => !s) }}>{children}</Ctx.Provider>;
}

/** The eye — place it wherever the card's header wants it. */
export function PrivacyToggle({ className = "" }: { className?: string }) {
  const { shown, flip } = useContext(Ctx);
  return (
    <IconButton
      label={shown ? "Hide amounts" : "Show amounts"}
      onClick={flip}
      aria-pressed={shown}
      className={`text-ink-3 hover:bg-hover hover:text-ink ${className}`}
    >
      <Icon name={shown ? "eye-off" : "eye"} size={15} strokeWidth={2} />
    </IconButton>
  );
}

/** The value itself — masked until the scope's eye is opened. */
export function Masked({ children, placeholder = "•••••" }: { children: ReactNode; placeholder?: string }) {
  const { shown } = useContext(Ctx);
  if (shown) return <>{children}</>;
  /* aria-label is ignored on a plain span, so the dots are hidden from
     assistive tech and a visually-hidden sentence speaks in their place. */
  return (
    <>
      <span aria-hidden="true" className="tracking-wide">{placeholder}</span>
      <span className="sr-only">Hidden. Use the eye to reveal.</span>
    </>
  );
}
