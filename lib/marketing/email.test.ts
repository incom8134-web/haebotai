import { test } from "node:test";
import assert from "node:assert/strict";
import { buildMarketingEmail, canSendMarketing } from "./email.ts";

const consent = { v: "x", age14_at: "a", terms_at: "a", privacy_at: "a", overseas_at: "a", marketing: true, marketing_at: "2026-09-01T00:00:00Z" };
const at = (kst: string) => new Date(`${kst}+09:00`);

test("only opted-in members, only in the daytime (KST), only with fresh consent", () => {
  assert.deepEqual(canSendMarketing(consent, at("2026-09-29T10:00:00")), { ok: true });
  assert.deepEqual(canSendMarketing({ ...consent, marketing: false }, at("2026-09-29T10:00:00")), { ok: false, reason: "not_opted_in" });
  assert.deepEqual(canSendMarketing(null, at("2026-09-29T10:00:00")), { ok: false, reason: "not_opted_in" });
  assert.deepEqual(canSendMarketing(consent, at("2026-09-29T21:00:00")), { ok: false, reason: "quiet_hours" });
  assert.deepEqual(canSendMarketing(consent, at("2026-09-29T07:59:00")), { ok: false, reason: "quiet_hours" });
  assert.deepEqual(canSendMarketing(consent, at("2028-10-01T10:00:00")), { ok: false, reason: "consent_expired" });
});

test("every promotional email is labelled, identifies the sender and can be stopped in one click", () => {
  const m = buildMarketingEmail({
    subject: "해봇 AI 정식 출시",
    html: "<p>안녕하세요</p>",
    text: "안녕하세요",
    unsubscribeUrl: "https://haebot.example/unsubscribe?u=1&t=abc",
    consentedAt: "2026-09-01T00:00:00Z",
    sender: { serviceName: "해봇 AI", companyName: "지니에듀테크 주식회사", address: "부산", phone: "051", email: "a@b.c" },
  });
  assert.equal(m.subject, "(광고) 해봇 AI 정식 출시");
  assert.match(m.html, /수신 거부/);
  assert.match(m.html, /unsubscribe\?u=1&amp;t=abc/);
  assert.match(m.text, /지니에듀테크 주식회사/);
  assert.match(m.text, /2026\. 9\. 1\./);
  assert.equal(m.headers["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");
  assert.match(m.headers["List-Unsubscribe"], /^<https:\/\/haebot\.example\/unsubscribe/);
  assert.equal(buildMarketingEmail({ ...{ subject: "(광고) 이미 붙음", html: "", text: "", unsubscribeUrl: "u", consentedAt: "2026-09-01T00:00:00Z", sender: { serviceName: "", companyName: "", address: "", phone: "", email: "" } } }).subject, "(광고) 이미 붙음");
});
