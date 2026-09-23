/* Brief
   Reader:   the person who just ran the installer, in the browser it opened
   Question: did it work, and what do I do next?
   Action:   copy a test prompt and paste it into their AI tool, opened in this folder
   Register: text
*/
/* The first page. Your AI tool replaces it with whichever test prompt you
   paste; nothing here is meant to stay. */
import { useEffect, useRef, useState } from "react";
import Button from "../formic/components/Button";
import Panel from "../formic/components/Panel";
import { FormicMark } from "../formic/components/brand";
import { Icon } from "../formic/components/primitives";

const PREFIX = "Use Formic (src/formic), read AGENTS.md, then";
const CLOSE = "Everything must work, not look like it works. Use the demo data the components ship (Formic Studio, ETB); no empty states, no placeholders. Everything you need is in src/formic and AGENTS.md; do not fetch formicai.dev. Only the base is installed: every component this prompt names that is not yet in src/formic/components, add with npx formicai add followed by its name (npx formicai add --list shows the names); never write a stand-in.";

/* Three test prompts, three different screens, so the first page is not
   always a dashboard. Each one replaces the welcome page; App.tsx is the
   AI tool's to change, main.tsx and CustomizeNudge.tsx are not. */
const PROMPTS: { label: string; title: string; caption: string; text: string }[] = [
  {
    label: "Test prompt 1",
    title: "Studio dashboard",
    caption: "Figures, two charts and a table; the classic first screen",
    text: `${PREFIX} replace the welcome page (App.tsx is yours to change; keep main.tsx and CustomizeNudge.tsx as they are) with Formic Studio's dashboard, composed the way AGENTS.md (Composition intelligence, Dashboard) says: an AppShell with the rail from the config; a page header with a caption whose actions hold a segmented Tabs time range (7 days, 30 days, 90 days) that changes every figure and chart below, plus two buttons (Export, New report; the label is the verb only, the icon goes in the \`icon\` prop, \`icon="download"\` and \`icon="plus"\`, never as a word in the label); no filter row under the header; four StatCards in one row built like the gallery's headline tiles: \`display={<CountUp value={…} />}\`, a delta with its tone, an icon (one tile \`iconTone="accent"\`, the rest neutral) and a \`trend\` sparkline with \`trendSmooth\` and \`trendAnimate\`; then a two-thirds Panel holding a LineChart of revenue by month (\`guides\`, two series where one has values below zero, a ChartLegend) beside a one-third Panel holding a DonutChart of revenue by city with \`segments\` (name, value, detail with the client count) and a \`format\` for ETB, the leading city named in the centre until another is hovered or focused from the legend rows under the ring (not \`legend="list"\`, no Gauge); then a recent invoices DataTable on its own, filling the full width, built like the gallery's Invoices table: a toolbar with a page-size Select, the one accent action (New invoice), and at the right end the search Input and a status Select (all, paid, due, overdue) that filters the rows; columns with widths (id 120px muted, status 110px as a StatusCell, client as a PersonCell with the contact and the company, amount \`align: "end"\` tabular, date muted) so only the client column stretches and rows stay one line high; selectable rows with the mixed header box, RowActions per row, and the paged footer. The theme switch beside the profile flips and the rail collapses. ${CLOSE}`,
  },
  {
    label: "Test prompt 2",
    title: "Course registration",
    caption: "A stepper form with a header image and a confirmation",
    text: `${PREFIX} replace the welcome page (App.tsx is yours to change; keep main.tsx and CustomizeNudge.tsx as they are) with a course registration page for a student, composed the way AGENTS.md (Composition intelligence, App shell) says: it stands alone, so an AppShell with \`rail="none"\`, the title Course registration and the caption for the term; the content one centred column (\`max-w-3xl\`); at the top a Card whose CardMedia is a header image (\`src="https://formicai.dev/assets/live-bg-1280.webp"\` with \`aspect="banner"\`, the short 4:1 band, not the tall video shape) with a CardTitle for the programme and a CardDescription for the dates; under it a Panel holding a Steps stepper with four steps (Student, Courses, Schedule, Review) and the form of the current step: Student is Fields with Inputs for full name, email and phone and a Select for the programme, all required with real validation; Courses is a CardGroup of at least six course Cards (title, credits, seats left) each with a CardButton that toggles it chosen, at least one required; Schedule is a DatePicker for the start date and segmented Tabs for morning or evening; Review lists every answer and ends with a Register accent button; Back and Next move between steps and the completed steps in the stepper can be clicked to go back; Register shows a Toast and turns the panel into a confirmation: a success Alert with the student's name and the chosen courses, and one secondary button (Register another) that resets the stepper. No table on this page. The theme switch at the right of the header strip flips. ${CLOSE}`,
  },
  {
    label: "Test prompt 3",
    title: "Workspace settings",
    caption: "Settings under a top bar: forms, a team list, an integrations gallery and a danger zone",
    text: `${PREFIX} replace the welcome page (App.tsx is yours to change; keep main.tsx and CustomizeNudge.tsx as they are) with Formic Studio's workspace settings, composed the way AGENTS.md (Composition intelligence, App shell) says, in the Text register (no figures, no charts): an AppShell with \`rail="topbar"\` (the rail plus the TopBar with search, theme, notifications and the account menu), the page title Settings, and underline Tabs for Profile, Team, Integrations and Billing that switch the content. Profile: a Panel with Fields (Input for studio name and email, Textarea for the address, Select for the timezone, an Avatar with a Change photo button) and one accent Save button that shows a Toast. Team: a CardGroup with \`orientation="inline"\` listing six people with Avatar, name, role Badge and a DropdownMenu of actions, plus an Invite button that opens a Drawer with an email TagInput and a role Select. Integrations: the Visual register, a CardGroup of eight services each with its real BrandLogo from brand-logos.tsx (Slack, Google Drive, Notion, Figma, GitHub, Stripe, Asana, Dropbox), a one-line description, and a Switch that connects or disconnects it, with a FilterBar above (search and a connected-only toggle). Billing: the current plan as a Card with a Progress bar of seats used, a payment method row, and a danger zone at the bottom where Delete workspace is a destructive Button that opens a confirm Modal (type the name to enable Delete). Wire useCommandPalette so ⌘K opens a CommandPalette that jumps between the four tabs. The theme switch in the TopBar flips. ${CLOSE}`,
  },
];

