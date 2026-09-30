"use client";

import { useState } from "react";
import { Camera } from "lucide-react";
import { useBi } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import { objs, str, strs } from "@/lib/tools/report/util";
import { CopyButton, Kicker } from "@/components/results/discover/shared";
import { downloadFromUrl, DownloadLink, guessImageExt } from "@/components/results/download";

// 세일즈 페이지 설계소 result: the plan and the page. "설계도" shows a
// wireframe of the page (one block per section, in order — tap one to
// jump to it) beside each section's headline, body copy and shot list;
// "완성 이미지" shows the rendered 860px page images to download.

export function SalesPageBoard({ output }: { output: Record<string, unknown> }) {
  const L = useBi();
  const sections = objs(output.sections)
    .map((s, i) => ({ order: Number(s.order) || i + 1, type: str(s.type).replace(/_/g, " "), headline: str(s.headline), body: str(s.body), shot: str(s.image_instruction) }))
    .sort((a, b) => a.order - b.order);
  const images = strs(output.rendered_images).filter((u) => /^(https?:|data:image)/.test(u));
  const [tab, setTab] = useState<"plan" | "page">(images.length ? "page" : "plan");
  const faq = objs(output.faq);

  return (
    <div className="mt-3 flex flex-col gap-5">
      <div className="grid gap-3 md:grid-cols-2">
        {strs(output.pain_points).length ? (
          <div className="rounded-2xl border border-hairline p-4">
            <Kicker>{L({ ko: "고객이 망설이는 이유", en: "Why buyers hesitate" })}</Kicker>
            <ul className="mt-2 flex flex-col gap-1 text-sm text-fg">
              {strs(output.pain_points).map((p, i) => (
                <li key={i} className="break-keep">· {p}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {strs(output.usps).length ? (
          <div className="rounded-2xl border border-accent/30 bg-accent-dim p-4">
            <Kicker>{L({ ko: "이 제품만의 이유 3가지", en: "Three reasons to buy" })}</Kicker>
            <ol className="mt-2 flex flex-col gap-1 text-sm font-medium text-fg">
              {strs(output.usps).map((u, i) => (
                <li key={i} className="break-keep">{i + 1}. {u}</li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>

      <div className="flex gap-1 rounded-xl bg-surface-2 p-1 text-sm" role="tablist">
        {(
          [
            ["plan", L({ ko: `설계도 (${sections.length}개 섹션)`, en: `Plan (${sections.length} sections)` })],
            ["page", L({ ko: `완성 이미지 (${images.length})`, en: `Rendered page (${images.length})` })],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            disabled={k === "page" && !images.length}
            onClick={() => setTab(k)}
            className={cn("flex-1 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-40", tab === k ? "bg-surface font-semibold text-fg shadow-sm" : "text-fg-muted")}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "plan" ? (
        <div className="grid gap-4 md:grid-cols-[10rem_minmax(0,1fr)]">
          <nav aria-label={L({ ko: "페이지 구조", en: "Page structure" })} className="md:sticky md:top-20 md:self-start">
            <ol className="flex gap-1 overflow-x-auto rounded-xl border border-hairline bg-white p-1.5 md:flex-col">
              {sections.map((s, i) => (
                <li key={i} className="shrink-0">
                  <a
                    href={`#sp-${i}`}
                    className={cn("block rounded-md border border-dashed border-neutral-300 px-2 text-[10px] leading-tight text-neutral-600 hover:border-accent hover:text-accent", i === 0 ? "py-4" : "py-2.5")}
                  >
                    <span className="font-semibold">{i + 1}</span> {s.type}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <ol className="flex flex-col gap-3">
            {sections.map((s, i) => (
              <li key={i} id={`sp-${i}`} className="scroll-mt-20 rounded-2xl border border-hairline bg-surface p-4">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-surface-2 px-1.5 py-0.5 text-2xs font-semibold text-fg-muted">{i + 1} · {s.type}</span>
                  <CopyButton text={`${s.headline}\n\n${s.body}`} className="ml-auto" />
                </div>
                <p className="mt-2 text-lg leading-snug font-bold text-fg break-keep">{s.headline}</p>
                <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-fg-muted break-keep">{s.body}</p>
                {s.shot ? (
                  <p className="mt-3 flex gap-1.5 rounded-lg bg-ai-dim p-2.5 text-xs leading-relaxed text-fg break-keep">
                    <Camera className="mt-0.5 size-3.5 shrink-0 text-ai" aria-label={L({ ko: "촬영 지시", en: "Shot" })} />
                    {s.shot}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <div className="mx-auto flex w-full max-w-[430px] flex-col">
          {images.map((url, i) => (
            <figure key={i} className="flex flex-col gap-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={L({ ko: `상세페이지 ${i + 1}`, en: `Page part ${i + 1}` })} className="w-full" />
              <DownloadLink label={L({ ko: `${i + 1}번 이미지 받기`, en: `Download part ${i + 1}` })} onClick={() => downloadFromUrl(`sales-page-${i + 1}.${guessImageExt(url)}`, url)} />
            </figure>
          ))}
        </div>
      )}

      {faq.length ? (
        <section>
          <Kicker>FAQ</Kicker>
          <div className="mt-2 flex flex-col gap-1.5">
            {faq.map((f, i) => (
              <details key={i} className="rounded-xl border border-hairline bg-surface px-3 py-2">
                <summary className="cursor-pointer text-sm font-medium text-fg break-keep">Q. {str(f.q)}</summary>
                <p className="mt-1.5 text-sm leading-relaxed text-fg-muted break-keep">A. {str(f.a)}</p>
              </details>
            ))}
          </div>
        </section>
      ) : null}

      {str(output.shipping_template) ? (
        <section className="rounded-2xl border border-hairline p-4">
          <div className="flex items-center gap-2">
            <Kicker>{L({ ko: "배송·교환 안내", en: "Shipping & returns" })}</Kicker>
            <CopyButton text={str(output.shipping_template)} className="ml-auto" />
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-fg-muted break-keep">{str(output.shipping_template)}</p>
        </section>
      ) : null}
    </div>
  );
}
