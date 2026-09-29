"use client";

import Link from "next/link";
import { PageHeader } from "@/components/site/page";
import { useBi } from "@/lib/i18n/context";
import type { ComponentId, StatusReport } from "@/lib/status";
import { cn } from "@/lib/utils";

const NAMES: Record<ComponentId, { ko: string; en: string }> = {
  app: { ko: "웹 서비스", en: "Website" },
  database: { ko: "로그인·데이터 저장", en: "Sign-in & data" },
  ai: { ko: "AI 생성 (Google Gemini)", en: "AI generation (Google Gemini)" },
  ratelimit: { ko: "요청 보호 (속도 제한)", en: "Request protection (rate limits)" },
  payments: { ko: "결제 (토스페이먼츠)", en: "Payments (Toss Payments)" },
};

const STATE = {
  up: { ko: "정상", en: "Operational", dot: "bg-studio-success" },
  down: { ko: "장애", en: "Disrupted", dot: "bg-danger" },
  not_configured: { ko: "준비 중", en: "Not enabled", dot: "bg-fg-subtle" },
} as const;

export function StatusView({ report }: { report: StatusReport }) {
  const L = useBi();
  const allUp = report.components.every((c) => c.state !== "down");
  // Fixed KST, formatted by hand: server and browser must print the same text (hydration).
  const checked = `${new Date(Date.parse(report.checkedAt) + 9 * 3_600_000).toISOString().slice(0, 16).replace("T", " ")} KST`;

  return (
    <div className="mx-auto max-w-[900px] px-4 pt-6 pb-10 md:px-8 md:pt-10">
      <PageHeader title={L({ ko: "서비스 상태", en: "Service status" })} lead={L({ ko: "해봇 AI를 이루는 서비스들의 지금 상태예요. 1분마다 새로 확인해요.", en: "The live state of the services behind Haebot AI, re-checked every minute." })} />
      <section className={cn("rounded-[24px] border p-5", allUp ? "border-studio-success/40 bg-studio-success/10" : "border-danger/40 bg-danger/10")} role="status">
        <p className="font-semibold">{allUp ? L({ ko: "모든 서비스가 정상 작동 중이에요", en: "All systems operational" }) : L({ ko: "일부 서비스에 문제가 있어요", en: "Some services are disrupted" })}</p>
        <p className="mt-1 text-xs text-fg-muted">{L({ ko: `마지막 확인 ${checked}`, en: `Last checked ${checked}` })}</p>
      </section>
      <ul className="glass mt-4 divide-y divide-hairline rounded-[24px]">
        {report.components.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-4 text-sm">
            <span>{L(NAMES[c.id])}</span>
            <span className="flex items-center gap-2 text-fg-muted">
              <span className={cn("size-2.5 rounded-full", STATE[c.state].dot)} aria-hidden />
              {L(STATE[c.state])}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm break-keep text-fg-muted">
        {L({ ko: "문제가 계속되면 ", en: "If a problem persists, " })}
        <Link href="/help/contact" className="text-studio-cyan underline underline-offset-2">{L({ ko: "고객센터", en: "contact customer service" })}</Link>
        {L({ ko: "로 알려 주세요. 실패한 실행의 크레딧은 자동으로 돌아가요.", en: ". Credits for failed runs are refunded automatically." })}
      </p>
    </div>
  );
}
