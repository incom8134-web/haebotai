// Pure logic behind the /admin operations pages — tested in
// lib/admin-ops.test.ts. Server reads and writes are in
// lib/admin-ops-server.ts.

import { normalizeHostEntry } from "./platform-access.ts";
import { SAAS } from "./site/access.ts";

type Bi = { ko: string; en: string };

// ── Failure reasons ────────────────────────────────────────────────────

export type ErrorClass = "key_refused" | "billing" | "free_tier" | "quota" | "overloaded" | "guard" | "output" | "timeout" | "other";

/**
 * What went wrong in a failed run, from its stored error text. The texts
 * are the friendly messages lib/ai/provider-errors.ts writes, plus raw
 * provider errors that slipped through. Order matters: the first match wins.
 */
export function classifyError(message: string | null | undefined): ErrorClass {
  const m = (message ?? "").toLowerCase();
  if (!m) return "other";
  if (/dunning|billing|결제가|결제를 확인|청구/.test(m)) return "billing";
  if (/무료 gemini 키|free[_ ]tier|무료 키/.test(m)) return "free_tier";
  if (/api 키가 거부|api key not valid|api_key_invalid|permission_denied|unauthenticated|401|403/.test(m)) return "key_refused";
  if (/한도를 초과|quota|resource_exhausted|rate limit|429|요청이 너무 잦/.test(m)) return "quota";
  if (/요청이 많아|overloaded|unavailable|503|529|과부하/.test(m)) return "overloaded";
  if (/시간이 초과|timeout|timed out|deadline/.test(m)) return "timeout";
  if (/생성할 수 없습니다|\[입력 필요\]|safety|blocked|차단/.test(m)) return "guard";
  if (/만들지 못했|parse|json|형식/.test(m)) return "output";
  return "other";
}

const OWN_KEY_ERROR_CLASS: Record<ErrorClass, { label: Bi; fix: Bi; memberCause: boolean }> = {
  key_refused: { label: { ko: "API 키 거부", en: "API key refused" }, fix: { ko: "회원 키가 삭제·비활성화됐어요. 회원에게 새 키 등록을 안내하세요.", en: "The member's key was deleted or disabled. Ask them to add a new one." }, memberCause: true },
  billing: { label: { ko: "결제 막힘", en: "Billing blocked" }, fix: { ko: "회원의 Google Cloud 결제가 막혔어요. 결제 수단 확인을 안내하세요.", en: "The member's Google Cloud billing is blocked. Ask them to check their payment method." }, memberCause: true },
  free_tier: { label: { ko: "무료 키 제한", en: "Free-key limit" }, fix: { ko: "무료 키로는 안 되는 기능(이미지 등)이에요. 결제를 켠 키를 안내하세요.", en: "Not available on a free key (e.g. images). Suggest a billing-enabled key." }, memberCause: true },
  quota: { label: { ko: "사용 한도 초과", en: "Quota exceeded" }, fix: { ko: "회원 키의 한도가 찼어요. 잠시 뒤 다시 하거나 2순위 키를 등록하게 하세요.", en: "The member's key hit its quota. Retry later or add a second key." }, memberCause: true },
  overloaded: { label: { ko: "Google 과부하", en: "Google overloaded" }, fix: { ko: "Google 쪽 일시 장애예요. 몰리면 해당 도구 일시 중지를 고려하세요.", en: "A temporary Google outage. If it piles up, consider pausing the tool." }, memberCause: false },
  timeout: { label: { ko: "시간 초과", en: "Timed out" }, fix: { ko: "응답이 너무 오래 걸렸어요. 같은 도구에서 반복되면 점검이 필요해요.", en: "The answer took too long. If it repeats on one tool, look into it." }, memberCause: false },
  guard: { label: { ko: "안전장치 차단", en: "Blocked by a safeguard" }, fix: { ko: "지어낸 연락처·가격 등을 막은 정상 동작이에요. 입력 안내를 보강하면 줄어요.", en: "Working as intended (invented phone numbers, prices…). Clearer input hints reduce it." }, memberCause: false },
  output: { label: { ko: "결과 생성 실패", en: "Output failed" }, fix: { ko: "AI 결과를 정리하지 못했어요. 같은 도구에서 반복되면 개발 확인이 필요해요.", en: "The AI's answer couldn't be used. If it repeats on one tool, needs a developer look." }, memberCause: false },
  other: { label: { ko: "기타", en: "Other" }, fix: { ko: "분류되지 않은 오류예요. 메시지를 보고 판단하세요.", en: "Unclassified. Read the message." }, memberCause: false },
};

