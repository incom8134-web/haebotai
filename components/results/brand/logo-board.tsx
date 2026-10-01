"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Star } from "lucide-react";
import { toast } from "sonner";
import { useBi } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import { obj, objs, str, strs } from "@/lib/tools/report/util";
import { CopyButton, Kicker, useLocalSet } from "@/components/results/discover/shared";
import { downloadFromUrl, DownloadLink, guessImageExt } from "@/components/results/download";

// 로고 디렉션 랩 result: a concept board. All four directions side by side
// first (as a buyer would compare them), then each one with its lockup,
// the symbol at real sizes down to a 16px favicon, palette with copyable
// hex, type spec, the reasoning and usage notes. Directions can be
// starred; the stars stay in this browser.

const SIZES = [96, 48, 32, 16];

export function LogoBoard({ output, runId }: { output: Record<string, unknown>; runId?: string }) {
  const L = useBi();
  const concepts = objs(output.concepts)
    .map((c) => ({
      name: str(c.name),
      rationale: str(c.concept_rationale),
      symbol: str(c.symbol),
      hex: strs(obj(c.color_spec).hex),
      type: obj(c.type_spec),
      usage: str(c.usage_notes),
      image: str(obj(c.image).url),
      imageAsset: str(obj(c.image).asset_id),
      symbolImage: str(obj(c.symbol_image).url),
    }))
    .filter((c) => c.image);
  const [favs, toggle] = useLocalSet(`haebot-logo-fav-${runId ?? "draft"}`);
  const [focus, setFocus] = useState(0);
  const router = useRouter();
  const [savingLogo, setSavingLogo] = useState(false);
  const [savedLogo, setSavedLogo] = useState<number | null>(null);
  const c = concepts[Math.min(focus, concepts.length - 1)];
  if (!c) return null;
  const mark = c.symbolImage || c.image;

  // Make this direction the brand logo (/brand), so every tool that reads
  // the profile carries it from now on.
  async function saveAsBrandLogo() {
    if (!c.imageAsset || savingLogo) return;
    setSavingLogo(true);
    const res = await fetch("/api/brand/logo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ assetId: c.imageAsset }) }).catch(() => null);
    setSavingLogo(false);
    if (res?.ok) {
      setSavedLogo(focus);
      toast.success(L({ ko: "브랜드 로고로 저장했어요", en: "Saved as your brand logo" }), { action: { label: L({ ko: "프로필 보기", en: "View profile" }), onClick: () => router.push("/brand") } });
    } else toast.error(L({ ko: "로고를 저장하지 못했어요", en: "Couldn't save the logo" }));
  }

  return (
    <div className="mt-3 flex flex-col gap-5">
      <section>
        <Kicker>{L({ ko: `${concepts.length}가지 방향 한눈에`, en: `${concepts.length} directions at a glance` })}</Kicker>
        <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4" role="tablist" aria-label={L({ ko: "로고 방향", en: "Logo directions" })}>
          {concepts.map((x, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={focus === i}
              onClick={() => setFocus(i)}
              className={cn("relative overflow-hidden rounded-xl border bg-white text-left transition-shadow", focus === i ? "border-accent ring-2 ring-accent/30" : "border-hairline hover:border-hairline-str")}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={x.image} alt={x.name} className="aspect-square w-full object-contain" />
              <span className="flex items-center gap-1 border-t border-black/5 px-2 py-1.5 text-xs font-medium text-neutral-800">
                <span className="min-w-0 flex-1 truncate">{i + 1}. {x.name}</span>
                {favs.has(String(i)) ? <Star className="size-3 fill-amber-400 text-amber-400" aria-label={L({ ko: "즐겨찾기", en: "Starred" })} /> : null}
              </span>
            </button>
          ))}
        </div>
      </section>

      <article className="grid gap-4 rounded-2xl border border-hairline bg-surface p-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-3">
          <div className="overflow-hidden rounded-xl border border-hairline bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c.image} alt={c.name} className="w-full" />
          </div>
          <div>
            <p className="text-2xs text-fg-subtle">{L({ ko: "크기 테스트 — 작아져도 알아볼 수 있나요?", en: "Size test — still recognisable when small?" })}</p>
            <div className="mt-1.5 flex items-end gap-4 rounded-xl border border-hairline bg-white p-3">
              {SIZES.map((px) => (
                <figure key={px} className="flex flex-col items-center gap-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={mark} alt="" width={px} height={px} style={{ width: px, height: px }} className="object-contain" />
                  <figcaption className="text-[10px] text-neutral-500">{px}px</figcaption>
                </figure>
              ))}
              <div className="ml-auto flex items-center gap-1.5 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1 text-[11px] text-neutral-700">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mark} alt="" width={16} height={16} className="size-4 object-contain" />
                {L({ ko: "브라우저 탭", en: "Browser tab" })}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <header className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-2xs text-fg-subtle">{L({ ko: `방향 ${focus + 1}`, en: `Direction ${focus + 1}` })}</p>
              <h4 className="text-lg font-bold text-fg break-keep">{c.name}</h4>
            </div>
            <button
              type="button"
              aria-pressed={favs.has(String(focus))}
              onClick={() => toggle(String(focus))}
              className="inline-flex items-center gap-1 rounded-full border border-hairline px-2.5 py-1 text-xs text-fg-muted hover:text-fg"
            >
              <Star className={cn("size-3.5", favs.has(String(focus)) && "fill-warn text-warn")} aria-hidden />
              {L({ ko: "마음에 들어요", en: "Star" })}
            </button>
          </header>
          <p className="text-sm leading-relaxed text-fg break-keep">{c.rationale}</p>
          {c.symbol ? (
            <p className="text-xs leading-relaxed text-fg-muted break-keep">
              <b className="font-semibold text-fg">{L({ ko: "심볼", en: "Symbol" })}</b> {c.symbol}
            </p>
          ) : null}
          {c.hex.length ? (
            <div className="flex flex-wrap gap-2">
              {c.hex.map((h) => (
                <span key={h} className="flex items-center gap-1.5 rounded-lg border border-hairline p-1 pr-1.5">
                  <span className="size-6 rounded" style={{ background: h }} aria-hidden />
                  <CopyButton text={h} label={h} className="border-0 px-0.5" />
                </span>
              ))}
            </div>
          ) : null}
          {str(c.type.family) ? (
            <p className="rounded-lg bg-surface-2 px-3 py-2 text-xs text-fg">
              <span className="text-fg-subtle">{L({ ko: "서체", en: "Type" })}</span> {str(c.type.family)} · {str(c.type.weight)}
              {str(c.type.tracking) ? ` · ${L({ ko: "자간", en: "tracking" })} ${str(c.type.tracking)}` : ""}
            </p>
          ) : null}
          {c.usage ? <p className="text-xs leading-relaxed text-fg-subtle break-keep">{c.usage}</p> : null}
          <div className="mt-auto flex flex-wrap gap-2 border-t border-hairline pt-3">
            <DownloadLink label={L({ ko: "로고 PNG", en: "Logo PNG" })} onClick={() => downloadFromUrl(`logo-${focus + 1}.png`, c.image)} />
            {c.symbolImage ? <DownloadLink label={L({ ko: "심볼만", en: "Symbol only" })} onClick={() => downloadFromUrl(`logo-${focus + 1}-symbol.${guessImageExt(c.symbolImage)}`, c.symbolImage)} /> : null}
            {c.imageAsset && runId ? (
              <button
                type="button"
                onClick={saveAsBrandLogo}
                disabled={savingLogo || savedLogo === focus}
                className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent-dim px-2.5 py-1 text-xs font-medium text-accent disabled:opacity-60"
              >
                <BadgeCheck className="size-3.5" aria-hidden />
                {savedLogo === focus ? L({ ko: "브랜드 로고로 저장됨", en: "Saved as brand logo" }) : savingLogo ? L({ ko: "저장 중…", en: "Saving…" }) : L({ ko: "브랜드 로고로 저장", en: "Save as brand logo" })}
              </button>
            ) : null}
          </div>
        </div>
      </article>

      {Array.isArray(output.mockups) && output.mockups.length ? (
        <section>
          <Kicker>{L({ ko: "적용 아이디어", en: "Where it could go" })}</Kicker>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {strs(output.mockups).map((m, i) => (
              <li key={i} className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-fg break-keep">{m}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
