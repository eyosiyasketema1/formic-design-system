const DEFAULT_TERMINAL_LINES= [
  { text: "npm run build", kind: "cmd" },
  { text: "vite v6.0.3 building for production..." },
  { text: "transforming (412) src/formic/components/charts.tsx" },
  { text: "✓ 418 modules transformed." },
  { text: "dist/index.html                  0.40 kB" },
  { text: "dist/assets/index-Bx2k.css      78.02 kB │ gzip: 15.87 kB" },
  { text: "dist/assets/index-CoNi.js      260.01 kB │ gzip: 74.28 kB" },
  { text: "✓ built in 1.63s" },
];


const LINE_CLASS= {
  cmd: "text-ink",
  out: "text-ink-2",
  err: "text-red",
  info: "text-ink-3 italic",
};

function Terminal({
  lines = DEFAULT_TERMINAL_LINES,
  title = "Terminal",
  status = "done",
  exitCode = status === "error" ? 1 : status === "done" ? 0 : undefined,
  duration,
  stream = false,
  maxHeight = "max-h-72",
  onStop,
  onCopy,
  className = "",
}) {
  const { count } = useStream(stream ? lines.length : 0, { intervalMs: 140 });
  const shown = stream ? lines.slice(0, count) : lines;
  const running = status === "running" || (stream && count < lines.length);
  const bodyRef = useRef(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => { bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight }); }, [shown.length]);
  const copy = async () => {
    const text = lines.map((l) => (l.kind === "cmd" ? `$ ${l.text}` : l.text)).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      onCopy?.(text);
      window.setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard unavailable: stay quiet */ }
  };
  return (
    <div className={`w-full min-w-0 overflow-hidden rounded-card bg-surface shadow-card ${className}`}>
      <div className="primitive-card-bar flex items-center justify-between gap-3 border-b border-line">
        <span className="flex min-w-0 items-center gap-2">
          <Icon name="terminal" size={13} strokeWidth={2} className="shrink-0 text-ink-3" />
          <span className="min-w-0 truncate font-mono text-micro tracking-wide text-ink-3 uppercase">{title}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          {running ? (
            <>
              <span className="flex items-center gap-1.5 text-micro text-ink-3"><Spinner size={11} /> running</span>
              {onStop && (
                <IconButton label="Stop" onClick={onStop} className="text-ink-3 hover:bg-hover hover:text-ink">
                  <Icon name="close" size={13} strokeWidth={2.2} />
                </IconButton>
              )}
            </>
          ) : exitCode !== undefined ? (
            <>
              {duration !== undefined && <span className="text-micro tabular-nums text-ink-3">{tcFormatDuration(duration)}</span>}
              <Badge tone={exitCode === 0 ? "green" : "red"}>exit {exitCode}</Badge>
            </>
          ) : null}
          <span aria-live="polite" className="text-micro text-ink-3">{copied ? "Copied" : ""}</span>
          <IconButton label="Copy output" onClick={copy} className={copied ? "text-green" : "text-ink-3 hover:bg-hover hover:text-ink"}>
            <Icon name={copied ? "check" : "copy"} size={13} strokeWidth={2} />
          </IconButton>
        </span>
      </div>
      <div ref={bodyRef} role="log" aria-live={running ? "polite" : "off"} aria-label={title} tabIndex={0} className={`overflow-auto ${maxHeight}`}>
        <pre className="w-fit min-w-full px-3.5 py-3 font-mono text-caption leading-relaxed">
          {shown.map((line, i) => {
            const kind = line.kind ?? "out";
            const last = i === shown.length - 1;
            return (
              <div key={i} className={`flex min-h-[1lh] whitespace-pre ${LINE_CLASS[kind]}`}>
                {kind === "cmd" && <span aria-hidden className="mr-2 select-none text-ink-3">$</span>}
                <span>{line.text}</span>
                {last && running && <StreamCaret className="self-center" />}
              </div>
            );
          })}
          {shown.length === 0 && running && <div className="flex min-h-[1lh] items-center"><StreamCaret /></div>}
        </pre>
      </div>
    </div>
  );
}

