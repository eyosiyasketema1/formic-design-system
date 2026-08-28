"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { MessageBubble } from "./ChatThread";
import CodeBlock from "./CodeBlock";
import Markdown from "./Markdown";
import PromptBar from "./PromptBar";
import SidebarNav from "./SidebarNav";
import { Avatar, ShimmerLabel, StreamCaret, StreamText } from "./primitives";
/* ─────────────────────────────────────────────────────────
 * CHAT APP
 * The full AI chat interface, composed exactly as the system
 * intends: SidebarNav rail · a thread of MessageBubbles that
 * embed Markdown / CodeBlock (or any component) as assistant
 * content · PromptBar pinned below. Sending plays a scripted
 * thinking → streaming reply; wire onSend to a real backend
 * and pass conversation/reply for real data.
 *
 * Requires styles/sidebar.css (SidebarNav) alongside tokens.
 * ───────────────────────────────────────────────────────── */
export type ChatAppMessage = { id: string; role: "user" | "assistant"; content: ReactNode };
const DEFAULT_CONVERSATION: ChatAppMessage[] = [
  {
    id: "u1",
    role: "user",
    content: "What's selling best this month? Show me the numbers and the restock function.",
  },
  {
    id: "a1",
    role: "assistant",
    content: (
      <div className="flex flex-col gap-3">
        <Markdown
          content={`Pistachio leads with **214 scoops** this week, up 9%. The top three:

| Flavor | Scoops | Trend |
| --- | --- | --- |
| Pistachio | 214 | Rising |
| Vanilla Bean | 167 | Flat |
| Rocky Road | 121 | Falling |`}
        />
        <CodeBlock filename="restock.ts" />
      </div>
    ),
  },
];
const DEFAULT_REPLY =
  "Queued — a double pistachio batch churns Friday night and cases by Saturday open. I also nudged Maple Orbit for extra base; approve the order in Suppliers when it lands.";
export default function ChatApp({
  conversation = DEFAULT_CONVERSATION,
  reply = DEFAULT_REPLY,
  activeTitle = "Weekend flavor plan",
  userName = "Turumba Team",
  className = "",
}: {
  /** the thread; assistant content can be any composed node */
  conversation?: ChatAppMessage[];
  /** scripted reply streamed after a send — replace with a backend */
  reply?: string;
  activeTitle?: string;
  userName?: string;
  className?: string;
} = {}) {
  const [messages, setMessages] = useState<ChatAppMessage[]>(conversation);
  const [phase, setPhase] = useState<"idle" | "thinking" | "streaming">("idle");
  const idRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollToEnd = () => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };
  useEffect(scrollToEnd, [messages, phase]);
  useEffect(() => {
    if (phase !== "thinking") return;
    const timer = window.setTimeout(() => setPhase("streaming"), 900);
    return () => window.clearTimeout(timer);
  }, [phase]);
  const send = (text: string) => {
    if (phase !== "idle") return;
    setMessages((current) => [
      ...current,
      { id: `sent-${(idRef.current += 1)}`, role: "user", content: text },
    ]);
    setPhase("thinking");
  };
  const settle = () => {
    setMessages((current) => [
      ...current,
      { id: `reply-${(idRef.current += 1)}`, role: "assistant", content: reply },
    ]);
    setPhase("idle");
  };
  return (
    /* demo app frame — a fixed-height shell like ChatComposer's card */
    <div className={`flex h-[560px] w-full overflow-hidden rounded-card border border-line bg-canvas shadow-card ${className}`}>
      <div className="hidden shrink-0 md:flex">
        <SidebarNav fill activeTitle={activeTitle} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-line px-4">
          <span className="min-w-0 truncate text-body font-medium text-ink">{activeTitle}</span>
          <Avatar name={userName} size="sm" />
        </header>
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
            {messages.map((message) => (
              <MessageBubble key={message.id} role={message.role}>
                {message.content}
              </MessageBubble>
            ))}
            {phase === "thinking" && (
              <MessageBubble role="assistant">
                <ShimmerLabel>Thinking…</ShimmerLabel>
              </MessageBubble>
            )}
            {phase === "streaming" && (
              <MessageBubble role="assistant">
                <span aria-live="polite" aria-busy>
                  <StreamText text={reply} onProgress={scrollToEnd} onDone={settle} />
                  <StreamCaret />
                </span>
              </MessageBubble>
            )}
          </div>
        </div>
        <div className="shrink-0 border-t border-line px-4 py-3">
          <div className="mx-auto w-full max-w-2xl">
            <PromptBar demo={false} placeholder="Message Creamery Ops…" onSend={send} />
          </div>
        </div>
      </div>
    </div>
  );
}
