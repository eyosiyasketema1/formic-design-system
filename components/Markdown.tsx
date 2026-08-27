"use client";
import { useMemo, type ReactNode } from "react";
import CodeBlock, { type CodeLanguage } from "./CodeBlock";
/* ─────────────────────────────────────────────────────────
 * MARKDOWN
 * Dependency-free renderer for AI output — the practical
 * subset: headings, paragraphs, bold / italic / strike,
 * inline code, safe links, nested bullet + ordered lists,
 * blockquotes, tables (scroll in place), rules, and fenced
 * code rendered through CodeBlock. Unknown syntax degrades
 * to plain text; javascript: URLs are dropped.
 * ───────────────────────────────────────────────────────── */
const CODE_LANGUAGES: CodeLanguage[] = ["ts", "js", "py", "json", "bash", "css"];
const asLanguage = (lang: string): CodeLanguage =>
  (CODE_LANGUAGES as string[]).includes(lang) ? (lang as CodeLanguage) : "text";
/* links: http(s), mailto, and same-origin relative targets only */
const safeHref = (href: string) => {
  const trimmed = href.trim();
  if (trimmed.startsWith("//")) return undefined; /* protocol-relative — off-origin */
  return /^(https?:|mailto:|\/|#|\.)/i.test(trimmed) ? trimmed : undefined;
};
/* ── inline ────────────────────────────────────────────── */
const INLINE =
  /(`[^`\n]+`)|(\*\*\*[^*\n]+\*\*\*)|(\*\*(?:[^*\n]|\*(?!\*))+\*\*)|(\*[^*\n]+\*)|(~~[^~\n]+~~)|(\[[^\]\n]+\]\([^()\s]+\))/g;
function renderInline(text: string, keyBase: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = new RegExp(INLINE.source, "g");
  let cursor = 0;
  let match: RegExpExecArray | null;
  let sequence = 0;
  const key = () => `${keyBase}-${(sequence += 1)}`;
  while ((match = re.exec(text))) {
    if (match.index > cursor) nodes.push(text.slice(cursor, match.index));
    const [full, code, boldItalic, bold, italic, strike, link] = match;
    if (boldItalic) {
      nodes.push(
        <strong key={key()} className="font-semibold text-ink">
          <em>{renderInline(full.slice(3, -3), key())}</em>
        </strong>,
      );
    } else if (code) {
      nodes.push(
        <code key={key()} className="rounded-[4px] bg-inset px-1 font-mono text-caption text-ink shadow-hairline">
          {full.slice(1, -1)}
        </code>,
      );
    } else if (bold) {
      nodes.push(
        <strong key={key()} className="font-semibold text-ink">
          {renderInline(full.slice(2, -2), key())}
        </strong>,
      );
    } else if (italic) {
      nodes.push(<em key={key()}>{renderInline(full.slice(1, -1), key())}</em>);
    } else if (strike) {
      nodes.push(
        <s key={key()} className="text-ink-3">
          {renderInline(full.slice(2, -2), key())}
        </s>,
      );
    } else if (link) {
      const inner = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(full);
      const href = inner ? safeHref(inner[2]) : undefined;
      nodes.push(
        href ? (
          <a
            key={key()}
            href={href}
            target="_blank"
            rel="noreferrer"
            className="animated-underline font-medium text-accent"
          >
            {renderInline(inner![1], key())}
          </a>
        ) : (
          inner?.[1] ?? full
        ),
      );
    }
    cursor = re.lastIndex;
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}
/* ── blocks ────────────────────────────────────────────── */
type ListItem = { text: string; sub: string[] };
type Block =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "code"; lang: string; code: string }
  | { type: "quote"; lines: string[] }
  | { type: "list"; ordered: boolean; items: ListItem[] }
  | { type: "table"; header: string[]; rows: string[][] }
  | { type: "hr" };
const splitRow = (line: string) =>
  line.replace(/^\|/, "").replace(/\|\s*$/, "").split("|").map((cell) => cell.trim());
function parseBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }
    const fence = /^```(\w*)\s*$/.exec(line);
    if (fence) {
      const body: string[] = [];
      index += 1;
      while (index < lines.length && !/^```\s*$/.test(lines[index])) {
        body.push(lines[index]);
        index += 1;
      }
      index += 1; /* past the closing fence */
      blocks.push({ type: "code", lang: fence[1], code: body.join("\n") });
      continue;
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length, text: heading[2] });
      index += 1;
      continue;
    }
    if (/^(-{3,}|\*{3,})\s*$/.test(line)) {
      blocks.push({ type: "hr" });
      index += 1;
      continue;
    }
    if (/^>\s?/.test(line)) {
      const quote: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        quote.push(lines[index].replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push({ type: "quote", lines: quote });
      continue;
    }
    /* a table row is pipe-delimited, not merely pipe-containing —
       prose with a stray "a|b" must stay prose */
    const isTableRow = (candidate: string) => {
      const trimmed = candidate.trim();
      return trimmed.includes("|") && (trimmed.startsWith("|") || / \| /.test(trimmed));
    };
    const isTableSeparator = (candidate?: string) =>
      candidate !== undefined &&
      /^\|?[\s:|-]+\|?\s*$/.test(candidate) &&
      candidate.includes("-") &&
      candidate.includes("|"); /* a bare --- is an hr, never a separator */
    if (isTableRow(line) && isTableSeparator(lines[index + 1])) {
      const header = splitRow(line);
      index += 2;
      const rows: string[][] = [];
      while (index < lines.length && lines[index].trim() && isTableRow(lines[index])) {
        rows.push(splitRow(lines[index]));
        index += 1;
      }
      blocks.push({ type: "table", header, rows });
      continue;
    }
    const listMatch = /^(\s*)([-*]|\d+\.)\s+(.*)$/.exec(line);
    if (listMatch && listMatch[1].length === 0) {
      const ordered = /\d/.test(listMatch[2]);
      const items: ListItem[] = [];
      while (index < lines.length) {
        const entry = /^(\s*)([-*]|\d+\.)\s+(.*)$/.exec(lines[index]);
        if (!entry) break;
        if (entry[1].length === 0) items.push({ text: entry[3], sub: [] });
        else if (items.length > 0) items[items.length - 1].sub.push(entry[3]);
        index += 1;
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }
    /* paragraph: consecutive plain lines */
    const paragraph: string[] = [line];
    index += 1;
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^(#{1,6}\s|```|>|\||(\s*)([-*]|\d+\.)\s|(-{3,}|\*{3,})\s*$)/.test(lines[index])
    ) {
      paragraph.push(lines[index]);
      index += 1;
    }
    blocks.push({ type: "paragraph", text: paragraph.join(" ") });
  }
  return blocks;
}
/* ── rendering ─────────────────────────────────────────── */
const HEADING_CLASSES: Record<number, string> = {
  1: "text-title font-semibold text-ink",
  2: "text-lead font-semibold text-ink",
  3: "text-body font-semibold text-ink",
};
const DEFAULT_CONTENT = `### Weekend flavor plan
Pistachio is **up 23%** this month with the *best margin* on the board — details in [the flavor doc](https://example.com/flavors).

- Churn a double batch Friday night
- Feature it on the A-board
  - Pair it with the waffle special
- Retire ~~Bubblegum~~ quietly

1. Prep the base Thursday
2. Churn overnight
3. Case by Saturday open

> Cold-chain check passes before every weekend feature.

| Flavor | Margin | Trend |
| --- | --- | --- |
| Pistachio | 38% | Rising |
| Vanilla Bean | 30% | Flat |

\`\`\`ts
const plan = schedule("pistachio", { batches: 2 });
\`\`\``;
export default function Markdown({
  content = DEFAULT_CONTENT,
  className = "",
}: {
  /** markdown source; defaults to demo content */
  content?: string;
  className?: string;
} = {}) {
  const blocks = useMemo(() => parseBlocks(content), [content]);
  return (
    <div className={`flex w-full flex-col gap-3 ${className}`}>
      {blocks.map((block, index) => {
        const key = `block-${index}`;
        switch (block.type) {
          case "heading": {
            const Tag = (`h${Math.min(block.level + 2, 6)}`) as "h3" | "h4" | "h5" | "h6";
            return (
              <Tag key={key} className={HEADING_CLASSES[Math.min(block.level, 3)]}>
                {renderInline(block.text, key)}
              </Tag>
            );
          }
          case "paragraph":
            return (
              <p key={key} className="text-body leading-relaxed text-ink">
                {renderInline(block.text, key)}
              </p>
            );
          case "code":
            return <CodeBlock key={key} code={block.code} language={asLanguage(block.lang)} />;
          case "quote":
            return (
              <blockquote key={key} className="border-l-2 border-line-strong pl-3 text-body leading-relaxed text-ink-2">
                {block.lines.map((quoteLine, quoteIndex) => (
                  <p key={quoteIndex}>{renderInline(quoteLine, `${key}-${quoteIndex}`)}</p>
                ))}
              </blockquote>
            );
          case "list": {
            const ListTag = block.ordered ? "ol" : "ul";
            return (
              <ListTag
                key={key}
                className={`flex flex-col gap-1 pl-5 text-body leading-relaxed text-ink ${
                  block.ordered ? "list-decimal" : "list-disc"
                } marker:text-ink-3`}
              >
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>
                    {renderInline(item.text, `${key}-${itemIndex}`)}
                    {item.sub.length > 0 && (
                      <ul className="mt-1 flex list-[circle] flex-col gap-1 pl-5 marker:text-ink-3">
                        {item.sub.map((subItem, subIndex) => (
                          <li key={subIndex}>
                            {renderInline(subItem, `${key}-${itemIndex}-${subIndex}`)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ListTag>
            );
          }
          case "table":
            return (
              <div key={key} role="region" aria-label="Table" tabIndex={0} className="overflow-x-auto rounded-md shadow-hairline">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-line">
                      {block.header.map((cell, cellIndex) => (
                        <th key={cellIndex} className="primitive-table-cell text-small font-medium whitespace-nowrap text-ink-3">
                          {renderInline(cell, `${key}-h${cellIndex}`)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-b border-line last:border-0">
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex} className="primitive-table-cell text-body text-ink">
                            {renderInline(cell, `${key}-${rowIndex}-${cellIndex}`)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "hr":
            return <hr key={key} className="border-line" />;
          default:
            return null;
        }
      })}
    </div>
  );
}
