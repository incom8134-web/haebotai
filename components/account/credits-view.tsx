"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Gauge, KeyRound, RotateCcw, Timer } from "lucide-react";
import { getTool, listTools } from "@/lib/tools/registry";
import { CATEGORY_LABELS } from "@/lib/tools/registry/categories";
import { useBi, useLocale } from "@/lib/i18n/context";
import type { PlanId } from "@/lib/site/plans";
import type { ToolUsage } from "@/lib/usage";
import { PageHeader } from "@/components/site/page";

// /account/credits — what I have, what each tool costs, what I've used
// this month, and the limits that apply regardless of credits.

const ALLOWANCE: Record<PlanId, number | null> = { free: 100, pro: 2000, student: null };

function CreditsView({ balance, plan, apiKeyConnected, usage }: { balance: number; plan: PlanId; apiKeyConnected: boolean; usage: { totalRuns: number; totalCredits: number; byTool: ToolUsage[] } }) {
  const L = useBi();
  const { locale } = useLocale();
  const allowance = ALLOWANCE[plan];
  const pct = allowance ? Math.max(0, Math.min(100, Math.round((balance / allowance) * 100))) : 100;
  const unlimited = plan === "student";
  const maxUsed = Math.max(1, ...usage.byTool.map((u) => u.credits));
  const tools = listTools().sort((a, b) => a.estimatedCredits - b.estimatedCredits);

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
            <Link href="/account/membership" className="text-studio-cyan hover:underline">{L({ ko: "학생 멤버십", en: "Student membership" })}</Link>
            <span className="text-fg-subtle">·</span>
            <Link href="/account/api-key" className="inline-flex items-center gap-1 text-studio-cyan hover:underline"><KeyRound size={13} aria-hidden /> {L({ ko: "내 API 키로 무료 실행", en: "Run free on your own key" })}</Link>
          </div>
        </section>

        <section className="glass rounded-[28px] p-6">
          <div className="flex items-end justify-between">
            <h2 className="text-lg font-semibold">{L({ ko: "이번 달 사용", en: "Used this month" })}</h2>
            <p className="font-mono text-xs text-fg-subtle">{L({ ko: `${usage.totalRuns}회 · ${usage.totalCredits} 크레딧`, en: `${usage.totalRuns} runs · ${usage.totalCredits} credits` })}</p>
          </div>
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
                  <td className="px-5 py-3"><Link href={`/tools/${t.id}`} className="flex items-center gap-2 hover:text-studio-cyan"><t.icon size={14} className="text-studio-cyan" aria-hidden />{locale === "en" ? t.name_en : t.name_ko}</Link></td>
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
