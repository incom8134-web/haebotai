"use client";

import Link from "next/link";
import { Coins, ReceiptText, RotateCcw, Undo2, Wand2 } from "lucide-react";
import { catalogTool } from "@/lib/tools/catalog";
import { FAQ } from "@/lib/site/faq";
import { useBi } from "@/lib/i18n/context";
import { PlanCards, PriceTable, toolPrices } from "@/components/site/plan-cards";
import { OWN_KEY_ONLY } from "@/lib/site/access";
import { OwnKeyPricing } from "@/components/site/own-key-pricing";
import { PRODUCTS } from "@/lib/payments/pro";

const won = (n: number) => `₩${n.toLocaleString("ko-KR")}`;

// Public pricing: the plans, how credits are charged, what a month of
// Plus covers (computed from the real per-tool credits), the price of
// every tool, and the credit questions.

// A plausible first month, in order; the list shows as many as Plus covers.
const STARTER = ["brand-dna", "seo-composer", "seo-composer", "logo-lab", "web-builder", "idea-radar", "market-desk", "persona-mapper", "campaign-planner", "content-transformer", "hook-lab", "sop-builder", "offer-architect", "competitor-lens", "meeting-action"];

export function PricingView({ signedIn }: { signedIn: boolean }) {
  const L = useBi();
  const prices = new Map(toolPrices().map((p) => [p.tool.slug, p.credits]));
  // Greedy: as many starter tools as a month of Plus covers, in order.
  const allowance = PRODUCTS.plus.credits;
  let left = allowance;
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
    { icon: Undo2, title: { ko: "실패·취소는 자동 환불", en: "Failures and cancels refunded" }, body: { ko: "실행할 때 크레딧을 잡아 두고, 끝나면 차감해요. 실패하거나 취소하면 돌려드려요.", en: "Credits are held when a run starts and charged when it finishes. Failed or cancelled runs are refunded." } },
    { icon: Wand2, title: { ko: "일부만 다시 만들기는 4분의 1", en: "Redoing one part costs a quarter" }, body: { ko: "결과의 한 부분만 고치면 그 도구 크레딧의 25%(최소 5)만 들어요.", en: "Rewriting one section costs 25% of the tool's credits (at least 5)." } },
    { icon: Coins, title: { ko: `모자라면 ${won(PRODUCTS.topup.amount)} 충전`, en: `Top up for ${won(PRODUCTS.topup.amount)}` }, body: { ko: `플러스·프로 이용 중에 ${PRODUCTS.topup.credits} 크레딧을 더할 수 있어요. 충전한 크레딧은 유효기간이 없어요.`, en: `On Plus or Pro, add ${PRODUCTS.topup.credits} credits anytime. Top-up credits never expire.` } },
  ];
  if (OWN_KEY_ONLY) {
    const keyFaq = FAQ.filter((f) => f.category === "api");
    return (
      <div className="mx-auto max-w-[1100px] px-4 pt-6 pb-14 md:px-8 md:pt-10">
        <header className="max-w-2xl">
          <h1 className="font-display text-[clamp(2rem,4vw,3rem)] leading-[1.05] font-bold tracking-[-0.02em] break-keep text-fg">{L({ ko: "요금", en: "Pricing" })}</h1>
          <p className="mt-3 text-base leading-relaxed break-keep text-fg-muted">
            {L({ ko: "16개 도구 모두 내 Gemini API 키로 실행되고, AI 사용 요금은 Google이 내 계정으로 직접 청구해요.", en: "All 16 tools run on your own Gemini API key, and Google bills any AI usage to your own account." })}
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
        <p className="mt-3 text-base leading-relaxed break-keep text-fg-muted">{L({ ko: "무료로 둘러보고, 플러스나 프로로 16개 도구를 모두 실행해요. 30일 이용권이라 자동 결제는 없어요. 가격은 부가세 포함이에요.", en: "Browse free, then run all 16 tools on Plus or Pro. Each is a 30-day pass with no auto-renewal. Prices include VAT." })}</p>
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
        <h2 id="starter" className="text-lg font-semibold text-fg">{L({ ko: `플러스 한 달 ${allowance.toLocaleString()} 크레딧이면`, en: `What a month of Plus (${allowance.toLocaleString()} credits) covers` })}</h2>
        <p className="mt-1 text-sm break-keep text-fg-muted">{L({ ko: "브랜드부터 블로그, 로고, 홈페이지, 운영 문서까지, 도구별 크레딧 기준으로 이만큼 실행할 수 있어요.", en: "From your brand to blog posts, a logo, a website and operating documents — this much, by each tool's credits." })}</p>
        <ol className="mt-4 flex flex-wrap items-center gap-2">
          {covered.map((c, i) => {
            const t = catalogTool(c.slug)!;
            return (
              <li key={`${c.slug}-${i}`} className="flex items-center gap-2">
                {i ? <span className="text-fg-subtle" aria-hidden>+</span> : null}
                <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface px-3 py-1.5 text-sm text-fg">
                  <t.icon size={13} className="text-accent" aria-hidden /> {L(t.name)} <span className="font-mono text-2xs text-fg-subtle">{c.credits}</span>
                </span>
              </li>
            );
          })}
          <li className="ml-1 font-mono text-sm text-fg">= {(allowance - left).toLocaleString()}{L({ ko: " 크레딧", en: " credits" })}</li>
        </ol>
        <p className="mt-3 text-2xs text-fg-subtle">{L({ ko: "남은 크레딧은 없어지지 않고, 다음에 플랜을 이용할 때 이어서 써요.", en: "Unused credits don't disappear; they carry over to your next plan period." })}</p>
      </section>

      <section className="mt-12" aria-labelledby="per-tool">
        <h2 id="per-tool" className="text-lg font-semibold text-fg">{L({ ko: "도구별 크레딧", en: "Credits per tool" })}</h2>
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
