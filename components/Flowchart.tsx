"use client";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import DropdownMenu from "./DropdownMenu";
import { Icon, IconButton, Tooltip, type IconName } from "./primitives";
import { useReducedMotion } from "./hooks";
/* ─────────────────────────────────────────────────────────
 * FLOWCHART — an automation or agent workflow on a dotted canvas
 * Nodes are cards of a `kind` (trigger, action, condition, end),
 * joined by measured bezier connectors that can carry a label
 * (Yes / No). Cards drag anywhere; the canvas pans by dragging
 * the dots and zooms with the wheel, the buttons, or ⌘0 to fit.
 * A condition card holds "if / and" rows whose chips open real
 * menus (DropdownMenu), so a rule can be edited in place.
 * Selecting a node lights its connectors and calls `onSelect`;
 * every move calls `onMove` with the new position, so the app
 * can persist the layout.
 *
 * No graph library: positions are numbers, connectors are one
 * SVG path each, dragging is pointer capture. Enough for the
 * flows a product actually shows (a trigger, a few steps, a
 * branch); a full editor with hundreds of nodes wants a graph
 * engine and is out of scope here.
 *
 * Kinds are semantic, so they carry colour (rule 16 is about
 * data series and furniture icons): trigger accent, condition
 * orange, action ink, end green.
 * ───────────────────────────────────────────────────────── */
export type FlowKind = "trigger" | "action" | "condition" | "end";
export type FlowRule = { key: string; property: string; operator?: string; value: string };
export type FlowNode = {
  id: string;
  kind: FlowKind;
  /** centre x, top y, in canvas px */
  x: number;
  y: number;
  w?: number;
  title?: string;
  caption?: string;
  icon?: IconName;
  /** condition only: the rows; `subject` is the chip before the property ("order") */
  rules?: FlowRule[];
  subject?: string;
};
export type FlowEdge = { from: string; to: string; label?: string };
export type FlowOptions = { properties?: string[]; values?: Record<string, string[]>; operators?: string[] };

const KIND: Record<FlowKind, { label: string; icon: IconName; pill: string; tile: string }> = {
  trigger: { label: "Trigger", icon: "bolt", pill: "bg-accent-tint text-accent", tile: "bg-accent-tint text-accent" },
  action: { label: "Action", icon: "play", pill: "bg-inset text-ink-2", tile: "bg-inset text-ink-2" },
  condition: { label: "If / Else", icon: "filter", pill: "bg-orange-tint text-orange", tile: "bg-orange-tint text-orange" },
  end: { label: "End", icon: "flag", pill: "bg-green-tint text-green", tile: "bg-green-tint text-green" },
};

const DEFAULT_NODES: FlowNode[] = [
  { id: "trigger", kind: "trigger", x: 300, y: 24, title: "New order created", caption: "Runs when an order is placed" },
  {
    id: "cond", kind: "condition", x: 300, y: 170, w: 380, subject: "order",
    rules: [
      { key: "r1", property: "flavor", operator: "is", value: "Rocky Road" },
      { key: "r2", property: "topping", operator: "is", value: "Rainbow sprinkles" },
    ],
  },
  { id: "notify", kind: "action", x: 150, y: 360, title: "Notify the kitchen", caption: "Slack #orders", icon: "bell" },
  { id: "done", kind: "end", x: 450, y: 360, title: "Done", caption: "Nothing else to do" },
];
const DEFAULT_EDGES: FlowEdge[] = [
  { from: "trigger", to: "cond" },
  { from: "cond", to: "notify", label: "Yes" },
  { from: "cond", to: "done", label: "No" },
];
const DEFAULT_OPTIONS: FlowOptions = {
  properties: ["flavor", "topping", "size", "scoops"],
  operators: ["is", "is not", "contains"],
  values: {
    flavor: ["Rocky Road", "Mint Chip", "Pistachio", "Bubblegum"],
    topping: ["Rainbow sprinkles", "Hot fudge", "Candied pecans", "Brown butter brittle"],
    size: ["Small", "Regular", "Large"],
    scoops: ["1", "2", "3"],
  },
};
const EST_H: Record<FlowKind, number> = { trigger: 60, action: 60, condition: 96, end: 60 };
const PILL = 28; // kind pill + gap above a card
const MIN_ZOOM = 0.5, MAX_ZOOM = 2;