// SaaS mode: runs use the company's Gemini key (GOOGLE_GENAI_API_KEY in Vercel), so key, billing and quota failures are ours to fix.
export const ERROR_CLASS: Record<ErrorClass, { label: Bi; fix: Bi; memberCause: boolean }> = SAAS
  ? {
      ...OWN_KEY_ERROR_CLASS,
      key_refused: { label: { ko: "회사 API 키 거부", en: "Company API key refused" }, fix: { ko: "Vercel의 GOOGLE_GENAI_API_KEY가 거부됐어요. Google AI Studio에서 키를 확인하고 Vercel 환경 변수를 바꾼 뒤 다시 배포하세요. 회원 크레딧은 자동 환불됐어요.", en: "GOOGLE_GENAI_API_KEY in Vercel was refused. Check the key in Google AI Studio, update the Vercel env var and redeploy. Members' credits were refunded." }, memberCause: false },
      billing: { label: { ko: "회사 결제 막힘", en: "Company billing blocked" }, fix: { ko: "회사 Google Cloud 결제(선불 잔액)가 막혔어요. 결제 수단과 잔액을 확인하세요.", en: "The company's Google Cloud billing (prepaid balance) is blocked. Check the payment method and balance." }, memberCause: false },
      free_tier: { label: { ko: "무료 등급 제한", en: "Free-tier limit" }, fix: { ko: "회사 키가 무료 등급으로 동작했어요. Google AI Studio에서 결제가 켜져 있는지 확인하세요.", en: "The company key acted as free tier. Check that billing is on in Google AI Studio." }, memberCause: false },
      quota: { label: { ko: "사용 한도 초과", en: "Quota exceeded" }, fix: { ko: "회사 키의 분당·일일 한도가 찼어요. Google Cloud에서 한도 상향을 신청하거나 하루 예산(PLATFORM_DAILY_CREDIT_CAP)을 확인하세요.", en: "The company key hit its rate or daily quota. Request a higher quota in Google Cloud, or check PLATFORM_DAILY_CREDIT_CAP." }, memberCause: false },
    }
  : OWN_KEY_ERROR_CLASS;

export interface FailureAlert {
  level: "warning" | "critical";
  message: Bi;
}

/**
 * Alerts for the dashboard: a high failure rate in the last 24 hours, or
 * a jump over the previous week's daily average. Small numbers are
 * ignored (fewer than 3 failures) so one bad run doesn't cry wolf.
 */
export function failureAlerts(last24h: { runs: number; failed: number }, prev7d: { runs: number; failed: number }): FailureAlert[] {
  const out: FailureAlert[] = [];
  if (last24h.failed < 3) return out;
  const rate = last24h.runs ? last24h.failed / last24h.runs : 0;
  const baseline = prev7d.failed / 7;
  if (rate >= 0.5) out.push({ level: "critical", message: { ko: `최근 24시간 실행의 ${Math.round(rate * 100)}%가 실패했어요 (${last24h.failed}/${last24h.runs}회).`, en: `${Math.round(rate * 100)}% of runs failed in the last 24 hours (${last24h.failed}/${last24h.runs}).` } });
  else if (rate >= 0.2) out.push({ level: "warning", message: { ko: `최근 24시간 실패율이 ${Math.round(rate * 100)}%예요 (${last24h.failed}/${last24h.runs}회).`, en: `Failure rate in the last 24 hours is ${Math.round(rate * 100)}% (${last24h.failed}/${last24h.runs}).` } });
  if (baseline > 0 && last24h.failed >= baseline * 3) out.push({ level: "warning", message: { ko: `실패가 평소(하루 ${baseline.toFixed(1)}회)의 ${Math.round(last24h.failed / baseline)}배로 늘었어요.`, en: `Failures are ${Math.round(last24h.failed / baseline)}× the usual (${baseline.toFixed(1)} a day).` } });
  return out;
}

