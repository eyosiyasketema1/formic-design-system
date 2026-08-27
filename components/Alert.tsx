"use client";
import { type ReactNode } from "react";
import { Icon, IconButton, type IconName } from "./primitives";
/* ─────────────────────────────────────────────────────────
 * ALERT
 * Inline callout on the system tints. Icon and background
 * carry the tone; the copy stays ink so every palette keeps
 * AA contrast (tone-on-own-tint verified ≥4.5 system-wide).
 * ───────────────────────────────────────────────────────── */
export type AlertTone = "neutral" | "info" | "success" | "warning" | "error";
const TONES: Record<AlertTone, { background: string; icon: IconName | null; color: string }> = {
  neutral: { background: "var(--inset)", icon: null, color: "var(--ink-2)" },
  info: { background: "var(--accent-tint)", icon: "info", color: "var(--accent)" },
  success: { background: "var(--green-tint)", icon: "circle-check", color: "var(--green)" },
  warning: { background: "var(--orange-tint)", icon: "alert", color: "var(--orange)" },
  error: { background: "var(--red-tint)", icon: "alert", color: "var(--red)" },
};
export default function Alert({
  tone = "neutral",
  title,
  onDismiss,
  className = "",
  children,
}: {
  tone?: AlertTone;
  title: string;
  /** renders a dismiss control that calls this */
  onDismiss?: () => void;
  className?: string;
  /** optional description below the title */
  children?: ReactNode;
}) {
  const spec = TONES[tone];
  return (
    <div
      className={`flex w-full items-start gap-2.5 rounded-md p-3 shadow-hairline ${className}`}
      style={{ background: spec.background }}
    >
      {spec.icon && (
        <Icon
          name={spec.icon}
          size={16}
          strokeWidth={2}
          className="mt-px shrink-0"
          style={{ color: spec.color }}
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-caption font-medium text-ink">{title}</p>
        {children && <div className="mt-0.5 text-small leading-relaxed text-ink-2">{children}</div>}
      </div>
      {onDismiss && (
        <IconButton
          label="Dismiss"
          onClick={onDismiss}
          className="-mt-1 -mr-1 text-ink-3 hover:bg-hover hover:text-ink"
        >
          <Icon name="close" size={12} strokeWidth={2.2} />
        </IconButton>
      )}
    </div>
  );
}
