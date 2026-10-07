import type { ConsentState } from "@/lib/consent";

// Every promotional email must be built here (정보통신망법 §50, 시행령
// §61·§62의3; the same rules make it CAN-SPAM/RFC 8058 friendly):
//   - only to members who opted in (never a waitlist or imported list),
//   - not between 21:00 and 08:00 KST (that needs a separate consent we
//     don't collect),
//   - subject starts with "(광고)",
//   - body ends with who sent it, how to reach them, when the member
//     agreed, and a one-click unsubscribe link (also in the
//     List-Unsubscribe headers so mail apps show their own button),
//   - consent older than two years has to be re-confirmed first.
// Transactional mail (sign-in links, payment receipts) is not advertising
// and does not go through this.

interface Sender {
  serviceName: string;
  companyName: string;
  address: string;
  phone: string;
  email: string;
}

type SendCheck = { ok: true } | { ok: false; reason: "not_opted_in" | "quiet_hours" | "consent_expired" };

const TWO_YEARS_MS = 2 * 365 * 24 * 60 * 60 * 1000;

/** Hour of the day in Korea (0-23). */
function kstHour(now: Date): number {
  return (now.getUTCHours() + 9) % 24;
}

/** Whether a promotional email may go to this member right now. */
export function canSendMarketing(consent: ConsentState | null, now: Date = new Date()): SendCheck {
  if (!consent?.marketing || !consent.marketing_at) return { ok: false, reason: "not_opted_in" };
  if (now.getTime() - new Date(consent.marketing_at).getTime() > TWO_YEARS_MS) return { ok: false, reason: "consent_expired" };
  const h = kstHour(now);
  if (h >= 21 || h < 8) return { ok: false, reason: "quiet_hours" };
  return { ok: true };
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export interface MarketingEmail {
  subject: string;
  html: string;
  text: string;
  headers: Record<string, string>;
}

/** Wraps a promotional message with everything the law requires. */
export function buildMarketingEmail(opts: { subject: string; html: string; text: string; unsubscribeUrl: string; consentedAt: string; sender: Sender }): MarketingEmail {
  const { sender, unsubscribeUrl } = opts;
  const subject = /^\(광고\)/.test(opts.subject.trim()) ? opts.subject.trim() : `(광고) ${opts.subject.trim()}`;
  const agreed = new Date(opts.consentedAt).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" });
  const footerText = [
    "",
    "―",
    `보낸 곳: ${sender.companyName} (${sender.serviceName})`,
    `주소: ${sender.address} · 전화: ${sender.phone} · 이메일: ${sender.email}`,
    `이 메일은 ${agreed}에 광고성 정보 수신에 동의하신 분께 보내 드렸습니다.`,
    `더 이상 받지 않으려면: ${unsubscribeUrl} (수신 거부는 무료이며 바로 처리됩니다)`,
  ].join("\n");
  const footerHtml = `<hr style="border:0;border-top:1px solid #ddd;margin:32px 0 16px"><p style="font-size:12px;line-height:1.7;color:#666">보낸 곳: ${esc(sender.companyName)} (${esc(sender.serviceName)})<br>주소: ${esc(sender.address)} · 전화: ${esc(sender.phone)} · 이메일: ${esc(sender.email)}<br>이 메일은 ${esc(agreed)}에 광고성 정보 수신에 동의하신 분께 보내 드렸습니다.<br><a href="${esc(unsubscribeUrl)}" style="color:#333">수신 거부</a> — 무료이며 한 번 누르면 바로 처리됩니다.</p>`;
  return {
    subject,
    html: `${opts.html}${footerHtml}`,
    text: `${opts.text}\n${footerText}`,
    headers: {
      "List-Unsubscribe": `<${unsubscribeUrl}>, <mailto:${sender.email}?subject=unsubscribe>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  };
}