// ── Activation funnel ──────────────────────────────────────────────────

export type FunnelStep = "signed_up" | "onboarded" | "has_key" | "first_run" | "first_success" | "returned";

export const FUNNEL_STEPS: { id: FunnelStep; label: Bi; hint: Bi }[] = [
  { id: "signed_up", label: { ko: "가입", en: "Signed up" }, hint: { ko: "구글·카카오로 계정을 만든 회원", en: "Created an account with Google or Kakao" } },
  { id: "onboarded", label: { ko: "동의·이름 완료", en: "Consent and name" }, hint: { ko: "필수 동의와 이름 입력까지 마친 회원", en: "Finished the required consents and entered a name" } },
  // SaaS mode measures buying a plan here; own-key mode, adding a key (lib/site/access.ts).
  SAAS
    ? { id: "has_key", label: { ko: "플랜 결제", en: "Bought a plan" }, hint: { ko: "플러스·프로를 한 번 이상 결제했거나 호스트인 회원", en: "Paid for Plus or Pro at least once, or is a host" } }
    : { id: "has_key", label: { ko: "API 키 등록", en: "Added an API key" }, hint: { ko: "내 API 키를 하나 이상 등록한 회원", en: "Saved at least one API key" } },
  { id: "first_run", label: { ko: "첫 실행", en: "First run" }, hint: { ko: "도구를 한 번 이상 실행한 회원", en: "Ran a tool at least once" } },
  { id: "first_success", label: { ko: "첫 결과물", en: "First result" }, hint: { ko: "결과물을 한 번 이상 받은 회원", en: "Got at least one finished result" } },
  { id: "returned", label: { ko: "다시 사용", en: "Came back" }, hint: { ko: "서로 다른 이틀 이상 도구를 쓴 회원", en: "Used tools on two or more different days" } },
];

export interface FunnelMember {
  id: string;
  createdAt: string;
  onboarded: boolean;
  /** Own-key mode: saved a key. SaaS mode: paid for a plan, or is a host. */
  hasKey: boolean;
}

export interface FunnelRun {
  userId: string;
  status: string;
  createdAt: string;
}

export interface FunnelResult {
  steps: { id: FunnelStep; count: number; ofPrevious: number | null; ofFirst: number }[];
  /** Members who reached a step but not the next one — who to help. */
  stuckAt: Record<FunnelStep, string[]>;
}

const kstDay = (iso: string) => new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);

/**
 * Each step counts members who did it, whatever the order (a team member
 * can run tools on the team key without a key of their own), so a step
 * can be larger than the one before. The percentage is of the step before.
 */
export function computeFunnel(members: FunnelMember[], runs: FunnelRun[]): FunnelResult {
  const ran = new Set<string>();
  const ok = new Set<string>();
  const days = new Map<string, Set<string>>();
  for (const r of runs) {
    ran.add(r.userId);
    if (r.status === "done") ok.add(r.userId);
    if (!days.has(r.userId)) days.set(r.userId, new Set());
    days.get(r.userId)!.add(kstDay(r.createdAt));
  }
  const has: Record<FunnelStep, (m: FunnelMember) => boolean> = {
    signed_up: () => true,
    onboarded: (m) => m.onboarded,
    has_key: (m) => m.hasKey,
    first_run: (m) => ran.has(m.id),
    first_success: (m) => ok.has(m.id),
    returned: (m) => (days.get(m.id)?.size ?? 0) >= 2,
  };
  const ids = FUNNEL_STEPS.map((s) => s.id);
  const counts = ids.map((id) => members.filter(has[id]).length);
  const stuckAt = Object.fromEntries(ids.map((id, i) => [id, i + 1 < ids.length ? members.filter((m) => has[id](m) && !has[ids[i + 1]](m)).map((m) => m.id) : []])) as Record<FunnelStep, string[]>;
  return {
    steps: ids.map((id, i) => ({ id, count: counts[i], ofPrevious: i === 0 ? null : counts[i - 1] ? counts[i] / counts[i - 1] : 0, ofFirst: counts[0] ? counts[i] / counts[0] : 0 })),
    stuckAt,
  };
}

