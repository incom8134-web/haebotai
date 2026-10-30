"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Crown, Info, Plus, Trash2 } from "lucide-react";
import { useBi } from "@/lib/i18n/context";
import { addHostEmail, removeHostEmail, type AdminActionState } from "@/lib/actions/admin";
import type { HostRow } from "@/lib/admin";
import { AdminPageHeader } from "@/components/admin/admin-shell";
import { Card, Pill, StatCard } from "@/components/admin/ui";
import { ActionNote, btnGhost, btnPrimary, field, fmtDate, num } from "@/components/admin/kit";
import { cn } from "@/lib/utils";

// /admin/hosts — who runs free on the company's Gemini key in Vercel
// (lib/platform-access.ts). Entries added here are live within 15 s;
// the Vercel ones (PLATFORM_KEY_EMAILS, ADMIN_EMAILS) change in Vercel.

/** 1 credit ≈ ₩5 of AI cost (lib/payments/pro.ts). An estimate, for scale. */
const WON_PER_CREDIT = 5;

function AddHostForm() {
  const L = useBi();
  const [state, action, pending] = useActionState<AdminActionState, FormData>(addHostEmail, null);
  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-[1.2fr_1fr_auto]">
        <input name="email" required maxLength={254} placeholder={L({ ko: "이메일 또는 @도메인 (예: kim@studio.kr, @genie.co.kr)", en: "Email or @domain (e.g. kim@studio.kr, @genie.co.kr)" })} aria-label={L({ ko: "호스트 이메일", en: "Host email" })} className={field} />
        <input name="note" maxLength={200} placeholder={L({ ko: "메모 (선택: 누구인지, 언제까지)", en: "Note (optional: who, until when)" })} aria-label={L({ ko: "메모", en: "Note" })} className={field} />
        <button type="submit" disabled={pending} className={btnPrimary}>
          <Plus className="size-4" aria-hidden /> {L({ ko: "호스트 추가", en: "Add host" })}
        </button>
      </div>
      <ActionNote state={state} />
    </form>
  );
}

function RemoveButton({ entry }: { entry: string }) {
  const L = useBi();
  const [state, action, pending] = useActionState<AdminActionState, FormData>(removeHostEmail, null);
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="email" value={entry} />
      <button
        type="submit"
        disabled={pending}
        onClick={(e) => {
          if (!window.confirm(L({ ko: `${entry}을(를) 호스트에서 뺄까요? 다음 실행부터 플랜이 필요해요.`, en: `Remove ${entry}? From the next run they'll need a plan.` }))) e.preventDefault();
        }}
        className={cn(btnGhost, "h-9 px-3 text-danger")}
      >
        <Trash2 className="size-4" aria-hidden /> {L({ ko: "빼기", en: "Remove" })}
      </button>
      {state && !state.ok ? <ActionNote state={state} /> : null}
    </form>
  );
}

const SOURCE: Record<HostRow["source"], { ko: string; en: string }> = {
  admin: { ko: "관리자에서 추가", en: "Added here" },
  env_platform: { ko: "Vercel · PLATFORM_KEY_EMAILS", en: "Vercel · PLATFORM_KEY_EMAILS" },
  env_admin: { ko: "Vercel · ADMIN_EMAILS (관리자)", en: "Vercel · ADMIN_EMAILS (staff)" },
};

