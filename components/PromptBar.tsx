"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Icon, SendButton, type IconName } from "./primitives";
import { useReducedMotion } from "./hooks";
/* ─────────────────────────────────────────────────────────
 * PROMPT BAR
 * A composer with real controls: attach, @ data sources,
 * / commands, a model picker, dictation, and send.
 * Type @ or / to open the menus; ↑↓ + Enter to pick.
 * Variants: Rounded (card radius) · Pill (full radius).
 *
 * Picking the flagship model fires a one-shot CSS rainbow
 * sweep (.rainbow-sweep in tokens.css) — no shader library,
 * no external deps, honors prefers-reduced-motion.
 * ───────────────────────────────────────────────────────── */
/* real product marks, inline so the file stays self-contained */
const BRANDS: Record<string, React.ReactNode> = {
  figma: (
    <svg width="11" height="16" viewBox="0 0 38 57" aria-hidden="true">
      <path d="M9.5 57A9.5 9.5 0 0 0 19 47.5V38H9.5a9.5 9.5 0 0 0 0 19z" fill="#0ACF83" />
      <path d="M0 28.5A9.5 9.5 0 0 1 9.5 19H19v19H9.5A9.5 9.5 0 0 1 0 28.5z" fill="#A259FF" />
      <path d="M0 9.5A9.5 9.5 0 0 1 9.5 0H19v19H9.5A9.5 9.5 0 0 1 0 9.5z" fill="#F24E1E" />
      <path d="M19 0h9.5a9.5 9.5 0 1 1 0 19H19V0z" fill="#FF7262" />
      <path d="M38 28.5a9.5 9.5 0 1 1-19 0 9.5 9.5 0 0 1 19 0z" fill="#1ABCFE" />
    </svg>
  ),
  slack: (
    <svg width="15" height="15" viewBox="0 0 127 127" aria-hidden="true">
      <path d="M27.2 80c0 7.3-5.9 13.2-13.2 13.2C6.7 93.2.8 87.3.8 80c0-7.3 5.9-13.2 13.2-13.2h13.2V80zm6.6 0c0-7.3 5.9-13.2 13.2-13.2 7.3 0 13.2 5.9 13.2 13.2v33c0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V80z" fill="#E01E5A" />
      <path d="M47 27.2c-7.3 0-13.2-5.9-13.2-13.2C33.8 6.7 39.7.8 47 .8c7.3 0 13.2 5.9 13.2 13.2v13.2H47zm0 6.7c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H13.9C6.6 60.3.7 54.4.7 47.1c0-7.3 5.9-13.2 13.2-13.2H47z" fill="#36C5F0" />
      <path d="M99.9 47.1c0-7.3 5.9-13.2 13.2-13.2 7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H99.9V47.1zm-6.6 0c0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V13.9C66.9 6.6 72.8.7 80.1.7c7.3 0 13.2 5.9 13.2 13.2v33.2z" fill="#2EB67D" />
      <path d="M80.1 99.8c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V99.8h13.2zm0-6.6c-7.3 0-13.2-5.9-13.2-13.2 0-7.3 5.9-13.2 13.2-13.2h33.1c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H80.1z" fill="#ECB22E" />
    </svg>
  ),
  gmail: (
    <svg width="15" height="12" viewBox="0 0 256 193" aria-hidden="true">
      <path d="M58.182 192.05V93.14L27.507 65.077 0 49.504v125.091c0 9.658 7.825 17.455 17.455 17.455h40.727Z" fill="#4285F4" />
      <path d="M197.818 192.05h40.727c9.659 0 17.455-7.826 17.455-17.455V49.505l-31.156 17.837-27.026 25.798v98.91Z" fill="#34A853" />
      <path d="m58.182 93.14-4.174-38.647 4.174-36.989L128 69.868l69.818-52.364 4.669 34.992-4.669 40.644L128 145.504 58.182 93.14Z" fill="#EA4335" />
      <path d="M197.818 17.504V93.14L256 49.504V26.231c0-21.585-24.64-33.89-41.89-20.945l-16.292 12.218Z" fill="#FBBC04" />
      <path d="m0 49.504 26.759 20.07L58.182 93.14V17.504L41.89 5.286C24.61-7.66 0 4.646 0 26.23v23.273Z" fill="#C5221F" />
    </svg>
  ),
};
export type Source = {
  key: string;
  name: string;
  desc: string;
  glyph?: IconName;
  brand?: string;
  attach?: boolean;
  connect?: boolean;
};
const DEFAULT_SOURCES: Source[] = [
  { key: "attach", name: "Add photos & files", desc: "Upload from your computer", glyph: "clip", attach: true },
  { key: "scoop", name: "Scoop Data", desc: "Sales & churn metrics", glyph: "chart" },
  { key: "flavors", name: "Flavor records", desc: "26 makers, tags, links", glyph: "layers" },
  { key: "web", name: "Web search", desc: "Real-time news and info", glyph: "globe" },
  { key: "figma", name: "Figma", desc: "Design-to-code workflows", brand: "figma" },
  { key: "slack", name: "Slack", desc: "Read and manage Slack", brand: "slack" },
  { key: "gmail", name: "Gmail", desc: "Read and manage Gmail", brand: "gmail", connect: true },
];
const DEFAULT_COMMANDS = [
  { key: "compare", name: "/compare", desc: "Flavor vs. last summer" },
  { key: "churn-plan", name: "/churn-plan", desc: "Draft a churn schedule" },
  { key: "restock", name: "/restock", desc: "Build a reorder list" },
  { key: "draft-email", name: "/draft-email", desc: "Write a supplier email" },
  { key: "summarize", name: "/summarize", desc: "Digest the thread so far" },
];
const DEFAULT_MODELS = [
  { key: "sprinkles-5", name: "Sprinkles 5", tag: "Flagship" },
  { key: "vanilla-1", name: "Vanilla 1", tag: "Basic" },
  { key: "freezer-burn", name: "Freezer Burn 0.4", tag: "Stale" },
];
const FILES = ["flavor-chart.png", "summer-menu.pdf", "pos-export.csv"];
const DICTATION = "Compare pistachio weekends to last summer";
/* self-running demo: walk the @ menu, then the / menu, and repeat.
 * Any pointer or key interaction hands control to the user. */
