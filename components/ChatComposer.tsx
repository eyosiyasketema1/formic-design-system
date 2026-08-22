"use client";
import { useEffect, useRef, useState } from "react";
import { Card, fadeUp, Icon, IconButton, SendButton, type IconName } from "./primitives";
/* ─────────────────────────────────────────────────────────
 * CHAT — interactive panel with tabs, replies, and composer.
 * The reply sequence begins only after the user sends.
 * Analytics: wire the `onSend` callback — this component
 * deliberately ships no tracking of its own.
 * ───────────────────────────────────────────────────────── */
type Phase = "idle" | "sent" | "reply1" | "reply2" | "done";
const DEFAULT_TABS = ["Flavors", "Suppliers"];
const HEADER_ACTIONS: { name: IconName; label: string }[] = [
  { name: "plus", label: "New chat" },
  { name: "clock", label: "History" },
  { name: "ellipsis", label: "More options" },
];
export type Reply = { label: string; sub: string; time: string; body: string };
const DEFAULT_REPLIES: Reply[] = [
  { label: "Sales History", sub: "Flavor Data", time: "4s", body: "Pulled 3 summers of mint chip sales for comparison." },
  { label: "Comparison", sub: "Trend Detection", time: "2s", body: "Mint chip is up 12% with stronger weekend peaks." },
];
function ReplySection({
  label,
  sub,
  time,
  body,
  resolving,
}: {
  label: string;
  sub: string;
  time: string;
  body: string;
  resolving?: boolean;
}) {
  return (
    <div
      className="flex w-full flex-col gap-1.5 transition-[opacity,filter,transform] duration-400"
      style={{
        opacity: resolving ? 0.55 : 1,
        filter: resolving ? "blur(0.5px)" : "blur(0)",
        transform: resolving ? "scale(0.985)" : "scale(1)",
        transformOrigin: "top left",
        transitionTimingFunction: "var(--ease-out-quint)",
        ...fadeUp(0, { duration: 400 }),
      }}
    >
      <div className="flex items-center gap-1 text-small leading-[1.3]">
        <span className="font-medium text-ink">{label}</span>
        <span className="text-ink-2">{sub}</span>
        <span className="text-ink">for {time}</span>
      </div>
      <p className="text-body leading-normal text-ink">{body}</p>
    </div>
  );
}
export default function ChatComposer({
  tabs = DEFAULT_TABS,
  placeholder = "Prompt or tag a flavor with @",
  initialMessage = "Compare mint chip to last summer",
  replies = DEFAULT_REPLIES,
  onSend,
}: {
  /** header tab labels */
  tabs?: string[];
  placeholder?: string;
  /** message pre-filled in the thread on mount ("" for an empty thread) */
  initialMessage?: string;
  /** the two staged replies shown after sending; defaults to demo content */
  replies?: Reply[];
  /** called with the prompt text on send — attach analytics here */
  onSend?: (text: string) => void;
}) {
  const [phase, setPhase] = useState<Phase>(initialMessage ? "done" : "idle");
  const [draft, setDraft] = useState("");
  const [submitted, setSubmitted] = useState(initialMessage);
  const [tab, setTab] = useState(tabs[0]);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    if (phase === "sent") t = setTimeout(() => setPhase("reply1"), 500);
    else if (phase === "reply1") t = setTimeout(() => setPhase("reply2"), 1400);
    else if (phase === "reply2") t = setTimeout(() => setPhase("done"), 1200);
    else return;
    return () => clearTimeout(t);
  }, [phase]);
  const sent = phase !== "idle";
  const canSend = draft.trim().length > 0;
  const send = () => {
    if (!canSend) return;
    const text = draft.trim();
    setSubmitted(text);
    onSend?.(text);
    setDraft("");
    setPhase("sent");
  };
  return (
    <Card className="flex h-[288px] w-full max-w-95 flex-col self-start">
      {/* header — tabs + actions */}
      <div className="flex shrink-0 items-center justify-between border-b border-line p-1.5">
        <div className="flex items-center">
          {tabs.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={tab === item}
              onClick={() => setTab(item)}
              className={`rounded-sm px-2 py-[3px] text-body text-ink transition-[background-color,opacity] duration-150 ${tab === item ? "bg-field" : "opacity-50 hover:opacity-75"}`}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {HEADER_ACTIONS.map(({ name, label }) => (
            <IconButton key={name} label={label} className="text-ink-3 hover:bg-hover hover:text-ink-2">
              <Icon name={name} size={15} strokeWidth={2} />
            </IconButton>
          ))}
        </div>
      </div>
      {/* conversation — fixed region so the card never changes shape */}
      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-3 pt-2.5 pb-1">
        {/* user bubble — right aligned, soft block */}
        <div className="flex justify-end pl-14">
          <div
            className="rounded-md bg-field px-3 py-1.5 text-body leading-[1.4] text-ink
              transition-[opacity,transform] duration-300"
            style={{
              opacity: sent ? 1 : 0,
              transform: sent ? "translateY(0)" : "translateY(10px)",
              transitionTimingFunction: "var(--ease-out-quint)",
            }}
          >
            {submitted}
          </div>
        </div>
        <div aria-live="polite" className="contents">
          {(phase === "reply1" || phase === "reply2" || phase === "done") && replies[0] ? (
            <ReplySection {...replies[0]} />
          ) : null}
          {(phase === "reply2" || phase === "done") && replies[1] ? (
            <ReplySection {...replies[1]} resolving={phase === "reply2"} />
          ) : null}
        </div>
      </div>
      {/* composer */}
      <div className="mt-auto shrink-0 p-1.5">
        <div
          role="presentation"
          onClick={() => inputRef.current?.focus()}
          className="flex cursor-text flex-col gap-2 rounded-control border border-line bg-field p-2.5 shadow-field transition-[border-color,box-shadow] duration-150 focus-within:border-line-strong focus-within:[box-shadow:var(--shadow-field-focus)]"
        >
          <input
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.nativeEvent.isComposing) send();
            }}
            placeholder={placeholder}
            aria-label="Chat prompt"
            className="min-h-4.5 bg-transparent text-body leading-[1.4] text-ink outline-none placeholder:text-ink-3"
          />
          <div className="flex items-center justify-end">
            <SendButton enabled={canSend} onClick={send} />
          </div>
        </div>
      </div>
    </Card>
  );
}
