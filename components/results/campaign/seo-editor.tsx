"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CircleCheck, CircleAlert } from "lucide-react";
import { useBi } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import { seoChecks } from "@/lib/tools/seo-check";
import { BlogArticle, type BlogOutput } from "@/components/results/blog-article";
import { CopyButton, Kicker } from "@/components/results/discover/shared";

// SEO 원고 컴포저 result: editor first. The article opens as a preview
// and switches to an editable draft; the sidebar re-checks the draft as
// it changes (keyword in title and first paragraph, length against the
// chosen target, keyword repetition, headings, search description,
// photos, sentence and paragraph length) and holds the titles, search
// description and hashtags to copy. Edits stay in this page.

export function SeoEditor({ output, input }: { output: Record<string, unknown>; input?: Record<string, unknown> }) {
  const L = useBi();
  const post = output as BlogOutput;
  const [md, setMd] = useState(post.body_markdown ?? "");
  const [mode, setMode] = useState<"preview" | "edit">("preview");
  const [meta, setMeta] = useState(post.meta_description ?? "");
  const checks = useMemo(
    () =>
      seoChecks({
        markdown: md,
        keyword: String(input?.topic ?? ""),
        titles: post.titles ?? [],
        meta,
        targetChars: Number(input?.length) || 0,
        imageSlots: (post.image_slots ?? []).length,
      }),
    [md, meta, input, post.titles, post.image_slots],
  );
  const passed = checks.filter((c) => c.pass).length;
  const edited = md !== (post.body_markdown ?? "");

  return (
    <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_17rem]">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <div className="flex gap-1 rounded-xl bg-surface-2 p-1 text-xs" role="tablist">
            {(
              [
                ["preview", L({ ko: "미리보기", en: "Preview" })],
                ["edit", L({ ko: "편집", en: "Edit" })],
              ] as const
            ).map(([k, label]) => (
              <button key={k} type="button" role="tab" aria-selected={mode === k} onClick={() => setMode(k)} className={cn("rounded-lg px-3 py-1.5", mode === k ? "bg-surface font-semibold text-fg shadow-sm" : "text-fg-muted")}>
                {label}
              </button>
            ))}
          </div>
          {edited ? (
            <button type="button" onClick={() => setMd(post.body_markdown ?? "")} className="text-2xs text-fg-subtle underline-offset-2 hover:underline">
              {L({ ko: "처음 원고로", en: "Reset" })}
            </button>
          ) : null}
          <CopyButton text={md} label={L({ ko: "본문 복사", en: "Copy body" })} className="ml-auto" />
        </div>
        {mode === "edit" ? (
          <textarea
            value={md}
            onChange={(e) => setMd(e.target.value)}
            aria-label={L({ ko: "본문 편집", en: "Edit body" })}
            className="mt-3 min-h-[36rem] w-full rounded-2xl border border-hairline bg-surface p-4 font-mono text-sm leading-relaxed text-fg outline-none focus:border-accent"
          />
        ) : (
          <BlogArticle post={{ ...post, body_markdown: md, meta_description: meta }} />
        )}
      </div>

      <aside className="flex flex-col gap-3 lg:sticky lg:top-20 lg:self-start" aria-label={L({ ko: "SEO 점검", en: "SEO checks" })}>
        <section className="rounded-2xl border border-hairline bg-surface p-3">
          <div className="flex items-baseline justify-between">
            <Kicker>{L({ ko: "SEO 점검", en: "SEO checks" })}</Kicker>
            <span className={cn("text-sm font-bold tabular-nums", passed === checks.length ? "text-grounded" : "text-fg")} aria-live="polite">
              {passed}/{checks.length}
            </span>
          </div>
          <ul className="mt-2 flex flex-col gap-1.5">
            {checks.map((c) => (
              <li key={c.id} className="flex gap-1.5 text-xs">
                {c.pass ? <CircleCheck className="mt-px size-3.5 shrink-0 text-grounded" aria-label="OK" /> : <CircleAlert className="mt-px size-3.5 shrink-0 text-warn" aria-label={L({ ko: "확인", en: "Check" })} />}
                <span>
                  <span className="text-fg">{c.label}</span>
                  <span className="block text-2xs text-fg-subtle">{c.detail}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[10px] leading-relaxed text-fg-subtle">{L({ ko: "편집하면 바로 다시 점검해요. 기준은 일반적인 블로그 SEO 권장값입니다.", en: "Re-checks as you edit. Thresholds are common blog SEO guidance." })}</p>
        </section>

        {post.titles?.length ? (
          <section className="rounded-2xl border border-hairline p-3">
            <Kicker>{L({ ko: "제목 후보", en: "Title options" })}</Kicker>
            <ul className="mt-1.5 flex flex-col gap-1.5">
              {post.titles.map((t, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-fg">
                  <span className="flex-1 break-keep">{t}</span>
                  <CopyButton text={t} className="px-1.5" />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="rounded-2xl border border-hairline p-3">
          <div className="flex items-center gap-2">
            <Kicker>{L({ ko: "검색 설명", en: "Search description" })}</Kicker>
            <span className="ml-auto text-2xs tabular-nums text-fg-subtle">{meta.length}</span>
          </div>
          <textarea
            value={meta}
            onChange={(e) => setMeta(e.target.value)}
            rows={4}
            aria-label={L({ ko: "검색 설명", en: "Search description" })}
            className="mt-1.5 w-full rounded-lg border border-hairline bg-bg p-2 text-xs leading-relaxed text-fg outline-none focus:border-accent"
          />
          <CopyButton text={meta} />
        </section>

        <Link href="/tools/seo-keywords/run" className="rounded-2xl border border-dashed border-hairline-str p-3 text-xs text-fg-muted hover:border-accent hover:text-fg">
          {L({ ko: "다음 글의 키워드를 고르려면 → 키워드 조사 모드", en: "Pick your next keyword → keyword research mode" })}
        </Link>

        {post.hashtags?.length ? (
          <section className="rounded-2xl border border-hairline p-3">
            <div className="flex items-center">
              <Kicker>{L({ ko: "해시태그", en: "Hashtags" })}</Kicker>
              <CopyButton text={post.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")} className="ml-auto" />
            </div>
            <p className="mt-1.5 text-xs text-ai">{post.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}</p>
          </section>
        ) : null}
      </aside>
    </div>
  );
}
