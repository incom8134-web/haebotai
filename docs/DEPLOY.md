# Deploying haebot-ai

## 1. Supabase project

One Supabase project per environment (staging and production are separate
projects, not separate schemas in one project).

### 1.1 Run migrations

Migrations live in `supabase/migrations/`, numbered and applied in order.
None of them have been applied to any live database by this work — apply
them yourself with the Supabase CLI, pointed at the target project:

```bash
supabase link --project-ref <staging-or-prod-project-ref>
supabase db push
```

Or, without the CLI, paste each file's contents into the SQL editor in
project order (0001 → 0012, currently).

| Migration | Purpose |
|---|---|
| `0001_init.sql` | Core schema: brands, inputs, facts, posts, generations, user_credits, storage buckets (`inputs`, `exports`, `logos`), RLS on every table |
| `0002_business_profile_fields.sql` | Adds the Business Profile fields every tool's `usesProfile` reads |
| `0003_runs_and_credits.sql` | Adds run-history columns to `generations` (status, timing, credits) |
| `0004_grounding_sources.sql` | 출처 (sources) panel storage on a run |
| `0005_chaining.sql` | Tracks which prior run seeded a chained run |
| `0006_generations_delete_policy.sql` | Adds the missing delete-own RLS policy on `generations` |
| `0007_support_keys_membership.sql` | Support tickets, BYOK API keys, membership + student verification tables |
| `0008_multi_provider_api_keys.sql` | Allows `anthropic`/`openai` alongside `google` in `user_api_keys` |
| `0009_generation_provider.sql` | Records which engine actually ran each generation |
| `0010_api_key_broken_flag.sql` | Adds `broken` flag to a key slot the rotation classifier invalidated |
| `0011_lock_down_credits_and_keys.sql` | **Security fix.** Revokes direct authenticated write access to `user_credits`, `generations`, `user_api_keys`; moves credit reserve/settle to `security definer` RPCs callable only by the service role; adds `user_api_key_status` view |
| `0012_pro_payments.sql` | Pro checkout: `payments` order ledger (read-own, service-role writes) and `activate_pro` (service-role only) — marks a pending order done, extends Pro 30 days, adds 2,000 credits, in one transaction |

Storage buckets (`inputs`, `exports`, `logos`) and their RLS policies are
created by `0001_init.sql` — no manual bucket setup needed.

### 1.2 Verify the security posture after migrating

Run `supabase/verify-security.sql` (or the equivalent checks) against the
target project after 0011 is applied: confirm an authenticated client
cannot `insert`/`update` `user_credits` or `generations` directly, and
cannot `select`/`insert`/`update`/`delete` `user_api_keys` at all — only
`reserve_credits`, `release_credit_reservation`, `settle_generation_credits`
(all `security definer`, service-role-only) and the `user_api_key_status`
view should be reachable.

### 1.3 Auth — Google OAuth

In the Supabase dashboard → Authentication → Providers → Google:

1. Create an OAuth 2.0 Client ID in Google Cloud Console (Web application).
2. Add this project's Supabase auth callback URL as an **Authorized redirect URI**
   in the Google Cloud OAuth client — the URL Supabase's dashboard shows you
   under the Google provider config (`https://<project-ref>.supabase.co/auth/v1/callback`).
3. Paste the Google Client ID and Secret into the Supabase provider config.
4. In Supabase → Authentication → URL Configuration, set **Site URL** to
   this deployment's origin, and add the app's own callback route to
   **Redirect URLs**:
   - Local dev: `http://localhost:3000/auth/callback`
   - Staging/production: `https://<your-domain>/auth/callback`

The app's own callback (`app/auth/callback/route.ts`) exchanges the code
for a session, then redirects to `?next=` if it was set (validated as a
same-site relative path — anything else falls back to `/studio`), or to
`/brand` for a first-time user with no brand row yet. `app/auth/page.tsx`
builds the `redirectTo` from `window.location.origin`, so no per-environment
code change is needed — only the Supabase-side redirect URL allowlist above.

## 2. Environment variables

