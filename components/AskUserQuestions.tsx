"use client";
import { useEffect, useId, useRef, useState } from "react";
import Button from "./Button";
import { Card, Icon, RadioCheck, fadeUp } from "./primitives";
/* ─────────────────────────────────────────────────────────
 * ASK USER QUESTIONS — an agent asks, the person answers
 * A stepped flow of questions with numbered options. Press 1 to 9
 * to pick, Enter to confirm, Backspace or the back control to
 * return. Single-select advances on its own; multi-select waits
 * for Next. An option row can be "Other" with an inline text
 * field, a whole question can be free text (a textarea), and a
 * question can be skippable. `onComplete` returns every answer.
 *
 * Use it when an agent needs a decision before it can continue
 * (which file, which approach, how far to go). For a yes / no
 * with consequences use ApprovalCard; for a plain form use Field.
 *
 * Ported from Micka Touillaud's Ask User Questions (fluid
 * functionalism, MIT), rebuilt on Formic primitives with no
 * motion or headless-ui dependency.
 * ───────────────────────────────────────────────────────── */
export type AskOption = { id: string; title: string; description?: string };
export type AskQuestion = {
  id: string;
  title: string;
  description?: string;
  /** the choices; omit for a free-text question */
  options?: AskOption[];
  multiSelect?: boolean;
  /** appends an "Other" row with an inline text field */
  allowOther?: boolean;
  otherPlaceholder?: string;
  /** a textarea is the whole answer; ⌘/Ctrl+Enter submits */
  freeText?: boolean;
  freeTextPlaceholder?: string;
  skippable?: boolean;
  nextLabel?: string;
};
export type AskAnswer = { questionId: string; selectedIds: string[]; otherText?: string; skipped?: boolean };

const DEFAULT_QUESTIONS: AskQuestion[] = [
  {
    id: "scope",
    title: "How far should I take the refactor?",
    description: "The module compiles either way; this decides how much I touch.",
    options: [
      { id: "minimal", title: "Minimal", description: "Fix the failing path only" },
      { id: "module", title: "This module", description: "Clean up everything in the file" },
      { id: "callers", title: "Module and callers", description: "Also update the three call sites" },
    ],
    allowOther: true,
    otherPlaceholder: "Something else…",
  },
  {
    id: "checks",
    title: "Which checks should run before I open the PR?",
    options: [
      { id: "types", title: "Type check" },
      { id: "unit", title: "Unit tests" },
      { id: "lint", title: "Lint" },
      { id: "e2e", title: "End-to-end", description: "Slow: about four minutes" },
    ],
    multiSelect: true,
    skippable: true,
  },
  {
    id: "notes",
    title: "Anything I should know about this code?",
    freeText: true,
    freeTextPlaceholder: "Conventions, gotchas, who owns it…",
    skippable: true,
  },
];

const OTHER = "__other";

