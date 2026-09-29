import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { consentOf } from "@/lib/consent";
import { unsubscribeUrl } from "@/lib/consent-server";
import { BUSINESS } from "@/lib/site/business";
import { buildMarketingEmail, canSendMarketing, type MarketingEmail } from "./email";

// The only way to get a list of people to send a promotional email to:
// members whose own opt-in is on and still valid right now. Pair it with
// your email provider — send each `email` exactly as built.

export interface OutgoingMarketing {
  to: string;
  userId: string;
  email: MarketingEmail;
}

export async function prepareMarketingSend(message: { subject: string; html: string; text: string }, now: Date = new Date()): Promise<{ ready: OutgoingMarketing[]; skipped: Record<string, number> }> {
  const admin = createAdminClient();
  const ready: OutgoingMarketing[] = [];
  const skipped: Record<string, number> = {};
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    for (const u of data.users) {
      const consent = consentOf(u.app_metadata);
      const check = canSendMarketing(consent, now);
      if (!check.ok || !u.email) {
        const why = check.ok ? "no_email" : check.reason;
        skipped[why] = (skipped[why] ?? 0) + 1;
        continue;
      }
      ready.push({
        to: u.email,
        userId: u.id,
        email: buildMarketingEmail({ ...message, unsubscribeUrl: unsubscribeUrl(u.id), consentedAt: consent!.marketing_at!, sender: BUSINESS }),
      });
    }
    if (data.users.length < 1000) break;
  }
  return { ready, skipped };
}
