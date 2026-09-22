/* A small unified diff, enough for `formicai update` to show what a refresh
   changes in a file. Line-based, Myers-free: an LCS table on the lines that
   differ after trimming the common head and tail, which is what a component
   update looks like in practice. */
import { green, red, grey, cyan } from "./util.js";

export function diffLines(a, b) {
  const A = a.split("\n"), B = b.split("\n");
  let head = 0;
  while (head < A.length && head < B.length && A[head] === B[head]) head++;
  let tail = 0;
  while (tail < A.length - head && tail < B.length - head && A[A.length - 1 - tail] === B[B.length - 1 - tail]) tail++;
  const X = A.slice(head, A.length - tail), Y = B.slice(head, B.length - tail);
  const ops = [];
  if (X.length * Y.length > 4_000_000) {
    for (const l of X) ops.push(["-", l]);
    for (const l of Y) ops.push(["+", l]);
  } else {
    const L = Array.from({ length: X.length + 1 }, () => new Uint32Array(Y.length + 1));
    for (let i = X.length - 1; i >= 0; i--) for (let j = Y.length - 1; j >= 0; j--)
      L[i][j] = X[i] === Y[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    let i = 0, j = 0;
    while (i < X.length && j < Y.length) {
      if (X[i] === Y[j]) { ops.push([" ", X[i]]); i++; j++; }
      else if (L[i + 1][j] >= L[i][j + 1]) ops.push(["-", X[i++]]);
      else ops.push(["+", Y[j++]]);
    }
    while (i < X.length) ops.push(["-", X[i++]]);
    while (j < Y.length) ops.push(["+", Y[j++]]);
  }
  return { head, tail, ops, before: A.length, after: B.length };
}

/* the hunks, with three lines of context, as a terminal string */
export function render(file, a, b, context = 3, label = "registry") {
  const { head, ops } = diffLines(a, b);
  const lines = [cyan(`--- ${file}`), cyan(`+++ ${file} (${label})`)];
  const ctxHead = [], aLines = a.split("\n");
  for (let k = Math.max(0, head - context); k < head; k++) ctxHead.push(grey(" " + aLines[k]));
  let added = 0, removed = 0;
  lines.push(grey(`@@ line ${Math.max(1, head - context + 1)} @@`), ...ctxHead);
  let quiet = 0;
  for (const [op, text] of ops) {
    if (op === " ") { if (quiet++ < context * 2) lines.push(grey(" " + text)); else if (quiet === context * 2 + 1) lines.push(grey(" …")); continue; }
    quiet = 0;
    if (op === "-") { removed++; lines.push(red("-" + text)); } else { added++; lines.push(green("+" + text)); }
  }
  const tailStart = head + ops.filter(([o]) => o !== "+").length;
  for (let k = tailStart; k < Math.min(aLines.length, tailStart + context); k++) lines.push(grey(" " + aLines[k]));
  return { text: lines.join("\n"), added, removed };
}
