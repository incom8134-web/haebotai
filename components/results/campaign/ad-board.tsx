"use client";

import Link from "next/link";
import { useState } from "react";
import { Camera, UserSquare } from "lucide-react";
import { useBi } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import { obj, objs, str, strs } from "@/lib/tools/report/util";
import { CopyButton, Kicker } from "@/components/results/discover/shared";

// 광고 크리에이티브 팩토리 result: a creative board — one row per buying
// motive with its visual, headline, body and CTA. Each row flips between
// its A and B versions, or shows both side by side with what the test
// compares. Channel versions and words to avoid follow; the photo and
// model modes of the tool are one click away.

export function AdBoard({ output }: { output: Record<string, unknown> }) {
  const L = useBi();
  const angles = objs(output.angles).map((a) => ({
    motive: str(a.motivation),
    headline: str(a.headline),
    body: str(a.body),
    cta: str(a.cta),
    image: str(a.image_url),
    b: obj(a.variant_b),
  }));
  const hasB = angles.some((a) => str(a.b.headline));
  const [compare, setCompare] = useState(false);
  const [side, setSide] = useState<Record<number, "A" | "B">>({});

  return (
    <div className="mt-3 flex flex-col gap-5">
      {str(output.core_message) ? (
        <div className="studio-gradient-bg rounded-2xl p-5 text-white">
          <p className="text-2xs font-semibold tracking-wide opacity-80">{L({ ko: "핵심 메시지", en: "Core message" })}</p>
          <p className="mt-1.5 text-lg leading-snug font-bold break-keep md:text-xl">{str(output.core_message)}</p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Kicker>{L({ ko: `구매 동기별 광고 ${angles.length}개`, en: `${angles.length} ads by buying motive` })}</Kicker>
        {hasB ? (
          <label className="ml-auto inline-flex cursor-pointer items-center gap-1.5 text-xs text-fg-muted">
            <input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} className="accent-[var(--color-accent)]" />
            {L({ ko: "A/B 나란히 보기", en: "Show A/B side by side" })}
          </label>
        ) : null}
      </div>

      <div className="flex flex-col gap-3">
        {angles.map((a, i) => {
          const s = side[i] ?? "A";
          const versions = [
            { key: "A" as const, headline: a.headline, body: a.body },
            ...(str(a.b.headline) ? [{ key: "B" as const, headline: str(a.b.headline), body: str(a.b.body) }] : []),
          ];
          const shown = compare ? versions : versions.filter((v) => v.key === s);
          return (
            <article key={i} className="grid gap-3 rounded-2xl border border-hairline bg-surface p-3 md:grid-cols-[12rem_minmax(0,1fr)]">
              <div>
                {a.image ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={a.image} alt={a.headline} loading="lazy" className="aspect-[4/5] w-full rounded-xl object-cover" />
                ) : (
                  <div className="studio-gradient-bg grid aspect-[4/5] place-items-center rounded-xl p-4 text-center text-sm font-bold text-white break-keep">{a.headline}</div>
                )}
              </div>
              <div className="flex min-w-0 flex-col">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-accent-dim px-2.5 py-0.5 text-2xs font-semibold text-accent">{a.motive}</span>
                  {versions.length > 1 && !compare ? (
                    <span className="ml-auto flex rounded-lg bg-surface-2 p-0.5 text-2xs" role="group" aria-label="A/B">
                      {versions.map((v) => (
                        <button key={v.key} type="button" aria-pressed={s === v.key} onClick={() => setSide((x) => ({ ...x, [i]: v.key }))} className={cn("rounded-md px-2 py-0.5", s === v.key ? "bg-surface font-semibold text-fg shadow-sm" : "text-fg-muted")}>
                          {v.key}
                        </button>
                      ))}
                    </span>
                  ) : null}
                </div>
                <div className={cn("mt-2 grid gap-3", compare && versions.length > 1 && "sm:grid-cols-2")}>
                  {shown.map((v) => (
                    <div key={v.key} className={cn(compare && versions.length > 1 && "rounded-xl border border-hairline p-3")}>
                      {compare && versions.length > 1 ? <p className="text-2xs font-semibold text-fg-subtle">{v.key}</p> : null}
                      <div className="flex items-start gap-2">
                        <p className="flex-1 text-base leading-snug font-bold text-fg break-keep">{v.headline}</p>
                        <CopyButton text={`${v.headline}\n${v.body}\n${a.cta}`} />
                      </div>
                      <p className="mt-1.5 text-sm leading-relaxed text-fg-muted break-keep">{v.body}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
                  {a.cta ? <span className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">{a.cta}</span> : null}
                  {str(a.b.test_note) ? <p className="text-2xs text-fg-subtle break-keep">A/B · {str(a.b.test_note)}</p> : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {objs(output.channel_versions).length ? (
        <section>
          <Kicker>{L({ ko: "채널별 버전", en: "By channel" })}</Kicker>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {objs(output.channel_versions).map((c, i) => (
              <div key={i} className="rounded-xl border border-hairline p-3">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold text-accent">{str(c.channel)}</p>
                  <CopyButton text={str(c.copy)} className="ml-auto" />
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-fg break-keep">{str(c.copy)}</p>
                {str(c.note) ? <p className="mt-1.5 text-2xs text-fg-subtle">{str(c.note)}</p> : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {strs(output.words_to_avoid).length ? (
        <div>
          <p className="text-2xs text-fg-subtle">{L({ ko: "쓰지 말아야 할 표현", en: "Words to avoid" })}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {strs(output.words_to_avoid).map((w) => (
              <span key={w} className="rounded-full border border-danger/30 bg-danger/10 px-2.5 py-1 text-xs text-danger line-through decoration-danger/60">{w}</span>
            ))}
          </div>
        </div>
      ) : null}

      <section className="flex flex-wrap gap-2 border-t border-hairline pt-3">
        <Link href="/tools/ad-photo/run" className="inline-flex items-center gap-1.5 rounded-xl border border-hairline px-3 py-2 text-xs text-fg hover:border-accent">
          <Camera className="size-3.5 text-accent" aria-hidden /> {L({ ko: "제품 사진 모드로 광고 사진 찍기", en: "Shoot ad photos in photo mode" })}
        </Link>
        <Link href="/tools/ad-model/run" className="inline-flex items-center gap-1.5 rounded-xl border border-hairline px-3 py-2 text-xs text-fg hover:border-accent">
          <UserSquare className="size-3.5 text-accent" aria-hidden /> {L({ ko: "모델 룩북 모드", en: "Model lookbook mode" })}
        </Link>
      </section>
    </div>
  );
}
