"use client";

import { toolSlug } from "@/lib/tools/catalog";
import Link from "next/link";
import { ArrowRight, Quote } from "lucide-react";
import { PageHeader, primaryButton } from "@/components/site/page";
import { useBi, useLocale } from "@/lib/i18n/context";
import { WORKFLOWS } from "@/lib/site/guides";
import { CUSTOMER_STORIES } from "@/lib/site/cases";
import { getTool } from "@/lib/tools/registry";

// Illustrative flows are labeled as examples; customer stories appear only
// once real ones are added to lib/site/cases.ts.
export function UseCasesView() {
  const L = useBi();
  const { locale } = useLocale();
  const name = (id: string) => {
    const t = getTool(id);
    return t ? (locale === "en" ? t.name_en : t.name_ko) : id;
  };

  return (
    <div className="mx-auto max-w-[1100px] px-4 pt-6 pb-10 md:px-8 md:pt-10">
      <PageHeader title={L({ ko: "활용 사례", en: "Use cases" })} lead={L({ ko: "도구를 하나씩 쓰는 대신, 결과를 다음 도구로 이어서 한 번에 끝내는 대표적인 흐름이에요.", en: "Instead of one tool at a time, these flows pass each result to the next tool and finish the job in one go." })} />

      {CUSTOMER_STORIES.length > 0 ? (
        <section className="mb-10">
          <h2 className="mb-4 text-lg font-semibold">{L({ ko: "고객 이야기", en: "Customer stories" })}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {CUSTOMER_STORIES.map((s) => (
              <article key={s.id} className="glass rounded-[24px] p-6">
                <Quote size={18} className="text-studio-cyan" aria-hidden />
                <p className="mt-3 leading-relaxed break-keep">{L(s.quote)}</p>
                <p className="mt-4 text-sm font-semibold">{L(s.business)}</p>
                <p className="mt-1 text-sm text-fg-muted">{L(s.result)}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <p className="mb-4 text-xs text-fg-subtle">{L({ ko: "아래는 도구 조합 예시예요. 실제 결과는 입력한 내용에 따라 달라요.", en: "These are example tool combinations; real results depend on what you enter." })}</p>
      <div className="grid gap-4 md:grid-cols-2">
        {WORKFLOWS.map((w) => (
          <article key={w.id} className="glass glass-hover flex flex-col rounded-[24px] p-6">
            <h2 className="text-lg font-semibold break-keep">{L(w.title)}</h2>
            <p className="mt-2 text-sm leading-relaxed break-keep text-fg-muted">{L(w.body)}</p>
            <ol className="mt-4 flex flex-wrap items-center gap-1.5 text-xs">
              {w.tools.map((id, i) => (
                <li key={id} className="flex items-center gap-1.5">
                  <Link href={`/tools/${toolSlug(id)}`} className="rounded-full border border-hairline px-2.5 py-1 hover:border-studio-cyan hover:text-studio-cyan">
                    {i + 1}. {name(id)}
                  </Link>
                  {i < w.tools.length - 1 ? <ArrowRight size={12} className="text-fg-subtle" aria-hidden /> : null}
                </li>
              ))}
            </ol>
            <Link href={`/tools/${toolSlug(w.tools[0])}/run`} className="mt-5 inline-flex items-center gap-1 self-start text-sm font-medium text-studio-cyan hover:underline">
              {L({ ko: `${name(w.tools[0])}부터 시작`, en: `Start with ${name(w.tools[0])}` })} <ArrowRight size={13} aria-hidden />
            </Link>
          </article>
        ))}
      </div>

      <div className="mt-10 text-center">
        <Link href="/auth" className={primaryButton}>{L({ ko: "시작하기", en: "Get started" })}</Link>
      </div>
    </div>
  );
}
