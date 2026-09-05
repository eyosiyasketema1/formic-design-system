"use client";
import { useEffect, useState } from "react";
/* ─────────────────────────────────────────────────────────
 * DOODLE AVATARS — DiceBear "notionists" (CC0), generated locally
 * A doodle is derived from the person's name, so the same name always
 * gets the same face, on every device, with no network and no stored
 * image. The two DiceBear packages are loaded on demand the first time
 * a doodle renders, so an app that never shows one never pays for them.
 *
 * Peer deps: @dicebear/core ^9, @dicebear/notionists ^9 (both MIT; the
 * notionists art is CC0). Install: npm i @dicebear/core @dicebear/notionists
 * ───────────────────────────────────────────────────────── */
const cache = new Map<string, Promise<string>>();

export function doodleSvg(seed: string): Promise<string> {
  let p = cache.get(seed);
  if (!p) {
    p = Promise.all([import("@dicebear/core"), import("@dicebear/notionists")]).then(([{ createAvatar }, notionists]) =>
      createAvatar(notionists, { seed, size: 128 }).toString(),
    );
    cache.set(seed, p);
  }
  return p;
}

/** the doodle for a seed, or null until it has loaded (render initials meanwhile) */
export function useDoodle(seed: string, enabled = true): string | null {
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    doodleSvg(seed).then((s) => { if (live) setSvg(s); }).catch(() => {});
    return () => { live = false; };
  }, [seed, enabled]);
  return enabled ? svg : null;
}
