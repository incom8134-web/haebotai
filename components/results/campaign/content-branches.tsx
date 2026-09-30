"use client";

import { useState } from "react";
import { useBi } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import { objs, str, strs } from "@/lib/tools/report/util";
import { CopyButton, Kicker } from "@/components/results/discover/shared";

// 콘텐츠 변환기 result: the source's core message in the middle and the
// platform versions branching out as tabs. Each version is shown in its
// own shape — carousel slides as square cards, a short-video script as a
// timed table, a thread as numbered posts — with a length check against
// that platform's usual limit and a copy button.

export const TARGET_LABELS: Record<string, { ko: string; en: string; limit?: number }> = {
  instagram_carousel: { ko: "인스타 카드뉴스", en: "IG carousel" },
  instagram_caption: { ko: "인스타 캡션", en: "IG caption", limit: 2200 },
  threads: { ko: "스레드", en: "Threads", limit: 500 },
  linkedin: { ko: "링크드인", en: "LinkedIn", limit: 1300 },
  shorts_script: { ko: "쇼츠 대본", en: "Shorts script" },
  newsletter: { ko: "뉴스레터", en: "Newsletter" },
  naver_blog: { ko: "네이버 블로그", en: "Naver blog" },
  kakao: { ko: "카카오톡 채널", en: "KakaoTalk", limit: 400 },
};

