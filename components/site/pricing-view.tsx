"use client";

import Link from "next/link";
import { KeyRound, ReceiptText, RotateCcw, Undo2, Wand2 } from "lucide-react";
import { catalogTool } from "@/lib/tools/catalog";
import { FAQ } from "@/lib/site/faq";
import { useBi } from "@/lib/i18n/context";
import { PlanCards, PriceTable, toolPrices } from "@/components/site/plan-cards";
import { OWN_KEY_ONLY } from "@/lib/site/access";
import { OwnKeyPricing } from "@/components/site/own-key-pricing";

// Public pricing: the plans, how credits are actually charged, what the
// sign-up credits cover (computed from the real estimates), the price of
// every tool, and the credit questions.

// A plausible first month, in order; the list shows as many as 500 covers.
const STARTER = ["idea-radar", "offer-architect", "brand-dna", "sales-page", "hook-lab", "campaign-planner", "market-desk", "competitor-lens", "persona-mapper", "content-transformer", "sop-builder", "meeting-action"];

export function PricingView({ signedIn }: { signedIn: boolean }) {
  const L = useBi();
  const prices = new Map(toolPrices().map((p) => [p.tool.slug, p.credits]));
  // Greedy: as many starter tools as 500 credits cover, in order.
  let left = 500;
  const covered: { slug: string; credits: number }[] = [];
  for (const slug of STARTER) {
    const c = prices.get(slug);
    if (c && c <= left) {
      covered.push({ slug, credits: c });
      left -= c;
    }
  }
  const credits = FAQ.filter((f) => f.category === "credits" || f.category === "api");
  const rules = [
    { icon: ReceiptText, title: { ko: "실행 전에 보여 드려요", en: "Shown before you run" }, body: { ko: "도구 화면의 실행 버튼 위에 이번 실행에 드는 크레딧과 남는 크레딧이 나와요.", en: "Above the run button: what this run costs and what you'll have left." } },
    { icon: Undo2, title: { ko: "실패·취소는 자동 환불", en: "Failures and cancels refunded" }, body: { ko: "예상 크레딧을 잡아 두고, 끝나면 실제 사용량으로 정산해요. 실패하거나 취소하면 돌려드려요.", en: "We hold the estimate and settle to actual use. Failed or cancelled runs are refunded." } },
    { icon: Wand2, title: { ko: "일부만 다시 만들기는 4분의 1", en: "Redoing one part costs a quarter" }, body: { ko: "결과의 한 부분만 고치면 그 도구 크레딧의 25%(최소 5)만 들어요.", en: "Rewriting one section costs 25% of the tool's credits (at least 5)." } },
    { icon: KeyRound, title: { ko: "내 API 키면 0 크레딧", en: "Your own API key: 0 credits" }, body: { ko: "Google AI Studio 키를 등록하면 크레딧이 차감되지 않아요. 요금은 내 Google 계정 한도로.", en: "Add a Google AI Studio key and runs cost no credits; usage goes to your Google quota." } },
  ];
  if (OWN_KEY_ONLY) {
    const keyFaq = FAQ.filter((f) => f.category === "api");
    return (
      <div className="mx-auto max-w-[1100px] px-4 pt-6 pb-14 md:px-8 md:pt-10">
        <header className="max-w-2xl">
          <h1 className="font-display text-[clamp(2rem,4vw,3rem)] leading-[1.05] font-bold tracking-[-0.02em] break-keep text-fg">{L({ ko: "요금", en: "Pricing" })}</h1>
          <p className="mt-3 text-base leading-relaxed break-keep text-fg-muted">
            {L({ ko: "25개 도구 모두 내 Gemini API 키로 실행되고, AI 사용 요금은 Google이 내 계정으로 직접 청구해요.", en: "All 25 tools run on your own Gemini API key, and Google bills any AI usage to your own account." })}
          </p>
        </header>
        <div className="mt-8">
          <OwnKeyPricing signedIn={signedIn} />
        </div>
        {keyFaq.length ? (
          <section className="mt-12 max-w-3xl" aria-labelledby="key-faq">
            <h2 id="key-faq" className="text-lg font-semibold text-fg">{L({ ko: "API 키에 관한 질문", en: "Questions about API keys" })}</h2>
            <div className="mt-4 divide-y divide-hairline rounded-[22px] border border-hairline bg-surface">
              {keyFaq.map((f) => (
                <details key={f.q.en} className="px-5 py-4">
                  <summary className="cursor-pointer font-medium break-keep text-fg">{L(f.q)}</summary>
                  <p className="pt-2 text-sm leading-relaxed break-keep text-fg-muted">{L(f.a)}</p>
                </details>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-[1100px] px-4 pt-6 pb-14 md:px-8 md:pt-10">
      <header className="max-w-2xl">
        <h1 className="font-display text-[clamp(2rem,4vw,3rem)] leading-[1.05] font-bold tracking-[-0.02em] break-keep text-fg">{L({ ko: "요금", en: "Pricing" })}</h1>
        <p className="mt-3 text-base leading-relaxed break-keep text-fg-muted">{L({ ko: "모든 플랜에서 25개 도구를 모두 써요. 다른 건 크레딧뿐이고, 자동 결제는 없어요.", en: "All 25 tools on every plan. Only credits differ, and nothing renews automatically." })}</p>
      </header>

      <div className="mt-8">
        <PlanCards signedIn={signedIn} />
      </div>

      <section className="mt-12" aria-labelledby="how-credits">
        <h2 id="how-credits" className="text-lg font-semibold text-fg">{L({ ko: "크레딧은 이렇게 써요", en: "How credits work" })}</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {rules.map((r) => (
            <li key={r.title.en} className="rounded-[20px] border border-hairline bg-surface p-4">
              <r.icon size={18} className="text-accent" aria-hidden />
              <p className="mt-3 text-sm font-semibold break-keep text-fg">{L(r.title)}</p>
              <p className="mt-1.5 text-xs leading-relaxed break-keep text-fg-muted">{L(r.body)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12 rounded-[24px] border border-accent/40 bg-accent-dim p-5 md:p-6" aria-labelledby="starter">
        <h2 id="starter" className="text-lg font-semibold text-fg">{L({ ko: "가입 크레딧 500이면", en: "What 500 sign-up credits cover" })}</h2>
        <p className="mt-1 text-sm break-keep text-fg-muted">{L({ ko: "아이디어부터 운영 문서까지, 예상 크레딧 기준으로 이만큼 실행할 수 있어요.", en: "By the estimates, this much — from an idea to an operating document." })}</p>
        <ol className="mt-4 flex flex-wrap items-center gap-2">
          {covered.map((c, i) => {
            const t = catalogTool(c.slug)!;
            return (
              <li key={c.slug} className="flex items-center gap-2">
                {i ? <span className="text-fg-subtle" aria-hidden>+</span> : null}
                <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface px-3 py-1.5 text-sm text-fg">
                  <t.icon size={13} className="text-accent" aria-hidden /> {L(t.name)} <span className="font-mono text-2xs text-fg-subtle">{c.credits}</span>
                </span>
              </li>
            );
          })}
          <li className="ml-1 font-mono text-sm text-fg">= {500 - left}{L({ ko: " 크레딧", en: " credits" })}</li>
        </ol>
        <p className="mt-3 text-2xs text-fg-subtle">{L({ ko: "실제 사용량은 입력 길이와 검토 횟수에 따라 조금 달라질 수 있어요. 남은 크레딧은 없어지지 않아요.", en: "Actual use varies a little with input length and review rounds. Unused credits never expire." })}</p>
      </section>

      <section className="mt-12" aria-labelledby="per-tool">
        <h2 id="per-tool" className="text-lg font-semibold text-fg">{L({ ko: "도구별 예상 크레딧", en: "Estimated credits per tool" })}</h2>
        <div className="mt-4">
          <PriceTable />
        </div>
      </section>

      <section className="mt-12 max-w-3xl" aria-labelledby="pricing-faq">
        <h2 id="pricing-faq" className="text-lg font-semibold text-fg">{L({ ko: "크레딧에 관한 질문", en: "Questions about credits" })}</h2>
        <div className="mt-4 divide-y divide-hairline rounded-[22px] border border-hairline bg-surface">
          {credits.map((f) => (
            <details key={f.q.en} className="px-5 py-4">
              <summary className="cursor-pointer font-medium break-keep text-fg">{L(f.q)}</summary>
              <p className="pt-2 text-sm leading-relaxed break-keep text-fg-muted">{L(f.a)}</p>
            </details>
          ))}
        </div>
        <p className="mt-4 flex items-center gap-1.5 text-sm text-fg-muted">
          <RotateCcw size={13} aria-hidden /> {L({ ko: "환불 기준은", en: "Refund terms:" })} <Link href="/legal/refund" className="text-accent underline underline-offset-2">{L({ ko: "환불정책", en: "Refund Policy" })}</Link>
        </p>
      </section>
    </div>
  );
}
