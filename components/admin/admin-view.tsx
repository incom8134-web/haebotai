"use client";

import { useActionState } from "react";
import Link from "next/link";
import { replyToTicket, approveStudentVerification, rejectStudentVerification, type AdminActionState } from "@/lib/actions/admin";
import { useBi } from "@/lib/i18n/context";
import type { AdminTicket, AdminStudentRequest } from "@/lib/admin";
import { PageHeader, primaryButton, secondaryButton, textareaClass } from "@/components/site/page";
import { cn } from "@/lib/utils";

// /admin/tickets and /admin/students — staff-only queues (gated in
// app/(app)/admin/layout.tsx). Data is fetched server-side in each
// page.tsx; these are the interactive rows.

const MSG: Record<string, { ko: string; en: string }> = {
  replied: { ko: "답변을 보냈어요.", en: "Reply sent." },
  approved: { ko: "학생 인증을 승인했어요.", en: "Approved." },
  rejected: { ko: "요청을 거절했어요.", en: "Rejected." },
  not_admin: { ko: "관리자 권한이 없어요.", en: "Not authorized." },
  missing_ticket: { ko: "문의를 찾을 수 없어요.", en: "Ticket not found." },
  missing_request: { ko: "요청을 찾을 수 없어요.", en: "Request not found." },
  reply_length: { ko: "답변은 1~4000자여야 해요.", en: "Reply must be 1-4000 characters." },
  bad_status: { ko: "잘못된 상태예요.", en: "Invalid status." },
};

const KIND_LABEL: Record<string, { ko: string; en: string }> = {
  question: { ko: "질문", en: "Question" },
  bug: { ko: "버그", en: "Bug" },
  billing: { ko: "결제", en: "Billing" },
  feature: { ko: "기능 제안", en: "Feature" },
  remote: { ko: "원격 도움", en: "Remote help" },
};

const STATUS_LABEL: Record<string, { ko: string; en: string }> = {
  open: { ko: "대기", en: "Open" },
  answered: { ko: "답변완료", en: "Answered" },
  closed: { ko: "종료", en: "Closed" },
};

function TicketRow({ ticket }: { ticket: AdminTicket }) {
  const L = useBi();
  const [state, action, pending] = useActionState<AdminActionState, FormData>(replyToTicket, null);

  return (
    <div className="glass rounded-[20px] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-surface-2/60 px-2.5 py-1 text-2xs font-medium">{L(KIND_LABEL[ticket.kind] ?? { ko: ticket.kind, en: ticket.kind })}</span>
        <span className="text-2xs text-fg-subtle">{L(STATUS_LABEL[ticket.status])}</span>
        <span className="ml-auto font-mono text-2xs text-fg-subtle">{new Date(ticket.createdAt).toLocaleString()}</span>
      </div>
      <p className="mt-2 font-semibold">{ticket.subject}</p>
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

      <form action={action} className="mt-3 flex flex-col gap-2 border-t border-hairline pt-3">
        <input type="hidden" name="ticketId" value={ticket.id} />
        <textarea name="reply" defaultValue={ticket.reply ?? ""} required className={cn(textareaClass, "min-h-20")} placeholder={L({ ko: "답변 작성", en: "Write a reply" })} />
        <div className="flex gap-2">
          <button type="submit" name="status" value="answered" disabled={pending} className={cn(primaryButton, "h-9 px-4 text-sm")}>
            {L({ ko: "답변 보내기", en: "Send reply" })}
          </button>
          <button type="submit" name="status" value="closed" disabled={pending} className={cn(secondaryButton, "h-9 px-4 text-sm")}>
            {L({ ko: "종료로 표시", en: "Mark closed" })}
          </button>
        </div>
      </form>
      {state ? <p className={cn("mt-2 text-2xs", state.ok ? "text-studio-success" : "text-danger")}>{L(MSG[state.message] ?? { ko: state.message, en: state.message })}</p> : null}
    </div>
  );
}

const TICKET_FILTERS = ["open", "answered", "closed"] as const;

export function TicketQueue({ tickets, status }: { tickets: AdminTicket[]; status: string }) {
  const L = useBi();
  return (
    <div>
      <PageHeader title={L({ ko: "고객 문의", en: "Support tickets" })} lead={L({ ko: "사용자가 보낸 문의에 답변하세요.", en: "Reply to tickets sent by users." })} />
      <div className="mb-5 flex gap-1.5">
        {TICKET_FILTERS.map((f) => (
          <Link
            key={f}
            href={`/admin/tickets?status=${f}`}
            className={cn(
              "rounded-xl px-3.5 py-2 text-xs font-medium transition-colors",
              status === f ? "bg-surface-2 text-fg" : "text-fg-muted hover:text-fg",
            )}
          >
            {L(STATUS_LABEL[f])}
          </Link>
        ))}
      </div>
      {tickets.length === 0 ? (
        <p className="text-sm text-fg-muted">{L({ ko: "표시할 문의가 없어요.", en: "No tickets here." })}</p>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <TicketRow key={t.id} ticket={t} />
          ))}
        </div>
      )}
    </div>
  );
}

function StudentRow({ request }: { request: AdminStudentRequest }) {
  const L = useBi();
  const [approveState, approveAction, approving] = useActionState<AdminActionState, FormData>(approveStudentVerification, null);
  const [rejectState, rejectAction, rejecting] = useActionState<AdminActionState, FormData>(rejectStudentVerification, null);
  const shown = approveState ?? rejectState;

  return (
    <div className="glass rounded-[20px] p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold">{request.schoolName}</p>
        <span className="font-mono text-2xs text-fg-subtle">{new Date(request.createdAt).toLocaleString()}</span>
      </div>
      {request.schoolEmail ? <p className="mt-1 text-sm text-fg-muted">{request.schoolEmail}</p> : null}
      {request.note ? <p className="mt-1 text-sm text-fg-subtle">{request.note}</p> : null}

      <div className="mt-3 flex gap-2 border-t border-hairline pt-3">
        <form action={approveAction}>
          <input type="hidden" name="requestId" value={request.id} />
          <input type="hidden" name="userId" value={request.userId} />
          <button type="submit" disabled={approving || rejecting} className={cn(primaryButton, "h-9 px-4 text-sm")}>
            {L({ ko: "승인 (1년)", en: "Approve (1 year)" })}
          </button>
        </form>
        <form action={rejectAction}>
          <input type="hidden" name="requestId" value={request.id} />
          <button type="submit" disabled={approving || rejecting} className={cn(secondaryButton, "h-9 px-4 text-sm text-danger")}>
            {L({ ko: "거절", en: "Reject" })}
          </button>
        </form>
      </div>
      {shown ? <p className={cn("mt-2 text-2xs", shown.ok ? "text-studio-success" : "text-danger")}>{L(MSG[shown.message] ?? { ko: shown.message, en: shown.message })}</p> : null}
    </div>
  );
}

export function StudentQueue({ requests }: { requests: AdminStudentRequest[] }) {
  const L = useBi();
  return (
    <div>
      <PageHeader title={L({ ko: "학생 인증", en: "Student verification" })} lead={L({ ko: "대기 중인 요청을 검토하세요.", en: "Review pending requests." })} />
      {requests.length === 0 ? (
        <p className="text-sm text-fg-muted">{L({ ko: "대기 중인 요청이 없어요.", en: "No pending requests." })}</p>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <StudentRow key={r.id} request={r} />
          ))}
        </div>
      )}
    </div>
  );
}