export function HostsView({ rows }: { rows: HostRow[] }) {
  const L = useBi();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const shown = q ? rows.filter((r) => [r.entry, r.note, ...r.members.flatMap((m) => [m.email, m.name ?? ""])].join(" ").toLowerCase().includes(q)) : rows;
  const added = rows.filter((r) => r.source === "admin").length;
  const runs = rows.reduce((s, r) => s + r.runs30d, 0);
  const credits = rows.reduce((s, r) => s + r.credits30d, 0);
  return (
    <div>
      <AdminPageHeader
        title={L({ ko: "호스트", en: "Hosts" })}
        lead={L({
          ko: "호스트로 추가한 이메일은 플랜·크레딧 없이 회사의 Gemini 키(Vercel 환경 변수)로 모든 도구를 실행해요. AI 비용은 회사가 내요. 추가·삭제는 15초 안에 적용되고 감사 로그에 남아요.",
          en: "Emails added as hosts run every tool on the company's Gemini key (the Vercel environment) with no plan or credits. The company pays the AI cost. Changes apply within 15 seconds and go to the audit log.",
        })}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatCard label={L({ ko: "호스트 항목", en: "Host entries" })} value={num(rows.length)} icon={Crown} tone="brand" note={L({ ko: `여기서 추가 ${num(added)} · Vercel ${num(rows.length - added)}`, en: `${num(added)} added here · ${num(rows.length - added)} in Vercel` })} />
        <StatCard label={L({ ko: "30일 실행", en: "Runs, 30 days" })} value={num(runs)} icon={Crown} tone="campaign" note={L({ ko: "완료·진행 중 실행만", en: "Finished or running only" })} />
        <StatCard label={L({ ko: "30일 AI 비용 (추정)", en: "AI cost, 30 days (est.)" })} value={`₩${num(credits * WON_PER_CREDIT)}`} icon={Crown} tone="operate" note={L({ ko: `${num(credits)} 크레딧 상당 · 1크레딧 ≈ ₩5`, en: `${num(credits)} credits' worth · 1 credit ≈ ₩5` })} />
      </div>

      <Card title={L({ ko: "호스트 추가", en: "Add a host" })} lead={L({ ko: "이메일 하나, 또는 @로 시작하는 도메인 전체(그 도메인의 모든 계정)를 넣을 수 있어요. 아직 가입하지 않은 이메일도 미리 넣어 둘 수 있어요.", en: "One email, or a whole domain starting with @ (every account on it). Emails that haven't signed up yet can be added ahead of time." })}>
        <AddHostForm />
      </Card>

      <Card
        className="mt-5"
        title={L({ ko: "호스트 목록", en: "Host list" })}
        action={<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={L({ ko: "찾기", en: "Search" })} aria-label={L({ ko: "호스트 찾기", en: "Search hosts" })} className={cn(field, "h-9 w-44")} />}
        bodyClassName="px-0 py-0"
      >
        {shown.length === 0 ? (
          <p className="px-5 py-6 text-sm text-fg-muted">{rows.length ? L({ ko: "맞는 항목이 없어요.", en: "No match." }) : L({ ko: "아직 호스트가 없어요.", en: "No hosts yet." })}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-hairline text-left text-xs text-fg-subtle">
                <tr>
                  <th className="px-5 py-3 font-medium">{L({ ko: "이메일·도메인", en: "Email or domain" })}</th>
                  <th className="px-3 py-3 font-medium">{L({ ko: "회원", en: "Member" })}</th>
                  <th className="px-3 py-3 text-right font-medium">{L({ ko: "30일 실행", en: "Runs, 30d" })}</th>
                  <th className="px-3 py-3 text-right font-medium">{L({ ko: "AI 비용 (추정)", en: "AI cost (est.)" })}</th>
                  <th className="px-3 py-3 font-medium">{L({ ko: "출처", en: "Source" })}</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={`${r.source}:${r.entry}`} className="border-b border-hairline last:border-0 align-top">
                    <td className="px-5 py-3">
                      <span className="font-mono text-[13px] font-semibold break-all">{r.entry}</span>
                      {r.note ? <span className="mt-0.5 block text-xs text-fg-muted">{r.note}</span> : null}
                      {r.addedAt ? <span className="mt-0.5 block text-[11px] text-fg-subtle">{L({ ko: `${fmtDate(r.addedAt)} · ${r.by ?? ""}`, en: `${fmtDate(r.addedAt)} · ${r.by ?? ""}` })}</span> : null}
                    </td>
                    <td className="px-3 py-3">
                      {r.members.length === 0 ? (
                        <Pill tone="gray">{L({ ko: "아직 가입 안 함", en: "Not signed up yet" })}</Pill>
                      ) : (
                        <ul className="space-y-0.5">
                          {r.members.slice(0, 3).map((m) => (
                            <li key={m.id}>
                              <Link href={`/admin/members/${m.id}`} className="text-accent hover:underline">{m.name || m.email}</Link>
                            </li>
                          ))}
                          {r.members.length > 3 ? <li className="text-xs text-fg-subtle">{L({ ko: `외 ${r.members.length - 3}명`, en: `+${r.members.length - 3} more` })}</li> : null}
                        </ul>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right font-mono">{num(r.runs30d)}</td>
                    <td className="px-3 py-3 text-right font-mono">₩{num(r.credits30d * WON_PER_CREDIT)}</td>
                    <td className="px-3 py-3">
                      <Pill tone={r.source === "admin" ? "blue" : "gray"}>{L(SOURCE[r.source])}</Pill>
                    </td>
                    <td className="px-5 py-3 text-right">{r.source === "admin" ? <RemoveButton entry={r.entry} /> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-fg-subtle">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        {L({
          ko: "Vercel 항목은 여기서 뺄 수 없어요. Vercel → Settings → Environment Variables에서 PLATFORM_KEY_EMAILS를 고친 뒤 다시 배포하세요. 호스트 실행도 하루 플랫폼 예산(PLATFORM_DAILY_CREDIT_CAP)에 포함돼요.",
          en: "Vercel entries can't be removed here: edit PLATFORM_KEY_EMAILS under Vercel → Settings → Environment Variables and redeploy. Host runs still count toward the daily platform budget (PLATFORM_DAILY_CREDIT_CAP).",
        })}
      </p>
    </div>
  );
}
