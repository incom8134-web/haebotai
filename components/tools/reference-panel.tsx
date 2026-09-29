"use client";

import { useRef, useState } from "react";
import { ChevronDown, FileText, ImageIcon, Paperclip, Presentation, Upload, X } from "lucide-react";
import { useBi } from "@/lib/i18n/context";
import { createClient } from "@/lib/supabase/client";
import { REFERENCE_LIMITS, referenceModesFor } from "@/lib/tools/reference";
import { cn } from "@/lib/utils";

// "참고 자료" on every tool's run page: paste text or drop files, then pick
// what this tool should do with them (its own commands — improve a deck,
// SEO-optimize a draft, redesign an old site). Collapsed until opened; a
// one-line summary shows what's attached when it's closed.

export interface ReferenceValue {
  mode: string;
  text: string;
  files: File[];
}

export const emptyReference = (toolId: string): ReferenceValue => ({ mode: referenceModesFor(toolId)[0].id, text: "", files: [] });

/**
 * Uploads the reference files straight to the user's own folder in the
 * "inputs" bucket (up to 30 MB, well past what a JSON request can carry)
 * and returns their paths for the run request. The server reads and
 * deletes them.
 */
export async function uploadReferenceFiles(files: File[]): Promise<{ name: string; path: string }[]> {
  if (!files.length) return [];
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다");
  const batch = crypto.randomUUID();
  return Promise.all(
    files.map(async (f, i) => {
      // Storage keys stay ASCII: the original name travels separately.
      const ext = (f.name.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
      const path = `${user.id}/refs/${batch}/${i}.${ext}`;
      // Some systems report no type (e.g. .md, .pptx); storage needs one.
      const { error } = await supabase.storage.from("inputs").upload(path, f, { contentType: f.type || MIME_BY_EXT[ext] || "application/octet-stream", upsert: false });
      if (error) throw new Error(`${f.name}: 업로드하지 못했습니다 (${error.message})`);
      return { name: f.name, path };
    }),
  );
}

const MIME_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain",
  md: "text/markdown",
  csv: "text/csv",
  html: "text/html",
};

