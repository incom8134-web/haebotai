"use client";

import { useActionState } from "react";
import Link from "next/link";
import { replyToTicket, reopenTicket, type AdminActionState } from "@/lib/actions/admin";
import { useBi } from "@/lib/i18n/context";
import type { AdminMember, AdminOverview, AdminTicket, TicketStatus } from "@/lib/admin";
import { PageHeader, inputClass, primaryButton, secondaryButton, textareaClass } from "@/components/site/page";
import { cn } from "@/lib/utils";

// /admin pages — staff only (gated in app/(app)/admin/layout.tsx). Data is
// fetched server-side in each page.tsx; these render it.

type Bi = { ko: string; en: string };

// Korea time, formatted by hand: Intl output differs between Node and
// browsers ("AM" vs "오전"), which breaks hydration.
const kst = (iso: string) => new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000);
const pad = (n: number) => String(n).padStart(2, "0");
const fmtDate = (iso: string | null) => {
  if (!iso) return "—";
  const d = kst(iso);
  return `${String(d.getUTCFullYear()).slice(2)}.${pad(d.getUTCMonth() + 1)}.${pad(d.getUTCDate())}`;
};
const fmtDateTime = (iso: string) => {
  const d = kst(iso);
  return `${pad(d.getUTCMonth() + 1)}.${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
};
const num = (n: number) => n.toLocaleString("ko-KR");

// ── Overview ───────────────────────────────────────────────────────────

function Stat({ label, value, note, href, alert }: { label: string; value: string; note?: string; href?: string; alert?: boolean }) {
  const body = (
    <>
      <p className="text-2xs font-medium text-fg-muted">{label}</p>
      <p className={cn("mt-1 font-display text-2xl font-bold tabular-nums", alert ? "text-danger" : "text-fg")}>{value}</p>
      {note ? <p className="mt-0.5 text-2xs text-fg-subtle">{note}</p> : null}
    </>
  );
  return href ? (
    <Link href={href} className="glass glass-hover rounded-[20px] p-4">
      {body}
    </Link>
  ) : (
    <div className="glass rounded-[20px] p-4">{body}</div>
  );
}

export function AdminOverviewView({ overview: o, toolNames }: { overview: AdminOverview; toolNames: Record<string, Bi> }) {
  const L = useBi();
  const keyShare = o.members ? Math.round((o.membersWithKey / o.members) * 100) : 0;
  const failRate = o.runs7d ? Math.round((o.failed7d / o.runs7d) * 100) : 0;
  return (
    <div>
      <PageHeader title={L({ ko: "운영 현황", en: "Overview" })} lead={L({ ko: "회원, 도구 실행, 고객 문의를 한눈에 봐요. 날짜는 한국 시간 기준이에요.", en: "Members, tool runs and support at a glance. Days are Korea time." })} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label={L({ ko: "전체 회원", en: "Members" })} value={num(o.members)} note={L({ ko: `최근 7일 +${num(o.newMembers7d)}`, en: `+${num(o.newMembers7d)} in 7 days` })} href="/admin/members" />
        <Stat label={L({ ko: "API 키 등록 회원", en: "Members with a key" })} value={num(o.membersWithKey)} note={L({ ko: `전체의 ${keyShare}%`, en: `${keyShare}% of members` })} />
        <Stat label={L({ ko: "7일 활동 회원", en: "Active in 7 days" })} value={num(o.activeMembers7d)} note={L({ ko: "도구를 1번 이상 실행", en: "Ran at least one tool" })} />
        <Stat label={L({ ko: "답변 대기 문의", en: "Open tickets" })} value={num(o.openTickets)} note={L({ ko: "눌러서 답변하기", en: "Open to reply" })} href="/admin/tickets" alert={o.openTickets > 0} />
        <Stat label={L({ ko: "오늘 실행", en: "Runs today" })} value={num(o.runsToday)} />
        <Stat label={L({ ko: "7일 실행", en: "Runs in 7 days" })} value={num(o.runs7d)} />
        <Stat label={L({ ko: "7일 실패", en: "Failed in 7 days" })} value={num(o.failed7d)} note={L({ ko: `실패율 ${failRate}%`, en: `${failRate}% failure rate` })} alert={failRate >= 20} />
        <Stat label={L({ ko: "누적 실행", en: "Runs, all time" })} value={num(o.runsAllTime)} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <section className="glass min-w-0 rounded-[20px] p-4">
          <h2 className="text-sm font-semibold">{L({ ko: "최근 14일", en: "Last 14 days" })}</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[420px] text-xs tabular-nums">
              <thead className="text-fg-subtle">
                <tr className="border-b border-hairline text-left">
                  <th className="py-2 pr-3 font-medium">{L({ ko: "날짜", en: "Day" })}</th>
                  <th className="py-2 pr-3 text-right font-medium">{L({ ko: "가입", en: "Sign-ups" })}</th>
                  <th className="py-2 pr-3 text-right font-medium">{L({ ko: "활동 회원", en: "Active" })}</th>
                  <th className="py-2 pr-3 text-right font-medium">{L({ ko: "실행", en: "Runs" })}</th>
                  <th className="py-2 text-right font-medium">{L({ ko: "실패", en: "Failed" })}</th>
                </tr>
              </thead>
              <tbody>
                {o.days.map((d) => (
                  <tr key={d.day} className="border-b border-hairline/60 last:border-0">
                    <td className="py-1.5 pr-3 font-mono text-fg-muted">{d.day.slice(5)}</td>
                    <td className="py-1.5 pr-3 text-right">{d.signups || "·"}</td>
                    <td className="py-1.5 pr-3 text-right">{d.activeMembers || "·"}</td>
                    <td className="py-1.5 pr-3 text-right">{d.runs || "·"}</td>
                    <td className={cn("py-1.5 text-right", d.failed ? "text-danger" : "")}>{d.failed || "·"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="flex min-w-0 flex-col gap-4">
          <section className="glass rounded-[20px] p-4">
            <h2 className="text-sm font-semibold">{L({ ko: "7일 인기 도구", en: "Top tools, 7 days" })}</h2>
            {o.topTools7d.length === 0 ? (
              <p className="mt-2 text-xs text-fg-muted">{L({ ko: "아직 실행 기록이 없어요.", en: "No runs yet." })}</p>
            ) : (
              <ol className="mt-2 space-y-1.5 text-xs">
                {o.topTools7d.map((t) => (
                  <li key={t.toolId} className="flex items-center justify-between gap-3">
                    <span className="truncate">{toolNames[t.toolId] ? L(toolNames[t.toolId]) : t.toolId}</span>
                    <span className="font-mono tabular-nums text-fg-muted">{num(t.runs)}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="glass rounded-[20px] p-4 text-xs leading-relaxed text-fg-muted">
            <h2 className="text-sm font-semibold text-fg">{L({ ko: "결제", en: "Payments" })}</h2>
            <p className="mt-1">
              {L({
                ko: "지금은 결제를 받지 않아요. 회원은 자기 API 키로 도구를 쓰고, AI 요금은 Google·Anthropic이 회원에게 직접 청구해요. 팀 테스트 키 사용량은 Google AI Studio의 Usage·Spend에서 확인하세요.",
                en: "No payments are taken right now. Members run tools on their own API keys and Google/Anthropic bill them directly. Check the team test key's usage under Usage and Spend in Google AI Studio.",
              })}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

// ── Members ────────────────────────────────────────────────────────────

const PROVIDER_LABEL: Record<string, string> = { google: "Gemini", anthropic: "Claude", openai: "OpenAI" };

export function MemberList({ members, total, page, pages, q }: { members: AdminMember[]; total: number; page: number; pages: number; q: string }) {
  const L = useBi();
  const link = (p: number) => `/admin/members?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`;
  return (
    <div>
      <PageHeader title={L({ ko: "회원", en: "Members" })} lead={L({ ko: `${num(total)}명 · 최근 가입 순`, en: `${num(total)} members · newest first` })} />
      <form action="/admin/members" className="mb-4 flex max-w-md gap-2">
        <input id="admin-member-search" name="q" defaultValue={q} placeholder={L({ ko: "이메일로 찾기", en: "Search by email" })} aria-label={L({ ko: "이메일로 찾기", en: "Search by email" })} className={cn(inputClass, "h-10")} />
        <button type="submit" className={cn(secondaryButton, "h-10 shrink-0 px-4 text-sm")}>
          {L({ ko: "찾기", en: "Search" })}
        </button>
      </form>

      {members.length === 0 ? (
        <p className="text-sm text-fg-muted">{L({ ko: "해당하는 회원이 없어요.", en: "No members match." })}</p>
      ) : (
        <div className="glass overflow-x-auto rounded-[20px]">
          <table className="w-full min-w-[720px] text-xs tabular-nums">
            <thead className="text-fg-subtle">
              <tr className="border-b border-hairline text-left">
                <th className="px-4 py-3 font-medium">{L({ ko: "이메일", en: "Email" })}</th>
                <th className="px-3 py-3 font-medium">{L({ ko: "가입", en: "Joined" })}</th>
                <th className="px-3 py-3 font-medium">{L({ ko: "최근 로그인", en: "Last sign-in" })}</th>
                <th className="px-3 py-3 font-medium">{L({ ko: "API 키", en: "API keys" })}</th>
                <th className="px-3 py-3 text-right font-medium">{L({ ko: "실행", en: "Runs" })}</th>
                <th className="px-4 py-3 font-medium">{L({ ko: "최근 실행", en: "Last run" })}</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b border-hairline/60 last:border-0">
                  <td className="max-w-[260px] truncate px-4 py-2.5 font-medium" title={m.email}>
                    {m.email || "—"}
                  </td>
                  <td className="px-3 py-2.5 text-fg-muted">{fmtDate(m.createdAt)}</td>
                  <td className="px-3 py-2.5 text-fg-muted">{fmtDate(m.lastSignInAt)}</td>
                  <td className="px-3 py-2.5">
                    {m.keys.length ? (
                      <span className="flex flex-wrap gap-1">
                        {m.keys.map((k) => (
                          <span key={k} className="rounded-full bg-studio-success/12 px-2 py-0.5 text-2xs font-medium text-studio-success">
                            {PROVIDER_LABEL[k] ?? k}
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span className="rounded-full bg-studio-warning/12 px-2 py-0.5 text-2xs font-medium text-studio-warning">{L({ ko: "없음", en: "None" })}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right">{m.runs ? num(m.runs) : "·"}</td>
                  <td className="px-4 py-2.5 text-fg-muted">{fmtDate(m.lastRunAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 ? (
        <nav className="mt-4 flex items-center gap-3 text-xs" aria-label={L({ ko: "페이지", en: "Pages" })}>
          {page > 1 ? (
            <Link href={link(page - 1)} className={cn(secondaryButton, "h-8 px-3")}>
              {L({ ko: "이전", en: "Previous" })}
            </Link>
          ) : null}
          <span className="font-mono text-fg-muted">
            {page} / {pages}
          </span>
          {page < pages ? (
            <Link href={link(page + 1)} className={cn(secondaryButton, "h-8 px-3")}>
              {L({ ko: "다음", en: "Next" })}
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}

// ── Support tickets ────────────────────────────────────────────────────

const MSG: Record<string, Bi> = {
  replied: { ko: "답변을 보냈어요. 회원 화면에 바로 보여요.", en: "Reply sent. The member sees it right away." },
  closed: { ko: "종료로 표시했어요.", en: "Marked closed." },
  reopened: { ko: "다시 대기로 옮겼어요.", en: "Moved back to open." },
  not_admin: { ko: "관리자 권한이 없어요.", en: "Not authorized." },
  missing_ticket: { ko: "문의를 찾을 수 없어요.", en: "Ticket not found." },
  reply_length: { ko: "답변은 1~4000자로 적어 주세요.", en: "Replies must be 1–4000 characters." },
  bad_status: { ko: "잘못된 상태예요.", en: "Invalid status." },
  save_failed: { ko: "저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.", en: "Couldn't save. Try again shortly." },
};

const KIND_LABEL: Record<string, Bi> = {
  question: { ko: "질문", en: "Question" },
  bug: { ko: "오류", en: "Bug" },
  billing: { ko: "결제", en: "Billing" },
  feature: { ko: "제안·피드백", en: "Idea / feedback" },
  remote: { ko: "원격 지원", en: "Remote help" },
};

const STATUS_LABEL: Record<TicketStatus, Bi> = {
  open: { ko: "답변 대기", en: "Open" },
  answered: { ko: "답변 완료", en: "Answered" },
  closed: { ko: "종료", en: "Closed" },
};

function ActionNote({ state }: { state: AdminActionState }) {
  const L = useBi();
  if (!state) return null;
  return (
    <p role="status" className={cn("mt-2 text-2xs", state.ok ? "text-studio-success" : "text-danger")}>
      {L(MSG[state.message] ?? { ko: state.message, en: state.message })}
    </p>
  );
}

function TicketCard({ ticket }: { ticket: AdminTicket }) {
  const L = useBi();
  const [state, action, pending] = useActionState<AdminActionState, FormData>(replyToTicket, null);
  const [reopenState, reopen, reopening] = useActionState<AdminActionState, FormData>(reopenTicket, null);

  return (
    <article className="glass rounded-[20px] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("rounded-full px-2.5 py-1 text-2xs font-medium", ticket.kind === "bug" ? "bg-danger/10 text-danger" : ticket.kind === "feature" ? "bg-accent/12 text-accent" : "bg-surface-2/70")}>
          {L(KIND_LABEL[ticket.kind] ?? { ko: ticket.kind, en: ticket.kind })}
        </span>
        <span className="truncate text-2xs text-fg-muted">{ticket.email || "—"}</span>
        <span className="ml-auto font-mono text-2xs text-fg-subtle">{fmtDateTime(ticket.createdAt)}</span>
      </div>
      <h3 className="mt-2 font-semibold break-keep">{ticket.subject}</h3>
      <p className="mt-1 text-sm whitespace-pre-wrap text-fg-muted">{ticket.body}</p>
      {ticket.contact ? (
        <p className="mt-1 text-2xs text-fg-subtle">
          {L({ ko: "연락처", en: "Contact" })}: {ticket.contact}
        </p>
      ) : null}
      {ticket.preferredTime ? (
        <p className="mt-0.5 text-2xs text-fg-subtle">
          {L({ ko: "희망 시간", en: "Preferred time" })}: {ticket.preferredTime}
        </p>
      ) : null}

      {ticket.status === "open" ? (
        <form action={action} className="mt-3 flex flex-col gap-2 border-t border-hairline pt-3">
          <input type="hidden" name="ticketId" value={ticket.id} />
          <textarea id={`reply-${ticket.id}`} name="reply" maxLength={4000} defaultValue={ticket.reply ?? ""} className={cn(textareaClass, "min-h-24")} placeholder={L({ ko: "답변을 적어 주세요. 회원의 고객센터 화면에 그대로 보여요.", en: "Write a reply. The member sees it as written in their support page." })} aria-label={L({ ko: "답변", en: "Reply" })} />
          <div className="flex flex-wrap gap-2">
            <button type="submit" name="status" value="answered" disabled={pending} className={cn(primaryButton, "h-9 px-4 text-sm")}>
              {L({ ko: "답변 보내기", en: "Send reply" })}
            </button>
            <button type="submit" name="status" value="closed" disabled={pending} className={cn(secondaryButton, "h-9 px-4 text-sm")}>
              {L({ ko: "답변 없이 종료", en: "Close without reply" })}
            </button>
          </div>
          <ActionNote state={state} />
        </form>
      ) : (
        <div className="mt-3 border-t border-hairline pt-3">
          {ticket.reply ? (
            <>
              <p className="text-2xs font-medium text-fg-subtle">{L({ ko: "보낸 답변", en: "Reply sent" })}</p>
              <p className="mt-1 text-sm whitespace-pre-wrap">{ticket.reply}</p>
            </>
          ) : (
            <p className="text-2xs text-fg-subtle">{L({ ko: "답변 없이 종료됨", en: "Closed without a reply" })}</p>
          )}
          <form action={reopen} className="mt-2">
            <input type="hidden" name="ticketId" value={ticket.id} />
            <button type="submit" disabled={reopening} className={cn(secondaryButton, "h-8 px-3 text-xs")}>
              {L({ ko: "다시 열기", en: "Reopen" })}
            </button>
          </form>
          <ActionNote state={reopenState} />
        </div>
      )}
    </article>
  );
}

export function TicketQueue({ tickets, status, counts }: { tickets: AdminTicket[]; status: TicketStatus; counts: Record<TicketStatus, number> }) {
  const L = useBi();
  return (
    <div>
      <PageHeader title={L({ ko: "고객 문의", en: "Support tickets" })} lead={L({ ko: "피드백과 문의에 답하세요. 답변하면 회원의 고객센터 화면과 도움말 아이콘에 표시돼요.", en: "Answer feedback and questions. Replies show on the member's support page and Help icon." })} />
      <nav className="mb-5 flex flex-wrap gap-1.5" aria-label={L({ ko: "상태", en: "Status" })}>
        {(Object.keys(STATUS_LABEL) as TicketStatus[]).map((s) => (
          <Link
            key={s}
            href={`/admin/tickets?status=${s}`}
            aria-current={status === s ? "page" : undefined}
            className={cn("rounded-xl px-3.5 py-2 text-xs font-medium transition-colors", status === s ? "bg-surface-2 text-fg" : "text-fg-muted hover:text-fg")}
          >
            {L(STATUS_LABEL[s])} <span className="font-mono tabular-nums text-fg-subtle">{counts[s]}</span>
          </Link>
        ))}
      </nav>
      {tickets.length === 0 ? (
        <p className="text-sm text-fg-muted">{status === "open" ? L({ ko: "답변을 기다리는 문의가 없어요.", en: "No open tickets." }) : L({ ko: "표시할 문의가 없어요.", en: "No tickets here." })}</p>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <TicketCard key={t.id} ticket={t} />
          ))}
        </div>
      )}
    </div>
  );
}
