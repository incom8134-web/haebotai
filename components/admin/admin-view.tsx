"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, AlertTriangle, ArrowLeft, ArrowRight, Ban, Copy, KeyRound, Play, Plus, RotateCcw, Save, Search, Trash2, UserPlus, Users, Wrench } from "lucide-react";
import { checkMemberKeyTier, createMember, deleteMember, replyToTicket, reopenTicket, setMemberSuspended, updateMember, type AdminActionState } from "@/lib/actions/admin";
import type { KeyTier } from "@/lib/ai/key-tier";
import { useBi } from "@/lib/i18n/context";
import { filtersToQuery, type MemberFilters } from "@/lib/admin-filters";
import type { AdminMember, AdminMemberDetail, AdminOverview, AdminTicket, TicketStatus, ToolUsageRow, UsagePeriod } from "@/lib/admin";
import { catalogTool, publicTools } from "@/lib/tools/catalog";
import { NAME_MAX } from "@/lib/member-name";
import { TONE, toolTone } from "@/components/site/tone";
import { AdminPageHeader } from "@/components/admin/admin-shell";
import { QuickNotice } from "@/components/admin/ops-view";
import { Avatar, BarList, Card, Pill, ProviderBadge, StatCard, TrendChart } from "@/components/admin/ui";
import { cn } from "@/lib/utils";
import { ActionNote, DateRange, btn, btnDanger, btnGhost, btnPrimary, field, fmtDate, fmtDateTime, num, pct } from "@/components/admin/kit";

// /admin pages — staff only (gated in app/admin/layout.tsx). Data is
// fetched server-side in each page.tsx; these render it. Layout after the
// CoolAdmin dashboard (Colorlib, MIT); components/admin/ui.tsx has the parts.

type Bi = { ko: string; en: string };



const KEY_LABEL: Record<string, string> = { google: "Gemini", anthropic: "Claude", openai: "OpenAI" };

function useToolLabel() {
  const L = useBi();
  return (id: string | null) => {
    if (!id) return "—";
    const t = catalogTool(id);
    return t ? L(t.name) : id;
  };
}

const memberHref = (id: string) => `/admin/members/${id}`;

// ── Dashboard ──────────────────────────────────────────────────────────