// ── Maintenance and paused tools ───────────────────────────────────────

export interface SiteSettings {
  maintenance: { on: boolean; message: string };
  /** Paused tools by catalog slug, each with the message members see. */
  pausedTools: Record<string, { message: string; at: string }>;
  /** Hosts added in /admin/hosts: emails or "@domain" entries that run free on the platform key (lib/platform-access.ts). */
  hostEmails: string[];
  /** When and by whom each host entry was added, for the admin list. */
  hostMeta: Record<string, { addedAt: string; by: string; note: string }>;
}

export const DEFAULT_SETTINGS: SiteSettings = { maintenance: { on: false, message: "" }, pausedTools: {}, hostEmails: [], hostMeta: {} };

/** site_settings rows → settings, ignoring anything malformed. */
export function parseSettings(rows: { key: string; value: unknown }[]): SiteSettings {
  const out: SiteSettings = { maintenance: { ...DEFAULT_SETTINGS.maintenance }, pausedTools: {}, hostEmails: [], hostMeta: {} };
  for (const { key, value } of rows) {
    const v = (value ?? {}) as Record<string, unknown>;
    if (key === "maintenance") out.maintenance = { on: v.on === true, message: typeof v.message === "string" ? v.message.slice(0, 300) : "" };
    if (key === "paused_tools" && v && typeof v === "object") {
      for (const [slug, info] of Object.entries(v)) {
        const i = (info ?? {}) as Record<string, unknown>;
        if (/^[a-z0-9-]{1,60}$/.test(slug)) out.pausedTools[slug] = { message: typeof i.message === "string" ? i.message.slice(0, 300) : "", at: typeof i.at === "string" ? i.at : "" };
      }
    }
    // { "<email or @domain>": { addedAt, by, note } }
    if (key === "host_emails" && v && typeof v === "object" && !Array.isArray(v)) {
      for (const [entry, info] of Object.entries(v)) {
        const clean = normalizeHostEntry(entry);
        if (!clean || out.hostMeta[clean]) continue;
        const i = (info ?? {}) as Record<string, unknown>;
        out.hostEmails.push(clean);
        out.hostMeta[clean] = { addedAt: typeof i.addedAt === "string" ? i.addedAt : "", by: typeof i.by === "string" ? i.by.slice(0, 254) : "", note: typeof i.note === "string" ? i.note.slice(0, 200) : "" };
      }
    }
  }
  return out;
}

export const MAINTENANCE_DEFAULT: Bi = { ko: "서비스 점검 중이에요. 잠시 뒤 다시 실행해 주세요. 만든 결과물은 그대로 볼 수 있어요.", en: "We're doing maintenance. Please run tools again shortly. Your results are still available." };
export const PAUSED_DEFAULT: Bi = { ko: "이 도구는 잠시 쉬고 있어요. 곧 다시 열게요.", en: "This tool is taking a short break. It'll be back soon." };

/** Whether a run of this tool (catalog slug) is blocked, and the message to show. Staff can still run, to test fixes. */
export function runBlock(settings: SiteSettings, slug: string, isStaff: boolean): { blocked: false } | { blocked: true; reason: "maintenance" | "paused"; message: string } {
  if (isStaff) return { blocked: false };
  if (settings.maintenance.on) return { blocked: true, reason: "maintenance", message: settings.maintenance.message || MAINTENANCE_DEFAULT.ko };
  const p = settings.pausedTools[slug];
  if (p) return { blocked: true, reason: "paused", message: p.message || PAUSED_DEFAULT.ko };
  return { blocked: false };
}

