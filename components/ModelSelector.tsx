"use client";
import { useEffect, useId, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Chip, Icon, Popover } from "./primitives";
import { BrandIcon, type BrandName } from "./brand";
import { useAnchoredLayer } from "./hooks";
/* ─────────────────────────────────────────────────────────
 * MODEL SELECTOR — which model answers, chosen in one control
 * The control every AI product has and a plain Select gets wrong:
 * a model is a provider's mark, a name, one line on what it is
 * for, and the two numbers people decide by, the context window
 * and the price. Closed, it is a button the height of the row it
 * sits in (the composer's toolbar, a settings row): mark, name,
 * chevron. Open, a listbox grouped by provider; the active row is
 * the rails' flat fill, the chosen one carries a check.
 *
 * Marks come from brand.tsx when the provider has one and fall
 * back to the provider's initial in an inset circle, the same
 * fallback Sources uses. Tags are quiet chips (Fast, Reasoning,
 * Vision), never colour; a model is not a status.
 * ───────────────────────────────────────────────────────── */
export type Model = {
  key: string;
  name: string;
  provider: string;
  /** the provider's monochrome mark from brand.tsx */
  brand?: BrandName;
  /** one line on what it is for */
  description?: string;
  /** context window, as the reader reads it: "200k", "1M" */
  context?: string;
  /** price as the reader reads it: "$3 / 1M in" */
  price?: string;
  tags?: string[];
  disabled?: boolean;
};

export const DEFAULT_MODELS: Model[] = [
  { key: "gpt-5", name: "GPT-5", provider: "OpenAI", brand: "openai", description: "The default for drafts and replies.", context: "400k", price: "$1.25 / 1M", tags: ["Fast"] },
  { key: "gpt-5-mini", name: "GPT-5 mini", provider: "OpenAI", brand: "openai", description: "Summaries, tags, quick checks.", context: "400k", price: "$0.25 / 1M", tags: ["Fast", "Cheap"] },
  { key: "claude-sonnet", name: "Claude Sonnet", provider: "Anthropic", description: "Long documents and careful edits.", context: "200k", price: "$3 / 1M", tags: ["Reasoning", "Vision"] },
  { key: "claude-opus", name: "Claude Opus", provider: "Anthropic", description: "The hard proposals, when it matters.", context: "200k", price: "$15 / 1M", tags: ["Reasoning"] },
  { key: "gemini-pro", name: "Gemini Pro", provider: "Google", brand: "google", description: "Whole sites and long transcripts in one go.", context: "1M", price: "$1.25 / 1M", tags: ["Vision"] },
  { key: "llama", name: "Llama 4", provider: "Meta", brand: "meta", description: "Runs on the studio's own box.", context: "128k", price: "Free", tags: ["Local"], disabled: true },
];

function ProviderMark({ model, size = 16 }: { model: Model; size?: number }) {
  if (model.brand) return <BrandIcon name={model.brand} size={size} className="shrink-0 text-ink-2" />;
  return <span aria-hidden className="flex size-4 shrink-0 items-center justify-center rounded-full bg-inset text-nano font-semibold text-ink">{model.provider[0]?.toUpperCase()}</span>;
}

