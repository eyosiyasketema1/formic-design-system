"use client";
import { Icon } from "./primitives";
/* ─────────────────────────────────────────────────────────
 * STEPS
 * Wizard progress: completed circles fill ink with a check,
 * the current step rings accent and carries aria-current,
 * upcoming steps stay recessive. Completed steps become
 * buttons when onStepClick allows going back.
 * ───────────────────────────────────────────────────────── */
export type Step = { key: string; label: string; description?: string };
const DEFAULT_STEPS: Step[] = [
  { key: "recipe", label: "Recipe", description: "Base and mix-ins" },
  { key: "churn", label: "Churn", description: "Overnight batch" },
  { key: "case", label: "Case", description: "Set and display" },
  { key: "launch", label: "Launch", description: "On the board" },
];
function StepCircle({
  state,
  index,
  label,
  clickable,
  onClick,
}: {
  state: "done" | "current" | "todo";
  index: number;
  label: string;
  clickable: boolean;
  onClick?: () => void;
}) {
  const visual =
    state === "done" ? (
      <Icon name="check" size={12} strokeWidth={2.5} />
    ) : (
      <span>{index + 1}</span>
    );
  const classes =
    state === "done"
      ? "bg-ink text-canvas"
      : state === "current"
        ? "bg-surface text-ink shadow-[0_0_0_1.5px_var(--accent)]"
        : "bg-inset text-ink-3 shadow-hairline";
  if (clickable) {
    return (
      <button
        type="button"
        aria-label={`Go back to step: ${label}`}
        onClick={onClick}
        className={`flex size-6 shrink-0 items-center justify-center rounded-full text-tiny font-medium transition-transform duration-150 hover:scale-110 ${classes}`}
      >
        {visual}
      </button>
    );
  }
  return (
    <span
      aria-hidden
      className={`flex size-6 shrink-0 items-center justify-center rounded-full text-tiny font-medium ${classes}`}
    >
      {visual}
    </span>
  );
}
export default function Steps({
  steps = DEFAULT_STEPS,
  current = 1,
  onStepClick,
  vertical = false,
  className = "",
}: {
  /** the stages, in order; defaults to demo content */
  steps?: Step[];
  /** index of the active step */
  current?: number;
  /** allows navigating back — completed circles become buttons */
  onStepClick?: (index: number) => void;
  vertical?: boolean;
  className?: string;
} = {}) {
  return (
    <ol className={`${vertical ? "flex flex-col" : "flex w-full items-start"} ${className}`}>
      {steps.map((step, index) => {
        const state = index < current ? "done" : index === current ? "current" : "todo";
        const last = index === steps.length - 1;
        const clickable = state === "done" && onStepClick !== undefined;
        const labelBlock = (
          <>
            <p
              className={`text-caption font-medium ${
                state === "todo" ? "text-ink-3" : "text-ink"
              }`}
            >
              {step.label}
            </p>
            {step.description && <p className="text-small text-ink-3">{step.description}</p>}
          </>
        );
        if (vertical) {
          return (
            <li
              key={step.key}
              aria-current={state === "current" ? "step" : undefined}
              className="flex gap-3"
            >
              <div className="flex flex-col items-center">
                <StepCircle state={state} index={index} label={step.label} clickable={clickable} onClick={() => onStepClick?.(index)} />
                {!last && (
                  <div className={`my-1 w-px flex-1 ${state === "done" ? "bg-ink" : "bg-line"}`} style={{ minHeight: 16 }} />
                )}
              </div>
              <div className={`min-w-0 ${last ? "" : "pb-4"}`}>{labelBlock}</div>
            </li>
          );
        }
        return (
          <li
            key={step.key}
            aria-current={state === "current" ? "step" : undefined}
            className={`min-w-0 ${last ? "" : "flex-1"}`}
          >
            <div className="flex items-center">
              <StepCircle state={state} index={index} label={step.label} clickable={clickable} onClick={() => onStepClick?.(index)} />
              {!last && (
                <div className={`mx-2 h-px flex-1 ${state === "done" ? "bg-ink" : "bg-line"}`} />
              )}
            </div>
            <div className="mt-1.5 min-w-0 pr-2">{labelBlock}</div>
          </li>
        );
      })}
    </ol>
  );
}
