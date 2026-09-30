"use client";

import { Download } from "lucide-react";
import { toast } from "sonner";

// File-saving helpers shared by the result views.

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Safari starts the download asynchronously; revoking at once can cancel it.
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function downloadText(filename: string, text: string, mimeType: string) {
  downloadBlob(filename, new Blob([text], { type: mimeType }));
}

// Works for both signed Storage URLs and data: URIs — fetch() handles
// both, so this is the one path for "save whatever's behind this src".
// The homepage's Vite + TypeScript project, zipped in the browser.
export async function downloadProject(filename: string, files: Record<string, string>) {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  for (const [path, text] of Object.entries(files)) zip.file(path, text);
  downloadBlob(filename, await zip.generateAsync({ type: "blob" }));
}

// An expired signed URL (old Library runs) answers with an XML error —
// never save that as "image-1.png"; say so instead.
export async function downloadFromUrl(filename: string, url: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    downloadBlob(filename, await res.blob());
  } catch {
    const en = document.documentElement.lang === "en";
    toast.error(en ? "Couldn't download the file. Refresh the page and try again." : "파일을 받지 못했어요. 페이지를 새로고침한 뒤 다시 시도해 주세요.");
  }
}

export function guessImageExt(url: string): string {
  const dataMatch = /^data:image\/([a-z0-9]+);/i.exec(url);
  if (dataMatch) return dataMatch[1] === "jpeg" ? "jpg" : dataMatch[1];
  const pathMatch = /\.([a-z0-9]+)(?:\?|$)/i.exec(url.split("?")[0] ?? "");
  return pathMatch?.[1] ?? "png";
}

export function DownloadLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-full border border-hairline px-2.5 py-1 text-xs text-fg-muted transition-colors hover:border-accent/50 hover:text-fg"
    >
      <Download className="size-3" aria-hidden />
      {label}
    </button>
  );
}

