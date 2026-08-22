"use client";
import { useState } from "react";
import Button from "./Button";
import { useSequence } from "./hooks";
import { Badge, Disclosure, Icon } from "./primitives";
/* ─────────────────────────────────────────────────────────
 * DIFF TABLE
 * The proposed edit plays once and rests on the completed
 * diff. Each changed row is the control: click it to include
 * or exclude that specific addition/removal before applying.
 * ───────────────────────────────────────────────────────── */
/* two reveal beats; the trailing 0 parks useSequence on stage 2 */
const STAGE_DELAYS = [180, 260, 0];
export type DiffRow = {
  key: string;
  id: string;
  dept: string;
  email: string;
  removed: boolean;
};
export type DiffAddition = {
  key: string;
  id: string;
  dept: string;
  email: string;
};
const DEFAULT_ROWS: DiffRow[] = [
  { key: "rocky", id: "Rocky Road", dept: "Classic", email: "aurora-scoops", removed: true },
  { key: "bubblegum", id: "Bubblegum", dept: "Retro", email: "kumo-creamery", removed: true },
  { key: "mint", id: "Mint Chip", dept: "Classic", email: "maple-orbit", removed: false },
];
const DEFAULT_ADDED: DiffAddition = { key: "pistachio", id: "Pistachio", dept: "Seasonal", email: "maple-orbit" };
const DOT: Record<string, string> = {
  Classic: "bg-accent",
  Retro: "bg-ink-3",
  Seasonal: "bg-orange",
};
function IncludedMark({ included, tone }: { included: boolean; tone: "red" | "green" }) {
  return (
    <span
      aria-hidden
      className={`flex size-4.5 shrink-0 items-center justify-center rounded-[5px] transition-[background-color,color,transform] duration-150 ${
        included
          ? tone === "red" ? "bg-red text-canvas" : "bg-green text-canvas"
          : "bg-inset text-ink-3 shadow-hairline"
      }`}
      style={{ transform: included ? "scale(1)" : "scale(0.92)" }}
    >
      {included ? <Icon name="check" size={11} strokeWidth={3} /> : null}
    </span>
  );
}
export default function DiffTable({
  title = "Proposed menu cleanup",
  rows = DEFAULT_ROWS,
  added = DEFAULT_ADDED,
  onApply,
}: {
  title?: string;
  /** existing rows; removed:true rows render as toggleable removals */
  rows?: DiffRow[];
  /** the proposed new row (omit with null for removals-only diffs) */
  added?: DiffAddition | null;
  /** called once when the user applies the selected edits */
  onApply?: (summary: { removals: number; additions: number }) => void;
} = {}) {
  const stage = useSequence(STAGE_DELAYS);
  // 0 plain · 1 removals · 2 completed diff
  const tinted = stage >= 1;
  const settled = stage >= 2;
  const [accepted, setAccepted] = useState(false);
  const [edits, setEdits] = useState<Record<string, boolean>>(() =>
    Object.fromEntries([
      ...rows.filter((row) => row.removed).map((row) => [row.key, true]),
      ...(added ? [[added.key, true] as const] : []),
    ]),
  );
  const removals = rows.filter((row) => row.removed && edits[row.key]).length;
  const additions = added && edits[added.key] ? 1 : 0;
  const total = removals + additions;
  const showAdded = settled && added !== null;
  const toggleEdit = (key: string) => setEdits((current) => ({ ...current, [key]: !current[key] }));
  return (
    <div className="w-full max-w-95">
      <div className="relative overflow-hidden rounded-card bg-surface shadow-card">
        <div className="primitive-card-bar flex items-center justify-between border-b border-line">
          <span className="text-caption font-medium text-ink">{title}</span>
          {settled && !accepted && <span className="text-tiny text-ink-3">Click changed rows to toggle</span>}
        </div>
        <table className="w-full table-fixed border-collapse text-left">
          <colgroup>
            <col className="w-[34%]" />
            <col className="w-[30%]" />
            <col className="w-[36%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-line">
              {["Flavor", "Category", "Supplier"].map((h) => (
                <th key={h} className="primitive-table-cell text-small font-medium text-ink-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const out = row.removed && tinted && edits[row.key];
              const interactive = row.removed && settled && !accepted;
              return (
                /* rows swap the shared offset outline for an inset ring —
                   an offset outline would clip against the card's rounded
                   overflow-hidden edge (sanctioned deviation) */
                <tr
                  key={row.key}
                  tabIndex={interactive ? 0 : undefined}
                  role={row.removed ? "checkbox" : undefined}
                  aria-checked={row.removed ? edits[row.key] : undefined}
                  aria-label={row.removed ? `Include removing ${row.id}` : undefined}
                  aria-disabled={row.removed && accepted ? true : undefined}
                  onClick={interactive ? () => toggleEdit(row.key) : undefined}
                  onKeyDown={interactive ? (event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      toggleEdit(row.key);
                    }
                  } : undefined}
                  className={`border-b border-line transition-[background-color,filter,opacity] duration-150 last:border-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-accent ${
                    interactive ? "cursor-pointer hover:brightness-[0.985]" : ""
                  }`}
                  style={{ background: out ? "var(--red-tint)" : undefined }}
                >
                  <td
                    className="primitive-table-cell text-body font-medium tabular-nums transition-colors duration-200"
                    style={{ color: out ? "var(--red)" : "var(--ink)" }}
                  >
                    {row.id}
                  </td>
                  <td className="primitive-table-cell">
                    <span
                      className="inline-flex h-5.5 items-center gap-1.5 rounded-full bg-inset px-2 text-tiny font-medium shadow-hairline transition-opacity duration-200"
                      style={{ opacity: out ? 0.55 : 1 }}
                    >
                      <span className={`size-1.5 rounded-full ${DOT[row.dept] ?? "bg-ink-3"}`} />
                      <span className="text-ink-2">{row.dept}</span>
                    </span>
                  </td>
                  <td
                    className="primitive-table-cell text-caption whitespace-nowrap transition-colors duration-200"
                    style={{
                      color: out ? "var(--red)" : "var(--ink-2)",
                      textDecorationLine: out ? "line-through" : "none",
                      textDecorationColor: "color-mix(in srgb, var(--red) 50%, transparent)",
                    }}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate">{row.email}</span>
                      {row.removed && settled && <IncludedMark included={edits[row.key]} tone="red" />}
                    </span>
                  </td>
                </tr>
              );
            })}
            {/* added row */}
            {added && (
              <tr>
                <td colSpan={3} className="p-0">
                  <Disclosure open={showAdded} duration={200}>
                      <div
                        role="checkbox"
                        tabIndex={accepted ? -1 : 0}
                        aria-checked={edits[added.key]}
                        aria-disabled={accepted || undefined}
                        aria-label={`Include adding ${added.id}`}
                        onClick={accepted ? undefined : () => toggleEdit(added.key)}
                        onKeyDown={accepted ? undefined : (event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            toggleEdit(added.key);
                          }
                        }}
                        className={`grid grid-cols-[34%_30%_36%] items-center transition-[background-color,filter,opacity] duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-accent ${
                          accepted ? "" : "cursor-pointer hover:brightness-[0.985]"
                        }`}
                        style={{ background: edits[added.key] ? "var(--green-tint)" : undefined }}
                      >
                        <span className="primitive-table-cell text-body font-medium tabular-nums transition-colors duration-200" style={{ color: edits[added.key] ? "var(--green)" : "var(--ink-3)" }}>
                          {added.id}
                        </span>
                        <span className="primitive-table-cell">
                          <span className="inline-flex h-5.5 items-center gap-1.5 rounded-full bg-surface px-2 text-tiny font-medium shadow-hairline">
                            <span className="size-1.5 rounded-full bg-green" />
                            <span className="text-ink-2">{added.dept}</span>
                          </span>
                        </span>
                        <span className="primitive-table-cell text-caption transition-colors duration-200" style={{ color: edits[added.key] ? "var(--green)" : "var(--ink-3)" }}>
                          <span className="flex items-center justify-between gap-2">
                            <span className="min-w-0 truncate">{added.email}</span>
                            <IncludedMark included={edits[added.key]} tone="green" />
                          </span>
                        </span>
                      </div>
                  </Disclosure>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {/* footer — the summary follows the row-level selection */}
        {settled && (
          <div
            className="primitive-card-footer flex min-h-11 items-center justify-between"
            style={{ animation: "fade-up 180ms var(--ease-out-quint) both" }}
          >
            {accepted ? (
              <Badge
                tone="green"
                free
                className="py-1 pr-2.5 pl-1 text-caption"
                style={{ animation: "pop-in 180ms var(--ease-out-quint) both" }}
              >
                <span className="flex size-4.5 items-center justify-center rounded-full bg-green text-canvas">
                  <Icon name="check" size={11} strokeWidth={3} />
                </span>
                {total} {total === 1 ? "edit" : "edits"} applied
              </Badge>
            ) : (
              <>
                <span className="text-tiny tabular-nums text-ink-3">
                  {removals} {removals === 1 ? "removal" : "removals"} · {additions} {additions === 1 ? "addition" : "additions"}
                </span>
                <span className="flex items-center gap-1.5">
                  <Button
                    variant="accent"
                    size="sm"
                    disabled={total === 0}
                    onClick={() => {
                      setAccepted(true);
                      onApply?.({ removals, additions });
                    }}
                  >
                    Apply {total} {total === 1 ? "change" : "changes"}
                  </Button>
                </span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
