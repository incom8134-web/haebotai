"use client";

import { useRef, useState } from "react";
import { ImagePlus, Palette, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useBi } from "@/lib/i18n/context";
import { paletteFromPixels } from "@/lib/palette-from-pixels";

// The brand logo on /brand (app/api/brand/logo). Once there's a logo, its
// main colours can fill the brand colours in one tap — read from the
// image in the browser, nothing sent anywhere.

async function colorsOf(url: string): Promise<string[]> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = url;
  await img.decode();
  const size = 96;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return [];
  ctx.drawImage(img, 0, 0, size, size);
  return paletteFromPixels(ctx.getImageData(0, 0, size, size).data);
}

export function LogoField({ initialUrl, onColors, onChange }: { initialUrl: string | null; onColors: (hex: string[]) => void; onChange?: (hasLogo: boolean) => void }) {
  const L = useBi();
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState<"upload" | "remove" | "colors" | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setBusy("upload");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/brand/logo", { method: "POST", body: form });
      const body = (await res.json().catch(() => ({}))) as { url?: string | null; error?: string };
      if (!res.ok) throw new Error(body.error);
      setUrl(body.url ?? null);
      onChange?.(true);
      toast.success(L({ ko: "로고를 저장했어요", en: "Logo saved" }));
    } catch (err) {
      toast.error((err as Error).message || L({ ko: "로고를 올리지 못했어요", en: "Couldn't upload the logo" }));
    } finally {
      setBusy(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove() {
    setBusy("remove");
    const res = await fetch("/api/brand/logo", { method: "DELETE" }).catch(() => null);
    setBusy(null);
    if (res?.ok) {
      setUrl(null);
      onChange?.(false);
    }
    else toast.error(L({ ko: "로고를 지우지 못했어요", en: "Couldn't remove the logo" }));
  }

  async function useColors() {
    if (!url) return;
    setBusy("colors");
    try {
      const hex = await colorsOf(url);
      if (!hex.length) throw new Error();
      onColors(hex);
      toast.success(L({ ko: `로고에서 ${hex.length}가지 색을 가져왔어요. 저장을 눌러 확정하세요.`, en: `Took ${hex.length} colours from the logo. Press Save to keep them.` }));
    } catch {
      toast.error(L({ ko: "로고에서 색을 읽지 못했어요", en: "Couldn't read colours from the logo" }));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-hairline bg-surface p-3">
      <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-hairline bg-white">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={L({ ko: "브랜드 로고", en: "Brand logo" })} className="size-full object-contain" />
        ) : (
          <ImagePlus className="size-6 text-fg-subtle" aria-hidden />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="text-xs leading-relaxed break-keep text-fg-muted">
          {L({ ko: "PNG·JPG·WEBP, 5MB 이하. 로고 디렉션 랩 결과에서 바로 저장할 수도 있어요.", en: "PNG, JPG or WEBP up to 5MB. You can also save one straight from a Logo Lab result." })}
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            aria-label={L({ ko: "로고 파일", en: "Logo file" })}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
            }}
          />
          <Button type="button" variant="secondary" size="sm" loading={busy === "upload"} disabled={!!busy} onClick={() => inputRef.current?.click()}>
            <ImagePlus className="size-4" aria-hidden /> {url ? L({ ko: "바꾸기", en: "Replace" }) : L({ ko: "로고 올리기", en: "Upload logo" })}
          </Button>
          {url ? (
            <>
              <Button type="button" variant="secondary" size="sm" loading={busy === "colors"} disabled={!!busy} onClick={useColors}>
                <Palette className="size-4" aria-hidden /> {L({ ko: "로고 색 가져오기", en: "Use logo colours" })}
              </Button>
              <Button type="button" variant="ghost" size="sm" loading={busy === "remove"} disabled={!!busy} onClick={remove}>
                <Trash2 className="size-4" aria-hidden /> {L({ ko: "지우기", en: "Remove" })}
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