Copy `.env.example` to `.env.local` (dev) or set these in the host's
environment variable settings (staging/production). `lib/env.ts` validates
all of them at startup with Zod and throws immediately with a list of what's
missing/invalid — a misconfigured deploy fails fast instead of serving
broken pages.

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Project URL, public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Anon key, public |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | **Server-only.** Bypasses RLS entirely. Treat a leak as a full DB compromise. |
| `GOOGLE_GENAI_API_KEY` | yes | Platform Gemini key — from ai.google.dev. Used for every user's Gemini runs (unless they've registered their own) |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | yes | Rate limiting (`lib/rate-limit.ts`) |
| `NEXT_PUBLIC_SITE_URL` | yes | This deployment's own origin |
| `NEXT_PUBLIC_TOSS_CLIENT_KEY` / `TOSS_SECRET_KEY` | optional | Toss Payments 결제위젯 client key (`test_gck_…`/`live_gck_…`) and its secret key (`…_gsk_…`, **server-only**). Both set → the Pro checkout at `/account/membership/checkout` works; either missing → it shows "not set up". The client key is inlined at build time, so redeploy after changing it. |
| `API_KEY_ENCRYPTION_SECRET` | optional | Enables BYOK (Claude/OpenAI/own-Gemini keys). Random 32+ byte value — `openssl rand -base64 32`. **Losing this after users have stored keys means every stored key is unrecoverable and must be re-entered.** Omitting it entirely disables BYOK; Claude/OpenAI tools then show no usable engine. |

Anthropic and OpenAI keys are never platform-wide env vars — Claude/ChatGPT
are own-key-only by design (product decision), so there is no
`ANTHROPIC_API_KEY`/`OPENAI_API_KEY` to set here.

## 3. Host settings

- Node runtime, not edge — `@resvg/resvg-js` (native binary addon) and
  `satori` (loads a `.wasm` file by relative path) are both marked
  `serverExternalPackages` in `next.config.ts` and won't run on an edge
  runtime. Confirm the host's build target is Node.
- Build command: `npm run build` (runs `next build`, Turbopack).
- Start command: `npm run start`.
- `proxy.ts` (Next.js 16's replacement for `middleware.ts`) runs
  `lib/supabase/middleware.ts`'s `updateSession` on every request except
  static assets — this refreshes the Supabase session cookie, so cookie
  domain/`NEXT_PUBLIC_SITE_URL` must match the deployed domain or sessions
  won't persist.

## 4. Post-deploy smoke test

1. Load `/` — landing page renders, no console errors.
2. `/auth` → sign in with Google → lands on `/brand` (first-time) or
   `/studio` (existing user) — confirms the OAuth redirect URL allowlist
   (§1.3) is correct.
3. Fill out the Business Profile at `/brand`, then load `/studio`.
4. Run a text tool on Gemini (e.g. `copy`) — confirms `GOOGLE_GENAI_API_KEY`
   and Redis rate limiting are both live, and the `generations` row lands
   with `status = done`, `credits_used` matching the tool's estimate.
5. Cancel a run partway through (the cancel button appears after 5s) —
   confirms the `generations` row ends `status = cancelled` and the
   reservation is refunded (check `/account/credits`).
6. Register an Anthropic key at `/account/api-key`, then run a Claude-
   enabled tool (e.g. `strategy`) with the engine picker set to Claude —
   confirms BYOK end-to-end: `API_KEY_ENCRYPTION_SECRET` is set correctly,
   the key round-trips through encryption, and `credits_used = 0` on the
   resulting row.
7. Run `image` or `brand-model` once — confirms the `exports` storage
   bucket and signed-URL generation both work on this project.
8. Run `business-plan` and download both the `.docx` and `.xlsx` exports
   from the result — confirms `app/api/export/[runId]` works under the
   deployed Node runtime (exercises `docx`/`exceljs`, not just the AI
   call).

## 5. Error-path behavior (for reference during the smoke test)

Every tool run follows one path in `app/api/tools/[toolId]/run/route.ts`:
validate → reserve credits → insert a `pending` `generations` row →
generate → validate the output → settle. Any failure after the row exists
(generation error, cancellation, a grounding/safety guard rejecting the
output) goes through a single `fail()` helper that updates the row to
`status = "error"` or `"cancelled"` with a message, and always calls
`settleGenerationCredits(runId, 0)` — a full refund of the reservation,
since no usable output was produced. A failure *before* the row is
inserted (bad input, unsupported engine, no usable key, insufficient
credits) never reserves anything, so there's nothing to refund. The one
edge case — the row insert itself fails after credits were reserved —
releases the reservation directly via `releaseUnattachedReservation`,
since `settleGenerationCredits` requires a real row to settle against.

Server-side error messages are Korean-only strings; `lib/ai/client-error-
messages.ts` translates the known ones for bilingual display in the UI and
falls back to showing the original string for anything unrecognized.
