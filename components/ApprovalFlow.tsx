"use client";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Button from "./Button";
import { Badge, Card, GlideMenu, Icon, IconButton, RadioCheck } from "./primitives";
/* Types and demo data come from ApprovalCard — same shape, same questions.
 * Keeping a second copy is exactly what the extraction rule forbids. */
import { DEFAULT_QUESTIONS, type Answer, type Question } from "./ApprovalCard";
import { useReducedMotion } from "./hooks";
/* ─────────────────────────────────────────────────────────
 * APPROVAL FLOW (human-in-the-loop, multi-question)
 * The stepper sibling of ApprovalCard. One question at a time,
 * but the stack slides vertically as you move between them and
 * the card's height animates to fit, so the card never jumps.
 * The step counter rolls like an odometer. Single-choice answers
 * auto-advance; multi-select waits for Continue.
 *
 * Use ApprovalCard for a short, directly-controlled approval;
 * use this when the run needs several questions in sequence.
 * ───────────────────────────────────────────────────────── */
/** Re-exported for convenience; identical to ApprovalCard's Question. */
export type ApprovalQuestion = Question;

export type ApprovalLabels = {
  skip: string;
  continue: string;
  send: string;
  customPlaceholder: string;
  sentMessage: string;
};
const DEFAULT_LABELS: ApprovalLabels = {
  skip: "Skip",
  continue: "Continue",
  send: "Send",
  customPlaceholder: "Something else…",
  sentMessage: "Answers sent",
};
const ROLL_MS = 400;
/* One easing for everything (rule 4) — the house curve. */
const SLIDE = "360ms var(--ease-out-quint)";
const AUTO_ADVANCE_MS = 480;

/* ── RollingDigits ─────────────────────────────────────── */
/* Odometer counter: only the characters that actually change
 * roll, and they roll in the direction of travel. Kept local —
 * the extraction rule promotes on the SECOND use, not the first. */
function RollingDigits({ value }: { value: string }) {
  const prevRef = useRef(value);
  const [oldVal, setOldVal] = useState(value);
  const [newVal, setNewVal] = useState(value);
  const [rolling, setRolling] = useState(false);
  const [shifted, setShifted] = useState(false);
  const [dir, setDir] = useState<"up" | "down">("up");
  useEffect(() => {
    if (prevRef.current === value) return;
    const from = prevRef.current;
    prevRef.current = value;
    const fromN = parseInt(from, 10);
    const toN = parseInt(value, 10);
    setDir(Number.isFinite(fromN) && Number.isFinite(toN) && toN < fromN ? "down" : "up");
    setOldVal(from);
    setNewVal(value);
    setRolling(true);
    setShifted(false);
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setShifted(true));
    });
    const done = setTimeout(() => {
      setRolling(false);
      setOldVal(value);
      setShifted(false);
    }, ROLL_MS);
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearTimeout(done);
    };
  }, [value]);
  const chars = rolling ? newVal : oldVal;
  return (
    <>
      {Array.from({ length: chars.length }, (_, i) => {
        const o = oldVal[i] ?? "";
        const n = chars[i] ?? "";
        if (!rolling || o === n) return <span key={`${i}-${n}`}>{n}</span>;
        const top = dir === "down" ? n : o;
        const bottom = dir === "down" ? o : n;
        const restY = dir === "down" ? "0" : "-1em";
        const startY = dir === "down" ? "-1em" : "0";
        return (
          <span
            key={`${i}-${o}-${n}-${dir}`}
            style={{ display: "inline-block", position: "relative", overflow: "hidden", height: "1em", lineHeight: "1em", verticalAlign: "-0.05em" }}
          >
            <span
              style={{
                display: "flex",
                flexDirection: "column",
                transition: `transform ${ROLL_MS - 50}ms var(--ease-out-quint)`,
                transform: `translateY(${shifted ? restY : startY})`,
              }}
            >
              <span style={{ height: "1em", lineHeight: "1em" }}>{top}</span>
              <span style={{ height: "1em", lineHeight: "1em" }}>{bottom}</span>
            </span>
          </span>
        );
      })}
    </>
  );
}