export default function AskUserQuestions({
  questions = DEFAULT_QUESTIONS,
  onComplete,
  onSkip,
  skipLabel = "Skip",
  className = "",
}: {
  questions?: AskQuestion[];
  onComplete?: (answers: Record<string, AskAnswer>) => void;
  onSkip?: (questionId: string, index: number) => void;
  skipLabel?: string;
  className?: string;
}) {
  const id = useId();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AskAnswer>>({});
  const [picked, setPicked] = useState<string[]>([]);
  const [other, setOther] = useState("");
  const [done, setDone] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const otherRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const q = questions[index];
  const total = questions.length;
  const options = q?.options ?? [];
  const rows = q?.allowOther ? [...options, { id: OTHER, title: "Other", description: undefined }] : options;

  /* restore the answer when stepping back to a question */
  useEffect(() => {
    const prev = q ? answers[q.id] : undefined;
    /* Other lives in otherText, not selectedIds: put its row back on */
    setPicked([...(prev?.selectedIds ?? []), ...(prev?.otherText && q?.allowOther ? [OTHER] : [])]);
    setOther(prev?.otherText ?? "");
    /* keep focus inside the flow so the shortcuts keep working: the
       textarea for free text, otherwise the question title (rule 6) */
    requestAnimationFrame(() => (q?.freeText ? textRef.current : titleRef.current)?.focus({ preventScroll: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- answers is read once per step
  }, [index]);

  const commit = (answer: AskAnswer) => {
    const next = { ...answers, [answer.questionId]: answer };
    setAnswers(next);
    if (index + 1 < total) setIndex(index + 1);
    else {
      setDone(true);
      onComplete?.(next);
    }
  };
  const canNext = q?.freeText ? true : picked.length > 0 && (!picked.includes(OTHER) || other.trim().length > 0);
  const submit = () => {
    if (!q || !canNext) return;
    commit({
      questionId: q.id,
      selectedIds: picked.filter((p) => p !== OTHER),
      otherText: q.freeText ? other.trim() || undefined : picked.includes(OTHER) ? other.trim() : undefined,
    });
  };
  const choose = (optionId: string) => {
    if (!q) return;
    if (q.multiSelect) {
      setPicked((p) => (p.includes(optionId) ? p.filter((x) => x !== optionId) : [...p, optionId]));
      if (optionId === OTHER) requestAnimationFrame(() => otherRef.current?.focus());
      return;
    }
    setPicked([optionId]);
    if (optionId === OTHER) {
      requestAnimationFrame(() => otherRef.current?.focus());
      return;
    }
    commit({ questionId: q.id, selectedIds: [optionId] });
  };
  const skip = () => {
    if (!q) return;
    onSkip?.(q.id, index);
    commit({ questionId: q.id, selectedIds: [], skipped: true });
  };
  const back = () => index > 0 && setIndex(index - 1);

  /* 1..9 pick a row, Enter confirms, Backspace steps back: only while
     the flow holds focus and no text field is being typed in */
  const onKeyDown = (event: React.KeyboardEvent) => {
    const typing = (event.target as HTMLElement).matches("input, textarea");
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) { event.preventDefault(); submit(); return; }
    if (typing) return;
    const n = Number(event.key);
    if (n >= 1 && n <= 9 && rows[n - 1]) { event.preventDefault(); choose(rows[n - 1].id); return; }
    if (event.key === "Enter") { event.preventDefault(); submit(); }
    if (event.key === "Backspace") { event.preventDefault(); back(); }
  };

  if (done || !q) {
    return (
      <Card className={`w-full max-w-130 p-5 ${className}`}>
        <div className="flex items-center gap-2 text-body font-medium text-ink">
          <Icon name="circle-check" size={16} strokeWidth={2} className="text-green" />
          Thanks, continuing.
        </div>
        <p className="mt-1 text-caption text-ink-3">{Object.values(answers).filter((a) => !a.skipped).length} of {total} answered.</p>
      </Card>
    );
  }
  const otherOn = picked.includes(OTHER);
  return (
    <Card className={`w-full max-w-130 ${className}`} onKeyDown={onKeyDown}>
      {/* progress: one hairline segment per question */}
      {total > 1 && (
        <div className="flex gap-1 px-5 pt-4" aria-hidden>
          {questions.map((x, i) => (
            <span key={x.id} className={`h-0.5 flex-1 rounded-full transition-colors duration-300 ${i <= index ? "bg-ink" : "bg-line"}`} />
          ))}
        </div>
      )}
      <div className="flex flex-col gap-1 px-5 pt-4">
        {total > 1 && <p className="font-mono text-micro tracking-wide text-ink-3 uppercase">Question {index + 1} of {total}</p>}
        <h3 ref={titleRef} id={`${id}-title`} tabIndex={-1} className="text-title font-semibold tracking-tight text-ink outline-none">{q.title}</h3>
        {q.description && <p className="text-caption text-ink-3">{q.description}</p>}
      </div>

      {q.freeText ? (
        <div className="px-5 pt-4">
          <textarea
            ref={textRef}
            value={other}
            onChange={(event) => setOther(event.target.value)}
            placeholder={q.freeTextPlaceholder ?? "Type your answer…"}
            aria-labelledby={`${id}-title`}
            rows={4}
            className="primitive-field w-full resize-y rounded-control border border-line bg-field px-3 py-2 text-body text-ink outline-none placeholder:text-ink-3"
          />
          <p className="mt-1.5 text-small text-ink-3">⌘ Enter to continue</p>
        </div>
      ) : (
        <div role={q.multiSelect ? "group" : "radiogroup"} aria-labelledby={`${id}-title`} className="flex flex-col gap-1 px-3 pt-4">
          {rows.map((o, i) => {
            const on = picked.includes(o.id);
            const isOther = o.id === OTHER;
            return (
              <div key={o.id} style={fadeUp(i, { duration: 260, stagger: 40 })}>
                <button
                  type="button"
                  role={q.multiSelect ? "checkbox" : "radio"}
                  aria-checked={on}
                  onClick={() => choose(o.id)}
                  className={`corner-smooth flex w-full items-center gap-3 rounded-control px-2 py-2 text-left transition-colors duration-150 ${on ? "bg-hover-2" : "hover:bg-hover"}`}
                >
                  <RadioCheck type={q.multiSelect ? "check" : "radio"} on={on} />
                  <span className="min-w-0 flex-1">
                    <span className={`block text-caption ${on ? "font-medium text-ink" : "text-ink"}`}>{o.title}</span>
                    {o.description && <span className="block text-small text-ink-3">{o.description}</span>}
                  </span>
                  {i < 9 && (
                    <kbd aria-hidden className={`flex size-5 shrink-0 items-center justify-center rounded-sm font-mono text-tiny ${on ? "bg-ink text-canvas" : "bg-inset text-ink-3"}`}>{i + 1}</kbd>
                  )}
                </button>
                {isOther && otherOn && (
                  <div className="pt-1 pr-2 pl-9">
                    <input
                      ref={otherRef}
                      value={other}
                      onChange={(event) => setOther(event.target.value)}
                      onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); submit(); } }}
                      placeholder={q.otherPlaceholder ?? "Tell me more…"}
                      aria-label="Other"
                      className="primitive-field h-8 w-full rounded-control border border-line bg-field px-3 text-caption text-ink outline-none placeholder:text-ink-3"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-2 flex items-center gap-2 border-t border-line px-3 py-3">
        <Button variant="ghost" size="sm" icon={<Icon name="arrow-left" size={14} />} onClick={back} disabled={index === 0} aria-label="Previous question">Back</Button>
        <span className="min-w-0 flex-1 truncate text-small text-ink-3">
          {q.freeText ? "" : q.multiSelect ? "Pick any, then Next. 1 to 9 toggles." : otherOn ? "Type, then Enter." : "Press 1 to 9 to choose."}
        </span>
        {q.skippable && <Button variant="ghost" size="sm" onClick={skip}>{skipLabel}</Button>}
        {(q.multiSelect || q.freeText || otherOn) && (
          <Button variant="primary" size="sm" iconEnd={<Icon name="arrow-right" size={14} />} onClick={submit} disabled={!canNext}>
            {q.nextLabel ?? (index + 1 < total ? "Next" : "Done")}
          </Button>
        )}
      </div>
    </Card>
  );
}
