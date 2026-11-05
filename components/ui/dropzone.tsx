"use client";

import { useBi } from "@/lib/i18n/context";

import { useRef, useState, type DragEvent, type ClipboardEvent } from "react";
import { ImagePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Kbd } from "@/components/ui/kbd";

export interface DropzoneProps {
  onFiles: (files: File[]) => void;
  accept?: string;
  maxFiles?: number;
  label?: string;
  hint?: string;
  disabled?: boolean;
  error?: string;
  className?: string;
}

function filterFiles(list: FileList | File[], accept: string | undefined, maxFiles: number) {
  const files = Array.from(list);
  const filtered = accept
    ? files.filter((f) => f.type.match(accept.replace("*", ".*")))
    : files;
  return filtered.slice(0, maxFiles);
}

function Dropzone({
  onFiles,
  accept = "image/*",
  maxFiles = 1,
  label,
  hint,
  disabled = false,
  error,
  className,
}: DropzoneProps) {
  const L = useBi();
  label ??= L({ ko: "이미지를 드래그하거나 클릭하여 업로드", en: "Drag an image here or click to upload" });
  hint ??= L({ ko: "또는 클립보드에서 붙여넣기", en: "or paste from the clipboard" });
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    const files = filterFiles(e.dataTransfer.files, accept, maxFiles);
    if (files.length) onFiles(files);
  }

  function handlePaste(e: ClipboardEvent<HTMLDivElement>) {
    if (disabled) return;
    const files = filterFiles(e.clipboardData.files, accept, maxFiles);
    if (files.length) onFiles(files);
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (!disabled && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onPaste={handlePaste}
        data-slot="dropzone"
        className={cn(
          "bg-dot-grid flex min-h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center outline-none transition-colors duration-(--dur-fast)",
          disabled
            ? "cursor-not-allowed border-hairline opacity-50"
            : "cursor-pointer border-hairline-str/70 bg-surface-2/40 hover:border-accent/60 hover:bg-accent-dim/40 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/50",
          dragOver && "border-primary bg-accent-dim",
          error && "border-danger",
        )}
      >
        <span className={cn("grid size-11 place-items-center rounded-2xl bg-accent-dim text-accent transition-transform duration-(--dur-fast)", dragOver && "scale-110")}>
          <ImagePlus className="size-5" aria-hidden />
        </span>
        <p className="text-sm font-semibold text-fg">{label}</p>
        <p className="flex flex-wrap items-center justify-center gap-1 text-xs text-fg-subtle">
          {hint} <Kbd>⌘V</Kbd>
        </p>
        <p className="mt-1 flex flex-wrap items-center justify-center gap-1.5 text-2xs text-fg-subtle">
          <span className="rounded-full border border-hairline bg-surface px-2 py-0.5">JPG · PNG · WEBP</span>
          {maxFiles > 1 ? <span className="rounded-full border border-hairline bg-surface px-2 py-0.5">{L({ ko: `최대 ${maxFiles}장`, en: `Up to ${maxFiles}` })}</span> : null}
          <span className="inline-flex h-7 items-center rounded-full bg-fg px-3 text-xs font-semibold text-bg">{L({ ko: "사진 고르기", en: "Choose photos" })}</span>
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={maxFiles > 1}
          disabled={disabled}
          className="sr-only"
          onChange={(e) => {
            if (e.target.files) {
              const files = filterFiles(e.target.files, accept, maxFiles);
              if (files.length) onFiles(files);
            }
            e.target.value = "";
          }}
        />
      </div>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}

export { Dropzone };
