# AI 해바 (AI Haeba)

An AI work studio for small-business owners, in Korean and English. Sixteen
tools turn one line about your shop into finished work: blog posts, ads, sales
pages, logos, proposals, plans and research. Every tool shares one Business
Profile, one project memory and one Library, and each result can feed the next
tool. Every number carries a source URL or a visible `추정` (estimate) badge.

Made by 지니에듀테크 주식회사 (Jinie EduTech Co., Ltd.) · [aihaeba.com](https://aihaeba.com)

Maintained by [incom8134-web](https://github.com/incom8134-web).

## How members get AI

The current access model is `saas` in `lib/site/access.ts`:

- Free members run tools with their own Gemini API keys. Provider usage is
  billed to their Google accounts; image generation requires a key with billing enabled.
- Plus and Pro members use the platform Gemini key and their purchased credits.
  Plans last 30 days and do not renew automatically. Active subscribers can buy top-ups.
- Hosts use the platform key without credits. Host access comes from
  `ADMIN_EMAILS`, `PLATFORM_KEY_EMAILS`, or the staff-managed host list.
- Members can store up to three keys, checked before saving and encrypted with
  AES-256-GCM. The API key guide is at `/help/api-guide`.

The alternate `own-key` mode and Anthropic adapter remain available in the code.
Student plans and referral credit bonuses are disabled; referral cash commissions
are enabled in SaaS mode. Prices and credit amounts live in `lib/payments/pro.ts`.

## What's where

```
app/
  page.tsx                   Landing page
  (app)/
    studio/                  Home: one brief → the right tool; pinned tools first
    quick/                   Quick start: pick what to make, write one line, press Make
    tools/                   16 public tools in five areas, plus flows that chain tools
    tools/[toolId]/          Tool overview; run/ is the runner (?brief=, ?preset=, ?fromRun=)
    projects/, library/      Project memory; every result, with exports and "run again"
    brand/                   Business Profile that grounds every run
    links/                   Quick links: pinned tools, latest results, outside services
    help/                    FAQ · contact (tickets, remote help) · api-guide · shortcuts · whats-new
    account/                 Overview, api-key/ (My API key), account deletion
    onboarding/, pricing/, use-cases/, status/, legal/
  admin/                     Staff only (ADMIN_EMAILS; everyone else gets a 404): overview,
                             members, tickets, funnel, errors, tools, announcements, settings
  api/                       Runs (streaming), exports, projects, account, cron, payments
components/
  shell/app-shell.tsx        Right-side dock (bottom tab bar on phones) and ⌘K search
  tool-runner.tsx            The run screen: form, live progress, result, chaining
  api-key-prompt.tsx         "Add your API key first" pop-up
  landing/, studio/, quick/, tools/, help/, account/, admin/, site/
lib/
  tools/registry/            Tool manifests; tools/content.json and experience-*.json hold
                             per-tool page content, presets and run-screen layout
  ai/                        Gemini and Claude adapters, free-key handling, error messages
  site/                      Access switch, FAQ, patch notes, plans, flows, quick start
  crypto/, api-keys.ts, admin.ts, actions/
public/
  videos/                    Landing videos and the API key walkthrough (with ko/en captions)
  guides/                    API key setup manuals (PDF, Korean and English)
supabase/migrations/         0001–0025 (apply in order; see docs/DEPLOY.md)
```

The public catalog groups tools into finding ideas, researching markets and
customers, building a brand, promotion, and documents and daily work. Hidden
modes and older engines remain available for existing results and tool chains.

## Design

The brand colour is the 지니에듀테크 gem blue. The palette (`--studio-*`)
and a light "glass" layer live in `app/globals.css`, in light (default) and
dark themes. Each tool area has its own colour across Tools, Studio, Library,
Links, Projects and Brand. Navigation is a floating dock on the right with
named, tinted buttons (a bottom tab bar on phones); everything else is
reachable from ⌘K. Motion respects `prefers-reduced-motion`. Old URLs
(`/support`, `/faq`, `/membership`, `/settings/api-keys`, …) redirect (see
`next.config.ts`).

## Setup

Requirements: Node 22.18+ (24 recommended), a Supabase project, a platform Google AI
Studio key and an Upstash Redis database. For staging and
production, follow [`docs/DEPLOY.md`](docs/DEPLOY.md): migrations, Google
OAuth, environment variables and a post-deploy smoke test.

```bash
npm ci
cp .env.example .env.local      # fill in the values; API_KEY_ENCRYPTION_SECRET enables member keys
npx supabase db push            # or run supabase/migrations/*.sql in order
npm run dev                     # http://localhost:3000
```

Enable the Google provider in Supabase Auth and add
`<NEXT_PUBLIC_SITE_URL>/auth/callback` as a redirect URL. Kakao login is
optional (`NEXT_PUBLIC_AUTH_PROVIDERS="google,kakao"`).

Key environment variables (all listed with notes in `.env.example`):

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only; bypasses row-level security |
| `API_KEY_ENCRYPTION_SECRET` | Encrypts members' API keys; required for the own-key model |
| `GOOGLE_GENAI_API_KEY` | Platform key for paid members and hosts |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Rate limits and spend guard |
| `ADMIN_EMAILS` | Staff allowed into `/admin` |
| `PLATFORM_KEY_EMAILS` | Extra accounts allowed to test on the team's key |
| `NEXT_PUBLIC_SITE_URL` | Public URL, used for auth redirects and links |

Useful scripts:

```bash
npm test            # unit tests (node:test): runner, prompts, policy, exports, providers, keys, admin
npm run typecheck   # next typegen + tsc
npm run lint
npm run check:unused
npm run check:attribution  # verifies the latest commit; accepts a base commit to check a range
npm run build
```

## Notes

- `AGENTS.md`: this is Next.js 16 (`proxy.ts` replaces
  `middleware.ts`). Read `node_modules/next/dist/docs/` before changing
  framework-level code.
- Runs need the Node runtime, not edge (native addons for image and document
  export).
- Grant matching (`grant`) is marked coming soon until a real K-Startup /
  기업마당 data source is wired in; its run page and run route refuse it.
- Staff work happens in `/admin`: answering support tickets, member lookups,
  announcements and error review. Every staff action is written to `audit_log`.