export function AdminOverviewView({ overview: o, alerts }: { overview: AdminOverview; alerts?: React.ReactNode }) {
  const L = useBi();
  const toolLabel = useToolLabel();
  const days = [...o.days].reverse(); // oldest → newest
  const failRate = pct(o.failed7d, o.runs7d);
  const providerTotal = o.providers.reduce((a, p) => a + p.members, 0);
  return (
    <div>
      <AdminPageHeader
        title={L({ ko: "대시보드", en: "Dashboard" })}
        lead={L({ ko: "회원, 도구 실행, 고객 문의를 한눈에 봐요. 날짜는 한국 시간 기준이에요.", en: "Members, tool runs and support at a glance. Days are Korea time." })}
        actions={
          <>
            <Link href="/admin/tools" className={btnGhost}>
              <Wrench className="size-4" aria-hidden />
              {L({ ko: "도구 사용 현황", en: "Tool usage" })}
            </Link>
            <Link href="/admin/members" className={btnPrimary}>
              <Users className="size-4" aria-hidden />
              {L({ ko: "회원 관리", en: "Members" })}
            </Link>
          </>
        }
      />

      {alerts}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={L({ ko: "전체 회원", en: "Members" })} value={num(o.members)} icon={Users} tone="discover" note={L({ ko: `최근 7일 +${num(o.newMembers7d)}명`, en: `+${num(o.newMembers7d)} in 7 days` })} noteTone={o.newMembers7d ? "up" : "flat"} spark={days.map((d) => d.signups)} href="/admin/members" />
        <StatCard label={L({ ko: "7일 실행", en: "Runs, 7 days" })} value={num(o.runs7d)} icon={Play} tone="brand" note={L({ ko: `오늘 ${num(o.runsToday)}회 · 누적 ${num(o.runsAllTime)}회`, en: `${num(o.runsToday)} today · ${num(o.runsAllTime)} all time` })} spark={days.map((d) => d.runs)} href="/admin/tools" />
        <StatCard label={L({ ko: "7일 활동 회원", en: "Active, 7 days" })} value={num(o.activeMembers7d)} icon={Activity} tone="operate" note={L({ ko: `API 키 등록 ${num(o.membersWithKey)}명 (${pct(o.membersWithKey, o.members)}%)`, en: `${num(o.membersWithKey)} with a key (${pct(o.membersWithKey, o.members)}%)` })} spark={days.map((d) => d.activeMembers)} />
        <StatCard label={L({ ko: "7일 실패율", en: "Failure rate, 7 days" })} value={`${failRate}%`} icon={AlertTriangle} tone="campaign" alert={failRate >= 20} note={L({ ko: `실패 ${num(o.failed7d)}회 / ${num(o.runs7d)}회`, en: `${num(o.failed7d)} of ${num(o.runs7d)} failed` })} noteTone={failRate >= 20 ? "down" : "flat"} spark={days.map((d) => d.failed)} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.7fr_1fr]">
        <Card title={L({ ko: "실행 추이", en: "Run trend" })} lead={L({ ko: "최근 14일, 하루 단위", en: "Last 14 days, per day" })}>
          <TrendChart
            ariaLabel={L({ ko: "최근 14일 실행과 실패", en: "Runs and failures, last 14 days" })}
            days={days.map((d) => d.day.slice(5).replace("-", "."))}
            series={[
              { label: L({ ko: "실행", en: "Runs" }), values: days.map((d) => d.runs), tone: "brand" },
              { label: L({ ko: "실패", en: "Failed" }), values: days.map((d) => d.failed), tone: "campaign" },
              { label: L({ ko: "가입", en: "Sign-ups" }), values: days.map((d) => d.signups), tone: "discover" },
            ]}
          />
        </Card>
        <Card
          title={L({ ko: "인기 도구", en: "Top tools" })}
          lead={L({ ko: "최근 7일 실행 횟수", en: "Runs in the last 7 days" })}
          action={
            <Link href="/admin/tools" className="text-sm font-semibold text-accent hover:underline">
              {L({ ko: "전체 보기", en: "View all" })}
            </Link>
          }
        >
          <BarList emptyText={L({ ko: "최근 7일 실행 기록이 없어요.", en: "No runs in the last 7 days." })} items={o.topTools7d.map((t) => ({ key: t.toolId, label: toolLabel(t.toolId), value: t.runs, tone: toolTone(t.toolId) }))} />
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2 xl:grid-cols-[1fr_1fr_0.8fr]">
        <Card
          title={L({ ko: "최근 가입", en: "New members" })}
          action={
            <Link href="/admin/members" className="text-sm font-semibold text-accent hover:underline">
              {L({ ko: "전체 보기", en: "View all" })}
            </Link>
          }
          bodyClassName="p-2"
        >
          <ul>
            {o.recentMembers.map((m) => (
              <li key={m.id}>
                <Link href={memberHref(m.id)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-surface-2/70">
                  <Avatar id={m.id} name={m.name} email={m.email} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-fg">{m.name ?? <span className="text-fg-subtle">{L({ ko: "이름 없음", en: "No name" })}</span>}</span>
                    <span className="block truncate text-xs text-fg-muted">{m.email || "—"}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <ProviderBadge provider={m.provider} />
                    <span className="text-xs text-fg-subtle">{fmtDate(m.createdAt)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card title={L({ ko: "최근 실행", en: "Latest runs" })} bodyClassName="p-2">
          {o.recentRuns.length === 0 ? (
            <p className="p-3 text-sm text-fg-muted">{L({ ko: "아직 실행 기록이 없어요.", en: "No runs yet." })}</p>
          ) : (
            <ul>
              {o.recentRuns.map((r, i) => (
                <li key={i}>
                  <Link href={memberHref(r.userId)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-surface-2/70">
                    <span className={cn("size-2.5 shrink-0 rounded-full", TONE[toolTone(r.toolId)].dot)} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-fg">
                        <b className="font-semibold">{r.name ?? r.email ?? "—"}</b> · {toolLabel(r.toolId)}
                      </span>
                      <span className="block text-xs text-fg-subtle">{fmtDateTime(r.createdAt)}</span>
                    </span>
                    <RunStatus status={r.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title={L({ ko: "로그인 방식", en: "Sign-in methods" })} lead={L({ ko: "회원 수 기준", en: "By members" })}>
          <ul className="space-y-4">
            {o.providers.map((p) => (
              <li key={p.provider}>
                <div className="flex items-center justify-between gap-2">
                  <ProviderBadge provider={p.provider} />
                  <span className="font-mono text-sm tabular-nums">
                    {num(p.members)} <span className="text-fg-subtle">({pct(p.members, providerTotal)}%)</span>
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
                  <div className={cn("h-full rounded-full", p.provider === "kakao" ? "bg-[#FEE500]" : p.provider === "google" ? "bg-[#4285F4]" : "bg-fg-subtle")} style={{ width: `${Math.max(3, pct(p.members, providerTotal))}%` }} />
                </div>
              </li>
            ))}
          </ul>
          <Link href="/admin/tickets" className="mt-6 flex items-center justify-between rounded-xl border border-hairline px-4 py-3 text-sm hover:bg-surface-2/70">
            <span className="font-semibold">{L({ ko: "답변 대기 문의", en: "Open tickets" })}</span>
            <span className={cn("font-mono text-lg font-bold tabular-nums", o.openTickets ? "text-danger" : "text-fg-muted")}>{num(o.openTickets)}</span>
          </Link>
        </Card>
      </div>
    </div>
  );
}

function RunStatus({ status }: { status: string }) {
  const L = useBi();
  if (status === "done") return <Pill tone="green">{L({ ko: "완료", en: "Done" })}</Pill>;
  if (status === "error") return <Pill tone="red">{L({ ko: "실패", en: "Failed" })}</Pill>;
  return <Pill tone="blue">{L({ ko: "진행 중", en: "Running" })}</Pill>;
}

// ── Members ────────────────────────────────────────────────────────────

function Select({ name, value, label, options }: { name: keyof MemberFilters; value: string; label: string; options: { value: string; label: string }[] }) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-xs font-semibold text-fg-muted">{label}</span>
      <select name={name} defaultValue={value} className={cn(field, "pr-8")}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function CreateMemberForm() {
  const L = useBi();
  const [state, action, pending] = useActionState<AdminActionState, FormData>(createMember, null);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-fg-muted">{L({ ko: "이메일", en: "Email" })}</span>
        <input name="email" type="email" required className={field} placeholder="name@example.com" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-fg-muted">{L({ ko: "이름", en: "Name" })}</span>
        <input name="name" required maxLength={NAME_MAX} className={field} placeholder={L({ ko: "예: 김민지", en: "e.g. Minji Kim" })} />
      </label>
      <button type="submit" disabled={pending} className={btnPrimary}>
        <UserPlus className="size-4" aria-hidden />
        {L({ ko: "추가", en: "Add" })}
      </button>
      <div className="sm:col-span-3">
        <ActionNote state={state} />
        {state?.ok && state.id ? (
          <Link href={memberHref(state.id)} className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline">
            {L({ ko: "프로필 열기", en: "Open profile" })} <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        ) : null}
        <p className="mt-1 text-xs text-fg-subtle">{L({ ko: "전화·방문으로 가입을 도운 경우에 써요. 회원은 처음 로그인할 때 동의 화면을 똑같이 거쳐요.", en: "For members you sign up by phone or in person. They still see the consent screen on their first sign-in." })}</p>
      </div>
    </form>
  );
}

export function MemberList({ members, total, all, page, pages, filters, deleted }: { members: AdminMember[]; total: number; all: number; page: number; pages: number; filters: MemberFilters; deleted?: boolean }) {
  const L = useBi();
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const link = (p: number) => `/admin/members${filtersToQuery({ ...filters, page: p })}`;
  const filtered = !!(filters.q || filters.provider || filters.key || filters.activity || filters.status || filters.from || filters.to);

  return (
    <div>
      <AdminPageHeader
        title={L({ ko: "회원 관리", en: "Members" })}
        lead={filtered ? L({ ko: `전체 ${num(all)}명 중 ${num(total)}명`, en: `${num(total)} of ${num(all)} members` }) : L({ ko: `전체 ${num(all)}명`, en: `${num(all)} members` })}
        actions={
          <button type="button" onClick={() => setAdding((a) => !a)} aria-expanded={adding} className={btnPrimary}>
            <Plus className="size-4" aria-hidden />
            {L({ ko: "회원 추가", en: "Add member" })}
          </button>
        }
      />

      {deleted ? <p role="status" className="mb-4 rounded-xl bg-studio-success/10 px-4 py-3 text-sm text-studio-success">{L({ ko: "회원을 삭제했어요. 결제·문의 기록만 법정 기간 동안 남아요.", en: "Member deleted. Only payment and support records stay for the legal period." })}</p> : null}

      {adding ? (
        <Card title={L({ ko: "회원 추가", en: "Add a member" })} className="mb-5">
          <CreateMemberForm />
        </Card>
      ) : null}

      <Card className="mb-5" bodyClassName="p-4">
        <form action="/admin/members" className="flex flex-col gap-3">
          <div className="grid gap-3 md:grid-cols-[2fr_repeat(5,minmax(0,1fr))] md:items-end">
          <label className="flex min-w-0 flex-col gap-1">
            <span className="text-xs font-semibold text-fg-muted">{L({ ko: "검색", en: "Search" })}</span>
            <span className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
              <input name="q" defaultValue={filters.q} placeholder={L({ ko: "이름·이메일·카카오 ID·전화", en: "Name, email, Kakao ID, phone" })} className={cn(field, "pl-9")} />
            </span>
          </label>
          <Select name="provider" value={filters.provider} label={L({ ko: "로그인", en: "Sign-in" })} options={[{ value: "", label: L({ ko: "전체", en: "All" }) }, { value: "google", label: "Google" }, { value: "kakao", label: "Kakao" }]} />
          <Select name="key" value={filters.key} label={L({ ko: "API 키", en: "API key" })} options={[{ value: "", label: L({ ko: "전체", en: "All" }) }, { value: "yes", label: L({ ko: "등록함", en: "Has a key" }) }, { value: "no", label: L({ ko: "없음", en: "No key" }) }]} />
          <Select name="activity" value={filters.activity} label={L({ ko: "활동", en: "Activity" })} options={[{ value: "", label: L({ ko: "전체", en: "All" }) }, { value: "active7", label: L({ ko: "7일 내 실행", en: "Ran in 7 days" }) }, { value: "dormant30", label: L({ ko: "30일 넘게 쉼", en: "Idle 30+ days" }) }, { value: "never", label: L({ ko: "실행 안 함", en: "Never ran" }) }]} />
          <Select name="status" value={filters.status} label={L({ ko: "상태", en: "Status" })} options={[{ value: "", label: L({ ko: "전체", en: "All" }) }, { value: "suspended", label: L({ ko: "이용 정지", en: "Suspended" }) }, { value: "no_name", label: L({ ko: "이름 미입력", en: "No name yet" }) }]} />
          <Select name="sort" value={filters.sort} label={L({ ko: "정렬", en: "Sort" })} options={[{ value: "new", label: L({ ko: "최근 가입", en: "Newest" }) }, { value: "old", label: L({ ko: "오래된 가입", en: "Oldest" }) }, { value: "recent", label: L({ ko: "최근 활동", en: "Recently active" }) }, { value: "runs", label: L({ ko: "실행 많은 순", en: "Most runs" }) }, { value: "name", label: L({ ko: "이름순", en: "Name" }) }]} />
          </div>
          <div className="flex flex-wrap items-end gap-3 border-t border-hairline pt-3">
            <DateRange from={filters.from} to={filters.to} label={L({ ko: "가입일", en: "Joined" })} />
            <div className="ml-auto flex gap-2">
              <button type="submit" className={btnPrimary}>
                {L({ ko: "적용", en: "Apply" })}
              </button>
              {filtered || filters.sort !== "new" ? (
                <Link href="/admin/members" className={btnGhost}>
                  {L({ ko: "초기화", en: "Reset" })}
                </Link>
              ) : null}
            </div>
          </div>
        </form>
      </Card>

      {members.length === 0 ? (
        <Card>
          <p className="text-sm text-fg-muted">{L({ ko: "조건에 맞는 회원이 없어요.", en: "No members match." })}</p>
        </Card>
      ) : (
        <Card bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-xs font-semibold tracking-wide text-fg-subtle uppercase">
                  <th className="px-5 py-3">{L({ ko: "회원 (가입 때 입력한 이름)", en: "Member (name they entered)" })}</th>
                  <th className="px-3 py-3">{L({ ko: "로그인", en: "Sign-in" })}</th>
                  <th className="px-3 py-3">{L({ ko: "카카오 ID · 전화", en: "Kakao ID · phone" })}</th>
                  <th className="px-3 py-3">{L({ ko: "가입", en: "Joined" })}</th>
                  <th className="px-3 py-3">{L({ ko: "최근 로그인", en: "Last sign-in" })}</th>
                  <th className="px-3 py-3">{L({ ko: "API 키", en: "API key" })}</th>
                  <th className="px-3 py-3 text-right">{L({ ko: "실행", en: "Runs" })}</th>
                  <th className="px-5 py-3">{L({ ko: "상태", en: "Status" })}</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} onClick={() => router.push(memberHref(m.id))} className="cursor-pointer border-b border-hairline/70 transition-colors last:border-0 hover:bg-surface-2/60">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar id={m.id} name={m.name ?? m.providerName ?? null} email={m.email} />
                        <div className="min-w-0">
                          <Link href={memberHref(m.id)} onClick={(e) => e.stopPropagation()} className="block max-w-[240px] truncate font-semibold text-fg hover:underline">
                            {m.name ?? (
                              <span className="font-normal text-fg-subtle">
                                {m.providerName ?? L({ ko: "이름 미입력", en: "No name yet" })}
                                {m.providerName ? <span className="ml-1.5 rounded bg-surface-2 px-1.5 py-0.5 text-[11px]">{L({ ko: `${m.provider === "kakao" ? "카카오" : "구글"} 이름 · 미입력`, en: `${m.provider === "kakao" ? "Kakao" : "Google"} name · not entered` })}</span> : null}
                              </span>
                            )}
                          </Link>
                          <span className="block max-w-[220px] truncate text-xs text-fg-muted">{m.email || "—"}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="flex flex-wrap gap-1">
                        {m.providers.map((p) => (
                          <ProviderBadge key={p} provider={p} />
                        ))}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-fg-muted">
                      <span className="block">{m.kakaoId ?? "—"}</span>
                      {m.phone ? <span className="block text-fg">{m.phone}</span> : null}
                    </td>
                    <td className="px-3 py-3 text-fg-muted tabular-nums">{fmtDate(m.createdAt)}</td>
                    <td className="px-3 py-3 text-fg-muted tabular-nums">{fmtDate(m.lastSignInAt)}</td>
                    <td className="px-3 py-3">
                      <KeyTierCell m={m} />
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      <span className="font-semibold">{m.runs ? num(m.runs) : "·"}</span>
                      {m.failedRuns ? <span className="block text-xs text-danger">{L({ ko: `실패 ${m.failedRuns}`, en: `${m.failedRuns} failed` })}</span> : null}
                    </td>
                    <td className="px-5 py-3">{m.suspended ? <Pill tone="red">{L({ ko: "정지", en: "Suspended" })}</Pill> : !m.name ? <Pill tone="amber">{L({ ko: "이름 미입력", en: "No name" })}</Pill> : <Pill tone="green">{L({ ko: "정상", en: "Active" })}</Pill>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {pages > 1 ? (
        <nav className="mt-5 flex items-center justify-center gap-3 text-sm" aria-label={L({ ko: "페이지", en: "Pages" })}>
          {page > 1 ? (
            <Link href={link(page - 1)} className={btnGhost}>
              {L({ ko: "이전", en: "Previous" })}
            </Link>
          ) : null}
          <span className="font-mono text-fg-muted">
            {page} / {pages}
          </span>
          {page < pages ? (
            <Link href={link(page + 1)} className={btnGhost}>
              {L({ ko: "다음", en: "Next" })}
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}

// ── One member: profile card ───────────────────────────────────────────

function Fact({ label, children, mono }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold text-fg-subtle">{label}</dt>
      <dd className={cn("mt-1 truncate text-[15px] text-fg", mono && "font-mono text-sm")}>{children}</dd>
    </div>
  );
}

function CopyId({ value }: { value: string }) {
  const L = useBi();
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(value).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        });
      }}
      className="ml-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-fg-muted hover:bg-surface-2"
      aria-label={L({ ko: "복사", en: "Copy" })}
    >
      <Copy className="size-3" aria-hidden />
      {done ? L({ ko: "복사됨", en: "Copied" }) : null}
    </button>
  );
}

const PAY_STATUS: Record<string, Bi> = { done: { ko: "결제 완료", en: "Paid" }, pending: { ko: "미완료", en: "Not finished" }, failed: { ko: "실패", en: "Failed" }, canceled: { ko: "취소", en: "Canceled" }, refunded: { ko: "환불", en: "Refunded" } };

const TIER: Record<KeyTier, { label: Bi; tone: "green" | "amber" | "red" | "blue" | "gray" }> = {
  paid: { label: { ko: "유료 키", en: "Paid key" }, tone: "green" },
  free: { label: { ko: "무료 키", en: "Free key" }, tone: "amber" },
  rate_limited: { label: { ko: "유료 · 한도 초과", en: "Paid · rate-limited" }, tone: "blue" },
  invalid: { label: { ko: "키 거부됨", en: "Key refused" }, tone: "red" },
  unknown: { label: { ko: "확인 실패", en: "Check failed" }, tone: "gray" },
};

function KeyRow({ k }: { k: AdminMemberDetail["keyDetails"][number] }) {
  const L = useBi();
  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <span className="grid size-9 place-items-center rounded-xl bg-accent/10 text-accent">
        <KeyRound className="size-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">
          {KEY_LABEL[k.provider] ?? k.provider} · {L({ ko: `${k.priority ?? "?"}순위`, en: `slot ${k.priority ?? "?"}` })}
        </span>
        <span className="block font-mono text-xs text-fg-muted">
          •••• {k.last4 ?? "????"} · {fmtDate(k.updatedAt)}
          {k.tier ? <span className="font-sans"> · {L({ ko: `${fmtDate(k.tier.checkedAt)} 확인`, en: `checked ${fmtDate(k.tier.checkedAt)}` })}</span> : null}
        </span>
      </span>
      <span className="flex items-center gap-2">
        {k.broken ? <Pill tone="red">{L({ ko: "거부됨", en: "Refused" })}</Pill> : null}
        {k.tier ? <Pill tone={TIER[k.tier.value].tone}>{L(TIER[k.tier.value].label)}</Pill> : k.provider === "google" ? <Pill tone="gray">{L({ ko: "등급 미확인", en: "Tier unchecked" })}</Pill> : null}
      </span>
    </li>
  );
}

/** Members table, API key column: keys, the Gemini key's free/paid badge, and the check button. */
function KeyTierCell({ m }: { m: AdminMember }) {
  const L = useBi();
  const [state, action, pending] = useActionState<AdminActionState, FormData>(checkMemberKeyTier, null);
  if (!m.keys.length)
    return (
      <div className="flex flex-col items-start gap-1.5" onClick={(e) => e.stopPropagation()}>
        <Pill tone="amber">{L({ ko: "키 없음", en: "No key" })}</Pill>
        <QuickNotice memberId={m.id} template="no_key" label={{ ko: "등록 안내", en: "Nudge" }} />
      </div>
    );
  // A check just made on this page wins over the stored one.
  const fresh = state?.message.startsWith("tier_") ? (state.message.slice(5) as KeyTier) : null;
  const tier = fresh ?? m.geminiKey?.tier?.value ?? null;
  return (
    // The row opens the profile on click; clicks in here stay here.
    <div className="flex flex-col items-start gap-1.5" onClick={(e) => e.stopPropagation()}>
      <span className="flex flex-wrap gap-1">
        {m.keys.filter((k) => k !== "google").map((k) => (
          <Pill key={k} tone="gray">
            {KEY_LABEL[k] ?? k}
          </Pill>
        ))}
        {m.geminiKey ? tier ? <Pill tone={TIER[tier].tone}>{`Gemini · ${L(TIER[tier].label)}`}</Pill> : <Pill tone="gray">{L({ ko: "Gemini · 미확인", en: "Gemini · unchecked" })}</Pill> : null}
      </span>
      {m.geminiKey ? (
        <form action={action} className="flex items-center gap-2">
          <input type="hidden" name="id" value={m.id} />
          <input type="hidden" name="priority" value={m.geminiKey.priority} />
          <button type="submit" disabled={pending} className="rounded-lg border border-hairline bg-surface px-2.5 py-1 text-xs font-semibold text-fg hover:bg-surface-2 disabled:opacity-50">
            {pending ? L({ ko: "확인 중…", en: "Checking…" }) : L({ ko: "등급 확인", en: "Check tier" })}
          </button>
          {!fresh && m.geminiKey.tier ? <span className="text-[11px] text-fg-subtle">{fmtDate(m.geminiKey.tier.checkedAt)}</span> : null}
        </form>
      ) : null}
      {tier === "invalid" || tier === "free" ? <QuickNotice memberId={m.id} template={tier === "invalid" ? "key_refused" : "free_tier"} /> : null}
      {state && !fresh ? (
        <span className="max-w-[220px] text-xs">
          <ActionNote state={state} />
        </span>
      ) : null}
    </div>
  );
}

export function MemberProfile({ m, notices }: { m: AdminMemberDetail; notices?: React.ReactNode }) {
  const L = useBi();
  const toolLabel = useToolLabel();
  const [edit, editAction, saving] = useActionState<AdminActionState, FormData>(updateMember, null);
  const [susp, suspAction, suspending] = useActionState<AdminActionState, FormData>(setMemberSuspended, null);
  const [del, delAction, deleting] = useActionState<AdminActionState, FormData>(deleteMember, null);
  const [confirm, setConfirm] = useState("");
  const kakao = m.identities.find((i) => i.provider === "kakao");

  return (
    <div>
      <Link href="/admin/members" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-fg-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden />
        {L({ ko: "회원 목록", en: "All members" })}
      </Link>

      {/* Profile card */}
      <section className="overflow-hidden rounded-3xl border border-hairline bg-surface shadow-[0_1px_2px_rgba(16,24,40,.04),0_20px_50px_-24px_rgba(16,24,40,.25)]">
        <div className="h-32 bg-[linear-gradient(120deg,#1e2a5a_0%,#3b6fe3_55%,#7aa2ff_100%)] md:h-40" />
        <div className="px-6 pb-6 md:px-8">
          <div className="flex flex-wrap items-end gap-5">
            <span className="-mt-14 rounded-[32px] bg-surface p-1.5 shadow-lg">
              <Avatar id={m.id} name={m.name ?? m.providerName ?? null} email={m.email} size="xl" />
            </span>
            <div className="min-w-0 flex-1 pt-4 pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-[30px] leading-tight font-bold text-fg">{m.name ?? <span className="text-fg-subtle">{m.providerName ?? L({ ko: "이름 미입력", en: "No name yet" })}</span>}</h1>
                {m.isStaff ? <Pill tone="blue">{L({ ko: "관리자", en: "Staff" })}</Pill> : null}
                {m.suspended ? <Pill tone="red">{L({ ko: "이용 정지", en: "Suspended" })}</Pill> : <Pill tone="green">{L({ ko: "정상", en: "Active" })}</Pill>}
              </div>
              <p className="mt-1 text-[15px] text-fg-muted">{m.email || "—"}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {m.providers.map((p) => (
                  <ProviderBadge key={p} provider={p} />
                ))}
              </div>
            </div>
          </div>

          <dl className="mt-7 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
            <Fact label={L({ ko: "가입 때 입력한 이름", en: "Name they entered" })}>{m.name ?? <span className="text-sm text-studio-warning">{L({ ko: "아직 입력 안 함", en: "Not entered yet" })}</span>}</Fact>
            <Fact label={L({ ko: `${m.provider === "kakao" ? "카카오" : "구글"} 계정 이름`, en: `${m.provider === "kakao" ? "Kakao" : "Google"} account name` })}>{m.providerName ?? "—"}</Fact>
            <Fact label={L({ ko: "카카오 회원번호", en: "Kakao ID" })} mono>
              {kakao?.providerId ?? m.kakaoId ?? "—"}
            </Fact>
            <Fact label={L({ ko: "휴대전화", en: "Phone" })} mono>
              {m.phone ?? <span className="font-sans text-sm text-fg-subtle">{L({ ko: "받지 않음", en: "Not collected" })}</span>}
            </Fact>
            <Fact label={L({ ko: "가입일", en: "Joined" })}>{fmtDateTime(m.createdAt)}</Fact>
            <Fact label={L({ ko: "최근 로그인", en: "Last sign-in" })}>{fmtDateTime(m.lastSignInAt)}</Fact>
            <Fact label={L({ ko: "회원 ID", en: "Member ID" })} mono>
              <span className="inline-flex max-w-full items-center">
                <span className="truncate">{m.id}</span>
                <CopyId value={m.id} />
              </span>
            </Fact>
            <Fact label={L({ ko: "약관 동의", en: "Terms agreed" })}>{m.consent.agreedAt ? `${fmtDate(m.consent.agreedAt)} (v${m.consent.version})` : L({ ko: "동의 전", en: "Not yet" })}</Fact>
            <Fact label={L({ ko: "마케팅 수신", en: "Marketing email" })}>{m.consent.marketing ? L({ ko: "동의", en: "Opted in" }) : L({ ko: "미동의", en: "No" })}</Fact>
            <Fact label={L({ ko: "비즈니스 프로필", en: "Business profile" })}>{m.brand?.name ? [m.brand.name, m.brand.industry, m.brand.region].filter(Boolean).join(" · ") : "—"}</Fact>
          </dl>
        </div>
      </section>

      <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={L({ ko: "총 실행", en: "Runs" })} value={num(m.runs)} icon={Play} tone="brand" note={L({ ko: `마지막 ${fmtDate(m.lastRunAt)}`, en: `Last ${fmtDate(m.lastRunAt)}` })} />
        <StatCard label={L({ ko: "실패", en: "Failed" })} value={num(m.failedRuns)} icon={AlertTriangle} tone="campaign" alert={m.runs > 0 && pct(m.failedRuns, m.runs) >= 50} note={L({ ko: `실패율 ${pct(m.failedRuns, m.runs)}%`, en: `${pct(m.failedRuns, m.runs)}% failure rate` })} />
        <StatCard label={L({ ko: "API 키", en: "API keys" })} value={num(m.keyDetails.length)} icon={KeyRound} tone="operate" note={m.keyDetails.some((k) => k.broken) ? L({ ko: "거부된 키 있음", en: "A key was refused" }) : L({ ko: "등록된 키", en: "Saved keys" })} noteTone={m.keyDetails.some((k) => k.broken) ? "down" : "flat"} />
        <StatCard label={L({ ko: "프로젝트", en: "Projects" })} value={num(m.projects)} icon={Wrench} tone="discover" note={m.plan ? `${m.plan}${m.planExpiresAt ? ` · ~${fmtDate(m.planExpiresAt)}` : ""}` : L({ ko: "무료 플랜", en: "Free plan" })} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Card title={L({ ko: "자주 쓰는 도구", en: "Tools used" })} lead={L({ ko: "이 회원의 전체 실행 기준", en: "All of this member's runs" })}>
          <BarList
            emptyText={L({ ko: "아직 도구를 실행하지 않았어요.", en: "Hasn't run a tool yet." })}
            items={m.toolUsage.slice(0, 8).map((t) => ({ key: t.toolId, label: toolLabel(t.toolId), value: t.runs, tone: toolTone(t.toolId), sub: t.failed ? L({ ko: `실패 ${t.failed}회`, en: `${t.failed} failed` }) : undefined }))}
          />
        </Card>
        <Card title={L({ ko: "API 키", en: "API keys" })} lead={L({ ko: "키 값은 암호화되어 끝 4자리만 보여요. 무료·유료 확인은 회원 목록의 ‘등급 확인’에서 해요.", en: "Encrypted; only the last 4 characters show. Check free/paid with 'Check tier' in the members list." })}>
          {m.keyDetails.length === 0 ? (
            <p className="text-sm text-fg-muted">{L({ ko: "등록한 키가 없어요. 도구를 실행하려면 키가 필요해요.", en: "No key saved. A key is needed to run tools." })}</p>
          ) : (
            <ul className="divide-y divide-hairline">
              {m.keyDetails.map((k, i) => (
                <KeyRow key={i} k={k} />
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-5" title={L({ ko: "최근 실행", en: "Recent runs" })} lead={L({ ko: "최근 15건", en: "Last 15" })} bodyClassName="p-0">
        {m.recentRuns.length === 0 ? (
          <p className="p-5 text-sm text-fg-muted">{L({ ko: "실행 기록이 없어요.", en: "No runs." })}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-xs font-semibold tracking-wide text-fg-subtle uppercase">
                  <th className="px-5 py-3">{L({ ko: "도구", en: "Tool" })}</th>
                  <th className="px-3 py-3">{L({ ko: "제목", en: "Title" })}</th>
                  <th className="px-3 py-3">{L({ ko: "상태", en: "Status" })}</th>
                  <th className="px-5 py-3">{L({ ko: "시각", en: "When" })}</th>
                </tr>
              </thead>
              <tbody>
                {m.recentRuns.map((r) => (
                  <tr key={r.id} className="border-b border-hairline/70 align-top last:border-0">
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-2 font-medium">
                        <span className={cn("size-2 rounded-full", TONE[toolTone(r.toolId)].dot)} aria-hidden />
                        {toolLabel(r.toolId)}
                      </span>
                    </td>
                    <td className="max-w-[320px] px-3 py-3 text-fg-muted">
                      <span className="block truncate">{r.title ?? "—"}</span>
                      {r.error ? <span className="mt-0.5 block text-xs break-keep text-danger">{r.error}</span> : null}
                    </td>
                    <td className="px-3 py-3">
                      <RunStatus status={r.status} />
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-fg-muted tabular-nums">{fmtDateTime(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card title={L({ ko: "결제 내역", en: "Payments" })} bodyClassName="p-0">
          {m.payments.length === 0 ? (
            <p className="p-5 text-sm text-fg-muted">{L({ ko: "결제 내역이 없어요.", en: "No payments." })}</p>
          ) : (
            <ul className="divide-y divide-hairline">
              {m.payments.map((p) => (
                <li key={p.orderId} className="flex items-center gap-3 px-5 py-3 text-sm">
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{num(p.amount)}원 {p.plan ? <span className="font-normal text-fg-muted">· {p.plan}</span> : null}</span>
                    <span className="block font-mono text-xs text-fg-subtle">
                      {p.orderId} · {fmtDateTime(p.createdAt)}
                    </span>
                  </span>
                  <Pill tone={p.status === "done" ? "green" : p.status === "pending" ? "gray" : "red"}>{L(PAY_STATUS[p.status] ?? { ko: p.status, en: p.status })}</Pill>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title={L({ ko: "문의 내역", en: "Support tickets" })} bodyClassName="p-0">
          {m.tickets.length === 0 ? (
            <p className="p-5 text-sm text-fg-muted">{L({ ko: "문의한 적이 없어요.", en: "No tickets." })}</p>
          ) : (
            <ul className="divide-y divide-hairline">
              {m.tickets.map((t) => (
                <li key={t.id}>
                  <Link href={`/admin/tickets?status=${t.status}`} className="flex items-center gap-3 px-5 py-3 text-sm hover:bg-surface-2/60">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{t.subject}</span>
                      <span className="block text-xs text-fg-subtle">
                        {L(KIND_LABEL[t.kind] ?? { ko: t.kind, en: t.kind })} · {fmtDateTime(t.createdAt)}
                      </span>
                    </span>
                    <Pill tone={t.status === "open" ? "amber" : t.status === "answered" ? "green" : "gray"}>{L(STATUS_LABEL[t.status as TicketStatus] ?? { ko: t.status, en: t.status })}</Pill>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {notices ? <div className="mt-5">{notices}</div> : null}

      {/* Manage: update, suspend, delete */}
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Card title={L({ ko: "회원 정보 수정", en: "Edit member" })} lead={L({ ko: "이름과 내부 메모 (회원에게는 보이지 않아요)", en: "Name and an internal note (never shown to the member)" })}>
          <form action={editAction} className="flex flex-col gap-3">
            <input type="hidden" name="id" value={m.id} />
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-fg-muted">{L({ ko: "이름", en: "Name" })}</span>
              <input name="name" required maxLength={NAME_MAX} defaultValue={m.name ?? m.providerName ?? ""} className={field} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-fg-muted">{L({ ko: "관리자 메모", en: "Staff note" })}</span>
              <textarea name="note" maxLength={2000} defaultValue={m.note} rows={4} className={cn(field, "h-auto py-2.5 leading-relaxed")} placeholder={L({ ko: "예: 10/19 전화 문의 — API 키 결제 설정 안내함", en: "e.g. Oct 19 call — walked them through API key billing" })} />
            </label>
            <div className="flex items-center gap-3">
              <button type="submit" disabled={saving} className={btnPrimary}>
                <Save className="size-4" aria-hidden />
                {L({ ko: "저장", en: "Save" })}
              </button>
              <ActionNote state={edit} />
            </div>
          </form>
        </Card>

        <Card title={L({ ko: "계정 관리", en: "Account" })} lead={m.isStaff ? L({ ko: "관리자 계정은 정지·삭제할 수 없어요", en: "Staff accounts can't be suspended or deleted" }) : undefined}>
          <form action={suspAction} className="flex flex-col gap-2">
            <input type="hidden" name="id" value={m.id} />
            <input type="hidden" name="suspend" value={m.suspended ? "0" : "1"} />
            <p className="text-sm text-fg-muted">{m.suspended ? L({ ko: "정지된 회원은 로그인할 수 없어요. 풀면 바로 다시 쓸 수 있어요.", en: "Suspended members can't sign in. Restoring lets them back in at once." }) : L({ ko: "정지하면 로그인이 막혀요. 데이터는 그대로 남아요.", en: "Suspending blocks sign-in. Their data stays." })}</p>
            <div className="flex items-center gap-3">
              <button type="submit" disabled={suspending || m.isStaff} className={m.suspended ? btnGhost : cn(btn, "border border-danger/40 text-danger hover:bg-danger/10")}>
                {m.suspended ? <RotateCcw className="size-4" aria-hidden /> : <Ban className="size-4" aria-hidden />}
                {m.suspended ? L({ ko: "정지 풀기", en: "Restore" }) : L({ ko: "이용 정지", en: "Suspend" })}
              </button>
              <ActionNote state={susp} />
            </div>
          </form>

          <form action={delAction} className="mt-6 flex flex-col gap-2 rounded-2xl border border-danger/30 bg-danger/[0.04] p-4">
            <input type="hidden" name="id" value={m.id} />
            <p className="text-sm font-semibold text-danger">{L({ ko: "회원 삭제", en: "Delete member" })}</p>
            <p className="text-xs leading-relaxed text-fg-muted">{L({ ko: "회원 탈퇴와 똑같이 결과물·프로필·API 키·파일을 지우고 로그인을 없애요. 결제(5년)·문의(3년) 기록만 법에 따라 남아요. 되돌릴 수 없어요.", en: "Same as the member leaving: results, profile, API keys and files are deleted and the login removed. Only payment (5 years) and support (3 years) records stay, as the law requires. This can't be undone." })}</p>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-fg-muted">{L({ ko: "확인을 위해 회원 이메일을 적어 주세요", en: "Type the member's email to confirm" })}</span>
              <input name="confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={m.email} className={field} autoComplete="off" disabled={m.isStaff} />
            </label>
            <div className="flex items-center gap-3">
              <button type="submit" disabled={deleting || m.isStaff || !m.email || confirm.trim().toLowerCase() !== m.email.toLowerCase()} className={btnDanger}>
                <Trash2 className="size-4" aria-hidden />
                {L({ ko: "영구 삭제", en: "Delete for good" })}
              </button>
              <ActionNote state={del} />
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

// ── Tool usage ─────────────────────────────────────────────────────────

const PERIODS: { value: UsagePeriod; label: Bi }[] = [
  { value: 7, label: { ko: "7일", en: "7 days" } },
  { value: 30, label: { ko: "30일", en: "30 days" } },
  { value: 90, label: { ko: "90일", en: "90 days" } },
  { value: 0, label: { ko: "전체", en: "All time" } },
];

export function ToolUsageView({ rows, totalRuns, totalMembers, period, range }: { rows: ToolUsageRow[]; totalRuns: number; totalMembers: number; period: UsagePeriod | null; range: { from: string; to: string } }) {
  const L = useBi();
  const toolLabel = useToolLabel();
  const used = new Set(rows.map((r) => catalogTool(r.toolId)?.slug ?? r.toolId));
  const unused = publicTools().filter((t) => !used.has(t.slug));
  const usedPublic = publicTools().length - unused.length;
  const failed = rows.reduce((a, r) => a + r.failed, 0);
  return (
    <div>
      <AdminPageHeader
        title={L({ ko: "도구 사용 현황", en: "Tool usage" })}
        lead={
          period === null
            ? L({ ko: `${range.from || "처음"} ~ ${range.to || "오늘"} (한국 시간)`, en: `${range.from || "start"} – ${range.to || "today"} (Korea time)` })
            : L({ ko: "어떤 도구를 가장 많이 쓰는지, 어디서 실패가 나는지 봐요.", en: "Which tools get used most, and where runs fail." })
        }
        actions={
          <nav className="flex rounded-xl border border-hairline bg-surface p-1" aria-label={L({ ko: "기간", en: "Period" })}>
            {PERIODS.map((p) => (
              <Link key={p.value} href={`/admin/tools?period=${p.value}`} aria-current={period === p.value ? "page" : undefined} className={cn("rounded-lg px-3.5 py-1.5 text-sm font-semibold", period === p.value ? "bg-[#3b6fe3] text-white" : "text-fg-muted hover:text-fg")}>
                {L(p.label)}
              </Link>
            ))}
          </nav>
        }
      />

      <Card className="mb-5" bodyClassName="p-4">
        <form action="/admin/tools" className="flex flex-wrap items-end gap-3">
          <DateRange from={range.from} to={range.to} label={L({ ko: "기간 직접 선택", en: "Custom dates" })} />
          <div className="flex gap-2">
            <button type="submit" className={btnPrimary}>
              {L({ ko: "적용", en: "Apply" })}
            </button>
            {period === null ? (
              <Link href="/admin/tools" className={btnGhost}>
                {L({ ko: "초기화", en: "Reset" })}
              </Link>
            ) : null}
          </div>
        </form>
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={L({ ko: "총 실행", en: "Runs" })} value={num(totalRuns)} icon={Play} tone="brand" />
        <StatCard label={L({ ko: "사용한 회원", en: "Members who ran" })} value={num(totalMembers)} icon={Users} tone="discover" />
        <StatCard label={L({ ko: "쓰인 도구", en: "Tools used" })} value={`${num(usedPublic)} / ${num(publicTools().length)}`} icon={Wrench} tone="operate" />
        <StatCard label={L({ ko: "실패율", en: "Failure rate" })} value={`${pct(failed, totalRuns)}%`} icon={AlertTriangle} tone="campaign" alert={pct(failed, totalRuns) >= 20} note={L({ ko: `실패 ${num(failed)}회`, en: `${num(failed)} failed` })} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1.4fr]">
        <Card title={L({ ko: "많이 쓰는 도구 TOP 10", en: "Top 10 tools" })}>
          <BarList
            emptyText={L({ ko: "이 기간에는 실행 기록이 없어요.", en: "No runs in this period." })}
            items={rows.slice(0, 10).map((r) => ({ key: r.toolId, label: toolLabel(r.toolId), value: r.runs, display: `${num(r.runs)} · ${pct(r.runs, totalRuns)}%`, tone: toolTone(r.toolId), sub: L({ ko: `회원 ${r.members}명`, en: `${r.members} members` }) }))}
          />
        </Card>
        <Card title={L({ ko: "도구별 상세", en: "By tool" })} bodyClassName="p-0">
          {rows.length === 0 ? (
            <p className="p-5 text-sm text-fg-muted">{L({ ko: "이 기간에는 실행 기록이 없어요.", en: "No runs in this period." })}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead>
                  <tr className="border-b border-hairline text-left text-xs font-semibold tracking-wide text-fg-subtle uppercase">
                    <th className="px-5 py-3">{L({ ko: "도구", en: "Tool" })}</th>
                    <th className="px-3 py-3 text-right">{L({ ko: "실행", en: "Runs" })}</th>
                    <th className="px-3 py-3 text-right">{L({ ko: "회원", en: "Members" })}</th>
                    <th className="px-3 py-3 text-right">{L({ ko: "실패율", en: "Failed" })}</th>
                    <th className="px-5 py-3">{L({ ko: "마지막 사용", en: "Last used" })}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const t = catalogTool(r.toolId);
                    const Icon = t?.icon;
                    const tone = toolTone(r.toolId);
                    const fail = pct(r.failed, r.runs);
                    return (
                      <tr key={r.toolId} className="border-b border-hairline/70 last:border-0">
                        <td className="px-5 py-3">
                          <span className="flex items-center gap-3">
                            <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", TONE[tone].tile)}>{Icon ? <Icon className="size-4" aria-hidden /> : null}</span>
                            <span className="font-semibold">{toolLabel(r.toolId)}</span>
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right font-semibold tabular-nums">{num(r.runs)}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{num(r.members)}</td>
                        <td className={cn("px-3 py-3 text-right tabular-nums", fail >= 20 ? "font-semibold text-danger" : "text-fg-muted")}>{fail}%</td>
                        <td className="px-5 py-3 whitespace-nowrap text-fg-muted tabular-nums">{fmtDateTime(r.lastRunAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {unused.length ? (
        <Card className="mt-5" title={L({ ko: "이 기간에 안 쓰인 도구", en: "Not used in this period" })} lead={L({ ko: "안내·추천이 필요한 도구예요", en: "Candidates for a nudge or a guide" })}>
          <ul className="flex flex-wrap gap-2">
            {unused.map((t) => (
              <li key={t.slug} className={cn("rounded-full px-3 py-1.5 text-sm font-medium", TONE[t.category].chip)}>
                {L(t.name)}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}

// ── Support tickets ────────────────────────────────────────────────────

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

function TicketCard({ ticket }: { ticket: AdminTicket }) {
  const L = useBi();
  const [state, action, pending] = useActionState<AdminActionState, FormData>(replyToTicket, null);
  const [reopenState, reopen, reopening] = useActionState<AdminActionState, FormData>(reopenTicket, null);

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone={ticket.kind === "bug" ? "red" : ticket.kind === "feature" ? "blue" : "gray"}>{L(KIND_LABEL[ticket.kind] ?? { ko: ticket.kind, en: ticket.kind })}</Pill>
        <Link href={memberHref(ticket.userId)} className="truncate text-sm font-medium text-accent hover:underline">
          {ticket.email || "—"}
        </Link>
        <span className="ml-auto font-mono text-xs text-fg-subtle">{fmtDateTime(ticket.createdAt)}</span>
      </div>
      <h3 className="mt-3 text-base font-semibold break-keep">{ticket.subject}</h3>
      <p className="mt-1 text-sm whitespace-pre-wrap text-fg-muted">{ticket.body}</p>
      {ticket.contact ? (
        <p className="mt-2 text-xs text-fg-subtle">
          {L({ ko: "연락처", en: "Contact" })}: {ticket.contact}
        </p>
      ) : null}
      {ticket.preferredTime ? (
        <p className="mt-0.5 text-xs text-fg-subtle">
          {L({ ko: "희망 시간", en: "Preferred time" })}: {ticket.preferredTime}
        </p>
      ) : null}

      {ticket.status === "open" ? (
        <form action={action} className="mt-4 flex flex-col gap-2 border-t border-hairline pt-4">
          <input type="hidden" name="ticketId" value={ticket.id} />
          <textarea id={`reply-${ticket.id}`} name="reply" maxLength={4000} defaultValue={ticket.reply ?? ""} rows={4} className={cn(field, "h-auto py-2.5")} placeholder={L({ ko: "답변을 적어 주세요. 회원의 고객센터 화면에 그대로 보여요.", en: "Write a reply. The member sees it as written in their support page." })} aria-label={L({ ko: "답변", en: "Reply" })} />
          <div className="flex flex-wrap items-center gap-2">
            <button type="submit" name="status" value="answered" disabled={pending} className={btnPrimary}>
              {L({ ko: "답변 보내기", en: "Send reply" })}
            </button>
            <button type="submit" name="status" value="closed" disabled={pending} className={btnGhost}>
              {L({ ko: "답변 없이 종료", en: "Close without reply" })}
            </button>
            <ActionNote state={state} />
          </div>
        </form>
      ) : (
        <div className="mt-4 border-t border-hairline pt-4">
          {ticket.reply ? (
            <>
              <p className="text-xs font-semibold text-fg-subtle">{L({ ko: "보낸 답변", en: "Reply sent" })}</p>
              <p className="mt-1 text-sm whitespace-pre-wrap">{ticket.reply}</p>
            </>
          ) : (
            <p className="text-xs text-fg-subtle">{L({ ko: "답변 없이 종료됨", en: "Closed without a reply" })}</p>
          )}
          <form action={reopen} className="mt-3 flex items-center gap-3">
            <input type="hidden" name="ticketId" value={ticket.id} />
            <button type="submit" disabled={reopening} className={btnGhost}>
              {L({ ko: "다시 열기", en: "Reopen" })}
            </button>
            <ActionNote state={reopenState} />
          </form>
        </div>
      )}
    </Card>
  );
}

export function TicketQueue({ tickets, status, counts }: { tickets: AdminTicket[]; status: TicketStatus; counts: Record<TicketStatus, number> }) {
  const L = useBi();
  return (
    <div>
      <AdminPageHeader
        title={L({ ko: "고객 문의", en: "Support tickets" })}
        lead={L({ ko: "피드백과 문의에 답하세요. 답변하면 회원의 고객센터 화면과 도움말 아이콘에 표시돼요.", en: "Answer feedback and questions. Replies show on the member's support page and Help icon." })}
        actions={
          <nav className="flex rounded-xl border border-hairline bg-surface p-1" aria-label={L({ ko: "상태", en: "Status" })}>
            {(Object.keys(STATUS_LABEL) as TicketStatus[]).map((s) => (
              <Link key={s} href={`/admin/tickets?status=${s}`} aria-current={status === s ? "page" : undefined} className={cn("rounded-lg px-3.5 py-1.5 text-sm font-semibold", status === s ? "bg-[#3b6fe3] text-white" : "text-fg-muted hover:text-fg")}>
                {L(STATUS_LABEL[s])} <span className="font-mono tabular-nums opacity-80">{counts[s]}</span>
              </Link>
            ))}
          </nav>
        }
      />
      {tickets.length === 0 ? (
        <Card>
          <p className="text-sm text-fg-muted">{status === "open" ? L({ ko: "답변을 기다리는 문의가 없어요.", en: "No open tickets." }) : L({ ko: "표시할 문의가 없어요.", en: "No tickets here." })}</p>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {tickets.map((t) => (
            <TicketCard key={t.id} ticket={t} />
          ))}
        </div>
      )}
    </div>
  );
}
