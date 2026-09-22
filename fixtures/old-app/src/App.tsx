import { useState } from "react";
import { Button } from "./components/ui/button";
import { Card } from "./components/ui/card";
import Page001 from "./pages/Page001";
import Page002 from "./pages/Page002";
import Page003 from "./pages/Page003";
import Widget001 from "./components/generated/Widget001";
import Widget002 from "./components/generated/Widget002";

const PAGES = [Page001, Page002, Page003];

// hash routes (#/1, #/2, #/3), the way an app this age tends to do it; also
// what scripts/visual_check.sh screenshots (--routes /,/#/2,/#/3)
function fromHash(): number {
  const m = /^#\/(\d+)$/.exec(window.location.hash);
  const n = m ? Number(m[1]) - 1 : 0;
  return n >= 0 && n < PAGES.length ? n : 0;
}

export default function App() {
  const [index, setIndex] = useState(fromHash);
  const go = (i: number) => {
    setIndex(i);
    window.location.hash = `#/${i + 1}`;
  };
  const Page = PAGES[index];
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 shadow-sm">
        <span className="text-xl font-bold text-indigo-600">Legacy Admin</span>
        <nav className="flex gap-2">
          {PAGES.map((_, i) => (
            <Button key={i} variant={i === index ? "default" : "ghost"} size="sm" onClick={() => go(i)}>
              Page {i + 1}
            </Button>
          ))}
        </nav>
      </header>
      <main className="grid gap-6 p-6 lg:grid-cols-3">
        <Card title="Widgets" className="lg:col-span-1">
          <Widget001 />
          <Widget002 />
        </Card>
        <div className="lg:col-span-2">
          <Page />
        </div>
      </main>
    </div>
  );
}
