"use client";

import Link from "next/link";
import { Check, GraduationCap } from "lucide-react";
import { PLANS } from "@/lib/site/plans";
import { CATEGORIES, CATEGORY_ORDER, publicTools } from "@/lib/tools/catalog";
import { getTool } from "@/lib/tools/registry";
import { useBi } from "@/lib/i18n/context";
import { primaryButton, secondaryButton } from "@/components/site/page";
import { cn } from "@/lib/utils";

// The three plans and the per-tool price list, shared by the homepage,
// /pricing and the account's credits page so they never disagree.

export function PlanCards({ signedIn }: { signedIn: boolean }) {
  const L = useBi();
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {PLANS.map((p) => (
        <article key={p.id} className={cn("relative flex flex-col rounded-[24px] border bg-surface p-6", p.highlight ? "border-accent/50" : "border-hairline")}>
          {p.id === "student" ? (
            <span className="absolute -top-3 left-6 flex items-center gap-1.5 rounded-full bg-ai px-3 py-1 text-2xs font-semibold text-white dark:text-[#04211f]">
              <GraduationCap size={12} aria-hidden /> {L({ ko: "학생 무제한", en: "Unlimited for students" })}
            </span>
          ) : null}
          <p className="font-semibold text-fg">{L(p.name)}</p>
          <p className="mt-3 font-display text-4xl font-bold tracking-[-0.02em] whitespace-nowrap text-fg">
            {/* "₩19,900/30일": the period reads as a suffix, so it never wraps the amount. */}
            {L(p.price).split("/")[0]}
            {L(p.price).includes("/") ? <span className="ml-1 text-base font-medium tracking-normal text-fg-muted">/ {L(p.price).split("/").slice(1).join("/").trim()}</span> : null}
          </p>
          <p className="mt-1 text-2xs text-fg-subtle">{L(p.note)}</p>
          <p className="mt-5 rounded-xl bg-surface-2 px-3 py-2 text-sm font-medium text-fg">{L(p.credits)}</p>
          <ul className="mt-5 flex-1 space-y-2.5 text-sm text-fg-muted">
            {p.features.map((f) => (
              <li key={f.en} className="flex gap-2 break-keep">
                <Check size={15} className="mt-0.5 shrink-0 text-grounded" aria-hidden /> {L(f)}
              </li>
            ))}
          </ul>
          <Link
            href={!signedIn ? "/auth" : p.id === "pro" ? "/account/membership/checkout" : p.id === "student" ? "/account/membership" : "/studio"}
            className={cn(p.id === "free" ? secondaryButton : primaryButton, "mt-7")}
          >
            {p.id === "student"
              ? signedIn
                ? L({ ko: "학생 인증하기", en: "Verify as a student" })
                : L({ ko: "가입 후 인증하기", en: "Sign up, then verify" })
              : p.id === "pro" && signedIn
                ? L({ ko: "프로 시작하기", en: "Get Pro" })
                : L({ ko: "시작하기", en: "Get started" })}
          </Link>
        </article>
      ))}
    </div>
  );
}

/** Every public, runnable tool with its estimated credits and time, by category. */
export function toolPrices() {
  return publicTools()
    .filter((t) => t.engine && !t.hidden)
    .map((t) => {
      const m = getTool(t.engine!);
      return m ? { tool: t, credits: m.estimatedCredits, seconds: m.estimatedSeconds } : null;
    })
    .filter((x) => x !== null);
}

export function PriceTable() {
  const L = useBi();
  const prices = toolPrices();
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {CATEGORY_ORDER.map((c) => {
        const rows = prices.filter((p) => p.tool.category === c);
        if (!rows.length) return null;
        return (
          <section key={c} className="rounded-[22px] border border-hairline bg-surface p-5" aria-label={L(CATEGORIES[c].name)}>
            <h3 className="text-sm font-semibold text-fg">{L(CATEGORIES[c].name)}</h3>
            <table className="mt-3 w-full text-sm">
              <thead className="sr-only">
                <tr>
                  <th>{L({ ko: "도구", en: "Tool" })}</th>
                  <th>{L({ ko: "예상 크레딧", en: "Est. credits" })}</th>
                  <th>{L({ ko: "소요 시간", en: "Time" })}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ tool, credits, seconds }) => (
                  <tr key={tool.slug} className="border-t border-hairline first:border-0">
                    <td className="py-2">
                      <Link href={`/tools/${tool.slug}`} className="flex items-center gap-2 text-fg hover:text-accent">
                        <tool.icon size={14} className="shrink-0 text-accent" aria-hidden /> <span className="break-keep">{L(tool.name)}</span>
                      </Link>
                    </td>
                    <td className="py-2 text-right font-mono text-fg">{credits}</td>
                    <td className="w-16 py-2 text-right font-mono text-2xs text-fg-subtle">~{Math.max(1, Math.round(seconds / 60))}{L({ ko: "분", en: "m" })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        );
      })}
    </div>
  );
}