const kb = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)}MB` : `${Math.max(1, Math.round(n / 1024))}KB`);

function FileIcon({ name }: { name: string }) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const Icon = ["png", "jpg", "jpeg", "webp"].includes(ext) ? ImageIcon : ext === "pptx" ? Presentation : FileText;
  return <Icon className="size-3.5 shrink-0 text-studio-cyan" aria-hidden />;
}

export function ReferencePanel({ toolId, value, onChange }: { toolId: string; value: ReferenceValue; onChange: (v: ReferenceValue) => void }) {
  const L = useBi();
  const modes = referenceModesFor(toolId);
  const filled = value.text.trim().length > 0 || value.files.length > 0;
  const [open, setOpen] = useState(filled);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const mode = modes.find((m) => m.id === value.mode) ?? modes[0];

  function addFiles(list: FileList | File[]) {
    setError(null);
    const incoming = [...list];
    const bad = incoming.find((f) => !REFERENCE_LIMITS.accept.some((ext) => f.name.toLowerCase().endsWith(ext)));
    if (bad) return setError(L({ ko: `${bad.name}: 이미지, PDF, Word, PowerPoint, 텍스트 파일만 올릴 수 있어요.`, en: `${bad.name}: images, PDF, Word, PowerPoint or text files only.` }));
    const files = [...value.files, ...incoming];
    if (files.length > REFERENCE_LIMITS.maxFiles) return setError(L({ ko: `파일은 ${REFERENCE_LIMITS.maxFiles}개까지 올릴 수 있어요.`, en: `Up to ${REFERENCE_LIMITS.maxFiles} files.` }));
    if (files.reduce((n, f) => n + f.size, 0) > REFERENCE_LIMITS.maxTotalBytes) return setError(L({ ko: "파일은 합쳐서 30MB까지 올릴 수 있어요.", en: "Files can total up to 30 MB." }));
    onChange({ ...value, files });
  }

  const summary = [
    value.files.length ? L({ ko: `파일 ${value.files.length}개`, en: `${value.files.length} file(s)` }) : "",
    value.text.trim() ? L({ ko: `${value.text.length.toLocaleString()}자`, en: `${value.text.length.toLocaleString()} chars` }) : "",
    L(mode.label),
  ].filter(Boolean).join(" · ");

  return (
    <section className="glass mt-4 rounded-[24px]" aria-label={L({ ko: "참고 자료", en: "Reference material" })}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-3 p-5 text-left md:px-6">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-studio-cyan/15 text-studio-cyan">
          <Paperclip className="size-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold break-keep">{L({ ko: "참고 자료 (선택)", en: "Reference material (optional)" })}</span>
          <span className="block truncate text-sm text-fg-muted">
            {filled ? summary : L({ ko: "기존 자료·문서·이미지를 붙여 넣거나 올리고, 무엇을 할지 고르세요", en: "Paste or upload existing material, then choose what to do with it" })}
          </span>
        </span>
        <ChevronDown className={cn("size-4 shrink-0 text-fg-subtle transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      {open ? (
        <div className="space-y-5 border-t border-hairline p-5 md:px-6">
          <fieldset>
            <legend className="text-sm font-medium">{L({ ko: "무엇을 할까요?", en: "What should this tool do?" })}</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {modes.map((m) => (
                <label
                  key={m.id}
                  className={cn(
                    "flex cursor-pointer flex-col rounded-2xl border p-3 transition-colors",
                    m.id === mode.id ? "border-studio-cyan/60 bg-studio-cyan/10" : "border-hairline hover:border-hairline-str",
                  )}
                >
                  <input type="radio" name={`ref-mode-${toolId}`} value={m.id} checked={m.id === mode.id} onChange={() => onChange({ ...value, mode: m.id })} className="sr-only" />
                  <span className="text-sm font-semibold break-keep">{L(m.label)}</span>
                  <span className="mt-0.5 text-xs leading-relaxed text-fg-muted break-keep">{L(m.hint)}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor={`ref-text-${toolId}`} className="text-sm font-medium">{L({ ko: "붙여 넣기", en: "Paste" })}</label>
            <textarea
              id={`ref-text-${toolId}`}
              value={value.text}
              maxLength={REFERENCE_LIMITS.maxTextChars}
              onChange={(e) => onChange({ ...value, text: e.target.value })}
              rows={6}
              placeholder={L({ ko: "기존 발표 자료, 초안, 광고 문구, 리뷰, 공고문, 사이트 글이나 HTML을 그대로 붙여 넣으세요.", en: "Paste an existing deck, draft, ad copy, reviews, a call for proposals, or your site's text or HTML." })}
              className="mt-2 w-full resize-y rounded-2xl border border-hairline bg-surface/60 px-4 py-3 text-sm leading-relaxed outline-none focus-visible:border-studio-cyan/60"
            />
            <p className="mt-1 text-right font-mono text-2xs text-fg-subtle">
              {value.text.length.toLocaleString()} / {REFERENCE_LIMITS.maxTextChars.toLocaleString()}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium">{L({ ko: "파일 올리기", en: "Upload files" })}</p>
            <div
              role="button"
              tabIndex={0}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                addFiles(e.dataTransfer.files);
              }}
              className={cn(
                "mt-2 flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl border border-dashed px-4 py-6 text-center transition-colors",
                dragging ? "border-studio-cyan bg-studio-cyan/10" : "border-hairline-str hover:border-studio-cyan/50",
              )}
            >
              <Upload className="size-5 text-studio-cyan" aria-hidden />
              <span className="text-sm">{L({ ko: "눌러서 고르거나 끌어다 놓기", en: "Click to choose or drop files" })}</span>
              <span className="text-2xs text-fg-subtle">{L({ ko: `이미지·PDF·Word·PowerPoint·텍스트 · ${REFERENCE_LIMITS.maxFiles}개, 합쳐서 30MB까지`, en: `Images, PDF, Word, PowerPoint, text · up to ${REFERENCE_LIMITS.maxFiles} files, 30 MB total` })}</span>
              <input
                ref={inputRef}
                type="file"
                multiple
                accept={REFERENCE_LIMITS.accept.join(",")}
                className="sr-only"
                onChange={(e) => {
                  if (e.target.files) addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>
            {value.files.length ? (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {value.files.map((f, i) => (
                  <li key={`${f.name}-${i}`} className="flex max-w-full items-center gap-1.5 rounded-full border border-hairline py-1 pr-1 pl-2.5 text-xs">
                    <FileIcon name={f.name} />
                    <span className="truncate">{f.name}</span>
                    <span className="text-fg-subtle">{kb(f.size)}</span>
                    <button
                      type="button"
                      aria-label={L({ ko: `${f.name} 빼기`, en: `Remove ${f.name}` })}
                      onClick={() => onChange({ ...value, files: value.files.filter((_, j) => j !== i) })}
                      className="grid size-5 place-items-center rounded-full text-fg-subtle hover:bg-surface-2 hover:text-fg"
                    >
                      <X className="size-3" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {error ? <p role="alert" className="mt-2 text-xs text-danger">{error}</p> : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
