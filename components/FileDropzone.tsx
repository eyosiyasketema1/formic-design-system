"use client";
import { useRef, useState } from "react";
import { Icon, IconButton } from "./primitives";
/* ─────────────────────────────────────────────────────────
 * FILE DROPZONE
 * Drag-and-drop upload with a browse fallback (the zone is
 * a real button, so keyboard works for free). Files are
 * validated against accept / maxSize; rejections announce
 * through an always-mounted live region. Accepted files
 * render as chips with remove.
 * ───────────────────────────────────────────────────────── */
export type DroppedFile = {
  id: string;
  name: string;
  size: number;
  type: string;
  /** the browser File — absent for preloaded (demo/server) entries */
  file?: File;
};
const formatSize = (bytes: number) =>
  bytes >= 1048576
    ? `${(bytes / 1048576).toFixed(1)} MB`
    : bytes >= 1024
      ? `${Math.round(bytes / 1024)} KB`
      : `${bytes} B`;
/** ".pdf" extension rules, "image/*" wildcards, exact mime types */
function matchesAccept(file: { name: string; type: string }, accept?: string) {
  if (!accept) return true;
  const name = file.name.toLowerCase();
  const mime = file.type.toLowerCase();
  return accept
    .split(",")
    .map((rule) => rule.trim().toLowerCase())
    .filter(Boolean)
    .some((rule) => {
      if (rule.startsWith(".")) return name.endsWith(rule);
      if (rule.endsWith("/*")) return mime.startsWith(rule.slice(0, -1));
      return mime === rule;
    });
}
export default function FileDropzone({
  accept,
  maxSize,
  multiple = true,
  label = "Drop files here or browse",
  hint,
  defaultFiles = [],
  onChange,
  className = "",
}: {
  /** input accept string — also validates drops (".pdf,image/*") */
  accept?: string;
  /** per-file size cap in bytes */
  maxSize?: number;
  multiple?: boolean;
  label?: string;
  /** secondary line inside the zone (e.g. "PNG or PDF · up to 5 MB") */
  hint?: string;
  /** preloaded entries (demo / already-uploaded) */
  defaultFiles?: DroppedFile[];
  /** fires with the full list after every add / remove */
  onChange?: (files: DroppedFile[]) => void;
  className?: string;
} = {}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const idRef = useRef(0);
  const dragDepth = useRef(0);
  const [files, setFiles] = useState<DroppedFile[]>(defaultFiles);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  /* screen-reader confirmation — chips appearing is silent otherwise */
  const [announce, setAnnounce] = useState("");
  const commit = (next: DroppedFile[], message: string) => {
    setFiles(next);
    setAnnounce(message);
    onChange?.(next);
  };
  const add = (incoming: File[]) => {
    const rejected: string[] = [];
    let accepted: DroppedFile[] = [];
    for (const file of incoming) {
      if (!matchesAccept(file, accept)) {
        rejected.push(`${file.name} isn't an accepted type`);
        continue;
      }
      if (maxSize !== undefined && file.size > maxSize) {
        rejected.push(`${file.name} is over ${formatSize(maxSize)}`);
        continue;
      }
      accepted.push({
        /* "picked-" namespace keeps generated ids clear of consumer defaultFiles ids */
        id: `picked-${(idRef.current += 1)}`,
        name: file.name,
        size: file.size,
        type: file.type,
        file,
      });
    }
    if (!multiple) accepted = accepted.slice(0, 1);
    setError(rejected.join(". "));
    if (accepted.length > 0) {
      const next = multiple ? [...files, ...accepted] : accepted;
      commit(
        next,
        `${accepted.length} file${accepted.length > 1 ? "s" : ""} added, ${next.length} attached`,
      );
    }
  };
  return (
    <div className={`w-full ${className}`}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault();
          dragDepth.current += 1;
          setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => {
          /* depth counter — children fire enter/leave pairs while dragging */
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (dragDepth.current === 0) setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          dragDepth.current = 0;
          setDragging(false);
          add(Array.from(event.dataTransfer.files));
        }}
        className={`flex w-full flex-col items-center justify-center gap-1.5 rounded-md border border-dashed px-6 py-7 transition-colors duration-150 ${
          dragging
            ? "border-accent bg-accent-tint"
            : "border-line-strong bg-field hover:bg-hover"
        }`}
      >
        <Icon
          name="upload"
          size={18}
          strokeWidth={1.8}
          className={dragging ? "text-accent" : "text-ink-3"}
        />
        <span className="text-caption font-medium text-ink">{label}</span>
        {hint && <span className="text-small text-ink-3">{hint}</span>}
      </button>
      {/* the zone button is the accessible control; the input is plumbing */}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        tabIndex={-1}
        aria-hidden
        className="hidden"
        onChange={(event) => {
          add(Array.from(event.target.files ?? []));
          event.target.value = ""; /* re-selecting the same file must re-fire */
        }}
      />
      {/* always mounted so rejections and confirmations actually announce */}
      <span role="status" aria-live="polite" className="block">
        <span className="sr-only">{announce}</span>
        {error && <span className="mt-1.5 block text-small text-red">{error}</span>}
      </span>
      {files.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1.5">
          {files.map((file) => (
            <li
              key={file.id}
              className="flex h-9 items-center gap-2 rounded-control bg-surface px-2.5 shadow-hairline"
              style={{ animation: "fade-up 250ms var(--ease-out-quint) both" }}
            >
              <Icon name="file" size={14} strokeWidth={2} className="shrink-0 text-ink-3" />
              <span className="min-w-0 flex-1 truncate text-caption text-ink">{file.name}</span>
              <span className="shrink-0 font-mono text-micro text-ink-3">
                {formatSize(file.size)}
              </span>
              <IconButton
                label={`Remove ${file.name}`}
                onClick={() =>
                  commit(
                    files.filter((entry) => entry.id !== file.id),
                    `${file.name} removed, ${files.length - 1} attached`,
                  )
                }
                className="text-ink-3 hover:bg-hover hover:text-ink"
              >
                <Icon name="close" size={12} strokeWidth={2.2} />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
