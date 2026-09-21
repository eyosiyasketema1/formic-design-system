#!/usr/bin/env python3
"""Writes the bulk of the old-app fixture at test time (nothing generated is
committed): ~400 .tsx files under src/pages/ and src/components/generated/ in
the style of a legacy React + Tailwind codebase (palette classes, rounded-lg,
shadow-md, raw <button> / <input> / <table>, lucide icons, useEffect). The
seed files (App.tsx, main.tsx, components/ui) import a handful of them so
`vite build` has a real graph.

    python3 fixtures/old-app/generate.py [<app-root>]     # default: this folder
"""
import sys
from pathlib import Path

ROOT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent
PAGES = 200
WIDGETS = 200

COLORS = ["slate", "gray", "zinc", "blue", "indigo", "emerald", "amber", "rose"]
ICONS = ["Bell", "Search", "Settings", "User", "Calendar", "Mail", "Check", "X", "Plus", "Trash2"]
NOUNS = ["orders", "users", "invoices", "tickets", "reports", "projects", "sessions", "events"]


def page(i: int) -> str:
    c = COLORS[i % len(COLORS)]
    icon = ICONS[i % len(ICONS)]
    noun = NOUNS[i % len(NOUNS)]
    return f'''import {{ useEffect, useState }} from "react";
import {{ {icon} }} from "lucide-react";
import Widget{(i % WIDGETS) + 1:03d} from "../components/generated/Widget{(i % WIDGETS) + 1:03d}";

type Row = {{ id: number; name: string; status: "open" | "closed" }};

export default function Page{i:03d}() {{
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {{
    setRows(Array.from({{ length: 8 }}, (_, n) => ({{ id: n + 1, name: `{noun} ${{n + 1}}`, status: n % 3 ? "open" : "closed" }})));
  }}, []);
  const shown = rows.filter((r) => r.name.includes(query));
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-{c}-900">Page {i}: {noun}</h1>
        <button className="rounded-lg bg-{c}-600 px-4 py-2 text-sm font-bold text-white shadow-md hover:bg-{c}-700" onClick={{() => setRows([])}}>
          <{icon} className="mr-2 inline h-4 w-4" /> Clear
        </button>
      </div>
      <input
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-{c}-500 focus:outline-none"
        placeholder="Search {noun}"
        value={{query}}
        onChange={{(e) => setQuery(e.target.value)}}
      />
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
            <tr><th className="px-4 py-2">ID</th><th className="px-4 py-2">Name</th><th className="px-4 py-2">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {{shown.map((r) => (
              <tr key={{r.id}} className="hover:bg-gray-50">
                <td className="px-4 py-2 text-gray-500">{{r.id}}</td>
                <td className="px-4 py-2 font-medium text-gray-900">{{r.name}}</td>
                <td className="px-4 py-2"><span className={{`rounded-full px-2 py-0.5 text-xs ${{r.status === "open" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}}`}}>{{r.status}}</span></td>
              </tr>
            ))}}
          </tbody>
        </table>
      </div>
      <Widget{(i % WIDGETS) + 1:03d} />
    </div>
  );
}}
'''


def widget(i: int) -> str:
    c = COLORS[(i * 3) % len(COLORS)]
    icon = ICONS[(i * 7) % len(ICONS)]
    return f'''import {{ useState }} from "react";
import {{ {icon} }} from "lucide-react";

export default function Widget{i:03d}({{ label = "Widget {i}" }}: {{ label?: string }}) {{
  const [on, setOn] = useState(false);
  return (
    <div className="mb-4 flex items-center justify-between rounded-lg border border-{c}-200 bg-{c}-50 p-4 shadow-md">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-{c}-600 text-white"><{icon} className="h-4 w-4" /></span>
        <div>
          <p className="text-sm font-bold text-{c}-900">{{label}}</p>
          <p className="text-xs text-gray-500">{{on ? "Enabled" : "Disabled"}}</p>
        </div>
      </div>
      <button
        className={{`h-6 w-11 rounded-full transition-colors ${{on ? "bg-{c}-600" : "bg-gray-300"}}`}}
        aria-pressed={{on}}
        onClick={{() => setOn(!on)}}
      >
        <span className={{`block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${{on ? "translate-x-5" : "translate-x-0.5"}}`}} />
      </button>
    </div>
  );
}}
'''


def main() -> None:
    pages = ROOT / "src" / "pages"
    widgets = ROOT / "src" / "components" / "generated"
    pages.mkdir(parents=True, exist_ok=True)
    widgets.mkdir(parents=True, exist_ok=True)
    for i in range(1, PAGES + 1):
        (pages / f"Page{i:03d}.tsx").write_text(page(i))
    for i in range(1, WIDGETS + 1):
        (widgets / f"Widget{i:03d}.tsx").write_text(widget(i))
    print(f"old-app: wrote {PAGES} pages and {WIDGETS} widgets under {ROOT / 'src'}")


if __name__ == "__main__":
    main()
