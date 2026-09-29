"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CONSENT_TERMS_VERSION, safeNext, type Consent } from "@/lib/consent";
import { REFERRAL } from "@/lib/referral";
import { redeemReferral } from "@/lib/referral-server";

export type ConsentState = { error: string } | null;

export async function acceptConsent(_prev: ConsentState, formData: FormData): Promise<ConsentState> {
  if (formData.get("age14") !== "on" || formData.get("terms") !== "on") return { error: "required" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const consent: Consent = { age14: true, terms: true, termsVersion: CONSENT_TERMS_VERSION, at: new Date().toISOString() };
  const { error } = await supabase.auth.updateUser({ data: { consent } });
  if (error) return { error: "save_failed" };
  // Mint a new JWT so the proxy sees the consent on the very next request.
  await supabase.auth.refreshSession();

  // Everyone passes through here once, so this is where an invite link
  // pays out (the SQL only accepts accounts younger than 7 days).
  const jar = await cookies();
  const ref = jar.get(REFERRAL.cookie)?.value;
  if (ref) {
    await redeemReferral(user.id, ref);
    jar.delete(REFERRAL.cookie);
  }

  redirect(safeNext(String(formData.get("next") ?? "")));
}
