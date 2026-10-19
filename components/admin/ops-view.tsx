"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { AlertTriangle, BellRing, Megaphone, PauseCircle, PlayCircle, Power, Send, Siren, Wrench } from "lucide-react";
import { useBi } from "@/lib/i18n/context";
import { changeAnnouncement, saveAnnouncement, sendMemberNotice, setMaintenance, setToolPaused, type AdminActionState } from "@/lib/actions/admin";
import { ERROR_CLASS, FUNNEL_STEPS, MAINTENANCE_DEFAULT, NOTICE_TEMPLATES, PAUSED_DEFAULT, type ErrorClass, type FailureAlert, type FunnelStep, type SiteSettings } from "@/lib/admin-ops";
import type { Announcement, ErrorReport, MemberNotice } from "@/lib/admin-ops-server";
import { catalogTool, publicTools } from "@/lib/tools/catalog";
import { TONE, toolTone } from "@/components/site/tone";
import { AdminPageHeader } from "@/components/admin/admin-shell";
import { Card, Pill, StatCard, TrendChart } from "@/components/admin/ui";
import { ActionNote, DateRange, btnGhost, btnPrimary, field, fmtDate, fmtDateTime, num, pct } from "@/components/admin/kit";
import { cn } from "@/lib/utils";

// /admin operations: activation funnel, failure reasons and alerts,
// notices to one member, announcements and patch notes, maintenance mode
// and paused tools. Data comes from lib/admin-ops-server.ts.

type Bi = { ko: string; en: string };

function useToolLabel() {
  const L = useBi();
  return (id: string | null) => {
    if (!id) return "—";
    const t = catalogTool(id);
    return t ? L(t.name) : id;
  };
}

// ── Alerts (dashboard and errors page) ─────────────────────────────────

export function AlertsBar({ alerts, settings }: { alerts: FailureAlert[]; settings: SiteSettings }) {
  const L = useBi();
  const paused = Object.keys(settings.pausedTools).length;
  if (!alerts.length && !settings.maintenance.on && !paused) return null;
  return (
    <div className="mb-5 flex flex-col gap-2">
      {settings.maintenance.on ? (
        <Link href="/admin/settings" className="flex items-center gap-3 rounded-2xl border border-danger/40 bg-danger/[0.07] px-4 py-3 text-sm font-semibold text-danger">
          <Power className="size-5 shrink-0" aria-hidden />
          {L({ ko: "점검 모드가 켜져 있어요. 회원은 도구를 실행할 수 없어요.", en: "Maintenance mode is on. Members can't run tools." })}
        </Link>
      ) : null}
      {paused ? (
        <Link href="/admin/settings" className="flex items-center gap-3 rounded-2xl border border-studio-warning/40 bg-studio-warning/10 px-4 py-3 text-sm font-semibold">
          <PauseCircle className="size-5 shrink-0 text-studio-warning" aria-hidden />
          {L({ ko: `중지된 도구 ${paused}개`, en: `${paused} tool(s) paused` })}
        </Link>
      ) : null}
      {alerts.map((a, i) => (
        <Link key={i} href="/admin/errors" className={cn("flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold", a.level === "critical" ? "border-danger/40 bg-danger/[0.07] text-danger" : "border-studio-warning/40 bg-studio-warning/10")}>
          <Siren className={cn("size-5 shrink-0", a.level === "critical" ? "" : "text-studio-warning")} aria-hidden />
          <span className="flex-1">{L(a.message)}</span>
          <span className="text-xs font-semibold underline">{L({ ko: "원인 보기", en: "See causes" })}</span>
        </Link>
      ))}
    </div>
  );
}

// ── One-click notice ───────────────────────────────────────────────────

/** A single button that sends a ready-made notice (from the errors and funnel pages). */
export function QuickNotice({ memberId, template, label }: { memberId: string; template: string; label?: Bi }) {
  const L = useBi();
  const [state, action, pending] = useActionState<AdminActionState, FormData>(sendMemberNotice, null);
  const tpl = NOTICE_TEMPLATES.find((t) => t.id === template);
  if (state?.ok) return <Pill tone="green">{L({ ko: "보냄", en: "Sent" })}</Pill>;
  return (
    <form action={action} className="inline-flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <input type="hidden" name="id" value={memberId} />
      <input type="hidden" name="template" value={template} />
      <button type="submit" disabled={pending} title={tpl?.title} className="inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-surface px-2.5 py-1 text-xs font-semibold hover:bg-surface-2 disabled:opacity-50">
        <Send className="size-3" aria-hidden />
        {pending ? L({ ko: "보내는 중…", en: "Sending…" }) : L(label ?? tpl?.label ?? { ko: "안내 보내기", en: "Send notice" })}
      </button>
      {state && !state.ok ? <ActionNote state={state} /> : null}
    </form>
  );
}