/* a chip that opens a menu of choices */
function Chip({ value, options, onPick, tone = "field" }: { value: string; options: string[]; onPick: (v: string) => void; tone?: "field" | "surface" }) {
  return (
    <DropdownMenu align="start" menuWidth={200} items={options.map((o) => ({ key: o, label: o, icon: (o === value ? "check" : undefined) as IconName | undefined }))} onSelect={onPick}>
      <button
        type="button"
        data-ui
        className={`corner-smooth inline-flex h-6 max-w-44 min-w-0 items-center gap-1 rounded-sm px-1.5 text-small font-medium text-ink transition-colors duration-150 ${tone === "surface" ? "bg-surface shadow-btn" : "bg-field hover:bg-hover-2"}`}
      >
        <span className="min-w-0 truncate">{value}</span>
        <Icon name="chevron" size={11} strokeWidth={2.4} className="shrink-0 text-ink-3" />
      </button>
    </DropdownMenu>
  );
}

function ConditionBody({ node, options, onRule }: { node: FlowNode; options: FlowOptions; onRule: (key: string, patch: Partial<FlowRule>) => void }) {
  return (
    <div className="flex flex-col gap-1.5 px-3 py-2.5">
      {(node.rules ?? []).map((r, i) => (
        <div key={r.key} className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span aria-hidden className="text-ink-3"><Icon name="lines" size={12} strokeWidth={2} /></span>
          <span className="w-7 text-caption text-ink-2">{i === 0 ? "If" : "and"}</span>
          <span data-ui className="inline-flex h-6 shrink-0 items-center gap-1 rounded-sm bg-surface px-1.5 text-small font-medium text-ink shadow-btn">
            <Icon name="package" size={12} strokeWidth={2} className="text-ink-2" />
            {node.subject ?? "item"}
          </span>
          <Chip value={r.property} options={options.properties ?? []} onPick={(property) => onRule(r.key, { property, value: options.values?.[property]?.[0] ?? r.value })} />
          <Chip value={r.operator ?? "is"} options={options.operators ?? ["is"]} onPick={(operator) => onRule(r.key, { operator })} />
          <Chip value={r.value} options={options.values?.[r.property] ?? [r.value]} onPick={(value) => onRule(r.key, { value })} />
        </div>
      ))}
    </div>
  );
}

function StepBody({ node }: { node: FlowNode }) {
  const k = KIND[node.kind];
  return (
    <div className="flex items-center gap-2.5 p-2.5">
      <span className={`corner-smooth flex size-9 shrink-0 items-center justify-center rounded-control ${k.tile}`}>
        <Icon name={node.icon ?? k.icon} size={16} strokeWidth={2} />
      </span>
      <span className="min-w-0 text-left">
        <span className="block truncate text-caption font-semibold text-ink">{node.title ?? k.label}</span>
        {node.caption && <span className="mt-0.5 block text-small text-ink-3">{node.caption}</span>}
      </span>
    </div>
  );
}

