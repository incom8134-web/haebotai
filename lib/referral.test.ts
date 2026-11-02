import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeReferralCode } from "./referral.ts";

test("referral codes are 8 uppercase letters/digits", () => {
  assert.equal(normalizeReferralCode("ab3de7gh"), "AB3DE7GH");
  assert.equal(normalizeReferralCode(" AB3DE7GH "), "AB3DE7GH");
  assert.equal(normalizeReferralCode("AB3DE7G"), null);
  assert.equal(normalizeReferralCode("AB3DE7GH'; drop"), null);
  assert.equal(normalizeReferralCode(null), null);
});

test("revenue share: 20% of the VAT-excluded price", async () => {
  const { commissionFor, payoutSplit } = await import("./referral.ts");
  assert.deepEqual(commissionFor(29_900), { base: 27_181, commission: 5_436 });
  assert.deepEqual(commissionFor(59_900), { base: 54_454, commission: 10_890 });
  assert.deepEqual(commissionFor(5_900), { base: 5_363, commission: 1_072 });
  assert.deepEqual(payoutSplit(2_718), { tax: 80, net: 2_638 });
  assert.deepEqual(payoutSplit(54_360), { tax: 1_790, net: 52_570 });
});

test("the SQL trigger uses the same numbers as REVENUE_SHARE", async () => {
  const fs = await import("node:fs");
  const { REVENUE_SHARE } = await import("./referral.ts");
  const sql = fs.readFileSync(new URL("../supabase/migrations/0024_referral_revenue_share.sql", import.meta.url), "utf8");
  assert.ok(sql.includes(`interval '${REVENUE_SHARE.windowDays} days'`));
  assert.ok(sql.includes(`interval '${REVENUE_SHARE.holdDays} days'`));
  assert.ok(sql.includes(`0.${String(REVENUE_SHARE.rate * 100).padStart(2, "0")}, floor(v_base * 0.${String(REVENUE_SHARE.rate * 100).padStart(2, "0")})`));
});

test("payout details: resident number and account number checks", async () => {
  const { normalizeRrn, normalizeAccountNumber } = await import("./referral.ts");
  assert.equal(normalizeRrn("900101-1234567"), "9001011234567");
  for (const bad of ["900101-123456", "901301-1234567", "900100-1234567", "900101-9234567", "abc"]) assert.equal(normalizeRrn(bad), null, bad);
  assert.equal(normalizeAccountNumber("123-456-789012"), "123456789012");
  assert.equal(normalizeAccountNumber("123"), null);
});

test("self-referral hints: same mailbox, card or name", async () => {
  const { emailIdentity, referralRisks } = await import("./referral.ts");
  assert.equal(emailIdentity("Kim.Haeba+shop@Gmail.com"), "kimhaeba@gmail.com");
  assert.equal(emailIdentity("kim.haeba@naver.com"), "kim.haeba@naver.com");
  const inviter = { email: "kimhaeba@gmail.com", cards: ["43301234****123*"], name: "김해바" };
  assert.deepEqual(referralRisks(inviter, [{ email: "friend@naver.com", cards: ["11112222****333*"], name: "이친구" }]), []);
  assert.deepEqual(referralRisks(inviter, [{ email: "kim.haeba+2@gmail.com", cards: [], name: null }]), ["same_email"]);
  assert.deepEqual(referralRisks(inviter, [{ email: "other@daum.net", cards: ["43301234****123*"], name: "김 해바" }]).sort(), ["same_card", "same_name"]);
});
