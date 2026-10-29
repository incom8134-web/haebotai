# Billing: plans, credits and the road to auto-renewal

Decided 2026-10-29 (lib/site/access.ts `ACCESS_MODEL = "saas"`).

## Plans

| Plan | Price (VAT incl.) | Credits | Max AI cost per payment (1 credit ≈ ₩5) |
|---|---|---|---|
| Free | ₩0 | none — browse only | ₩0 |
| Plus | ₩29,900 / 30 days | 2,000 | ≈ ₩10,000 |
| Pro | ₩59,900 / 30 days | 6,000 | ≈ ₩30,000 |
| Top-up (Plus/Pro only) | ₩5,900 | 500 | ≈ ₩2,500 |

Prices and credits live in `lib/payments/pro.ts` (`PRODUCTS`); per-tool
credits in `lib/tools/registry/*` (`estimatedCredits`, see the note in
`lib/tools/types.ts` for how they were measured).

### Margin at full use (worst case)

Net revenue = price ÷ 1.1 (VAT) × (1 − card fee). The card fee is an
estimate (≈ 3.3%); use the rate in the Toss contract.

| | Net revenue | Max AI cost | Gross margin at full use |
|---|---|---|---|
| Plus | ≈ ₩26,280 | ₩10,000 | ≈ 62% |
| Pro | ≈ ₩52,660 | ₩30,000 | ≈ 43% |
| Top-up | ≈ ₩5,190 | ₩2,500 | ≈ 52% |

On the VAT-inclusive price the cost shares are 33% and 50% (the 67% / 50%
figures). Most members don't use every credit, so the real margin is
higher; re-measure per-tool costs against Google Cloud billing monthly.

## Recommended billing path

1. **Now — 30-day passes (live).** One-time payments through the Toss
   결제위젯 that already work: no auto-renewal, buying again stacks 30
   days and adds the plan's credits. No extra contract needed.
2. **Next — monthly auto-renewal (자동결제).** Apply to Toss Payments for
   the billing (빌링) product; it is reviewed separately from the
   standard contract. Once approved:
   - issue a billing key with `requestBillingAuth` (card registration),
     store it server-side only;
   - a daily Vercel cron charges members whose period ends today
     (`POST /v1/billing/{billingKey}`), re-using `activate_order`;
   - dunning: retry on day 1 and 3, then drop to Free;
   - one-click cancel in Membership, and a renewal notice before each
     charge (전자상거래법 / 공정위 subscription guideline: notify before a
     free→paid or price change, make cancelling as easy as subscribing).
3. **Later — yearly plans** (two months free) once monthly churn is known.

## Operating notes

- **Refunds:** done in the Toss merchant dashboard (cancel payment). The
  webhook marks the order `canceled`, but the credits and days it granted
  are not taken back automatically — `/admin` shows them but can't edit
  them yet, so lower `user_credits.balance` and `memberships.expires_at`
  in the Supabase SQL editor.
- **Terms:** the SaaS terms, privacy policy and refund policy take effect
  on `SAAS_REVISION` in `lib/site/legal.ts`. Announce the change on the
  site at least 30 days before (제3조; ending own keys is a change against
  existing members' interest) and set the date to the real launch date.
- **Toss keys:** `NEXT_PUBLIC_TOSS_CLIENT_KEY` and `TOSS_SECRET_KEY` in
  Vercel; register the webhook `/api/payments/toss/webhook`.