export default function Flowchart({
  nodes: nodesProp = DEFAULT_NODES,
  edges = DEFAULT_EDGES,
  options = DEFAULT_OPTIONS,
  height = 460,
  onSelect,
  onMove,
  onRuleChange,
  className = "",
}: {
  nodes?: FlowNode[];
  edges?: FlowEdge[];
  /** the choices condition chips offer */
  options?: FlowOptions;
  /** canvas height in px; the canvas scrolls nowhere, it pans */
  height?: number;
  onSelect?: (id: string | null) => void;
  onMove?: (id: string, x: number, y: number) => void;
  onRuleChange?: (nodeId: string, ruleKey: string, rule: FlowRule) => void;
  className?: string;
} = {}) {
  const reduced = useReducedMotion();
  const canvasRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef(new Map<string, HTMLElement>());
  const [nodes, setNodes] = useState(nodesProp);
  useEffect(() => setNodes(nodesProp), [nodesProp]);
  const [heights, setHeights] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState({ x: 0, y: 0, z: 1 });
  const [size, setSize] = useState({ w: 0, h: height });
  const drag = useRef<{ id: string | "canvas"; sx: number; sy: number; bx: number; by: number; moved: boolean } | null>(null);

  /* measure cards (their height depends on content) and the canvas */
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const measure = () => {
      setSize({ w: canvas.clientWidth, h: canvas.clientHeight });
      setHeights((prev) => {
        const next = { ...prev };
        let changed = false;
        nodeRefs.current.forEach((el, id) => {
          const h = el.offsetHeight;
          if (h && Math.abs(h - (next[id] ?? 0)) > 0.5) { next[id] = h; changed = true; }
        });
        return changed ? next : prev;
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(canvas);
    nodeRefs.current.forEach((el) => ro.observe(el));
    return () => ro.disconnect();
  }, [nodes]);

  const hOf = (n: FlowNode) => heights[n.id] ?? EST_H[n.kind];
  const wOf = (n: FlowNode) => n.w ?? 280;
  const anchors = (n: FlowNode) => ({ top: { x: n.x, y: n.y + PILL }, bottom: { x: n.x, y: n.y + PILL + hOf(n) } });
  const path = (e: FlowEdge) => {
    const a = nodes.find((n) => n.id === e.from), b = nodes.find((n) => n.id === e.to);
    if (!a || !b) return null;
    const from = anchors(a).bottom, to = anchors(b).top;
    const k = Math.min(Math.max(Math.abs(to.y - from.y) * 0.55, 24), 84);
    return { d: `M ${from.x} ${from.y} C ${from.x} ${from.y + k}, ${to.x} ${to.y - k}, ${to.x} ${to.y}`, mid: { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 } };
  };

  /* fit every node into view */
  const fit = () => {
    if (!nodes.length || !size.w) return;
    const xs = nodes.flatMap((n) => [n.x - wOf(n) / 2, n.x + wOf(n) / 2]);
    const ys = nodes.flatMap((n) => [n.y, n.y + PILL + hOf(n)]);
    const bw = Math.max(...xs) - Math.min(...xs) + 48, bh = Math.max(...ys) - Math.min(...ys) + 48;
    const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.min(size.w / bw, size.h / bh)));
    setView({ z, x: (size.w - bw * z) / 2 - (Math.min(...xs) - 24) * z, y: (size.h - bh * z) / 2 - (Math.min(...ys) - 24) * z });
  };
  const zoomBy = (factor: number, cx = size.w / 2, cy = size.h / 2) =>
    setView((v) => {
      const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.z * factor));
      /* keep the point under the cursor still */
      return { z, x: cx - ((cx - v.x) * z) / v.z, y: cy - ((cy - v.y) * z) / v.z };
    });
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const r = canvas.getBoundingClientRect();
      if (event.ctrlKey || event.metaKey) zoomBy(event.deltaY < 0 ? 1.1 : 0.9, event.clientX - r.left, event.clientY - r.top);
      else setView((v) => ({ ...v, x: v.x - event.deltaX, y: v.y - event.deltaY }));
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.w, size.h]);

  /* dragging: a card moves the node, the dots pan the view */
  const down = (id: string | "canvas") => (event: React.PointerEvent<HTMLElement>) => {
    if ((event.target as Element).closest("[data-ui], [role=menu]")) return;
    if (id !== "canvas") event.stopPropagation();
    const n = id === "canvas" ? null : nodes.find((x) => x.id === id);
    drag.current = { id, sx: event.clientX, sy: event.clientY, bx: n ? n.x : view.x, by: n ? n.y : view.y, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const move = (event: React.PointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = event.clientX - d.sx, dy = event.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) < 3) return;
    d.moved = true;
    if (d.id === "canvas") setView((v) => ({ ...v, x: d.bx + dx, y: d.by + dy }));
    else {
      const x = d.bx + dx / view.z, y = d.by + dy / view.z;
      setNodes((ns) => ns.map((n) => (n.id === d.id ? { ...n, x, y } : n)));
    }
  };
  const up = (event: React.PointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d) return;
    if (d.id !== "canvas" && d.moved) {
      const n = nodes.find((x) => x.id === d.id);
      if (n) onMove?.(n.id, n.x, n.y);
    }
    /* pointer capture retargets the click to the captured wrapper, so a
       press that did not move is the selection, decided here, not in an
       onClick the card would never receive */
    drag.current = null;
    if (!d.moved) select(d.id === "canvas" ? null : d.id);
  };
  const select = (id: string | null) => {
    const next = selected === id ? null : id;
    setSelected(next);
    onSelect?.(next);
  };
  const rule = (nodeId: string, key: string, patch: Partial<FlowRule>) =>
    setNodes((ns) =>
      ns.map((n) => {
        if (n.id !== nodeId) return n;
        const rules = (n.rules ?? []).map((r) => (r.key === key ? { ...r, ...patch } : r));
        onRuleChange?.(nodeId, key, rules.find((r) => r.key === key)!);
        return { ...n, rules };
      }),
    );
  const lit = (e: FlowEdge) => selected === e.from || selected === e.to;
  const ease = reduced ? "none" : "transform 200ms var(--ease-out-quint)";
  return (
    <div
      ref={canvasRef}
      role="application"
      aria-label="Flowchart"
      onPointerDown={down("canvas")}
      onPointerMove={move}
      onPointerUp={up}
      onKeyDown={(event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === "0") { event.preventDefault(); fit(); }
        if ((event.metaKey || event.ctrlKey) && (event.key === "=" || event.key === "+")) { event.preventDefault(); zoomBy(1.2); }
        if ((event.metaKey || event.ctrlKey) && event.key === "-") { event.preventDefault(); zoomBy(1 / 1.2); }
      }}
      tabIndex={0}
      className={`relative w-full touch-none overflow-hidden rounded-card bg-canvas shadow-hairline select-none ${drag.current?.id === "canvas" ? "cursor-grabbing" : "cursor-grab"} ${className}`}
      style={{
        height,
        backgroundImage: "radial-gradient(var(--line-strong) 1px, transparent 1.25px)",
        backgroundSize: `${22 * view.z}px ${22 * view.z}px`,
        backgroundPosition: `${view.x}px ${view.y}px`,
      }}
    >
      {/* the moving layer */}
      <div className="absolute top-0 left-0 origin-top-left" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.z})`, transition: drag.current ? "none" : ease }}>
        <svg className="pointer-events-none absolute top-0 left-0 overflow-visible" width={1} height={1} aria-hidden>
          {edges.map((e) => {
            const p = path(e);
            if (!p) return null;
            return (
              <g key={`${e.from}-${e.to}`}>
                <path d={p.d} fill="none" stroke={lit(e) ? "var(--accent)" : "var(--line-strong)"} strokeWidth={1.5} className="transition-[stroke] duration-150" />
                <circle cx={p.d.split(" ")[1]} cy={p.d.split(" ")[2]} r={3} fill={lit(e) ? "var(--accent)" : "var(--line-strong)"} />
              </g>
            );
          })}
        </svg>
        {/* edge labels are HTML, so they keep the type ramp */}
        {edges.map((e) => {
          const p = path(e);
          if (!p || !e.label) return null;
          return (
            <span key={`label-${e.from}-${e.to}`} className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full px-2 py-0.5 text-tiny font-medium ${lit(e) ? "bg-accent-tint text-accent" : "bg-inset text-ink-2"}`} style={{ left: p.mid.x, top: p.mid.y }}>
              {e.label}
            </span>
          );
        })}
        {nodes.map((n) => {
          const k = KIND[n.kind];
          const on = selected === n.id;
          const body: ReactNode = n.kind === "condition" ? <ConditionBody node={n} options={options} onRule={(key, patch) => rule(n.id, key, patch)} /> : <StepBody node={n} />;
          return (
            <div
              key={n.id}
              ref={(el) => { if (el) nodeRefs.current.set(n.id, el); else nodeRefs.current.delete(n.id); }}
              onPointerDown={down(n.id)}
              className="absolute flex -translate-x-1/2 touch-none flex-col items-start gap-1.5"
              style={{ left: n.x, top: n.y, width: wOf(n), zIndex: drag.current?.id === n.id ? 2 : 1, cursor: drag.current?.id === n.id ? "grabbing" : "grab" }}
            >
              <span className={`inline-flex h-6 items-center gap-1 rounded-sm px-2 text-tiny font-medium ${k.pill}`}>
                <Icon name={k.icon} size={11} strokeWidth={2.4} />
                {k.label}
              </span>
              <div
                role="button"
                tabIndex={0}
                aria-pressed={on}
                aria-label={n.title ?? k.label}
                onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); select(n.id); } }}
                className={`corner-smooth w-full rounded-card bg-surface text-left transition-shadow duration-150 ${on ? "shadow-[0_0_0_1.5px_var(--accent)]" : "shadow-card hover:shadow-overlay"}`}
              >
                {body}
              </div>
            </div>
          );
        })}
      </div>
      {/* view controls */}
      <div className="absolute right-2 bottom-2 flex items-center gap-0.5 rounded-control bg-surface p-0.5 shadow-card" data-ui onPointerDown={(e) => e.stopPropagation()}>
        <Tooltip label="Zoom out"><IconButton label="Zoom out" onClick={() => zoomBy(1 / 1.2)} className="text-ink-3 hover:bg-hover hover:text-ink"><Icon name="minus" size={13} strokeWidth={2.2} /></IconButton></Tooltip>
        <button type="button" onClick={fit} className="h-6 min-w-11 rounded-sm px-1.5 font-mono text-tiny text-ink-2 transition-colors duration-150 hover:bg-hover hover:text-ink" aria-label="Fit to view">{Math.round(view.z * 100)}%</button>
        <Tooltip label="Zoom in"><IconButton label="Zoom in" onClick={() => zoomBy(1.2)} className="text-ink-3 hover:bg-hover hover:text-ink"><Icon name="plus" size={13} strokeWidth={2.2} /></IconButton></Tooltip>
      </div>
    </div>
  );
}