// ── Notices and announcements ──────────────────────────────────────────

const ALL_NOTICE_TEMPLATES: { id: string; title: string; body: string; link: string | null; label: Bi; ownKey?: boolean }[] = [
  { id: "choose_plan", label: { ko: "플랜 안내", en: "Choose a plan" }, title: "플러스로 16개 도구를 바로 써 보세요", body: "무료 플랜은 둘러보기만 할 수 있어요. 플러스(₩29,900/30일)는 2,000 크레딧으로 블로그 글, 광고 사진, 리포트까지 바로 만들 수 있어요. 자동 결제는 없어요.", link: "/pricing" },
  { id: "low_credits", label: { ko: "크레딧 충전 안내", en: "Low credits" }, title: "크레딧이 얼마 남지 않았어요", body: "멤버십에서 ₩5,900에 500 크레딧을 충전하거나, 플랜을 30일 연장하면 그 플랜의 크레딧이 더해져요.", link: "/account/membership" },
  { id: "run_failed", label: { ko: "실행 실패 안내", en: "Run failed" }, title: "실행이 끝나지 못했어요", body: "실패한 실행의 크레딧은 자동으로 돌려드렸어요. 잠시 뒤 [같은 입력으로 다시]를 눌러 주세요. 계속 안 되면 고객센터로 알려 주세요.", link: "/library" },
  { ownKey: true, id: "key_refused", label: { ko: "API 키 확인 요청", en: "Check your API key" }, title: "API 키를 확인해 주세요", body: "등록하신 Gemini API 키가 Google에서 거부되고 있어요. Google AI Studio에서 키가 살아 있는지와 결제 상태를 확인한 뒤, [계정 → 내 API 키]에서 새 키를 등록해 주세요.", link: "/account/api-key" },
  { ownKey: true, id: "no_key", label: { ko: "API 키 등록 안내", en: "Add an API key" }, title: "API 키만 등록하면 바로 시작할 수 있어요", body: "AI 해바의 도구는 회원님의 Gemini API 키로 실행돼요. 사용 가이드를 따라 키를 만들어 [계정 → 내 API 키]에 붙여 넣어 주세요. 3분이면 끝나요.", link: "/account/api-key" },
  { ownKey: true, id: "free_tier", label: { ko: "무료 키 안내", en: "Free key limits" }, title: "무료 키로는 일부 기능이 제한돼요", body: "지금 등록하신 키는 무료 등급이라 이미지 생성 등 일부 기능을 쓸 수 없어요. Google AI Studio에서 결제를 켜면 모든 도구를 쓸 수 있어요.", link: "/account/api-key" },
  { id: "custom", label: { ko: "직접 작성", en: "Write my own" }, title: "", body: "", link: null },
];

/** Notice templates for this access model: API-key ones only while members can add keys, plan ones only when plans are sold. */
export const NOTICE_TEMPLATES = ALL_NOTICE_TEMPLATES.filter((t) => (t.ownKey ? !SAAS : SAAS || !["choose_plan", "low_credits", "run_failed"].includes(t.id)));

/** Only same-site paths are allowed as notice/announcement links. */
export function safeLink(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  return s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/\\") && s.length <= 200 ? s : null;
}

export interface AnnouncementWindow {
  published: boolean;
  starts_at: string | null;
  ends_at: string | null;
}

/** Live right now: published and inside its optional window. */
export function isLive(a: AnnouncementWindow, now: number): boolean {
  if (!a.published) return false;
  if (a.starts_at && new Date(a.starts_at).getTime() > now) return false;
  if (a.ends_at && new Date(a.ends_at).getTime() <= now) return false;
  return true;
}
