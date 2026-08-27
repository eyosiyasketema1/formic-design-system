"use client";
import { useState, type CSSProperties, type ReactNode } from "react";
import { fadeUp, StreamCaret, StreamText } from "./primitives";
/* ─────────────────────────────────────────────────────────
 * CHAT THREAD
 * A conversation column: user messages as right-aligned
 * bubbles, assistant replies flat on the canvas. The final
 * assistant message streams in word by word — embed richer
 * replies (StreamingText, ToolChips, ApprovalCard) as
 * MessageBubble children in a real app.
 * ───────────────────────────────────────────────────────── */
export type ChatRole = "user" | "assistant";
export type ChatMessage = { id: string; role: ChatRole; text: string };
const DEFAULT_MESSAGES: ChatMessage[] = [
  { id: "m1", role: "user", text: "Which flavor should we push this weekend?" },
  {
    id: "m2",
    role: "assistant",
    text: "Pistachio is the strongest candidate — sales are up 23% this month and it carries the best margin on the menu.",
  },
  { id: "m3", role: "user", text: "Draft the weekend plan for it." },
  {
    id: "m4",
    role: "assistant",
    text: "Here's the plan: churn a double batch Friday night, feature it on the A-board Saturday morning, and pair it with the waffle special through Sunday close.",
  },
];
export function MessageBubble({
  role,
  className = "",
  style,
  children,
}: {
  role: ChatRole;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  if (role === "user") {
    return (
      <div className={`flex justify-end ${className}`} style={style}>
        <div className="max-w-[85%] rounded-card rounded-br-sm bg-inset px-3.5 py-2 text-body leading-relaxed text-ink shadow-hairline">
          {children}
        </div>
      </div>
    );
  }
  return (
    <div className={`text-body leading-relaxed text-ink ${className}`} style={style}>
      {children}
    </div>
  );
}
export default function ChatThread({
  messages = DEFAULT_MESSAGES,
  streamLast = true,
  onDone,
}: {
  /** the conversation; defaults to demo content */
  messages?: ChatMessage[];
  /** stream the final assistant message in word by word */
  streamLast?: boolean;
  /** called once the streamed message settles */
  onDone?: () => void;
} = {}) {
  const last = messages[messages.length - 1];
  const streamed = streamLast && last?.role === "assistant";
  const [done, setDone] = useState(!streamed);
  return (
    <div className="flex w-full max-w-105 flex-col gap-4">
      {messages.map((message, index) => {
        const isStreaming = streamed && index === messages.length - 1;
        return (
          <MessageBubble
            key={message.id}
            role={message.role}
            style={fadeUp(index, { duration: 350, stagger: 120 })}
          >
            {isStreaming ? (
              <span aria-live="polite" aria-busy={!done}>
                <StreamText
                  text={message.text}
                  onDone={() => {
                    setDone(true);
                    onDone?.();
                  }}
                />
                {!done && <StreamCaret />}
              </span>
            ) : (
              message.text
            )}
          </MessageBubble>
        );
      })}
    </div>
  );
}