const AUTO_STEPS: {
  draft: string;
  active?: number;
  connect?: boolean;
  modelOpen?: boolean;
  model?: string;
  hold: number;
}[] = [
  { draft: "", connect: false, model: "vanilla-1", hold: 1100 },
  { draft: "@", active: 0, hold: 900 },
  { draft: "@", active: 1, hold: 620 },
  { draft: "@", active: 4, hold: 620 },
  { draft: "@", active: 6, hold: 700 },
  { draft: "@", active: 6, connect: true, hold: 1000 },
  { draft: "", hold: 700 },
  { draft: "/", active: 0, hold: 900 },
  { draft: "/", active: 1, hold: 620 },
  { draft: "/", active: 3, hold: 1000 },
  { draft: "", hold: 800 },
  // open the model picker and upgrade to the flagship → rainbow sweep
  { draft: "", modelOpen: true, hold: 1200 },
  { draft: "", model: "sprinkles-5", hold: 2400 },
  { draft: "", hold: 900 },
];
/* the last @word or /word being typed, if any */
function parseToken(draft: string): { kind: "at" | "slash"; query: string; start: number } | null {
  const match = /(^|\s)([@/])([\w-]*)$/.exec(draft);
  if (!match) return null;
  return {
    kind: match[2] === "@" ? "at" : "slash",
    query: match[3].toLowerCase(),
    start: match.index + match[1].length,
  };
}
export type Command = { key: string; name: string; desc: string };
export type Model = { key: string; name: string; tag: string };
export default function PromptBar({
  variant = "Rounded",
  demo = true,
  tall = false,
  placeholder,
  sources = DEFAULT_SOURCES,
  commands = DEFAULT_COMMANDS,
  models = DEFAULT_MODELS,
  onSend,
}: {
  variant?: "Rounded" | "Pill";
  /** the self-running walkthrough; turn off when embedding in a real surface */
  demo?: boolean;
  /** hero sizing: a multi-line input with controls on their own row */
  tall?: boolean;
  placeholder?: string;
  /** @ menu entries; defaults to demo content */
  sources?: Source[];
  /** / menu entries */
  commands?: Command[];
  /** model picker entries */
  models?: Model[];
  onSend?: (text: string) => void;
}) {
  const pill = variant === "Pill";
  const reduced = useReducedMotion();
  const [draft, setDraft] = useState("");
  const [dismissed, setDismissed] = useState(false);
  const [plusOpen, setPlusOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [model, setModel] = useState(models[1] ?? models[0]);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const [active, setActive] = useState(0);
  const [listening, setListening] = useState(false);
  const [auto, setAuto] = useState(demo);
  const [autoStep, setAutoStep] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [sweep, setSweep] = useState(0);
  const wide = expanded || tall;
  const [rowBox, setRowBox] = useState<{ top: number; height: number } | null>(null);
  const [engaged, setEngaged] = useState(false);
  const [modelBox, setModelBox] = useState<{ top: number; height: number } | null>(null);
  const [modelHovered, setModelHovered] = useState<number | null>(null);
  const [modelMenuLeft, setModelMenuLeft] = useState(0);
  const [modelMenuBottom, setModelMenuBottom] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const composerAnchorRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const modelRef = useRef<HTMLButtonElement>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const modelRowRefs = useRef<(HTMLButtonElement | null)[]>([]);
  /* hand control to the user: stop the demo loop, and when they aim at
   * the input itself, clear the demo's leftover draft for a clean start */
  const takeOver = (event: { target: EventTarget | null }) => {
    setAuto(false);
    if (auto && event.target === inputRef.current) setDraft("");
  };
  const token = dismissed ? null : parseToken(draft);
  const menu: "at" | "slash" | null = plusOpen ? "at" : token?.kind ?? null;
  const query = plusOpen ? "" : token?.query ?? "";
  const rows: { key: string; name: string; desc: string }[] =
    menu === "at"
      ? sources.filter((s) => s.name.toLowerCase().includes(query))
      : menu === "slash"
        ? commands.filter((c) => c.name.slice(1).startsWith(query))
        : [];
  useEffect(() => {
    setActive(0);
    setEngaged(false);
  }, [menu, query]);
  /* a single highlight glides to the active row instead of each row
   * toggling its own background — matches the gliding pill in the nav */
  useLayoutEffect(() => {
    const target = rowRefs.current[active];
    if (target) setRowBox({ top: target.offsetTop, height: target.offsetHeight });
  }, [menu, query, active, connected, rows.length]);
  /* same gliding highlight in the model menu — floats to the hovered
   * row, falling back to the currently-selected model */
  const modelIndex = models.findIndex((m) => m.key === model.key);
  useLayoutEffect(() => {
    if (!modelOpen) return;
    const target = modelRowRefs.current[modelHovered ?? modelIndex];
    if (target) setModelBox({ top: target.offsetTop, height: target.offsetHeight });
  }, [modelOpen, modelHovered, modelIndex]);
  /* The menu is outside the clipped composer, so align it to the model
   * trigger by measurement instead of pinning it to the far-right edge. */
  useLayoutEffect(() => {
    if (!modelOpen || !composerAnchorRef.current || !modelRef.current) return;
    const anchorRect = composerAnchorRef.current.getBoundingClientRect();
    const triggerRect = modelRef.current.getBoundingClientRect();
    setModelMenuLeft(Math.max(0, Math.min(triggerRect.left - anchorRect.left, anchorRect.width - 176)));
    setModelMenuBottom(anchorRect.bottom - triggerRect.top + 8);
  }, [modelOpen, wide, model.name]);
  useEffect(() => {
    if (!modelOpen) setModelHovered(null);
  }, [modelOpen]);
  /* Picking the flagship fires a one-shot rainbow sweep across the
   * interior — pure CSS (.rainbow-sweep), remounted per trigger. */
  const celebrate = () => {
    if (reduced) return;
    setSweep((s) => s + 1);
  };
  const selectModel = (next: Model) => {
    setModel(next);
    setModelOpen(false);
    if (next.key === "sprinkles-5") celebrate();
  };
  /* autoplay: apply the current step, then advance after its hold */
  useEffect(() => {
    if (!auto) return;
    const step = AUTO_STEPS[autoStep % AUTO_STEPS.length];
    setDraft(step.draft);
    if (step.active !== undefined) setActive(step.active);
    if (step.connect !== undefined) setConnected(step.connect);
    if (step.modelOpen !== undefined) setModelOpen(step.modelOpen);
    if (step.model) {
      const next = models.find((m) => m.key === step.model);
      if (next) selectModel(next);
    }
    const t = setTimeout(() => setAutoStep((s) => s + 1), step.hold);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, autoStep]);
  /* dictation resolves after a beat, like a real transcript landing */
  useEffect(() => {
    if (!listening) return;
    const t = setTimeout(() => {
      setDraft((current) => (current ? `${current.trimEnd()} ${DICTATION}` : DICTATION));
      setListening(false);
      inputRef.current?.focus();
    }, 2200);
    return () => clearTimeout(t);
  }, [listening]);
  /* Move wrapped text above the controls, then grow to a compact maximum. */
  useLayoutEffect(() => {
    const input = inputRef.current;
    const controls = controlsRef.current;
    const measure = measureRef.current;
    const modelButton = modelRef.current;
    if (!input || !controls || !measure || !modelButton) return;
    const fixedControlsWidth = 28 * 3 + modelButton.offsetWidth;
    const inlineGaps = 4 * 4;
    const inlineInputWidth = controls.clientWidth - fixedControlsWidth - inlineGaps;
    const needsFullWidth = draft.includes("\n") || measure.offsetWidth + 8 > inlineInputWidth;
    if (needsFullWidth !== expanded) {
      setExpanded(needsFullWidth);
    }
    const minHeight = 28;
    const maxHeight = 100;
    input.style.height = "0px";
    const contentHeight = input.scrollHeight;
    input.style.height = `${Math.min(Math.max(contentHeight, minHeight), maxHeight)}px`;
    input.style.overflowY = contentHeight > maxHeight ? "auto" : "hidden";
  }, [draft, expanded]);
  /* clicking anywhere outside the composer closes the open menus */
  useEffect(() => {
    if (!modelOpen && !plusOpen) return;
    const close = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setModelOpen(false);
        setPlusOpen(false);
      }
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [modelOpen, plusOpen]);
  const closeMenus = () => {
    setPlusOpen(false);
    setModelOpen(false);
  };
  const pick = (row: { key: string; name: string }) => {
    const source = sources.find((s) => s.key === row.key);
    if (source?.attach) {
      setAttachments((current) => [...current, FILES[current.length % FILES.length]]);
      if (token) setDraft(draft.slice(0, token.start));
    } else if (menu === "at") {
      setDraft(`${token ? draft.slice(0, token.start) : draft}@${row.name} `);
    } else {
      setDraft(`${token ? draft.slice(0, token.start) : draft}${row.name} `);
    }
    setPlusOpen(false);
    setDismissed(false);
    inputRef.current?.focus();
  };
  const canSend = draft.trim().length > 0 || attachments.length > 0;
  const send = () => {
    if (!canSend) return;
    onSend?.(draft.trim());
    setDraft("");
    setAttachments([]);
    closeMenus();
  };
  return (
    <div
      data-promptbar
      ref={rootRef}
      className={demo ? "flex min-h-[384px] w-full max-w-105 flex-col justify-end pb-8" : "w-full"}
      onPointerDownCapture={takeOver}
      onKeyDownCapture={takeOver}
    >
      {/* composer is the anchor — menus grow up from its top edge */}
      <div ref={composerAnchorRef} className="relative">
      {/* ── @ / slash menu ─────────────────────────────── */}
      {menu && (
        <div
          onMouseLeave={() => setEngaged(false)}
          className="absolute inset-x-0 bottom-full z-10 mb-2 rounded-md bg-surface p-1 shadow-overlay"
          style={{ animation: "pop-in 180ms var(--ease-out-quint) both", transformOrigin: "bottom center" }}
        >
          {/* single gliding highlight — appears once a row is hovered */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-1 rounded-sm bg-hover"
            style={{
              top: rowBox?.top ?? 0,
              height: rowBox?.height ?? 0,
              opacity: rowBox && engaged && rows.length > 0 ? 1 : 0,
              transition:
                "top 220ms var(--ease-out-quint), height 220ms var(--ease-out-quint), opacity 150ms ease",
            }}
          />
          {rows.map((row, i) => {
            const source = menu === "at" ? sources.find((s) => s.key === row.key) : undefined;
            return (
              <div
                key={row.key}
                ref={(el) => {
                  rowRefs.current[i] = el;
                }}
                onMouseEnter={() => {
                  setActive(i);
                  setEngaged(true);
                }}
                className="relative z-10 flex h-9 w-full items-center rounded-sm"
              >
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => pick(row)}
                  className="flex h-full min-w-0 flex-1 items-center gap-2.5 px-2 text-left"
                >
                  {source && (
                    <span className="flex size-5.5 shrink-0 items-center justify-center text-ink-2">
                      {source.brand ? BRANDS[source.brand] : <Icon name={source.glyph ?? "clip"} size={15} strokeWidth={1.8} />}
                    </span>
                  )}
                  <span className="shrink-0 text-caption font-medium text-ink">
                    {row.name}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-small text-ink-3">{row.desc}</span>
                </button>
                {source?.connect && (
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => setConnected((current) => !current)}
                    className={`shrink-0 pr-2 pl-1 text-small font-medium transition-colors duration-150 ${
                      connected ? "text-green" : "text-accent hover:underline"
                    }`}
                  >
                    {connected ? "Connected" : "Connect"}
                  </button>
                )}
              </div>
            );
          })}
          {rows.length === 0 && (
            <div className="flex h-9 items-center px-2 text-small text-ink-3">
              No matches for “{query}”
            </div>
          )}
          <div className="mt-1 border-t border-line px-2 pt-1.5 pb-1 text-tiny text-ink-3">
            {menu === "at" ? "Type to search sources & files" : "Type to search commands"}
          </div>
        </div>
      )}
      {/* ── model menu ─────────────────────────────────── */}
      {modelOpen && (
        <div
          onMouseLeave={() => setModelHovered(null)}
          className="absolute z-10 w-44 rounded-md bg-surface p-1 shadow-overlay"
          style={{ left: modelMenuLeft, bottom: modelMenuBottom, animation: "pop-in 180ms var(--ease-out-quint) both", transformOrigin: "bottom left" }}
        >
          {/* single gliding highlight — floats to the hovered / selected row */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-1 rounded-sm bg-hover"
            style={{
              top: modelBox?.top ?? 0,
              height: modelBox?.height ?? 0,
              opacity: modelBox && modelHovered !== null ? 1 : 0,
              transition:
                "top 220ms var(--ease-out-quint), height 220ms var(--ease-out-quint), opacity 150ms ease",
            }}
          />
          {models.map((m, i) => (
            <button
              key={m.key}
              type="button"
              ref={(el) => {
                modelRowRefs.current[i] = el;
              }}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setModelHovered(i)}
              onClick={() => {
                selectModel(m);
                inputRef.current?.focus();
              }}
              className="relative z-10 flex h-7.5 w-full items-center gap-2 rounded-sm px-2 text-left"
            >
              <span className="min-w-0 flex-1 truncate text-caption font-medium text-ink">{m.name}</span>
              <span className="shrink-0 text-tiny text-ink-3">{m.tag}</span>
              <span className={`shrink-0 text-ink ${m.key === model.key ? "" : "invisible"}`}>
                <Icon name="check" size={13} strokeWidth={2.5} />
              </span>
            </button>
          ))}
        </div>
      )}
      {/* ── composer ───────────────────────────────────── */}
      <div
        className={`relative isolate flex flex-col overflow-hidden border border-line bg-surface shadow-card transition-[border-color,border-radius] duration-150 focus-within:border-line-strong ${
          tall ? "gap-2.5 p-3.5" : "gap-1.5 p-1.5"
        } ${
          pill ? (attachments.length > 0 || wide ? "rounded-capsule" : "rounded-full") : tall ? "rounded-capsule" : "rounded-card"
        }`}
      >
        {/* rainbow sweep — remounts per trigger, fades itself out */}
        {sweep > 0 && (
          <div key={sweep} aria-hidden className="rainbow-sweep -z-10" style={{ borderRadius: "inherit" }} />
        )}
        <span
          ref={measureRef}
          aria-hidden="true"
          className="pointer-events-none absolute invisible whitespace-pre text-body leading-[18px]"
        >
          {draft}
        </span>
        {attachments.length > 0 && (
          <div className={`flex flex-wrap gap-1.5 pt-0.5 ${pill ? "px-1" : "px-0.5"}`}>
            {attachments.map((file, i) => (
              <span
                key={`${file}-${i}`}
                className={`flex h-6.5 items-center gap-1.5 bg-field py-1 pr-1 pl-1.5 text-tiny text-ink-2 shadow-hairline ${
                  pill ? "rounded-full" : "rounded-chip"
                }`}
                style={{ animation: "pop-in 200ms var(--ease-out-quint) both" }}
              >
                <Icon name="file" size={12} />
                <span className="max-w-36 truncate">{file}</span>
                <button
                  type="button"
                  aria-label={`Remove ${file}`}
                  onClick={() => setAttachments((current) => current.filter((_, j) => j !== i))}
                  className={`-my-1 flex size-6 items-center justify-center text-ink-3 transition-colors duration-150 hover:bg-line/70 hover:text-ink ${
                    pill ? "rounded-full" : "rounded-[5px]"
                  }`}
                >
                  <Icon name="close" size={10} strokeWidth={2.5} />
                </button>
              </span>
            ))}
          </div>
        )}
        <div
          ref={controlsRef}
          className={`grid items-end gap-x-1 gap-y-1.5 ${
            wide
              ? "grid-cols-[28px_auto_minmax(0,1fr)_28px_28px]"
              : "grid-cols-[28px_minmax(0,1fr)_auto_28px_28px]"
          }`}
        >
          <button
            type="button"
            aria-label="Add attachments and sources"
            aria-expanded={plusOpen}
            onClick={() => {
              setModelOpen(false);
              setPlusOpen((current) => !current);
              inputRef.current?.focus();
            }}
            className={`flex size-7 shrink-0 items-center justify-center justify-self-start text-ink-3 transition-[background-color,color,transform] duration-150 hover:bg-hover hover:text-ink active:scale-[0.94] ${
              pill ? "rounded-full" : "rounded-control"
            } ${plusOpen ? "bg-hover text-ink" : ""} ${wide ? "col-start-1 row-start-2" : "col-start-1 row-start-1"}`}
          >
            <Icon name="plus" size={16} strokeWidth={2} />
          </button>
          <textarea
            ref={inputRef}
            rows={1}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setDismissed(false);
              setPlusOpen(false);
            }}
            onKeyDown={(event) => {
              if (menu && rows.length > 0) {
                if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                  event.preventDefault();
                  setEngaged(true);
                  setActive((current) => (current + (event.key === "ArrowDown" ? 1 : rows.length - 1)) % rows.length);
                  return;
                }
                if ((event.key === "Enter" && !event.shiftKey) || event.key === "Tab") {
                  event.preventDefault();
                  pick(rows[active]);
                  return;
                }
              }
              if (event.key === "Escape") {
                setDismissed(true);
                closeMenus();
                return;
              }
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                send();
              }
            }}
            placeholder={listening ? "Listening…" : placeholder ?? "Write a message…"}
            aria-label="Prompt"
            className={`${tall ? "min-h-[68px] px-2 py-2 text-lead leading-5" : "min-h-7 px-1 py-[5px] text-body leading-[18px]"} min-w-0 w-full resize-none bg-transparent text-ink outline-none [overflow-wrap:anywhere] placeholder:text-ink-3 ${
              wide ? "col-span-full col-start-1 row-start-1" : "col-start-2 row-start-1"
            }`}
          />
          {/* model picker */}
          <button
            ref={modelRef}
            type="button"
            aria-expanded={modelOpen}
            aria-label="Choose model"
            onClick={() => {
              setPlusOpen(false);
              setModelOpen((current) => !current);
            }}
            className={`flex h-7 shrink-0 items-center gap-1 px-1.5 text-small font-medium text-ink-2 transition-colors duration-150 hover:bg-hover hover:text-ink ${
              pill ? "rounded-full" : "rounded-control"
            } ${wide ? "col-start-2 row-start-2 justify-self-start" : "col-start-3 row-start-1"}`}
          >
            {model.name}
            <span className="text-ink-3">
              <Icon name="chevron" size={11} strokeWidth={2.4} />
            </span>
          </button>
          {/* dictation */}
          <button
            type="button"
            aria-label={listening ? "Stop dictation" : "Start dictation"}
            aria-pressed={listening}
            onClick={() => setListening((current) => !current)}
            className={`flex size-7 shrink-0 items-center justify-center transition-[background-color,color,transform] duration-150 active:scale-[0.94] ${
              pill ? "rounded-full" : "rounded-control"
            } ${listening ? "bg-accent-tint text-accent" : "text-ink-3 hover:bg-hover hover:text-ink"} ${wide ? "col-start-4 row-start-2" : "col-start-4 row-start-1"}`}
          >
            {listening ? (
              <span className="flex h-3.5 items-center gap-[2.5px]">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-[2.5px] rounded-full bg-current"
                    style={{ height: "100%", animation: `eq-bounce 900ms ease-in-out ${i * 150}ms infinite` }}
                  />
                ))}
              </span>
            ) : (
              <Icon name="mic" size={15} strokeWidth={2} />
            )}
          </button>
          {/* send — tactile square (round in the pill variant) */}
          <SendButton
            enabled={canSend}
            round={pill}
            onClick={send}
            className={wide ? "col-start-5 row-start-2" : "col-start-5 row-start-1"}
          />
        </div>
      </div>
      </div>
    </div>
  );
}
