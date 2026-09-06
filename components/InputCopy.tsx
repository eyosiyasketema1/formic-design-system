"use client";
import { useEffect, useId, useRef, useState } from "react";
import Button from "./Button";
import { Icon, IconButton, Tooltip } from "./primitives";
/* ─────────────────────────────────────────────────────────
 * INPUT COPY — a value to take away
 * A read-only field with the one action it needs: copy. The
 * button turns into a check for a moment and says so to screen
 * readers; a failed clipboard says that too. `variant="button"`
 * puts a labelled Copy button on the trailing edge instead of
 * the icon, for values people copy often (an API key, a share
 * link, an install command).
 * ───────────────────────────────────────────────────────── */
export default function InputCopy({
  value = "npx formic add project-sidebar",
  label,
  variant = "icon",
  mono = true,
  onCopy,
  className = "",
}: {
  value?: string;
  /** shown above the field, and read as part of the button's name */
  label?: string;
  /** icon: a quiet copy button inside the field. button: a labelled Copy button */
  variant?: "icon" | "button";
  /** monospace value (commands, keys, urls) */
  mono?: boolean;
  onCopy?: (value: string) => void;
  className?: string;
}) {
  const id = useId();
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setStatus("copied");
      onCopy?.(value);
    } catch {
      setStatus("error");
    }
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setStatus("idle"), 1600);
  };
  const name = status === "copied" ? "Copied" : status === "error" ? "Could not copy" : `Copy${label ? ` ${label}` : ""}`;
  const glyph = status === "copied" ? "check" : status === "error" ? "alert" : "copy";
  const tone = status === "copied" ? "text-green" : status === "error" ? "text-red" : "text-ink-3 hover:text-ink";
  return (
    <div className={`flex w-full flex-col gap-1.5 ${className}`}>
      {label && <label htmlFor={id} className="text-caption font-medium text-ink">{label}</label>}
      <div className="flex items-center gap-2">
        <span className="primitive-field corner-smooth flex h-9 min-w-0 flex-1 items-center gap-1 rounded-control border border-line bg-field pr-1 pl-3">
          <input
            id={id}
            readOnly
            value={value}
            onFocus={(event) => event.currentTarget.select()}
            aria-label={label ? undefined : "Value to copy"}
            className={`min-w-0 flex-1 bg-transparent text-caption text-ink outline-none ${mono ? "font-mono" : ""}`}
          />
          {variant === "icon" && (
            <Tooltip label={name}>
              <IconButton label={name} onClick={copy} className={`size-7 rounded-sm transition-colors duration-150 hover:bg-hover ${tone}`}>
                <span key={status} className="flex" style={{ animation: "pop-in 200ms var(--ease-out-quint) both" }}>
                  <Icon name={glyph} size={15} strokeWidth={2} />
                </span>
              </IconButton>
            </Tooltip>
          )}
        </span>
        {variant === "button" && (
          <Button variant="secondary" size="md" icon={<Icon name={glyph} size={14} />} onClick={copy} aria-label={name} className={status === "copied" ? "text-green" : status === "error" ? "text-red" : ""}>
            {status === "copied" ? "Copied" : "Copy"}
          </Button>
        )}
      </div>
      <span className="sr-only" role="status" aria-live="polite">{status === "idle" ? "" : name}</span>
    </div>
  );
}
