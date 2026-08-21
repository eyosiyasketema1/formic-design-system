"use client";
import { useState } from "react";
import { Icon, IconButton } from "./primitives";
/* ─────────────────────────────────────────────────────────
 * APPROVAL CARD (human-in-the-loop)
 * One question at a time; elongated pills show progress;
 * the circular arrow up top advances (↑ sends on the last).
 * Choices, paging, and submission are directly controlled.
 * ───────────────────────────────────────────────────────── */
export type Question = {
  q: string;
  type: "radio" | "check";
  options: string[];
};
export type Answer = {
  question: string;
  selected: string[];
  custom?: string;
};
const DEFAULT_QUESTIONS: Question[] = [
  {
    q: "How many flavors should we launch?",
    type: "radio",
    options: ["Three (core line)", "Five (full case)", "Just one hero"],
  },
  {
    q: "Which mix-ins should we stock?",
    type: "check",
    options: ["Chocolate chips", "Waffle bits", "Sprinkles"],
  },
  {
    q: "Which market do we enter first?",
    type: "radio",
    options: ["Food trucks", "Grocery freezers", "Scoop shops"],
  },
];
export default function ApprovalCard({
  questions = DEFAULT_QUESTIONS,
  onSubmitted,
  resettable = true,
}: {
  /** questions to ask; defaults to demo content */
  questions?: Question[];
  /** receives the structured answers when the user sends */
  onSubmitted?: (answers: Answer[]) => void;
  resettable?: boolean;
} = {}) {
  const [qi, setQi] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number[]>>({});
  const [custom, setCustom] = useState<Record<number, string>>({});
  const [sent, setSent] = useState(false);
  const [open, setOpen] = useState(true);
  const question = questions[qi];
  const last = qi === questions.length - 1;
  const selected = answers[qi] ?? [];
  const hasAnswer = selected.length > 0 || Boolean(custom[qi]?.trim());
  const submit = (finalAnswers: Record<number, number[]> = answers) => {
    setSent(true);
    onSubmitted?.(
      questions.map((entry, i) => ({
        question: entry.q,
        selected: (finalAnswers[i] ?? []).map((idx) => entry.options[idx]),
        custom: custom[i]?.trim() || undefined,
      })),
    );
  };
  const toggle = (index: number) => {
    setAnswers((current) => {
      const picked = current[qi] ?? [];
      const next = question.type === "radio"
        ? [index]
        : picked.includes(index)
          ? picked.filter((item) => item !== index)
          : [...picked, index];
      return { ...current, [qi]: next };
    });
    if (question.type === "radio") {
      setCustom((current) => ({ ...current, [qi]: "" }));
      // single-choice auto-advances
      window.setTimeout(() => {
        if (qi === questions.length - 1) {
          submit({ ...answers, [qi]: [index] });
        } else setQi((current) => Math.min(questions.length - 1, current + 1));
      }, 480);
    }
  };
  const reset = () => {
    setQi(0);
    setAnswers({});
    setCustom({});
    setSent(false);
    setOpen(true);
  };
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="rounded-control bg-surface px-3 py-2 text-caption font-medium text-ink shadow-btn transition-colors duration-150 hover:bg-hover">
        Open approval
      </button>
    );
  }
  // Once answered, the whole card fires off into a small confirmation badge.
  if (sent) {
    return (
      <div className="flex w-full max-w-80 items-center gap-3" style={{ animation: "pop-in 260ms var(--ease-out-quint) both" }}>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-tint py-1 pr-2.5 pl-1 text-caption font-medium text-green">
          <span className="flex size-4.5 items-center justify-center rounded-full bg-green text-canvas">
            <Icon name="check" size={11} strokeWidth={3} />
          </span>
          Answers sent
        </span>
        {resettable && (
          <button type="button" onClick={reset} className="text-small font-medium text-ink-3 transition-colors duration-150 hover:text-ink">
            Start over
          </button>
        )}
      </div>
    );
  }
  return (
    <div className="flex min-h-[196px] w-full max-w-80 flex-col items-stretch">
      <div className="w-full self-start overflow-hidden rounded-card bg-surface shadow-card">
        {(
          <div key={qi} className="primitive-card-pad" style={{ animation: "fade-up 350ms var(--ease-out-quint) both" }}>
            <div className="flex items-start justify-between gap-3">
              <span className="text-body font-medium text-ink">{question.q}</span>
              <IconButton
                label="Dismiss"
                onClick={() => setOpen(false)}
                className="text-ink-3 hover:bg-hover hover:text-ink"
              >
                <Icon name="close" />
              </IconButton>
            </div>
            <div className="mt-2 flex flex-col gap-0.5">
              {question.options.map((option, i) => {
                const on = selected.includes(i);
                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(i)}
                    className="-mx-1.5 flex items-center gap-2 rounded-control px-1.5 py-1 text-left transition-colors duration-150 hover:bg-hover"
                  >
                    <span
                      className={`flex size-4 shrink-0 items-center justify-center transition-colors duration-200
                        ${question.type === "radio" ? "rounded-full" : "rounded-[5px]"}
                        ${on ? "bg-ink text-canvas" : "shadow-[inset_0_0_0_1.5px_var(--line-strong)] text-transparent"}`}
                    >
                      {question.type === "radio" ? (
                        <span className="size-1.5 rounded-full bg-canvas transition-transform duration-200" style={{ transform: on ? "scale(1)" : "scale(0)" }} />
                      ) : (
                        <Icon name="check" size={12} strokeWidth={3} />
                      )}
                    </span>
                    <span className={`text-body transition-colors duration-200 ${on ? "text-ink" : "text-ink-2"}`}>
                      {option}
                    </span>
                  </button>
                );
              })}
              <label className="-mx-1.5 flex items-center gap-2 rounded-control px-1.5 py-1 transition-colors duration-150 focus-within:bg-hover hover:bg-hover">
                <span aria-hidden="true" className="size-4 shrink-0" />
                <input
                  value={custom[qi] ?? ""}
                  onChange={(event) => {
                    setCustom((current) => ({ ...current, [qi]: event.target.value }));
                    if (question.type === "radio") setAnswers((current) => ({ ...current, [qi]: [] }));
                  }}
                  placeholder="Type something…"
                  aria-label="Custom answer"
                  className="min-w-0 flex-1 bg-transparent text-body text-ink outline-none placeholder:text-ink-3"
                />
              </label>
            </div>
          </div>
        )}
        {/* footer — ring-dot pager + send arrow */}
        <div className="primitive-card-footer flex items-center justify-between">
          <span className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Previous"
              disabled={qi === 0 || sent}
              onClick={() => setQi((current) => Math.max(0, current - 1))}
              className="flex size-6 items-center justify-center rounded-[5px] text-ink-3 transition-colors duration-150 enabled:hover:bg-hover enabled:hover:text-ink-2 disabled:opacity-35"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <span className="flex items-center gap-1">
              {questions.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Go to question ${i + 1}`}
                  aria-current={i === qi && !sent ? "step" : undefined}
                  disabled={sent}
                  onClick={() => setQi(i)}
                  className="rounded-full transition-[width,height,background-color,border-color,border-width] duration-300 disabled:cursor-default"
                  style={
                    i === qi && !sent
                      ? { width: 9, height: 9, border: "2.5px solid var(--ink)" }
                      : sent || i < qi
                        ? { width: 7, height: 7, background: "var(--ink-3)" }
                        : { width: 7, height: 7, border: "1.5px solid var(--ink-3)" }
                  }
                />
              ))}
            </span>
            <button
              type="button"
              aria-label="Next"
              disabled={last || sent}
              onClick={() => setQi((current) => Math.min(questions.length - 1, current + 1))}
              className="flex size-6 items-center justify-center rounded-[5px] text-ink-3 transition-colors duration-150 enabled:hover:bg-hover enabled:hover:text-ink-2 disabled:opacity-35"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
            </button>
          </span>
          {!sent && (
            <button
              type="button"
              aria-label={last ? "Send answers" : "Next question"}
              disabled={!hasAnswer}
              onClick={() => {
                if (last) submit();
                else setQi((current) => current + 1);
              }}
              className="-mr-0.5 flex size-7 items-center justify-center rounded-control transition-[background-color,color,transform] duration-200 enabled:active:scale-[0.96]"
              style={{
                background: hasAnswer ? "var(--ink)" : "var(--field)",
                color: hasAnswer ? "var(--surface)" : "var(--ink-3)",
                boxShadow: hasAnswer ? "var(--highlight-raised)" : "var(--shadow-btn)",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
