"use client";

import { toolSlug } from "@/lib/tools/catalog";
import Link from "next/link";
import { motion } from "motion/react";
import { Download, Gauge, KeyRound, RotateCcw, Timer } from "lucide-react";
import { getTool, listTools } from "@/lib/tools/registry";
import { CATEGORY_LABELS } from "@/lib/tools/registry/categories";
import { useBi, useLocale } from "@/lib/i18n/context";
import type { PlanId } from "@/lib/site/plans";
import type { OwnKeyUsage, ToolUsage } from "@/lib/usage";
import { PageHeader } from "@/components/site/page";

// /account/credits — what I have, what each tool costs, what I've used
// this month, and the limits that apply regardless of credits.

const ALLOWANCE: Record<PlanId, number | null> = { free: 500, pro: 2000, student: null };

const PROVIDER_BILLING: Record<string, { name: string; href: string }> = {
  google: { name: "Google Gemini", href: "https://console.cloud.google.com/billing" },
  anthropic: { name: "Anthropic (Claude)", href: "https://console.anthropic.com/settings/limits" },
  openai: { name: "OpenAI", href: "https://platform.openai.com/settings/organization/limits" },
};

// Own-key runs are billed by the provider, not in credits, so we can't
// show money — only runs and tokens, plus where to set a spending cap.
function OwnKeyUsagePanel({ ownKey }: { ownKey: OwnKeyUsage[] }) {
  const L = useBi();
  return (
    <section className="glass mt-6 rounded-[28px] p-6">
      <h2 className="text-lg font-semibold">{L({ ko: "내 API 키 사용량 (이번 달)", en: "Your own API keys (this month)" })}</h2>
      <p className="mt-1 text-sm break-keep text-fg-muted">{L({ ko: "이 실행들은 해봇이 아닌 각 제공사에서 직접 청구돼요. 예상치 못한 요금을 막으려면 제공사 콘솔에서 월 예산·한도 알림을 설정하세요.", en: "These runs are billed by each provider, not Haebot. To avoid surprise bills, set a monthly budget or spend limit in the provider's console." })}</p>
      <ul className="mt-4 divide-y divide-hairline text-sm">
        {ownKey.map((o) => {
          const billing = PROVIDER_BILLING[o.provider];
          return (
            <li key={o.provider} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <span className="font-medium">{billing?.name ?? o.provider}</span>
              <span className="font-mono text-xs text-fg-muted">
                {L({ ko: `${o.runs}회 · 입력 ${o.inputTokens.toLocaleString()} / 출력 ${o.outputTokens.toLocaleString()} 토큰`, en: `${o.runs} runs · ${o.inputTokens.toLocaleString()} in / ${o.outputTokens.toLocaleString()} out tokens` })}
              </span>
              {billing ? (
                <a href={billing.href} target="_blank" rel="noopener noreferrer" className="text-xs text-studio-cyan hover:underline">
                  {L({ ko: "예산·한도 설정", en: "Set a budget" })} ↗
                </a>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function CreditsView({ balance, plan, apiKeyConnected, usage }: { balance: number; plan: PlanId; apiKeyConnected: boolean; usage: { totalRuns: number; totalCredits: number; byTool: ToolUsage[]; ownKey: OwnKeyUsage[] } }) {
  const L = useBi();
  const { locale } = useLocale();
  const allowance = ALLOWANCE[plan];
  const pct = allowance ? Math.max(0, Math.min(100, Math.round((balance / allowance) * 100))) : 100;
  const unlimited = plan === "student";
  const maxUsed = Math.max(1, ...usage.byTool.map((u) => u.credits));
  // Only tools that can run have a price; upcoming ones are listed on the tools page.
  const tools = listTools().filter((t) => !t.comingSoon).sort((a, b) => a.estimatedCredits - b.estimatedCredits);

  return (
    <>
      <PageHeader title={L({ ko: "크레딧·한도", en: "Credits & limits" })} lead={L({ ko: "실행 전에 예상 크레딧을 잡아 두고, 끝나면 실제 사용량으로 정산해요. 실패하거나 취소하면 자동 환불돼요.", en: "We reserve the estimate before a run and settle after. Failed or cancelled runs are refunded automatically." })} />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <section className="glass-strong rounded-[28px] p-6">
          <p className="text-sm text-fg-muted">{L({ ko: "남은 크레딧", en: "Credits left" })}</p>
          <p className="mt-1 font-display text-5xl font-bold tracking-[-0.02em]">{unlimited ? "∞" : balance.toLocaleString()}</p>
          {allowance ? (
            <>
              <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-surface-2/70" role="meter" aria-valuemin={0} aria-valuemax={allowance} aria-valuenow={balance} aria-label={L({ ko: "남은 비율", en: "Remaining" })}>
                <motion.div className="studio-gradient-bg h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }} />
              </div>
              <p className="mt-2 text-xs text-fg-subtle">{L({ ko: `플랜 기준 ${allowance.toLocaleString()} 중 ${pct}%`, en: `${pct}% of your ${allowance.toLocaleString()} plan allowance` })}</p>
            </>
          ) : (
            <p className="mt-3 text-sm text-studio-success">{L({ ko: "학생 멤버십 — 크레딧이 차감되지 않아요.", en: "Student membership — credits are never charged." })}</p>
          )}
          {apiKeyConnected ? <p className="mt-3 text-sm text-studio-success">{L({ ko: "내 API 키 연결됨 — 실행에 크레딧이 들지 않아요.", en: "Your API key is connected — runs use no credits." })}</p> : null}

          <ul className="mt-6 space-y-3 border-t border-hairline pt-5 text-sm">
            <li className="flex gap-3"><Timer size={16} className="mt-0.5 shrink-0 text-studio-cyan" aria-hidden /><span><b className="font-medium">{L({ ko: "분당 10회 실행", en: "10 runs per minute" })}</b><span className="text-fg-muted"> — {L({ ko: "크레딧과 별개로 모든 플랜에 적용돼요.", en: "applies on every plan, separate from credits." })}</span></span></li>
            <li className="flex gap-3"><Gauge size={16} className="mt-0.5 shrink-0 text-studio-cyan" aria-hidden /><span><b className="font-medium">{L({ ko: "분당 30회 내보내기", en: "30 exports per minute" })}</b><span className="text-fg-muted"> — {L({ ko: "Word·Excel·캘린더 파일", en: "Word, Excel and calendar files" })}</span></span></li>
            <li className="flex gap-3"><RotateCcw size={16} className="mt-0.5 shrink-0 text-studio-cyan" aria-hidden /><span><b className="font-medium">{L({ ko: "실패·취소는 환불", en: "Failures are refunded" })}</b><span className="text-fg-muted"> — {L({ ko: "중간에 끊겨도 자동으로 돌려드려요.", en: "even if a run drops midway." })}</span></span></li>
          </ul>
          <div className="mt-5 flex flex-wrap gap-2 text-sm">
            <Link href="/account/membership" className="text-studio-cyan underline underline-offset-2">{L({ ko: "학생 멤버십", en: "Student membership" })}</Link>
            <span className="text-fg-subtle">·</span>
            <Link href="/account/api-key" className="inline-flex items-center gap-1 text-studio-cyan underline underline-offset-2"><KeyRound size={13} aria-hidden /> {L({ ko: "내 API 키로 무료 실행", en: "Run free on your own key" })}</Link>
          </div>
        </section>

        <section className="glass rounded-[28px] p-6">
          <div className="flex items-end justify-between">
            <h2 className="text-lg font-semibold">{L({ ko: "이번 달 사용", en: "Used this month" })}</h2>
            <p className="font-mono text-xs text-fg-subtle">{L({ ko: `${usage.totalRuns}회 · ${usage.totalCredits} 크레딧`, en: `${usage.totalRuns} runs · ${usage.totalCredits} credits` })}</p>
          </div>
          <a href="/api/account/usage" className="mt-2 inline-flex items-center gap-1 text-xs text-studio-cyan hover:underline">
            <Download size={12} aria-hidden /> {L({ ko: "최근 12개월 사용 내역 CSV", en: "Last 12 months as CSV" })}
          </a>
          {usage.byTool.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-dashed border-hairline-str p-8 text-center text-sm text-fg-muted">{L({ ko: "이번 달에는 아직 실행한 도구가 없어요.", en: "No runs yet this month." })}</p>
          ) : (
            <ul className="mt-5 space-y-3">
              {usage.byTool.map((u, i) => {
                const t = getTool(u.toolId);
                return (
                  <li key={u.toolId}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">{t ? <t.icon size={14} className="text-studio-cyan" aria-hidden /> : null}{t ? (locale === "en" ? t.name_en : t.name_ko) : u.toolId}</span>
                      <span className="font-mono text-xs text-fg-muted">{u.runs}× · {u.credits}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2/60">
                      <motion.div className="h-full rounded-full bg-studio-cyan/70" initial={{ width: 0 }} animate={{ width: `${Math.max(4, (u.credits / maxUsed) * 100)}%` }} transition={{ duration: 0.8, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {usage.ownKey.length > 0 ? <OwnKeyUsagePanel ownKey={usage.ownKey} /> : null}

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">{L({ ko: "도구별 예상 크레딧", en: "Estimated credits per tool" })}</h2>
        <div className="glass overflow-x-auto rounded-[24px]">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-xs text-fg-subtle">
                <th className="px-5 py-3 font-medium">{L({ ko: "도구", en: "Tool" })}</th>
                <th className="px-5 py-3 font-medium">{L({ ko: "분야", en: "Area" })}</th>
                <th className="px-5 py-3 text-right font-medium">{L({ ko: "예상 크레딧", en: "Est. credits" })}</th>
                <th className="px-5 py-3 text-right font-medium">{L({ ko: "소요 시간", en: "Time" })}</th>
              </tr>
            </thead>
            <tbody>
              {tools.map((t) => (
                <tr key={t.id} className="border-b border-hairline/60 last:border-0 transition-colors hover:bg-surface-2/30">
                  <td className="px-5 py-3"><Link href={`/tools/${toolSlug(t.id)}`} className="flex items-center gap-2 hover:text-studio-cyan"><t.icon size={14} className="text-studio-cyan" aria-hidden />{locale === "en" ? t.name_en : t.name_ko}</Link></td>
                  <td className="px-5 py-3 text-fg-muted">{L(CATEGORY_LABELS[t.category])}</td>
                  <td className="px-5 py-3 text-right font-mono">{t.estimatedCredits}</td>
                  <td className="px-5 py-3 text-right font-mono text-fg-muted">~{t.estimatedSeconds}s</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

export { CreditsView };
