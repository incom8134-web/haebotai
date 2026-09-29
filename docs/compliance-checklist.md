# Compliance & safety checklist

What the app does for each legal/safety item, where it lives in the code,
and what only the operator can do. Keep this in step with the code and
with `lib/site/legal.ts` (the published documents).

| # | Item | Status | Where |
|---|------|--------|-------|
| 1 | Privacy policy | Done — items, purposes, retention, processors, overseas transfer, marketing, consent records, cookies, officer | `lib/site/legal.ts` (PRIVACY), `/legal/privacy` |
| 2 | Terms of service | Done — sign-up consent flow, under-14 rule, optional marketing | `lib/site/legal.ts` (TERMS) |
| 3 | Refund policy | Done — 7-day withdrawal, pro-rata, auto credit refunds | `lib/site/legal.ts` (REFUND) |
| 4 | Cookie policy | Done — every cookie/storage key listed; no analytics or ad cookies | `/legal/cookies` |
| 5 | Cookie banner | Notice only (nothing optional to consent to). Must become an opt-in banner before any analytics/ad script is added | `components/site/cookie-notice.tsx` |
| 6 | Form consents | Done — separate required items (14+, terms, collection, overseas transfer), optional marketing unchecked, "agree all" shortcut; written record with time/IP/browser | `app/auth/consent`, `lib/consent*.ts`, bucket `consents` |
| 7 | No unnecessary data | Google profile photo URL dropped at every sign-in; no analytics | `app/auth/callback/route.ts` |
| 8 | Third-party SDKs | Supabase, Vercel, Google Gemini, Upstash, Toss, Anthropic/OpenAI (own keys only). No trackers | privacy §5–6, `/legal/licenses` |
| 9 | Dark patterns | Nothing pre-checked; unsubscribe is one click with no questions; decline/under-14 exits offered | consent page, `/unsubscribe` |
| 10 | Hidden fees | Price incl. VAT, no auto-renewal, shown at checkout and in plans | `lib/site/plans.ts`, checkout |
| 11 | Fake reviews | None on the site | — |
| 12 | Unsupported claims | Removed "priority runs", Pro-only exports/own-key claims, "first result in 1 minute" | `lib/site/plans.ts`, landing |
| 13 | Alt text | axe: 0 violations on 16 pages × light/dark | `scratchpad axe run` |
| 14 | Color contrast | Tokens darkened/lightened to WCAG AA | `app/globals.css` |
| 15 | Keyboard | Skip link, labelled inputs, focusable main, dialog titled | `components/shell/app-shell.tsx`, `components/tool-form.tsx` |
| 16 | Business details | Company, CEO, reg. no., address, phone, email, hosting — **통신판매업 신고번호 pending**; live payments stay off until it's set | `lib/site/business.ts`, `lib/payments/toss.ts` |
| 17 | Kids' data | Under 14 can't join; self-declared under-14 deletes the account | consent page |
| 18 | Unsubscribe in emails | Every promotional email must go through `buildMarketingEmail` / `prepareMarketingSend`: "(광고)" subject, sender info, one-click link + List-Unsubscribe headers, opted-in only, no 21:00–08:00 sends, 2-year re-confirmation | `lib/marketing/*`, `/api/unsubscribe` |
| 19 | Font/image licenses | Pretendard/Geist/Space Grotesk OFL; GSAP standard licence (AI-generated code permitted); images AI-generated in-house | `/legal/licenses` |
| 20 | Data deletion | Self-serve 회원 탈퇴 deletes results, files, keys, credits, consent log; legally required records kept separately | `app/api/account/delete` |
| — | Database security | RLS on every table; anon key reads nothing; members can't read others' rows, change credits, grant Pro, call money RPCs or touch others' files (live pen-test: 32/32) | `supabase/migrations`, `supabase/verify-security.sql` |
| — | Secrets | Service role / Gemini / Upstash / Toss / encryption keys absent from client bundles (checked on production) | — |
| — | DDoS / bandwidth | Vercel platform DDoS protection; per-IP 120 req/min on `/api`; per-member rate limits; upload size/type limits on every bucket | `lib/supabase/middleware.ts`, `lib/rate-limit.ts`, migration 0014 |
| — | Runaway AI spend | Kill switch, daily platform budget, per-member daily run cap, alerts at 50/80/100 %, one-retry maximum in provider calls, 285 s watchdog | `lib/spend-guard*.ts`, run route |
| — | Loop charging | Pro is a one-time 30-day pass (no billing key); orders are server-priced, confirm is idempotent, checkout is rate-limited | `app/api/payments/pro/*` |
| — | Security headers | HSTS, nosniff, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy | `next.config.ts` |

## Operator actions (can't be done from code)

1. **통신판매업 신고** and put the number in `lib/site/business.ts` → live Toss keys will then work.
2. **Gemini API billing on (paid tier)** for the platform key. The site promises inputs aren't used for training; that is only true on Google's paid API terms.
3. **Google Cloud budget alerts** (Billing → Budgets & alerts) and, if wanted, API quota caps — the provider-side safety net under the app's own budget.
4. **Vercel Spend Management** (Settings → Billing) with a hard limit, and Firewall/Attack Challenge Mode if traffic looks hostile.
5. Set `BUDGET_ALERT_WEBHOOK_URL` (and tune `PLATFORM_DAILY_CREDIT_CAP`) in Vercel env.
6. Rotate the Supabase service-role key and `API_KEY_ENCRYPTION_SECRET`.
7. Supabase Auth → rate limits and "Leaked password"/bot protection as desired; keep email templates transactional only.
