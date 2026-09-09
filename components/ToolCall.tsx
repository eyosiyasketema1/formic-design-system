"use client";
import { isValidElement, useId, useState, type ReactNode } from "react";
import Button from "./Button";
import { Chip, Disclosure, Icon, Spinner, type IconName } from "./primitives";
/* ─────────────────────────────────────────────────────────
 * TOOL CALL — one thing an agent did, and what came back
 * ToolChips summarises a run; this is one call in full. A row the
 * reader can leave closed: state, what the tool was asked in plain
 * words, the tool's name, how long it took. Open, it shows the
 * input the agent sent and the output the tool returned, both as
 * the code they are, or the error and a way to retry.
 *
 *   pending   queued, nothing sent yet (a clock)
 *   running   sent, waiting (the spinner, the row's elapsed time live)
 *   done      returned (a green check, the duration)
 *   error     failed (a red mark, the message, Retry)
 *
 * State lives in the glyph and, for errors, the message; the row's
 * copy stays ink so a transcript of twenty calls reads as a list,
 * not a warning board. ToolCalls stacks several in one hairline
 * frame with dividers, the way they arrive.
 * ───────────────────────────────────────────────────────── */
export type ToolCallState = "pending" | "running" | "done" | "error";
export type ToolCallData = {
  /** the tool's name as the agent knows it: search_sites, read_file */
  name: string;
  /** what it was asked, in the reader's words: "Searching client sites" */
  label: string;
  state: ToolCallState;
  /** what the agent sent; an object is pretty-printed */
  input?: unknown;
  /** what the tool returned; an object is pretty-printed, a node is shown as is */
  output?: unknown;
  /** the failure, for `error` */
  error?: string;
  /** milliseconds, shown as 0.8s / 12s / 1m 04s */
  duration?: number;
  icon?: IconName;
};

export const DEFAULT_TOOL_CALLS: ToolCallData[] = [
  {
    name: "search_sites", label: "Searching the client sites for exit pages", state: "done", icon: "search", duration: 820,
    input: { query: "exit rate by page", sites: ["selamcoffee.com", "creamery.et"], period: "30d" },
    output: [{ site: "selamcoffee.com", page: "/menu", exits: 0.38 }, { site: "creamery.et", page: "/order", exits: 0.21 }],
  },
  {
    name: "read_file", label: "Reading the Northwind proposal", state: "done", icon: "file", duration: 140,
    input: { path: "proposals/northwind-bank.md" },
    output: "# Northwind Bank, brand and site\n\nScope: identity refresh, 12 templates, launch site.\nValue: ETB 724,000 over two phases.",
  },
  {
    name: "create_invoice", label: "Creating the September invoice", state: "error", icon: "receipt", duration: 310,
    input: { client: "Northwind Bank", amount: 362000, currency: "ETB", due: "2026-10-01" },
    error: "Northwind Bank has an open invoice (INV-0231). Close it before creating another.",
  },
  {
    name: "run_query", label: "Totalling hours this week", state: "running", icon: "database",
    input: { sql: "select sum(hours) from timesheets where week = '2026-W37'" },
  },
  { name: "send_summary", label: "Sending the weekly summary", state: "pending", icon: "send" },
];

export const formatDuration = (ms?: number) => {
  if (ms === undefined) return "";
  if (ms < 1000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  const m = Math.floor(ms / 60000), s = Math.round((ms % 60000) / 1000);
  return `${m}m ${String(s).padStart(2, "0")}s`;
};
const asText = (value: unknown) => (typeof value === "string" ? value : JSON.stringify(value, null, 2));

function StateGlyph({ state }: { state: ToolCallState }) {
  if (state === "running") return <Spinner size={14} className="text-ink-2" />;
  if (state === "done") return <Icon name="circle-check" size={16} strokeWidth={2} className="text-green" />;
  if (state === "error") return <Icon name="circle-x" size={16} strokeWidth={2} className="text-red" />;
  return <Icon name="clock" size={16} strokeWidth={2} className="text-ink-3" />;
}

function Block({ label, children, tone = "neutral" }: { label: string; children: ReactNode; tone?: "neutral" | "error" }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="font-mono text-micro tracking-wide text-ink-3 uppercase">{label}</span>
      {typeof children === "string"
        ? <pre className={`max-h-56 overflow-auto rounded-sm px-3 py-2 font-mono text-small leading-relaxed whitespace-pre-wrap ${tone === "error" ? "bg-red-tint text-red" : "bg-inset text-ink"}`}>{children}</pre>
        : <div className="rounded-sm bg-inset px-3 py-2 text-caption text-ink">{children}</div>}
    </div>
  );
}

export default function ToolCall({
  call,
  defaultOpen,
  onRetry,
  className = "",
}: {
  call: ToolCallData;
  /** open on mount; errors open by default, the rest closed */
  defaultOpen?: boolean;
  /** shown on `error` */
  onRetry?: (call: ToolCallData) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen ?? call.state === "error");
  const bodyId = useId();
  const hasBody = call.input !== undefined || call.output !== undefined || call.error;
  return (
    <div className={`w-full min-w-0 ${className}`}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={hasBody ? bodyId : undefined}
        disabled={!hasBody}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-9 w-full items-center gap-3 rounded-control px-2 py-1.5 text-left transition-colors duration-150 enabled:hover:bg-hover disabled:cursor-default"
      >
        <span className="flex size-5 shrink-0 items-center justify-center"><StateGlyph state={call.state} /></span>
        {call.icon && <Icon name={call.icon} size={15} strokeWidth={1.8} className="shrink-0 text-ink-2" />}
        <span className="min-w-0 flex-1 truncate text-caption font-medium text-ink">
          {call.label}
        </span>
        <Chip mono size="sm" className="hidden shrink-0 sm:inline-flex">{call.name}</Chip>
        {call.state === "running"
          ? <span className="shrink-0 text-small text-ink-3">running</span>
          : call.duration !== undefined && <span className="shrink-0 text-small tabular-nums text-ink-3">{formatDuration(call.duration)}</span>}
        {hasBody && <Icon name="chevron" size={14} strokeWidth={2} className={`shrink-0 text-ink-3 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />}
      </button>
      {hasBody && (
        <Disclosure open={open} live={call.state === "error"}>
          <div id={bodyId} className="flex flex-col gap-3 px-2 pt-1 pb-3 pl-10">
            {call.input !== undefined && <Block label="Input">{asText(call.input)}</Block>}
            {call.state === "running" && <p className="text-caption text-ink-2">Waiting for {call.name}…</p>}
            {call.output !== undefined && call.state !== "error" && <Block label="Output">{isValidElement(call.output) ? call.output : asText(call.output)}</Block>}
            {call.error && (
              <Block label="Error" tone="error">{call.error}</Block>
            )}
            {call.state === "error" && onRetry && (
              <div><Button variant="secondary" size="sm" icon={<Icon name="retry" />} onClick={() => onRetry(call)}>Try again</Button></div>
            )}
          </div>
        </Disclosure>
      )}
    </div>
  );
}

/** several calls in one frame, in the order they happened */
export function ToolCalls({
  calls = DEFAULT_TOOL_CALLS,
  onRetry,
  className = "",
}: {
  calls?: ToolCallData[];
  onRetry?: (call: ToolCallData) => void;
  className?: string;
}) {
  return (
    <div className={`flex w-full min-w-0 flex-col divide-y divide-line rounded-md bg-surface p-1 shadow-hairline ${className}`}>
      {calls.map((call, i) => <ToolCall key={`${call.name}-${i}`} call={call} onRetry={onRetry} />)}
    </div>
  );
}