function useCopy(): [boolean, (text: string) => Promise<void>] {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };
  return [copied, copy];
}

function PromptPanel({ label, title, caption, text }: (typeof PROMPTS)[number]) {
  const [copied, copy] = useCopy();
  return (
    <Panel title={`${label}: ${title}`} caption={caption}>
      <div className="flex flex-col gap-3">
        <p className="rounded-md bg-inset p-4 text-body leading-relaxed text-ink">{text}</p>
        <div className="flex justify-end">
          <Button variant="accent" size="md" onClick={() => copy(text)} icon={<Icon name={copied ? "check" : "copy"} />} aria-live="polite">
            {copied ? "Copied" : "Copy prompt"}
          </Button>
        </div>
      </div>
    </Panel>
  );
}

export default function Welcome() {
  const [copiedPrefix, copyPrefix] = useCopy();
  return (
    <main data-formic-welcome className="flex min-h-dvh items-center justify-center bg-canvas p-6 sm:p-8">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <header className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-md bg-accent-tint text-accent"><FormicMark size={26} /></span>
          <div>
            <h1 className="text-display font-semibold text-ink">Formic is working</h1>
            <p className="mt-1 text-body text-ink-2">Components, tokens, the rules for your AI tool and a check before every commit are in place.</p>
          </div>
        </header>

        <div className="rounded-md bg-inset px-4 py-3 text-caption text-ink-2">
          <p className="font-medium text-ink">Next: let your AI tool build the first page.</p>
          <p className="mt-0.5">Open your AI tool (Claude Code, Cursor, Antigravity, Copilot, Codex, any of them) in this folder and paste one of the three test prompts. Each builds a different screen; pick the one closest to your product. If the result looks generic, say "That is not Formic, read AGENTS.md and redo it".</p>
        </div>

        {PROMPTS.map((p) => <PromptPanel key={p.label} {...p} />)}

        <Panel title="Every prompt after that" caption="Start it the same way, then say what you want">
          <div className="flex items-center justify-between gap-3">
            <p className="min-w-0 flex-1 rounded-md bg-inset px-4 py-3 font-mono text-caption text-ink">{PREFIX} <span className="text-ink-3">add a clients page with a DataTable…</span></p>
            <Button variant="secondary" size="md" onClick={() => copyPrefix(PREFIX + " ")} icon={<Icon name={copiedPrefix ? "check" : "copy"} />} aria-live="polite" className="shrink-0">
              {copiedPrefix ? "Copied" : "Copy"}
            </Button>
          </div>
        </Panel>
      </div>
    </main>
  );
}