export default function ModelSelector({
  models = DEFAULT_MODELS,
  value,
  defaultValue,
  onChange,
  size = "sm",
  align = "start",
  label = "Model",
  className = "",
}: {
  models?: Model[];
  /** controlled selection */
  value?: string;
  defaultValue?: string;
  onChange?: (model: Model) => void;
  /** the trigger's height: sm 32px for a composer toolbar, md 36px for a settings row */
  size?: "sm" | "md";
  align?: "start" | "end";
  /** the accessible name of the control */
  label?: string;
  className?: string;
}) {
  const [own, setOwn] = useState(defaultValue ?? models.find((m) => !m.disabled)?.key ?? models[0]?.key);
  const current = value ?? own;
  const selected = models.find((m) => m.key === current) ?? models[0];
  const listId = useId();
  const { open, setOpen, position, anchorRef, openAt } = useAnchoredLayer<HTMLButtonElement>(listId);
  const enabled = models.map((m, i) => ({ m, i })).filter(({ m }) => !m.disabled).map(({ i }) => i);
  const [active, setActive] = useState(0);
  const show = () => {
    if (!openAt({ estimatedHeight: models.length * 44 + 40, width: 352, align })) return;
    setActive(Math.max(0, models.findIndex((m) => m.key === current)));
  };
  const choose = (model: Model) => {
    if (model.disabled) return;
    if (value === undefined) setOwn(model.key);
    onChange?.(model);
    setOpen(false);
    anchorRef.current?.focus();
  };
  const step = (dir: 1 | -1) => setActive((c) => { const at = enabled.indexOf(c); return enabled[Math.max(0, Math.min(enabled.length - 1, at + dir))] ?? c; });
  useEffect(() => { if (open) document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: "nearest" }); }, [open, active, listId]);
  const onKey = (event: ReactKeyboardEvent) => {
    if (!open) { if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) { event.preventDefault(); show(); } return; }
    if (event.key === "ArrowDown") { event.preventDefault(); step(1); }
    else if (event.key === "ArrowUp") { event.preventDefault(); step(-1); }
    else if (event.key === "Enter" || event.key === " ") { event.preventDefault(); choose(models[active]); }
    else if (event.key === "Escape") { event.preventDefault(); setOpen(false); }
    else if (event.key === "Tab") setOpen(false);
  };
  if (!selected) return null;
  const groups = models.reduce<{ provider: string; items: { m: Model; i: number }[] }[]>((acc, m, i) => {
    const g = acc.find((x) => x.provider === m.provider);
    if (g) g.items.push({ m, i }); else acc.push({ provider: m.provider, items: [{ m, i }] });
    return acc;
  }, []);
  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        role="combobox"
        aria-label={`${label}: ${selected.name}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKey}
        className={`corner-smooth inline-flex items-center gap-2 rounded-control bg-surface text-ink shadow-btn transition-colors duration-150 hover:bg-hover ${size === "md" ? "h-9 px-3 text-body" : "h-8 px-2.5 text-caption"} ${className}`}
      >
        <ProviderMark model={selected} size={size === "md" ? 16 : 14} />
        <span className="optical-text font-medium leading-none">{selected.name}</span>
        <Icon name="chevron" size={14} strokeWidth={2} className={`text-ink-3 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && position && (
        <Popover id={listId} role="listbox" x={position.x} top={position.top} bottom={position.bottom} width={352} className="max-h-96 overflow-y-auto p-1" onClose={() => setOpen(false)}>
          {groups.map((g, gi) => (
            <div key={g.provider} role="group" aria-label={g.provider}>
              <p className={`px-2 pb-1 text-micro font-medium tracking-wide text-ink-3 uppercase ${gi === 0 ? "pt-1" : "pt-2"}`}>{g.provider}</p>
              {g.items.map(({ m, i }) => {
                const isActive = i === active, isSelected = m.key === current;
                return (
                  <div
                    key={m.key}
                    id={`${listId}-${i}`}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={m.disabled || undefined}
                    onMouseEnter={m.disabled ? undefined : () => setActive(i)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => choose(m)}
                    className={`corner-smooth flex items-start gap-2.5 rounded-control px-2 py-2 transition-colors duration-150 ${m.disabled ? "cursor-default" : "cursor-pointer"} ${isActive && !m.disabled ? "bg-hover-2" : ""}`}
                  >
                    <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center"><ProviderMark model={m} size={14} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 overflow-hidden">
                        <span className={`shrink-0 text-caption font-medium ${m.disabled ? "text-ink-3" : "text-ink"}`}>{m.name}</span>
                        {m.tags?.map((t) => <Chip key={t} size="sm" className="hidden shrink-0 sm:inline-flex">{t}</Chip>)}
                      </span>
                      {m.description && <span className={`block truncate text-small ${m.disabled ? "text-ink-3" : "text-ink-2"}`}>{m.description}</span>}
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-0.5 text-small tabular-nums text-ink-3">
                      {m.context && <span>{m.context}</span>}
                      {m.price && <span>{m.price}</span>}
                    </span>
                    <span className="flex size-4 shrink-0 items-center justify-center self-center">{isSelected && <Icon name="check" size={14} strokeWidth={2.2} className="text-ink" />}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </Popover>
      )}
    </>
  );
}
