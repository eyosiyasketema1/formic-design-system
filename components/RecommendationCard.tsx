"use client";
import { useState, type ReactNode } from "react";
import Button, { type ButtonVariant } from "./Button";
import { Card, Disclosure } from "./primitives";
/* ─────────────────────────────────────────────────────────
 * RECOMMENDATION CARD
 * The card holds its shape. Pressing "Alternatives" opens a
 * new drawer listing the other options; picking one promotes
 * it to the recommendation. The primary action confirms.
 * ───────────────────────────────────────────────────────── */
export type RecommendationOption = {
  key: string;
  /** rich recommendation body (inline code chips welcome) */
  body: ReactNode;
  /** one-line summary shown in the alternatives drawer */
  short: string;
  /** 0–3 bars of confidence */
  signal: 0 | 1 | 2 | 3;
  /** CSS color for the meter, e.g. "var(--green)" */
  tone: string;
  label: string;
  cta: string;
  ctaVariant: ButtonVariant;
};
const codeChip = (text: string, tone: "accent" | "orange") => (
  <code
    className={`rounded-md px-1.5 py-0.5 font-mono text-small ${
      tone === "accent" ? "bg-accent-tint text-accent" : "bg-orange-tint text-orange"
    }`}
  >
    {text}
  </code>
);
const DEFAULT_OPTIONS: RecommendationOption[] = [
  {
    key: "high",
    body: (
      <>
        Reorder waffle cones from {codeChip("cone_king", "accent")} with lead time{" "}
        {codeChip("7_days", "accent")}.
      </>
    ),
    short: "Reorder from cone_king · 7-day lead",
    signal: 3,
    tone: "var(--green)",
    label: "High confidence",
    cta: "Accept",
    ctaVariant: "accent",
  },
  {
    key: "review",
    body: (
      <>
        Switch vanilla to {codeChip("vanilla_madagascar", "orange")} for peak season.
      </>
    ),
    short: "Switch to vanilla_madagascar",
    signal: 2,
    tone: "var(--orange)",
    label: "Needs review",
    cta: "Configure",
    ctaVariant: "primary",
  },
  {
    key: "none",
    body: (
      <>
        Fall back to a <span className="font-medium text-ink">full restock</span> across every SKU.
      </>
    ),
    short: "Full restock across every SKU",
    signal: 0,
    tone: "var(--ink-3)",
    label: "No signal",
    cta: "Accept full restock",
    ctaVariant: "primary",
  },
];
function Meter({ signal, tone }: { signal: number; tone: string }) {
  return (
    <span aria-hidden className="flex items-end gap-0.5">
      {[0, 1, 2].map((bar) => (
        <span
          key={bar}
          className="w-1 rounded-full transition-colors duration-300"
          style={{ height: 10, background: bar < signal ? tone : "var(--line-strong)" }}
        />
      ))}
    </span>
  );
}
export default function RecommendationCard({
  title = "Want me to place this restock order?",
  options = DEFAULT_OPTIONS,
  onAccept,
}: {
  title?: string;
  /** ranked options; the first is the initial recommendation */
  options?: RecommendationOption[];
  /** called with the accepted option */
  onAccept?: (option: RecommendationOption) => void;
} = {}) {
  const [selected, setSelected] = useState(0);
  const [open, setOpen] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const active = options[selected];
  const others = options.map((o, i) => ({ o, i })).filter(({ i }) => i !== selected);
  return (
    <Card className="w-full max-w-95">
      <div className="primitive-card-pad">
        <span className="text-body font-semibold text-ink">{title}</span>
        <p
          key={active.key}
          className="mt-1.5 min-h-12 text-body leading-relaxed text-ink-2"
          style={{ animation: "fade-in 180ms ease-out both" }}
        >
          {active.body}
        </p>
      </div>
      {/* alternatives drawer — a distinctly new section of the card */}
      <Disclosure open={open}>
          <div className="border-t border-line bg-inset px-2 py-2">
            <p className="px-1.5 pb-1 text-tiny font-medium text-ink-3">
              Other options
            </p>
            {others.map(({ o, i }) => (
              <button
                key={o.key}
                type="button"
                onClick={() => {
                  setSelected(i);
                  setAccepted(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-control px-1.5 py-1.5
                  text-left transition-colors duration-150 hover:bg-hover"
              >
                <Meter signal={o.signal} tone={o.tone} />
                <span className="min-w-0 flex-1 truncate text-caption text-ink">{o.short}</span>
                <span className="shrink-0 text-tiny text-ink-3">{o.label}</span>
              </button>
            ))}
          </div>
      </Disclosure>
      <div className="primitive-card-footer flex items-center justify-between gap-3 bg-inset">
        <span className="flex items-center gap-2">
          <Meter signal={active.signal} tone={active.tone} />
          <span className="text-caption font-medium text-ink-2">{active.label}</span>
        </span>
        <span className="-mr-0.5 flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            aria-expanded={open}
            onClick={() => setOpen((current) => !current)}
          >
            Alternatives
          </Button>
          <Button
            variant={accepted ? "success" : active.ctaVariant}
            size="sm"
            onClick={() => {
              if (accepted) return;
              setAccepted(true);
              onAccept?.(active);
            }}
          >
            {accepted ? "Accepted" : active.cta}
          </Button>
        </span>
      </div>
    </Card>
  );
}