/** Profile card: send a notice (template or custom) and see what was sent. */
export function NoticePanel({ memberId, sent }: { memberId: string; sent: MemberNotice[] }) {
  const L = useBi();
  const [state, action, pending] = useActionState<AdminActionState, FormData>(sendMemberNotice, null);
  const [tplId, setTplId] = useState(NOTICE_TEMPLATES[0].id);
  const tpl = NOTICE_TEMPLATES.find((t) => t.id === tplId)!;
  return (
    <Card title={L({ ko: "회원에게 안내 보내기", en: "Send this member a notice" })} lead={L({ ko: "회원이 앱을 열면 맨 위에 배너로 보여요. 닫을 때까지 남아 있어요.", en: "Shows as a banner at the top of their app until they close it." })}>
      <form action={action} className="flex flex-col gap-3" key={tplId}>
        <input type="hidden" name="id" value={memberId} />
        <div className="flex flex-wrap gap-1.5">
          {NOTICE_TEMPLATES.map((t) => (
            <button key={t.id} type="button" onClick={() => setTplId(t.id)} aria-pressed={tplId === t.id} className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold", tplId === t.id ? "border-[#3b6fe3] bg-[#3b6fe3] text-white" : "border-hairline hover:bg-surface-2")}>
              {L(t.label)}
            </button>
          ))}
        </div>
        <input type="hidden" name="template" value={tplId} />
        <input name="title" defaultValue={tpl.title} required maxLength={120} placeholder={L({ ko: "제목", en: "Title" })} className={field} aria-label={L({ ko: "제목", en: "Title" })} />
        <textarea name="body" defaultValue={tpl.body} rows={4} maxLength={1000} placeholder={L({ ko: "내용", en: "Message" })} className={cn(field, "h-auto py-2.5 leading-relaxed")} aria-label={L({ ko: "내용", en: "Message" })} />
        <input name="link" defaultValue={tpl.link ?? ""} placeholder="/account/api-key" className={cn(field, "font-mono")} aria-label={L({ ko: "연결할 화면 (선택)", en: "Link (optional)" })} />
        <div className="flex items-center gap-3">
          <button type="submit" disabled={pending} className={btnPrimary}>
            <Send className="size-4" aria-hidden />
            {L({ ko: "보내기", en: "Send" })}
          </button>
          <ActionNote state={state} />
        </div>
      </form>
      {sent.length ? (
        <div className="mt-5 border-t border-hairline pt-4">
          <p className="text-xs font-semibold text-fg-subtle">{L({ ko: "보낸 안내", en: "Sent" })}</p>
          <ul className="mt-2 divide-y divide-hairline">
            {sent.map((n) => (
              <li key={n.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate">{n.title}</span>
                <span className="text-xs text-fg-subtle">{fmtDateTime(n.createdAt)}</span>
                {n.readAt ? <Pill tone="gray">{L({ ko: "확인함", en: "Seen" })}</Pill> : <Pill tone="amber">{L({ ko: "안 읽음", en: "Unread" })}</Pill>}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}

// ── Activation funnel ──────────────────────────────────────────────────

const STUCK_HELP: Partial<Record<FunnelStep, { next: Bi; template?: string }>> = {
  signed_up: { next: { ko: "동의·이름을 안 마친 회원", en: "Haven't finished consent and name" } },
  onboarded: { next: { ko: "API 키를 안 등록한 회원", en: "Haven't added an API key" }, template: "no_key" },
  has_key: { next: { ko: "키는 있지만 실행 안 한 회원", en: "Have a key but never ran a tool" } },
  first_run: { next: { ko: "실행했지만 결과물을 못 받은 회원", en: "Ran but never got a result" }, template: "key_refused" },
  first_success: { next: { ko: "결과물을 받고 다시 안 온 회원", en: "Got a result but didn't come back" } },
};

export function FunnelView({ steps, stuckAt, members, range }: { steps: { id: FunnelStep; count: number; ofPrevious: number | null; ofFirst: number }[]; stuckAt: Record<FunnelStep, string[]>; members: Record<string, { email: string; name: string | null }>; range: { from: string; to: string } }) {
  const L = useBi();
  const max = Math.max(1, steps[0]?.count ?? 1);
  const worst = steps.slice(1).reduce<{ id: FunnelStep; drop: number } | null>((w, s) => {
    const drop = 1 - (s.ofPrevious ?? 1);
    return !w || drop > w.drop ? { id: s.id, drop } : w;
  }, null);
  return (
    <div>
      <AdminPageHeader
        title={L({ ko: "가입 퍼널", en: "Activation funnel" })}
        lead={range.from || range.to ? L({ ko: `가입일 ${range.from || "처음"} ~ ${range.to || "오늘"} 회원 기준`, en: `Members who joined ${range.from || "start"} – ${range.to || "today"}` }) : L({ ko: "가입한 회원이 어디까지 왔는지, 어디서 멈추는지 봐요.", en: "How far members get after signing up, and where they stop." })}
      />
      <Card className="mb-5" bodyClassName="p-4">
        <form action="/admin/funnel" className="flex flex-wrap items-end gap-3">
          <DateRange from={range.from} to={range.to} label={L({ ko: "가입일", en: "Joined" })} />
          <button type="submit" className={btnPrimary}>
            {L({ ko: "적용", en: "Apply" })}
          </button>
          {range.from || range.to ? (
            <Link href="/admin/funnel" className={btnGhost}>
              {L({ ko: "초기화", en: "Reset" })}
            </Link>
          ) : null}
        </form>
      </Card>

      <Card title={L({ ko: "단계별 회원 수", en: "Members at each step" })} lead={worst && worst.drop > 0 ? L({ ko: `가장 많이 빠지는 곳: ‘${L(FUNNEL_STEPS.find((s) => s.id === worst.id)!.label)}’ 단계 (${Math.round(worst.drop * 100)}% 이탈)`, en: `Biggest drop: '${L(FUNNEL_STEPS.find((s) => s.id === worst.id)!.label)}' (${Math.round(worst.drop * 100)}% lost)` }) : undefined}>
        <ol className="space-y-4">
          {steps.map((s, i) => {
            const meta = FUNNEL_STEPS.find((f) => f.id === s.id)!;
            const isWorst = worst?.id === s.id && worst.drop > 0;
            return (
              <li key={s.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-[15px] font-semibold">
                    <span className="mr-2 inline-grid size-6 place-items-center rounded-md bg-[#3b6fe3] text-xs text-white">{i + 1}</span>
                    {L(meta.label)} <span className="ml-1 text-xs font-normal text-fg-subtle">{L(meta.hint)}</span>
                  </span>
                  <span className="font-mono text-sm tabular-nums">
                    <b className="text-base">{num(s.count)}</b>
                    {s.ofPrevious !== null ? <span className={cn("ml-2", isWorst ? "font-semibold text-danger" : "text-fg-muted")}>{L({ ko: `이전 단계의 ${Math.round(s.ofPrevious * 100)}%`, en: `${Math.round(s.ofPrevious * 100)}% of previous` })}</span> : null}
                  </span>
                </div>
                <div className="mt-2 h-8 overflow-hidden rounded-lg bg-surface-2">
                  <div className={cn("flex h-full items-center rounded-lg px-3 text-xs font-semibold text-white", isWorst ? "bg-danger" : "bg-[#3b6fe3]")} style={{ width: `${Math.max(4, (s.count / max) * 100)}%` }}>
                    {Math.round(s.ofFirst * 100)}%
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </Card>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {steps.slice(0, -1).map((s) => {
          const help = STUCK_HELP[s.id];
          const ids = stuckAt[s.id] ?? [];
          if (!help || !ids.length) return null;
          return (
            <Card key={s.id} title={L(help.next)} lead={L({ ko: `${ids.length}명 · 다음 단계로 못 간 회원`, en: `${ids.length} member(s) stuck here` })} bodyClassName="p-2">
              <ul>
                {ids.slice(0, 12).map((id) => (
                  <li key={id} className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-surface-2/60">
                    <Link href={`/admin/members/${id}`} className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{members[id]?.name ?? members[id]?.email ?? id}</span>
                      {members[id]?.name ? <span className="block truncate text-xs text-fg-muted">{members[id]?.email}</span> : null}
                    </Link>
                    {help.template ? <QuickNotice memberId={id} template={help.template} /> : null}
                  </li>
                ))}
              </ul>
              {ids.length > 12 ? <p className="px-3 pb-2 text-xs text-fg-subtle">{L({ ko: `외 ${ids.length - 12}명`, en: `+${ids.length - 12} more` })}</p> : null}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ── Failure reasons ────────────────────────────────────────────────────

const CLASS_TONE: Record<ErrorClass, "red" | "amber" | "blue" | "gray"> = { key_refused: "red", billing: "red", free_tier: "amber", quota: "amber", overloaded: "blue", timeout: "blue", guard: "gray", output: "gray", other: "gray" };
const NOTICE_FOR: Partial<Record<ErrorClass, string>> = { key_refused: "key_refused", billing: "key_refused", free_tier: "free_tier" };

export function ErrorsView({ report, alerts, settings, period, range, names }: { report: ErrorReport; alerts: FailureAlert[]; settings: SiteSettings; period: number | null; range: { from: string; to: string }; names: Record<string, string> }) {
  const L = useBi();
  const toolLabel = useToolLabel();
  const rate = pct(report.failed, report.total);
  return (
    <div>
      <AdminPageHeader
        title={L({ ko: "오류 분석", en: "Failures" })}
        lead={L({ ko: "실패한 실행을 원인별로 묶었어요. 회원 쪽 원인(키·결제)은 바로 안내를 보낼 수 있어요.", en: "Failed runs grouped by cause. For member-side causes (key, billing) you can send a notice right here." })}
        actions={
          <nav className="flex rounded-xl border border-hairline bg-surface p-1" aria-label={L({ ko: "기간", en: "Period" })}>
            {[1, 7, 30, 90].map((d) => (
              <Link key={d} href={`/admin/errors?days=${d}`} aria-current={period === d ? "page" : undefined} className={cn("rounded-lg px-3.5 py-1.5 text-sm font-semibold", period === d ? "bg-[#3b6fe3] text-white" : "text-fg-muted hover:text-fg")}>
                {d === 1 ? L({ ko: "24시간", en: "24h" }) : L({ ko: `${d}일`, en: `${d}d` })}
              </Link>
            ))}
          </nav>
        }
      />
      <AlertsBar alerts={alerts} settings={settings} />
      <Card className="mb-5" bodyClassName="p-4">
        <form action="/admin/errors" className="flex flex-wrap items-end gap-3">
          <DateRange from={range.from} to={range.to} label={L({ ko: "기간 직접 선택", en: "Custom dates" })} />
          <button type="submit" className={btnPrimary}>
            {L({ ko: "적용", en: "Apply" })}
          </button>
        </form>
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={L({ ko: "실행", en: "Runs" })} value={num(report.total)} icon={PlayCircle} tone="brand" />
        <StatCard label={L({ ko: "실패", en: "Failed" })} value={num(report.failed)} icon={AlertTriangle} tone="campaign" alert={rate >= 20} note={L({ ko: `실패율 ${rate}%`, en: `${rate}% failure rate` })} />
        <StatCard label={L({ ko: "회원 쪽 원인", en: "Member-side causes" })} value={num(report.byClass.filter((c) => ERROR_CLASS[c.cls].memberCause).reduce((a, c) => a + c.count, 0))} icon={BellRing} tone="operate" note={L({ ko: "키·결제·한도", en: "Key, billing, quota" })} />
        <StatCard label={L({ ko: "서비스 쪽 원인", en: "Service-side causes" })} value={num(report.byClass.filter((c) => !ERROR_CLASS[c.cls].memberCause).reduce((a, c) => a + c.count, 0))} icon={Wrench} tone="discover" note={L({ ko: "과부하·시간초과·생성 실패", en: "Overload, timeout, output" })} />
      </div>

      {report.days.length > 1 ? (
        <Card className="mt-5" title={L({ ko: "하루 단위 추이", en: "Per day" })}>
          <TrendChart
            ariaLabel={L({ ko: "하루 단위 실행과 실패", en: "Runs and failures per day" })}
            days={report.days.map((d) => d.day.slice(5).replace("-", "."))}
            series={[
              { label: L({ ko: "실행", en: "Runs" }), values: report.days.map((d) => d.runs), tone: "brand" },
              { label: L({ ko: "실패", en: "Failed" }), values: report.days.map((d) => d.failed), tone: "campaign" },
            ]}
          />
        </Card>
      ) : null}

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {report.byClass.length === 0 ? (
          <Card>
            <p className="text-sm text-fg-muted">{L({ ko: "이 기간에는 실패가 없어요. 🎉", en: "No failures in this period. 🎉" })}</p>
          </Card>
        ) : (
          report.byClass.map((c) => (
            <Card key={c.cls}>
              <div className="flex items-center justify-between gap-2">
                <Pill tone={CLASS_TONE[c.cls]}>{L(ERROR_CLASS[c.cls].label)}</Pill>
                <span className="font-display text-2xl font-bold tabular-nums">{num(c.count)}</span>
              </div>
              <p className="mt-3 text-sm text-fg-muted break-keep">{L(ERROR_CLASS[c.cls].fix)}</p>
              <p className="mt-3 text-xs text-fg-subtle">
                {L({ ko: `회원 ${c.members}명`, en: `${c.members} member(s)` })}
                {c.tools.length ? ` · ${c.tools.map(toolLabel).join(", ")}` : ""}
              </p>
            </Card>
          ))
        )}
      </div>

      <Card className="mt-5" title={L({ ko: "최근 실패", en: "Recent failures" })} lead={L({ ko: "최근 40건", en: "Last 40" })} bodyClassName="p-0">
        {report.recent.length === 0 ? (
          <p className="p-5 text-sm text-fg-muted">{L({ ko: "실패 기록이 없어요.", en: "No failures." })}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-xs font-semibold tracking-wide text-fg-subtle uppercase">
                  <th className="px-5 py-3">{L({ ko: "원인", en: "Cause" })}</th>
                  <th className="px-3 py-3">{L({ ko: "회원", en: "Member" })}</th>
                  <th className="px-3 py-3">{L({ ko: "도구", en: "Tool" })}</th>
                  <th className="px-3 py-3">{L({ ko: "메시지", en: "Message" })}</th>
                  <th className="px-3 py-3">{L({ ko: "시각", en: "When" })}</th>
                  <th className="px-5 py-3">{L({ ko: "안내", en: "Notice" })}</th>
                </tr>
              </thead>
              <tbody>
                {report.recent.map((r, i) => (
                  <tr key={i} className="border-b border-hairline/70 align-top last:border-0">
                    <td className="px-5 py-3">
                      <Pill tone={CLASS_TONE[r.cls]}>{L(ERROR_CLASS[r.cls].label)}</Pill>
                    </td>
                    <td className="px-3 py-3">
                      <Link href={`/admin/members/${r.userId}`} className="font-semibold hover:underline">
                        {names[r.userId] ?? r.userId.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-2">
                        <span className={cn("size-2 rounded-full", TONE[toolTone(r.toolId)].dot)} aria-hidden />
                        {toolLabel(r.toolId)}
                      </span>
                    </td>
                    <td className="max-w-[340px] px-3 py-3 text-xs text-fg-muted break-keep">{r.error}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-fg-muted tabular-nums">{fmtDateTime(r.createdAt)}</td>
                    <td className="px-5 py-3">{NOTICE_FOR[r.cls] ? <QuickNotice memberId={r.userId} template={NOTICE_FOR[r.cls]!} /> : <span className="text-xs text-fg-subtle">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Announcements and patch notes ──────────────────────────────────────

const toKstInput = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() + 9 * 3600 * 1000).toISOString().slice(0, 16) : "");

function AnnouncementForm({ editing, onDone }: { editing: Announcement | null; onDone: () => void }) {
  const L = useBi();
  const [state, action, pending] = useActionState<AdminActionState, FormData>(async (prev, fd) => {
    const r = await saveAnnouncement(prev, fd);
    if (r?.ok) onDone();
    return r;
  }, null);
  const [kind, setKind] = useState<"banner" | "patch">(editing?.kind ?? "banner");
  return (
    <form action={action} className="grid gap-3 md:grid-cols-2" key={editing?.id ?? "new"}>
      {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
      <div className="flex gap-2 md:col-span-2">
        {(["banner", "patch"] as const).map((k) => (
          <label key={k} className={cn("cursor-pointer rounded-xl border px-4 py-2 text-sm font-semibold", kind === k ? "border-[#3b6fe3] bg-[#3b6fe3] text-white" : "border-hairline")}>
            <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} className="sr-only" />
            {k === "banner" ? L({ ko: "📢 상단 배너 공지", en: "📢 Top banner" }) : L({ ko: "✨ 패치노트 (새로운 점)", en: "✨ Patch note (What's new)" })}
          </label>
        ))}
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-fg-muted">{L({ ko: "제목 (한국어, 필수)", en: "Title (Korean, required)" })}</span>
        <input name="title_ko" required defaultValue={editing?.title.ko ?? ""} maxLength={160} className={field} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-fg-muted">{L({ ko: "제목 (영어, 선택)", en: "Title (English, optional)" })}</span>
        <input name="title_en" defaultValue={editing && editing.title.en !== editing.title.ko ? editing.title.en : ""} maxLength={160} className={field} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-fg-muted">{L({ ko: "내용 (한국어)", en: "Body (Korean)" })}</span>
        <textarea name="body_ko" rows={4} defaultValue={editing?.body.ko ?? ""} maxLength={3000} className={cn(field, "h-auto py-2.5")} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-fg-muted">{L({ ko: "내용 (영어, 선택)", en: "Body (English, optional)" })}</span>
        <textarea name="body_en" rows={4} defaultValue={editing && editing.body.en !== editing.body.ko ? editing.body.en : ""} maxLength={3000} className={cn(field, "h-auto py-2.5")} />
      </label>
      {kind === "banner" ? (
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-fg-muted">{L({ ko: "색", en: "Style" })}</span>
          <select name="level" defaultValue={editing?.level ?? "info"} className={field}>
            <option value="info">{L({ ko: "파랑 · 안내", en: "Blue · info" })}</option>
            <option value="warning">{L({ ko: "노랑 · 주의", en: "Yellow · warning" })}</option>
            <option value="success">{L({ ko: "초록 · 좋은 소식", en: "Green · good news" })}</option>
          </select>
        </label>
      ) : (
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-fg-muted">{L({ ko: "버전 (선택, 예: 2.14.0)", en: "Version (optional, e.g. 2.14.0)" })}</span>
          <input name="version" defaultValue={editing?.version ?? ""} maxLength={20} className={cn(field, "font-mono")} />
        </label>
      )}
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-fg-muted">{L({ ko: "연결할 화면 (선택, 예: /tools)", en: "Link (optional, e.g. /tools)" })}</span>
        <input name="link" defaultValue={editing?.link ?? ""} className={cn(field, "font-mono")} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-fg-muted">{L({ ko: "시작 (선택, 한국 시간)", en: "Starts (optional, Korea time)" })}</span>
        <input type="datetime-local" name="starts_at" defaultValue={toKstInput(editing?.startsAt ?? null)} className={field} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-fg-muted">{L({ ko: "끝 (선택, 한국 시간)", en: "Ends (optional, Korea time)" })}</span>
        <input type="datetime-local" name="ends_at" defaultValue={toKstInput(editing?.endsAt ?? null)} className={field} />
      </label>
      <label className="flex items-center gap-2 text-sm font-semibold md:col-span-2">
        <input type="checkbox" name="published" defaultChecked={editing?.published ?? false} className="size-4" />
        {L({ ko: "바로 게시 (끄면 초안으로 저장)", en: "Publish now (off = save as draft)" })}
      </label>
      <div className="flex items-center gap-3 md:col-span-2">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {editing ? L({ ko: "저장", en: "Save" }) : L({ ko: "만들기", en: "Create" })}
        </button>
        {editing ? (
          <button type="button" onClick={onDone} className={btnGhost}>
            {L({ ko: "취소", en: "Cancel" })}
          </button>
        ) : null}
        <ActionNote state={state} />
      </div>
    </form>
  );
}

function AnnouncementRow({ a, onEdit }: { a: Announcement; onEdit: () => void }) {
  const L = useBi();
  const [state, action, pending] = useActionState<AdminActionState, FormData>(changeAnnouncement, null);
  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <span className="text-lg" aria-hidden>
        {a.kind === "banner" ? "📢" : "✨"}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">
          {a.version ? <span className="mr-1.5 font-mono text-xs text-fg-subtle">v{a.version}</span> : null}
          {L(a.title)}
        </span>
        <span className="block text-xs text-fg-subtle">
          {fmtDateTime(a.createdAt)}
          {a.startsAt || a.endsAt ? ` · ${a.startsAt ? fmtDate(a.startsAt) : "…"} ~ ${a.endsAt ? fmtDate(a.endsAt) : "…"}` : ""}
        </span>
      </span>
      {a.status === "ended" ? <Pill tone="gray">{L({ ko: "기간 끝남", en: "Ended" })}</Pill> : a.status === "scheduled" ? <Pill tone="blue">{L({ ko: "예약됨", en: "Scheduled" })}</Pill> : a.status === "live" ? <Pill tone="green">{L({ ko: "게시 중", en: "Live" })}</Pill> : <Pill tone="amber">{L({ ko: "초안", en: "Draft" })}</Pill>}
      <form action={action} className="flex items-center gap-1.5">
        <input type="hidden" name="id" value={a.id} />
        <button type="button" onClick={onEdit} className="rounded-lg border border-hairline px-2.5 py-1 text-xs font-semibold hover:bg-surface-2">
          {L({ ko: "수정", en: "Edit" })}
        </button>
        <button type="submit" name="op" value={a.published ? "unpublish" : "publish"} disabled={pending} className="rounded-lg border border-hairline px-2.5 py-1 text-xs font-semibold hover:bg-surface-2">
          {a.published ? L({ ko: "내리기", en: "Unpublish" }) : L({ ko: "게시", en: "Publish" })}
        </button>
        <button
          type="submit"
          name="op"
          value="delete"
          disabled={pending}
          onClick={(e) => {
            if (!window.confirm(L({ ko: "삭제할까요? 되돌릴 수 없어요.", en: "Delete? This can't be undone." }))) e.preventDefault();
          }}
          className="rounded-lg border border-danger/40 px-2.5 py-1 text-xs font-semibold text-danger hover:bg-danger/10"
        >
          {L({ ko: "삭제", en: "Delete" })}
        </button>
      </form>
      {state && !state.ok ? (
        <span className="w-full">
          <ActionNote state={state} />
        </span>
      ) : null}
    </li>
  );
}

export function AnnouncementsView({ items }: { items: Announcement[] }) {
  const L = useBi();
  const [editing, setEditing] = useState<Announcement | null>(null);
  return (
    <div>
      <AdminPageHeader
        title={L({ ko: "공지·패치노트", en: "Announcements" })}
        lead={L({ ko: "상단 배너는 모든 회원 화면 맨 위에, 패치노트는 [도움말 → 새로운 점]에 보여요. 배포 없이 바로 바뀌어요.", en: "Banners show at the top of every member page; patch notes on Help → What's new. No deploy needed." })}
      />
      <Card title={editing ? L({ ko: "수정하기", en: "Edit" }) : L({ ko: "새로 쓰기", en: "Write new" })} className="mb-5">
        <AnnouncementForm editing={editing} onDone={() => setEditing(null)} />
      </Card>
      <Card title={L({ ko: "전체 목록", en: "All" })} bodyClassName="px-5 py-1">
        {items.length === 0 ? (
          <p className="py-4 text-sm text-fg-muted">{L({ ko: "아직 없어요. 위에서 첫 공지를 써 보세요.", en: "Nothing yet. Write the first one above." })}</p>
        ) : (
          <ul className="divide-y divide-hairline">
            {items.map((a) => (
              <AnnouncementRow key={a.id} a={a} onEdit={() => setEditing(a)} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

// ── Maintenance mode and paused tools ──────────────────────────────────

function MaintenanceCard({ settings }: { settings: SiteSettings }) {
  const L = useBi();
  const [state, action, pending] = useActionState<AdminActionState, FormData>(setMaintenance, null);
  const on = settings.maintenance.on;
  return (
    <Card title={L({ ko: "점검 모드", en: "Maintenance mode" })} lead={L({ ko: "켜면 회원은 모든 도구 실행이 막히고 안내 문구를 봐요. 결과물 보기는 그대로예요. 관리자는 계속 실행할 수 있어요.", en: "When on, members can't run any tool and see your message. Results stay viewable. Staff can still run tools." })}>
      <form action={action} className="flex flex-col gap-3">
        <input type="hidden" name="on" value={on ? "0" : "1"} />
        <div className={cn("flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold", on ? "bg-danger/10 text-danger" : "bg-studio-success/10 text-studio-success")}>
          <Power className="size-5" aria-hidden />
          {on ? L({ ko: "지금 점검 중이에요", en: "Maintenance is ON" }) : L({ ko: "정상 운영 중", en: "Running normally" })}
        </div>
        <textarea name="message" rows={2} maxLength={300} defaultValue={settings.maintenance.message} placeholder={L(MAINTENANCE_DEFAULT)} className={cn(field, "h-auto py-2.5")} aria-label={L({ ko: "회원에게 보일 문구", en: "Message members see" })} />
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            onClick={(e) => {
              if (!on && !window.confirm(L({ ko: "점검 모드를 켤까요? 모든 회원의 도구 실행이 막혀요.", en: "Turn on maintenance? All members' runs will be blocked." }))) e.preventDefault();
            }}
            className={on ? btnPrimary : cn(btnPrimary, "bg-danger hover:bg-danger/90")}
          >
            {on ? L({ ko: "점검 끝내기", en: "End maintenance" }) : L({ ko: "점검 모드 켜기", en: "Turn on maintenance" })}
          </button>
          <ActionNote state={state} />
        </div>
      </form>
    </Card>
  );
}

function ToolPauseRow({ slug, paused }: { slug: string; paused: { message: string; at: string } | undefined }) {
  const L = useBi();
  const [state, action, pending] = useActionState<AdminActionState, FormData>(setToolPaused, null);
  const t = catalogTool(slug)!;
  const Icon = t.icon;
  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", TONE[t.category].tile)}>
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{L(t.name)}</span>
        {paused ? <span className="block text-xs text-danger">{L({ ko: `중지됨 · ${fmtDateTime(paused.at)}`, en: `Paused · ${fmtDateTime(paused.at)}` })}{paused.message ? ` · ${paused.message}` : ""}</span> : null}
      </span>
      <form action={action} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="pause" value={paused ? "0" : "1"} />
        {!paused ? <input name="message" maxLength={300} placeholder={L(PAUSED_DEFAULT)} className={cn(field, "h-9 w-64 text-xs")} aria-label={L({ ko: "중지 안내 문구 (선택)", en: "Pause message (optional)" })} /> : null}
        <button type="submit" disabled={pending} className={cn("inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold", paused ? "bg-studio-success/15 text-studio-success hover:bg-studio-success/25" : "border border-danger/40 text-danger hover:bg-danger/10")}>
          {paused ? <PlayCircle className="size-4" aria-hidden /> : <PauseCircle className="size-4" aria-hidden />}
          {paused ? L({ ko: "다시 열기", en: "Reopen" }) : L({ ko: "중지", en: "Pause" })}
        </button>
      </form>
      {state && !state.ok ? (
        <span className="w-full">
          <ActionNote state={state} />
        </span>
      ) : null}
    </li>
  );
}

export function SettingsView({ settings }: { settings: SiteSettings }) {
  const L = useBi();
  const tools = publicTools();
  const pausedCount = Object.keys(settings.pausedTools).length;
  return (
    <div>
      <AdminPageHeader title={L({ ko: "운영 설정", en: "Operations" })} lead={L({ ko: "배포 없이 바로 바뀌어요. 바꾼 내용은 15초 안에 모든 서버에 적용되고 감사 로그에 남아요.", en: "Changes apply without a deploy, reach every server within 15 seconds, and go to the audit log." })} />
      <div className="grid gap-5 xl:grid-cols-[1fr_1.4fr]">
        <MaintenanceCard settings={settings} />
        <Card title={L({ ko: "도구 일시 중지", en: "Pause a tool" })} lead={pausedCount ? L({ ko: `지금 ${pausedCount}개 중지됨`, en: `${pausedCount} paused now` }) : L({ ko: "문제가 생긴 도구만 잠시 막아요. 실행 화면에 안내가 보여요.", en: "Block just the tool that's misbehaving. Its run page shows a notice." })} bodyClassName="px-5 py-1">
          <ul className="divide-y divide-hairline">
            {[...tools].sort((a, b) => Number(!!settings.pausedTools[b.slug]) - Number(!!settings.pausedTools[a.slug])).map((t) => (
              <ToolPauseRow key={t.slug} slug={t.slug} paused={settings.pausedTools[t.slug]} />
            ))}
          </ul>
        </Card>
      </div>
      <p className="mt-4 flex items-center gap-2 text-xs text-fg-subtle">
        <Megaphone className="size-3.5" aria-hidden />
        {L({ ko: "점검 사실을 미리 알리려면 [공지·패치노트]에서 배너를 예약하세요.", en: "To warn members ahead of time, schedule a banner in Announcements." })}
      </p>
    </div>
  );
}