export function ContentBranches({ output }: { output: Record<string, unknown> }) {
  const L = useBi();
  const versions = objs(output.versions).map((v) => ({
    platform: str(v.platform),
    angle: str(v.angle),
    title: str(v.title),
    body: str(v.body),
    slides: objs(v.slides).map((s) => ({ heading: str(s.heading), text: str(s.text) })),
    script: objs(v.script).map((s) => ({ time: str(s.time), visual: str(s.visual), voice: str(s.voice) })),
    posts: strs(v.posts),
    hashtags: strs(v.hashtags),
    cta: str(v.cta),
    note: str(v.note),
  }));
  const [tab, setTab] = useState(0);
  const v = versions[Math.min(tab, versions.length - 1)];

  const fullText = (x: typeof v) =>
    [
      x.title,
      x.body,
      ...x.slides.map((s, i) => `[${i + 1}] ${s.heading}\n${s.text}`),
      ...x.script.map((s) => `${s.time} | ${s.visual} | ${s.voice}`),
      ...x.posts.map((p, i) => `${i + 1}/ ${p}`),
      x.cta,
      x.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" "),
    ]
      .filter(Boolean)
      .join("\n\n");

  return (
    <div className="mt-3 flex flex-col gap-4">
      <section className="relative mx-auto w-full max-w-2xl rounded-2xl border-2 border-accent bg-accent-dim p-4 text-center">
        <Kicker>{L({ ko: "원본의 핵심", en: "Core of the source" })}</Kicker>
        <p className="mt-1 text-lg leading-snug font-bold text-fg break-keep">{str(output.core_message)}</p>
        {strs(output.key_points).length ? (
          <ul className="mt-2 flex flex-wrap justify-center gap-1.5">
            {strs(output.key_points).map((k, i) => (
              <li key={i} className="rounded-full bg-surface px-2.5 py-1 text-xs text-fg break-keep">{k}</li>
            ))}
          </ul>
        ) : null}
        <span className="absolute -bottom-4 left-1/2 h-4 w-0.5 -translate-x-1/2 bg-accent" aria-hidden />
      </section>

      <div className="flex gap-1.5 overflow-x-auto border-t-2 border-accent/40 pt-3" role="tablist">
        {versions.map((x, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={tab === i}
            onClick={() => setTab(i)}
            className={cn("shrink-0 rounded-full border px-3 py-1.5 text-xs", tab === i ? "border-accent bg-accent text-white" : "border-hairline text-fg-muted hover:text-fg")}
          >
            {L(TARGET_LABELS[x.platform] ?? { ko: x.platform, en: x.platform })}
          </button>
        ))}
      </div>

      {v ? (
        <article className="rounded-2xl border border-hairline bg-surface p-4">
          <header className="flex flex-wrap items-center gap-2">
            {v.angle ? <p className="text-xs text-fg-muted break-keep">{L({ ko: "이 버전의 각도", en: "Angle" })}: {v.angle}</p> : null}
            {(() => {
              const limit = TARGET_LABELS[v.platform]?.limit;
              const n = (v.body + v.posts.join("")).length;
              return limit && n ? (
                <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", n <= limit ? "bg-grounded-dim text-grounded" : "bg-warn/15 text-fg")}>
                  {n.toLocaleString()} / {limit.toLocaleString()}
                  {L({ ko: "자", en: " chars" })}
                </span>
              ) : null;
            })()}
            <CopyButton text={fullText(v)} label={L({ ko: "전체 복사", en: "Copy all" })} className="ml-auto" />
          </header>
          {v.title ? <p className="mt-2 text-base font-bold text-fg break-keep">{v.title}</p> : null}

          {v.slides.length ? (
            <ol className="mt-3 flex snap-x gap-2 overflow-x-auto pb-2">
              {v.slides.map((s, i) => (
                <li key={i} className="flex aspect-square w-52 shrink-0 snap-start flex-col justify-between rounded-xl bg-fg p-4 text-bg">
                  <span className="text-2xs opacity-60">
                    {i + 1} / {v.slides.length}
                  </span>
                  <span>
                    <span className="block text-base leading-snug font-bold break-keep">{s.heading}</span>
                    <span className="mt-1.5 block text-xs leading-relaxed opacity-80 break-keep">{s.text}</span>
                  </span>
                </li>
              ))}
            </ol>
          ) : null}

          {v.script.length ? (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[30rem] text-xs">
                <thead>
                  <tr className="border-b border-hairline text-left text-fg-subtle">
                    <th className="py-1.5 pr-3 font-normal">{L({ ko: "시간", en: "Time" })}</th>
                    <th className="py-1.5 pr-3 font-normal">{L({ ko: "화면", en: "Visual" })}</th>
                    <th className="py-1.5 font-normal">{L({ ko: "말·자막", en: "Voice" })}</th>
                  </tr>
                </thead>
                <tbody>
                  {v.script.map((s, i) => (
                    <tr key={i} className="border-b border-hairline align-top last:border-0">
                      <td className="py-2 pr-3 font-mono text-fg-subtle">{s.time}</td>
                      <td className="py-2 pr-3 text-fg-muted break-keep">{s.visual}</td>
                      <td className="py-2 text-fg break-keep">{s.voice}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {v.posts.length ? (
            <ol className="mt-3 flex flex-col gap-2 border-l-2 border-hairline-str pl-3">
              {v.posts.map((p, i) => (
                <li key={i} className="text-sm leading-relaxed text-fg break-keep">
                  <span className="mr-1 text-2xs text-fg-subtle">
                    {i + 1}/{v.posts.length}
                  </span>
                  {p}
                </li>
              ))}
            </ol>
          ) : null}

          {v.body ? <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-fg break-keep">{v.body}</p> : null}
          {v.cta ? <p className="mt-3 text-sm font-semibold text-accent break-keep">→ {v.cta}</p> : null}
          {v.hashtags.length ? <p className="mt-2 text-xs text-ai">{v.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}</p> : null}
          {v.note ? <p className="mt-3 border-t border-hairline pt-2 text-2xs text-fg-subtle break-keep">{v.note}</p> : null}
        </article>
      ) : null}

      {strs(output.dropped).length ? (
        <details className="text-xs text-fg-muted">
          <summary className="cursor-pointer text-fg-subtle">{L({ ko: "원본에서 뺀 내용", en: "Left out of the source" })}</summary>
          <ul className="mt-1.5 flex flex-col gap-1">
            {strs(output.dropped).map((d, i) => (
              <li key={i} className="break-keep">· {d}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
