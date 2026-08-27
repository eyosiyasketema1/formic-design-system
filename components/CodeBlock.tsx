"use client";
import { useMemo, useState } from "react";
import { Icon, IconButton } from "./primitives";
/* ─────────────────────────────────────────────────────────
 * CODE BLOCK
 * AI code output: header with language / filename and a copy
 * action, lightly highlighted body. The tokenizer is a small
 * line-based regex pass — no runtime dependency — and every
 * syntax color is an existing theme token, so all palettes
 * and dark mode come for free. Block comments that span
 * lines degrade to plain text (accepted trade-off).
 * ───────────────────────────────────────────────────────── */
export type CodeLanguage = "ts" | "js" | "py" | "json" | "bash" | "css" | "text";
const KEYWORDS: Record<CodeLanguage, string[]> = {
  ts: ["const", "let", "var", "function", "return", "if", "else", "for", "while", "import", "from", "export", "default", "type", "interface", "class", "extends", "new", "async", "await", "try", "catch", "throw", "switch", "case", "break", "continue", "typeof", "in", "of", "null", "undefined", "true", "false"],
  js: ["const", "let", "var", "function", "return", "if", "else", "for", "while", "import", "from", "export", "default", "class", "extends", "new", "async", "await", "try", "catch", "throw", "switch", "case", "break", "continue", "typeof", "in", "of", "null", "undefined", "true", "false"],
  py: ["def", "return", "if", "elif", "else", "for", "while", "import", "from", "as", "class", "try", "except", "raise", "with", "lambda", "pass", "None", "True", "False", "and", "or", "not", "in", "is", "yield"],
  json: ["true", "false", "null"],
  bash: ["if", "then", "else", "fi", "for", "do", "done", "echo", "export", "function", "case", "esac", "while", "local"],
  css: [],
  text: [],
};
type TokenKind = "plain" | "keyword" | "string" | "comment" | "number" | "fn";
const TOKEN_COLORS: Record<TokenKind, string> = {
  plain: "var(--ink-2)",
  keyword: "var(--accent)",
  string: "var(--green)",
  comment: "var(--ink-3)",
  number: "var(--orange)",
  fn: "var(--ink)",
};
function highlightLine(line: string, language: CodeLanguage): { text: string; kind: TokenKind }[] {
  if (language === "text") return [{ text: line, kind: "plain" }];
  const keywords = KEYWORDS[language];
  const comment =
    language === "py" || language === "bash"
      ? "#.*"
      : language === "css"
        ? "\\/\\*.*?\\*\\/" /* css has no line comments — // would eat url(//…) */
        : "\\/\\/.*|\\/\\*.*?\\*\\/";
  const re = new RegExp(
    `(${comment})|("(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*'|\`(?:[^\`\\\\]|\\\\.)*\`)|(\\b\\d+(?:\\.\\d+)?\\b)|(\\b[A-Za-z_$][\\w$]*\\b)`,
    "g",
  );
  const tokens: { text: string; kind: TokenKind }[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(line))) {
    if (match.index > cursor) tokens.push({ text: line.slice(cursor, match.index), kind: "plain" });
    const [full, com, str, num, word] = match;
    let kind: TokenKind = "plain";
    if (com) kind = "comment";
    else if (str) kind = "string";
    else if (num) kind = "number";
    else if (word) kind = keywords.includes(word) ? "keyword" : line[re.lastIndex] === "(" ? "fn" : "plain";
    tokens.push({ text: full, kind });
    cursor = re.lastIndex;
  }
  if (cursor < line.length) tokens.push({ text: line.slice(cursor), kind: "plain" });
  return tokens;
}
const DEFAULT_CODE = `export function restock(flavor: string, batches = 2) {
  // churn overnight so it sets by open
  const start = Date.now();
  return schedule({ flavor, batches, at: "05:30" })
    .then((job) => log(\`queued \${flavor} x\${batches}\`, job.id));
}`;
export default function CodeBlock({
  code = DEFAULT_CODE,
  language = "ts",
  filename,
  lineNumbers = false,
  onCopy,
}: {
  /** the source to render; defaults to demo content */
  code?: string;
  language?: CodeLanguage;
  /** shown in the header instead of the bare language label */
  filename?: string;
  lineNumbers?: boolean;
  /** called with the code after a successful copy */
  onCopy?: (code: string) => void;
} = {}) {
  const [copied, setCopied] = useState(false);
  const lines = useMemo(
    () => code.split("\n").map((line) => highlightLine(line, language)),
    [code, language],
  );
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      onCopy?.(code);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable (insecure context) — leave the button quiet */
    }
  };
  return (
    <div className="w-full max-w-105">
      <div className="overflow-hidden rounded-card bg-surface shadow-card">
        <div className="primitive-card-bar flex items-center justify-between border-b border-line">
          <span className="min-w-0 truncate font-mono text-micro tracking-wide text-ink-3 uppercase">
            {filename ?? language}
          </span>
          <span className="flex items-center gap-1.5">
            {/* announce the confirmation; the icon swap alone is silent */}
            <span aria-live="polite" className="text-micro text-ink-3">
              {copied ? "Copied" : ""}
            </span>
            <IconButton
              label="Copy code"
              onClick={copy}
              className={copied ? "text-green" : "text-ink-3 hover:bg-hover hover:text-ink"}
            >
              <Icon name={copied ? "check" : "copy"} size={13} strokeWidth={2} />
            </IconButton>
          </span>
        </div>
        {/* keyboard-scrollable like FilterTable's region — long lines
            must be reachable without a pointer */}
        <div className="overflow-x-auto" role="region" aria-label={`Code: ${filename ?? language}`} tabIndex={0}>
          <pre className="w-fit min-w-full px-3.5 py-3 font-mono text-caption leading-relaxed">
            {lines.map((tokens, index) => (
              /* min-h-[1lh] keeps empty lines tall without placeholder
                 characters that would pollute manual text selection */
              <div key={index} className="flex min-h-[1lh] whitespace-pre">
                {lineNumbers && (
                  <span
                    aria-hidden
                    className="mr-3.5 w-5 shrink-0 select-none text-right text-ink-3"
                    style={{ opacity: 0.7 }}
                  >
                    {index + 1}
                  </span>
                )}
                <span className="flex-1">
                  {tokens.map((token, i) => (
                    <span key={i} style={{ color: TOKEN_COLORS[token.kind] }}>
                      {token.text}
                    </span>
                  ))}
                </span>
              </div>
            ))}
          </pre>
        </div>
      </div>
    </div>
  );
}