export default function ApprovalFlow({
  questions = DEFAULT_QUESTIONS,
  labels,
  onSubmitted,
  onAnswerChange,
  resettable = true,
}: {
  questions?: ApprovalQuestion[];
  labels?: Partial<ApprovalLabels>;
  onSubmitted?: (answers: Answer[]) => void;
  onAnswerChange?: (questionIndex: number, answer: number[]) => void;
  resettable?: boolean;
}) {
  const t = { ...DEFAULT_LABELS, ...labels };
  const reduced = useReducedMotion();
  const [qi, setQi] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number[]>>({});
  const [custom, setCustom] = useState<Record<number, string>>({});
  const [sent, setSent] = useState(false);
  const [open, setOpen] = useState(true);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const questionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const measured = useRef(false);
  const [viewportH, setViewportH] = useState<number | undefined>(undefined);
  const [trackY, setTrackY] = useState(0);
  const [animate, setAnimate] = useState(false);
  /* Until the first question is measured, render only the active one so the
     initial (and SSR) height is Q1's — not every question stacked, which
     would flash to full height and then shrink on mount. */
  const [ready, setReady] = useState(false);
  /* A shorter questions array must not leave qi dangling past the end. */
  useEffect(() => {
    setQi((current) => Math.min(current, Math.max(questions.length - 1, 0)));
  }, [questions.length]);
  const last = qi === questions.length - 1;
  const selected = answers[qi] ?? [];
  const hasAnswer = selected.length > 0 || Boolean(custom[qi]?.trim());

  const sync = (withAnim: boolean) => {
    const item = questionRefs.current[qi];
    if (!item) return;
    setViewportH(item.offsetHeight);
    setTrackY(item.offsetTop);
    setAnimate(withAnim && !reduced);
  };
  useLayoutEffect(() => {
    const withAnim = measured.current;
    measured.current = true;
    sync(withAnim);
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qi, answers, custom, open, sent]);
  useEffect(() => {
    const id = requestAnimationFrame(() => sync(measured.current));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qi]);
  useEffect(() => () => { if (advanceTimer.current) clearTimeout(advanceTimer.current); }, []);
  /* When the step changes, focus follows it. Without this the user's focus is
     left inside the question that just became aria-hidden — screen readers
     lose their place and the next Tab starts from a hidden node. Skipped on
     first paint so the card doesn't steal focus when it appears. */
  useEffect(() => {
    if (!measured.current) return;
    const item = questionRefs.current[qi];
    if (!item || !item.contains(document.activeElement)) {
      item?.focus({ preventScroll: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qi]);

  const goTo = (next: number) => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    setQi(Math.min(Math.max(next, 0), questions.length - 1));
  };
  /* Takes an explicit map: auto-advance fires from inside the same click that
     calls setAnswers, so `answers` in that closure is still the OLD value and
     the user's final selection would be dropped from the payload. */
  const send = (finalAnswers: Record<number, number[]> = answers) => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    setSent(true);
    onSubmitted?.(
      questions.map((entry, i) => ({
        question: entry.q,
        selected: (finalAnswers[i] ?? []).map((idx) => entry.options[idx]),
        custom: custom[i]?.trim() || undefined,
      })),
    );
  };
  /* Closing must cancel a pending auto-advance, or the flow submits itself
     after the card is already gone. */
  const close = () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    setOpen(false);
  };
  const advance = () => {
    if (last) send();
    else goTo(qi + 1);
  };
  const toggle = (index: number) => {
    const type = questions[qi]?.type;
    if (!type) return;
    const picked = answers[qi] ?? [];
    const next = type === "radio"
      ? [index]
      : picked.includes(index)
        ? picked.filter((item) => item !== index)
        : [...picked, index];
    const merged = { ...answers, [qi]: next };
    setAnswers(merged);
    onAnswerChange?.(qi, next);          // outside the updater — updaters must be pure
    if (type === "radio") {
      setCustom((current) => ({ ...current, [qi]: "" }));
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
      advanceTimer.current = setTimeout(() => {
        if (last) send(merged);          // the map that includes this very pick
        else setQi((current) => Math.min(questions.length - 1, current + 1));
      }, AUTO_ADVANCE_MS);
    }
  };
  const reset = () => {
    setQi(0);
    setAnswers({});
    setCustom({});
    setSent(false);
    setOpen(true);
    measured.current = false;
  };

  if (!open) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Open approval
      </Button>
    );
  }
  if (sent) {
    return (
      <div className="flex w-full max-w-80 items-center gap-3" style={{ animation: "pop-in 260ms var(--ease-out-quint) both" }}>
        <Badge tone="green" free className="gap-1.5 py-1 pr-2.5 pl-1 text-caption">
          {/* the tick is text-canvas so dark mode keeps contrast (rule 2) */}
          <span className="flex size-4.5 items-center justify-center rounded-full bg-green text-canvas">
            <Icon name="check" size={11} strokeWidth={3} />
          </span>
          {t.sentMessage}
        </Badge>
        {resettable && (
          <button type="button" onClick={reset} className="text-small font-medium text-ink-3 transition-colors duration-150 hover:text-ink">
            Start over
          </button>
        )}
      </div>
    );
  }
  return (
    <div className="w-full max-w-80">
      <Card className="relative" style={{ animation: "fade-up 380ms var(--ease-out-quint) both" }}>
        <IconButton
          label="Dismiss"
          onClick={close}
          className="absolute top-2.5 right-2.5 z-10 text-ink-3 hover:bg-hover hover:text-ink"
        >
          <Icon name="close" size={14} strokeWidth={2.2} />
        </IconButton>
        {/* The live region is a node whose TEXT changes. Putting it on the
            sliding viewport announced nothing on a step change (only aria-hidden
            flipped) and dumped a text input into a live region. */}
        <span className="sr-only" aria-live="polite">
          Question {qi + 1} of {questions.length}. {questions[qi]?.q}
        </span>
        <div className="primitive-card-pad">
          {/* the question itself is the heading */}
          <div
            className="overflow-hidden"
            style={{ height: viewportH, transition: animate ? `height ${SLIDE}` : undefined }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 26,
                transform: `translate3d(0, ${-trackY}px, 0)`,
                transition: animate ? `transform ${SLIDE}` : undefined,
                willChange: "transform",
              }}
            >
              {questions.map((question, qIdx) => {
                const active = qIdx === qi;
                if (!ready && !active) return null;
                const picked = answers[qIdx] ?? [];
                const questionStyle: CSSProperties = {
                  opacity: active ? 1 : 0,
                  transition: animate ? `opacity ${SLIDE}` : undefined,
                  pointerEvents: active ? undefined : "none",
                };
                return (
                  <div
                    key={`${question.q}-${qIdx}`}
                    ref={(el) => { questionRefs.current[qIdx] = el; }}
                    tabIndex={-1}
                    aria-hidden={active ? undefined : true}
                    style={questionStyle}
                  >
                    <div className="pr-7 text-body font-medium text-ink">{question.q}</div>
                    <GlideMenu className="mt-2.5 flex flex-col gap-1" highlightClassName="inset-x-0 rounded-control bg-hover">
                      {question.options.map((option, i) => {
                        const on = picked.includes(i);
                        return (
                          <button
                            key={`${option}-${i}`}
                            type="button"
                            data-menu-row
                            aria-pressed={on}
                            tabIndex={active ? 0 : -1}
                            onClick={() => { if (active) toggle(i); }}
                            className="relative z-10 flex items-center gap-1.5 rounded-control py-1 pr-2 pl-1 text-left transition-colors duration-150"
                          >
                            {/* the shared primitive, not a hand-rolled copy */}
                            <RadioCheck type={question.type} on={on} />
                            <span className={`min-w-0 text-caption transition-colors duration-200 ${on ? "text-ink" : "text-ink-2"}`}>
                              {option}
                            </span>
                          </button>
                        );
                      })}
                      {/* focus-within is the only focus affordance here: the input
                          is outside .primitive-field, and tokens.css suppresses
                          input:focus-visible on the assumption of that wrapper. */}
                      <label data-menu-row className="relative z-10 flex items-center gap-1.5 rounded-control py-1 pr-2 pl-1 transition-colors duration-150 focus-within:bg-hover">
                        <input
                          value={custom[qIdx] ?? ""}
                          tabIndex={active ? 0 : -1}
                          onChange={(event) => {
                            if (!active) return;
                            setCustom((current) => ({ ...current, [qIdx]: event.target.value }));
                            if (question.type === "radio") setAnswers((current) => ({ ...current, [qIdx]: [] }));
                          }}
                          onKeyDown={(event) => {
                            if (!active) return;
                            if (event.key === "Enter" && hasAnswer) {
                              event.preventDefault();
                              advance();
                            }
                          }}
                          placeholder={t.customPlaceholder}
                          aria-label="Custom answer"
                          className="min-w-0 flex-1 bg-transparent pl-1.5 text-caption text-ink outline-none placeholder:text-ink-3"
                        />
                      </label>
                    </GlideMenu>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        {/* footer — step nav (rolling counter) + pill actions */}
        <div className="primitive-card-footer flex items-center justify-between gap-3">
          <div className="flex items-center gap-1 text-ink-3">
            <IconButton label="Previous question" disabled={qi <= 0} onClick={() => goTo(qi - 1)}
              className="enabled:hover:text-ink disabled:opacity-35">
              <Icon name="chevron-left" size={14} strokeWidth={2} />
            </IconButton>
            <span className="inline-flex items-center text-small font-medium tracking-tight text-ink-3 tabular-nums" style={{ lineHeight: 1 }}>
              <RollingDigits value={`${qi + 1} / ${questions.length}`} />
            </span>
            <IconButton label="Next question" disabled={last} onClick={() => goTo(qi + 1)}
              className="enabled:hover:text-ink disabled:opacity-35">
              <Icon name="chevron-right" size={14} strokeWidth={2} />
            </IconButton>
          </div>
          <div className="-mr-0.5 flex items-center gap-1.5">
            <Button variant="ghost" size="sm" onClick={() => (last ? close() : goTo(qi + 1))}>
              {t.skip}
            </Button>
            <Button variant="accent" size="sm" disabled={!hasAnswer} onClick={advance}>
              {last ? t.send : t.continue}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
