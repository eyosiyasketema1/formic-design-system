"use client";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Icon, IconButton } from "./primitives";
/* ─────────────────────────────────────────────────────────
 * COLOR PICKER
 * A Figma-style picker with no dependencies: a saturation /
 * brightness square, a hue slider, a hex field, an eyedropper
 * where the browser has one, and a swatch row. Controlled by
 * a hex string. No alpha on purpose — this picks brand and
 * accent colours, and a translucent accent would void every
 * contrast guarantee the system makes.
 *
 * Colour-math note: the square's white→hue and transparent→black
 * gradients and the hue strip's spectrum are the DATA the control
 * displays, not styling, so they are the one place literal colours
 * are legitimate (same standing as --ease-out-quint's definition).
 * Everything else — handles, chrome, focus — reads tokens.
 * ───────────────────────────────────────────────────────── */

export type Hsv = { h: number; s: number; v: number };

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function hexToHsv(hex: string): Hsv {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return { h: 0, s: 0, v: 0 };
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  return { h, s: max ? d / max : 0, v: max };
}

export function hsvToHex({ h, s, v }: Hsv): string {
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x]
    : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const to = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

const isHex = (s: string) => /^#[0-9a-f]{6}$/i.test(s);

/* The accent family: Lime green's saturation and lightness at spread hues.
   Same set as the landing page's "Pick an accent" row. */
const DEFAULT_SWATCHES = ["#a5e12a", "#e0a329", "#29e0c2", "#2985e0", "#9429e0", "#e02985", "#1a1a1a", "#ffffff"];

export default function ColorPicker({
  value = "#3b5bdb",
  onChange,
  swatches = DEFAULT_SWATCHES,
  className = "",
}: {
  value?: string;
  onChange?: (hex: string) => void;
  /** quick picks along the bottom */
  swatches?: string[];
  className?: string;
}) {
  const id = useId();
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(value));
  const [text, setText] = useState(value.toUpperCase());
  const squareRef = useRef<HTMLDivElement>(null);
  const lastEmitted = useRef(value.toLowerCase());

  /* External value changed (swatch elsewhere, reset) → resync, but never
     while the user is mid-drag or mid-typing on a value we just emitted. */
  useEffect(() => {
    if (value.toLowerCase() !== lastEmitted.current) {
      setHsv(hexToHsv(value));
      setText(value.toUpperCase());
      lastEmitted.current = value.toLowerCase();
    }
  }, [value]);

  const commit = (next: Hsv) => {
    setHsv(next);
    const hex = hsvToHex(next);
    setText(hex.toUpperCase());
    lastEmitted.current = hex;
    onChange?.(hex);
  };

  /* ── saturation / brightness square ── */
  const fromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const box = squareRef.current?.getBoundingClientRect();
    if (!box) return;
    const s = clamp((event.clientX - box.left) / box.width, 0, 1);
    const v = clamp(1 - (event.clientY - box.top) / box.height, 0, 1);
    commit({ ...hsv, s, v });
  };
  const onSquareDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    squareRef.current?.focus();
    fromPointer(event);
  };
  const onSquareMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.buttons & 1) fromPointer(event);
  };
  const onSquareKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 0.1 : 0.02;
    const map: Record<string, Partial<Hsv>> = {
      ArrowLeft: { s: clamp(hsv.s - step, 0, 1) }, ArrowRight: { s: clamp(hsv.s + step, 0, 1) },
      ArrowUp: { v: clamp(hsv.v + step, 0, 1) }, ArrowDown: { v: clamp(hsv.v - step, 0, 1) },
    };
    const delta = map[event.key];
    if (!delta) return;
    event.preventDefault();
    commit({ ...hsv, ...delta });
  };

  /* ── hex field ── */
  const onTextChange = (raw: string) => {
    const next = raw.startsWith("#") ? raw : `#${raw}`;
    setText(next.toUpperCase());
    if (isHex(next)) {
      const parsed = hexToHsv(next);
      setHsv(parsed);
      lastEmitted.current = next.toLowerCase();
      onChange?.(next.toLowerCase());
    }
  };

  /* ── eyedropper (progressive: only where the platform has one) ── */
  const eyedropper = typeof window !== "undefined" && "EyeDropper" in window;
  const pick = async () => {
    try {
      const result = await new (window as unknown as { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper().open();
      onTextChange(result.sRGBHex);
    } catch {
      /* user cancelled */
    }
  };

  const hueHex = hsvToHex({ h: hsv.h, s: 1, v: 1 });
  const current = hsvToHex(hsv);

  return (
    <div className={`flex w-full max-w-70 flex-col gap-3 ${className}`}>
      {/* saturation / brightness */}
      <div
        ref={squareRef}
        role="slider"
        tabIndex={0}
        aria-label="Saturation and brightness"
        aria-valuetext={`saturation ${Math.round(hsv.s * 100)} percent, brightness ${Math.round(hsv.v * 100)} percent`}
        aria-valuenow={Math.round(hsv.v * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        onPointerDown={onSquareDown}
        onPointerMove={onSquareMove}
        onKeyDown={onSquareKey}
        className="corner-smooth relative aspect-[4/3] w-full cursor-crosshair touch-none overflow-hidden rounded-control"
        style={{
          background: `linear-gradient(to top, #000000, transparent), linear-gradient(to right, #ffffff, ${hueHex})`,
        }}
      >
        <span
          aria-hidden
          className="absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface"
          style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, background: current, boxShadow: "var(--shadow-overlay)" }}
        />
      </div>

      {/* hue */}
      <input
        type="range"
        min={0}
        max={360}
        step={1}
        value={Math.round(hsv.h)}
        aria-label="Hue"
        onChange={(e) => commit({ ...hsv, h: Number(e.target.value) })}
        className="color-picker-hue w-full"
        style={{ background: "linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)" }}
      />

      {/* hex + eyedropper */}
      <div className="flex items-center gap-2">
        <span className="corner-smooth flex h-8 min-w-0 flex-1 items-center gap-1.5 rounded-control bg-field px-2.5 transition-colors duration-150 focus-within:bg-hover-2">
          <span aria-hidden className="size-3.5 shrink-0 rounded-full" style={{ background: current, boxShadow: "var(--shadow-overlay)" }} />
          <span className="font-mono text-caption text-ink-3">#</span>
          <input
            id={`${id}-hex`}
            aria-label="Hex colour"
            value={text.replace(/^#/, "")}
            onChange={(e) => onTextChange(e.target.value)}
            onBlur={() => { if (!isHex(text)) setText(current.toUpperCase()); }}
            spellCheck={false}
            maxLength={6}
            className="min-w-0 flex-1 bg-transparent font-mono text-caption text-ink uppercase outline-none"
          />
        </span>
        {eyedropper && (
          <IconButton label="Pick a colour from the screen" onClick={pick} className="size-8 rounded-control bg-field text-ink-2 hover:bg-hover-2 hover:text-ink">
            <Icon name="edit" size={14} strokeWidth={2} />
          </IconButton>
        )}
      </div>

      {/* swatches */}
      {swatches.length > 0 && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Swatches">
          {swatches.map((hex) => {
            const on = hex.toLowerCase() === current.toLowerCase();
            return (
              <button
                key={hex}
                type="button"
                aria-label={hex}
                aria-pressed={on}
                onClick={() => onTextChange(hex)}
                className="corner-smooth size-6 rounded-control transition-transform duration-150 hover:scale-110"
                style={{ background: hex, boxShadow: on ? "0 0 0 2px var(--surface), 0 0 0 3.5px var(--ink)" : "var(--shadow-overlay)" }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
