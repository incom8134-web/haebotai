"use client";

import { CalendarDays } from "lucide-react";
import { useBi } from "@/lib/i18n/context";
import type { AdminActionState } from "@/lib/actions/admin";
import { NAME_MAX } from "@/lib/member-name";
import { cn } from "@/lib/utils";

// Shared bits for the /admin views (admin-view.tsx, ops-view.tsx).

type Bi = { ko: string; en: string };

// Korea time, formatted by hand: Intl output differs between Node and
// browsers ("AM" vs "오전"), which breaks hydration.
export const kst = (iso: string) => new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000);
export const pad = (n: number) => String(n).padStart(2, "0");
export const fmtDate = (iso: string | null) => {
  if (!iso) return "—";
  const d = kst(iso);
  return `${d.getUTCFullYear()}.${pad(d.getUTCMonth() + 1)}.${pad(d.getUTCDate())}`;
};
export const fmtDateTime = (iso: string | null) => {
  if (!iso) return "—";
  const d = kst(iso);
  return `${String(d.getUTCFullYear()).slice(2)}.${pad(d.getUTCMonth() + 1)}.${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
};
export const num = (n: number) => n.toLocaleString("ko-KR");
export const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

export const btn = "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors disabled:opacity-50";
export const btnPrimary = cn(btn, "bg-[#3b6fe3] text-white hover:bg-[#2f5fd0]");
export const btnGhost = cn(btn, "border border-hairline bg-surface text-fg hover:bg-surface-2");
export const btnDanger = cn(btn, "bg-danger text-white hover:opacity-90");
export const field = "h-10 w-full rounded-xl border border-hairline bg-surface px-3 text-sm outline-none focus:border-accent";

// ── Messages from the server actions ──────────────────────────────────

export const MSG: Record<string, Bi> = {
  replied: { ko: "답변을 보냈어요. 회원 화면에 바로 보여요.", en: "Reply sent. The member sees it right away." },
  closed: { ko: "종료로 표시했어요.", en: "Marked closed." },
  reopened: { ko: "다시 대기로 옮겼어요.", en: "Moved back to open." },
  not_admin: { ko: "관리자 권한이 없어요.", en: "Not authorized." },
  missing_ticket: { ko: "문의를 찾을 수 없어요.", en: "Ticket not found." },
  reply_length: { ko: "답변은 1~4000자로 적어 주세요.", en: "Replies must be 1–4000 characters." },
  bad_status: { ko: "잘못된 상태예요.", en: "Invalid status." },
  save_failed: { ko: "저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.", en: "Couldn't save. Try again shortly." },
  member_created: { ko: "회원을 추가했어요. 같은 이메일로 구글·카카오 로그인하면 이 계정으로 들어와요.", en: "Member added. Signing in with Google or Kakao on the same email lands in this account." },
  member_saved: { ko: "저장했어요.", en: "Saved." },
  member_suspended: { ko: "이용을 정지했어요. 다시 로그인할 수 없어요.", en: "Suspended. They can't sign in." },
  member_restored: { ko: "정지를 풀었어요.", en: "Restored." },
  missing_member: { ko: "회원을 찾을 수 없어요.", en: "Member not found." },
  bad_email: { ko: "이메일 주소를 확인해 주세요.", en: "Check the email address." },
  bad_name: { ko: `이름을 1~${NAME_MAX}자로 적어 주세요.`, en: `Name must be 1–${NAME_MAX} characters.` },
  email_taken: { ko: "이미 가입된 이메일이에요.", en: "That email already has an account." },
  note_length: { ko: "메모는 2000자까지예요.", en: "Notes are up to 2000 characters." },
  staff_protected: { ko: "관리자 계정은 여기서 정지·삭제할 수 없어요.", en: "Staff accounts can't be suspended or deleted here." },
  confirm_mismatch: { ko: "확인용 이메일이 일치하지 않아요.", en: "The confirmation email doesn't match." },
  notice_sent: { ko: "안내를 보냈어요. 회원이 앱을 열면 맨 위에 보여요.", en: "Sent. It shows at the top of their app." },
  notice_empty: { ko: "제목을 적어 주세요.", en: "Add a title." },
  ops_not_ready: { ko: "저장하지 못했어요. 데이터베이스 마이그레이션 0020이 적용됐는지 확인해 주세요.", en: "Couldn't save. Check that database migration 0020 is applied." },
  announcement_title: { ko: "한국어 제목을 적어 주세요.", en: "Add a Korean title." },
  announcement_created: { ko: "만들었어요.", en: "Created." },
  announcement_saved: { ko: "저장했어요.", en: "Saved." },
  announcement_publish: { ko: "게시했어요.", en: "Published." },
  announcement_unpublish: { ko: "내렸어요.", en: "Unpublished." },
  announcement_delete: { ko: "삭제했어요.", en: "Deleted." },
  maintenance_on: { ko: "점검 모드를 켰어요. 15초 안에 모든 서버에 적용돼요.", en: "Maintenance on. Every server picks it up within 15 seconds." },
  maintenance_off: { ko: "점검 모드를 껐어요.", en: "Maintenance off." },
  tool_paused: { ko: "도구를 중지했어요.", en: "Tool paused." },
  tool_resumed: { ko: "도구를 다시 열었어요.", en: "Tool reopened." },
  no_key: { ko: "이 순위에 등록된 키가 없어요.", en: "No key in that slot." },
  refunded: { ko: "환불했어요. 크레딧과 늘어난 기간도 회수했어요.", en: "Refunded. Its credits and added days were taken back." },
  refund_changed: { ko: "그 사이 회원이 크레딧을 써서 환불 금액이 바뀌었어요. 새 금액을 확인하고 다시 눌러 주세요.", en: "The member used credits since, so the amount changed. Check the new amount and try again." },
  refund_window_passed: { ko: "결제 후 7일이 지나 환불할 수 없어요.", en: "More than 7 days since payment; not refundable." },
  refund_fully_used: { ko: "이 결제의 크레딧을 모두 써서 환불할 금액이 없어요.", en: "All of this payment's credits are used; nothing to refund." },
  refund_bad_input: { ko: "결제 정보가 올바르지 않아 금액을 계산하지 못했어요.", en: "Couldn't work out the amount from this payment's data." },
  refund_unknown_order: { ko: "결제를 찾을 수 없어요. 데이터베이스 마이그레이션 0023이 적용됐는지 확인해 주세요.", en: "Payment not found. Check that database migration 0023 is applied." },
  refund_not_refundable: { ko: "결제 완료 상태인 결제만 환불할 수 있어요.", en: "Only completed payments can be refunded." },
  refund_no_payment_key: { ko: "토스 결제키가 없어 취소할 수 없어요. 토스 대시보드에서 처리해 주세요.", en: "No Toss payment key; cancel it in the Toss dashboard." },
  refund_toss_failed: { ko: "토스에서 취소하지 못했어요. 아무것도 바뀌지 않았어요. 감사 로그에서 사유를 확인해 주세요.", en: "Toss refused the cancel; nothing changed. See the audit log for the reason." },
  refund_ledger_failed: { ko: "토스 환불은 됐지만 크레딧·기간 회수에 실패했어요. 다시 누르면 회수만 다시 시도해요(중복 환불 없음).", en: "Toss refunded, but taking back credits and days failed. Pressing again retries only that (no double refund)." },
  tier_unknown: { ko: "Google이 응답하지 않아 확인하지 못했어요. 잠시 뒤 다시 눌러 주세요.", en: "Google didn't answer. Try again shortly." },
};

export function ActionNote({ state }: { state: AdminActionState }) {
  const L = useBi();
  if (!state) return null;
  return (
    <p role="status" className={cn("text-sm", state.ok ? "text-studio-success" : "text-danger")}>
      {L(MSG[state.message] ?? { ko: state.message, en: state.message })}
    </p>
  );
}

/** Calendar filter: two date pickers (Korea-time days, inclusive). */
export function DateRange({ from, to, label }: { from: string; to: string; label: string }) {
  const L = useBi();
  return (
    <fieldset className="flex flex-wrap items-end gap-2">
      <legend className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-fg-muted">
        <CalendarDays className="size-3.5" aria-hidden />
        {label}
      </legend>
      <input type="date" name="from" defaultValue={from} max={to || undefined} aria-label={L({ ko: `${label} 시작일`, en: `${label} from` })} className={cn(field, "w-[160px]")} />
      <span className="pb-2.5 text-fg-subtle">~</span>
      <input type="date" name="to" defaultValue={to} min={from || undefined} aria-label={L({ ko: `${label} 종료일`, en: `${label} to` })} className={cn(field, "w-[160px]")} />
    </fieldset>
  );
}

