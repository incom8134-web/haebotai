# 해봇 AI — Haebot AI Studio

Grounded AI marketing and business tools in one app. Fifteen tools share one
Business Profile, one runner, and one sourcing standard: every number carries
a source URL or a visible `추정` (estimate) badge.

This repository merges two projects:

| Source | What it contributed |
|---|---|
| **groundwork** (`Hyeaokshin AI clone`) | The working product — Next.js 16 app, Supabase auth + RLS, credit ledger, Gemini runner, 15-tool registry, chaining, exports (docx / xlsx / ics), library, business profile, i18n (ko/en). |
| **haebot-ai-studio** (Lovable prototype) | The Studio design — "One brief. A whole campaign." workspace, cyan→violet gradient system, glass panels, ambient glow, header with credit pill, campaign showcase imagery. |

The prototype's TanStack Start / Lovable scaffolding was not carried over; its
one real screen was rebuilt as the app's `/studio` route on top of the real
tool registry, and its visual language lives in `app/globals.css` as a scoped
`.studio-*` layer that works in both light and dark themes.

## What's where

```
app/(app)/
  layout.tsx, template.tsx   Shell data + page transition (blur-glide via motion)
  studio/                    Home: one brief → any tool; pinned (★) tools first
  tools/                     Flows strip, then all 18 tools by category
  tools/[toolId]/            Tool overview: sticky identity card + examples, path, sample, FAQ
  tools/[toolId]/run/        Runner (?brief=, ?preset=, ?fromRun=)
  library/, brand/           Results, Business Profile
  help/                      Help home (instant FAQ search) · faq/ · contact/ (customer service,
                             remote help) · api-guide/ (API key manual) · whats-new/
  account/                   Overview + sign-out · credits/ (balance, monthly usage by tool, cost
                             per tool, rate limits) · membership/ (plans, student application) · api-key/
  links/                     Quick links: pinned tools, latest results, flows, outside services, shortcuts
components/
  shell/app-shell.tsx        Right-side liquid-glass dock (bottom tab bar on phones),
                             floating brand + ⌘K search, Help badge for replies/updates
  site/page.tsx              Glass primitives: Page, PageHeader, Panel, Segmented (sliding thumb), buttons
  tools/, help/, account/, studio/
lib/
  tools/registry/            18 manifests (strategy, copy, presentation added from aimarketingstudio)
  tools/content.json         Per-tool page content + presets (tested against manifests)
  tools/experience-*.json    Per-tool run workspace: layout (split / steps / canvas), story header,
                             numbered sections, control types, live stage (tested against manifests)
  site/                      FAQ, patch notes, plans, flows
  crypto/, api-keys.ts, membership.ts, support.ts, actions/
supabase/migrations/         0001–0007
```

## Design

The Studio palette (cyan → violet over deep navy, dark by default) with a
liquid-glass layer in `app/globals.css`: `.glass` / `.glass-strong`
(saturated backdrop blur, rim light, inner highlight, specular sheen),
`.glass-hover` (spring lift), a fixed `.app-backdrop` with drifting glows,
and smooth `<details class="smooth">` accordions. Motion: page
transitions, a spring-animated active pill in the dock and tab bar, a
sliding thumb in segmented controls, layout-animated tool filtering. All of
it respects `prefers-reduced-motion`.

Navigation is deliberately not a left sidebar + top link bar: a floating
dock on the right holds six destinations, everything else is reachable
from ⌘K. Every service still has its own page — Help and Account each
group theirs behind a glass sub-navigation, and every tool's run screen
carries a guide rail (examples, tips, result preview, help links). Old URLs (`/support`, `/faq`,
`/membership`, `/settings/api-keys`, …) redirect (see `next.config.ts`).

## Combined sources

| Source | Kept |
|---|---|
| groundwork | The working app: auth, credits, runner, registry, exports, library, profile |
| haebot-ai-studio | Visual language and the Studio screen |
| aimarketingstudio | Brand Strategy, Campaign Copy and Presentation tools (with their suggestion prompts as presets), and the strategy → copy → deck flow. Its sidebar layout, quick-links page and separate history page were not carried over (Library covers history; ⌘K covers quick links). |

## Staff operations (no admin UI yet)

Run with the service role in the Supabase SQL editor:

```sql
-- answer a ticket (shows up in the user's bell + ticket history)
update support_tickets set status = 'answered', reply = '…' where id = '…';

-- approve a student
update student_verifications set status = 'approved' where id = '…';
insert into memberships (user_id, plan, expires_at)
values ('<user id>', 'student', now() + interval '1 year')
on conflict (user_id) do update set plan = excluded.plan, expires_at = excluded.expires_at;
```

## How the Studio works

1. Pick a category and a tool card (all 15 come live from the registry, with
   their credit and time estimates).
2. Write a brief. The Studio figures out which field of that tool the brief
   belongs in (`lib/tools/brief.ts` — first required text field). Tools with
   only structured inputs (brand model, grant matcher, homepage) open without
   a brief.
3. **Generate** opens `/tools/<id>/run?brief=…` with the form pre-filled, and the
   run goes through the normal pipeline: profile chips, credit reservation,
   streaming, sources panel, export, chaining.
4. The right panel shows your four latest runs (or an example showcase when
   you have none) and the Business Profile fields grounding every run.

## Setup

Requirements: Node 20.9+ (22 recommended), a Supabase project, a Google AI
Studio key, and an Upstash Redis database.

```bash
npm install
cp .env.example .env.local      # fill in the values; set API_KEY_ENCRYPTION_SECRET to enable BYOK
npx supabase db push            # or run supabase/migrations/*.sql in order
npm run dev                     # http://localhost:3000
```

Useful scripts:

```bash
npm test            # 46 unit tests (node:test) — runner, prompts, policy, exports, brief, presets, crypto
npm run typecheck   # next typegen + tsc
npm run lint
npm run build
```

Enable the Google provider in Supabase Auth and add
`<NEXT_PUBLIC_SITE_URL>/auth/callback` as a redirect URL.

## Notes

- `AGENTS.md` / `CLAUDE.md` are kept from groundwork: this is Next.js 16
  (`proxy.ts` replaces `middleware.ts`); read `node_modules/next/dist/docs/`
  before changing framework-level code.
- Tool field labels and summaries are Korean-only for now; the app shell,
  landing, Studio, library, and profile are fully bilingual.
- The brand accent outside the Studio is still groundwork's forest green
  (`--color-accent` in `globals.css`). Switching the whole app to the
  Studio's cyan is a one-token change.
