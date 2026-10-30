"use client";

import { UpgradeCard } from "@/components/upgrade-button";
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Coins,
  FolderKanban,
  FolderOpen,
  KeyRound,
  Loader2,
  Paperclip,
  Plus,
  Search,
  Sparkles,
  Wand2,
} from "lucide-react";
import { catalogTool, modesOf, publicTools, toolNumber } from "@/lib/tools/catalog";
import { routeBrief } from "@/lib/tools/route-brief";
import { PATCH_NOTES } from "@/lib/site/patch-notes";
import { CountUp, Reveal, useRotatingExample } from "@/components/studio/studio-extras";
import { chainTargets, getTool } from "@/lib/tools/registry";
import { briefField } from "@/lib/tools/brief";
import { formatDateTime } from "@/lib/format-date";
import { useBi, useLocale } from "@/lib/i18n/context";
import { primaryButton } from "@/components/site/page";
import { cn } from "@/lib/utils";
import { OWN_KEY_ONLY } from "@/lib/site/access";
import { IconTile, toolTone } from "@/components/site/tone";

// The member's home, laid out as one calm column: a slim status row,
// "what shall we make?" with a one-line composer that picks the tool,
// starter pills, then "continue working" beside "try next", and the
// projects below. Everything is real account state — no sample numbers.

export interface DashboardRun {
  id: string;
  toolId: string;
  status: string;
  title: string | null;
  projectId: string | null;
  createdAt: string;
}

const LIVE = new Set(["pending", "streaming"]);

function runName(run: DashboardRun, L: ReturnType<typeof useBi>) {
  const t = catalogTool(run.toolId);
  return run.title || (t ? L(t.name) : run.toolId);
}

function StatusChip({ status }: { status: string }) {
  const L = useBi();
  if (LIVE.has(status))
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-ai-dim px-2 py-0.5 text-[10px] font-medium text-ai">
        <Loader2 size={10} className="animate-spin" aria-hidden />{" "}
        {L({ ko: "만드는 중", en: "Running" })}
      </span>
    );
  if (status === "error")
    return (
      <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-medium text-danger">
        {L({ ko: "실패", en: "Failed" })}
      </span>
    );
  if (status === "cancelled")
    return (
      <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-fg-muted">
        {L({ ko: "취소됨", en: "Cancelled" })}
      </span>
    );
  return null;
}

function QuickCreate({
  projects,
}: {
  projects: { id: string; name: string }[];
}) {
  const L = useBi();
  const router = useRouter();
  const [pending, start] = useTransition();
  // Tools (and their modes, right under them) whose form has a free-text
  // field a one-line brief can go into, in numbered order.
  const tools = useMemo(
    () =>
      publicTools()
        .flatMap((t) => [t, ...modesOf(t.slug)])
        .filter((t) => t.engine && getTool(t.engine) && briefField(getTool(t.engine)!)),
    [],
  );
  const label = (t: (typeof tools)[number]) => {
    const n = toolNumber(t.slug);
    const parent = t.hidden ? catalogTool(t.hidden.parent) : undefined;
    return `${n}. ${parent ? `${L(parent.name)} · ` : ""}${L(t.name)}`;
  };
  const [slug, setSlug] = useState(
    tools.find((t) => t.slug === "offer-architect")?.slug ??
      tools[0]?.slug ??
      "",
  );
  const [brief, setBrief] = useState("");
  const [project, setProject] = useState(projects[0]?.id ?? "");
  // The brief suggests tools as it's typed; the suggestion drives the
  // picker until the member chooses a tool themselves.
  const [picked, setPicked] = useState(false);
  const suggested = useMemo(
    () => routeBrief(brief, tools.map((t) => t.slug)),
    [brief, tools],
  );
  const auto = !picked && !!suggested[0];
  const chosen = auto ? suggested[0] : slug;
  const go = () => {
    const q = new URLSearchParams();
    if (brief.trim()) q.set("brief", brief.trim());
    if (project) q.set("project", project);
    const qs = q.toString();
    start(() => router.push(`/tools/${chosen}/run${qs ? `?${qs}` : ""}`));
  };
  const example = useRotatingExample(EXAMPLES.map((e) => L(e)));
  const pill = "inline-flex h-8 min-w-0 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold";
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        go();
      }}
    >
      <div className="overflow-hidden rounded-2xl border-2 border-accent/80 bg-surface shadow-[0_18px_44px_-28px_var(--studio-violet)]">
        <textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              go();
            }
          }}
          rows={2}
          maxLength={600}
          aria-label={L({ ko: "하고 싶은 일", en: "What you want to make" })}
          placeholder={example}
          className="w-full resize-none bg-transparent px-4 pt-4 pb-2 text-base text-fg outline-none placeholder:text-fg-subtle"
        />
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-hairline bg-surface-2/50 px-3 py-2.5">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <label className={cn(pill, "border-accent/30 bg-accent-dim text-accent")}>
              <Wand2 size={13} className="shrink-0" aria-hidden />
              <span className="shrink-0">{auto ? L({ ko: "자동:", en: "Auto:" }) : L({ ko: "도구:", en: "Tool:" })}</span>
              <select
                value={chosen}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setPicked(true);
                }}
                aria-label={L({ ko: "도구", en: "Tool" })}
                className="max-w-[46vw] min-w-0 cursor-pointer truncate bg-transparent font-semibold outline-none sm:max-w-[260px]"
              >
                {tools.map((t) => (
                  <option key={t.slug} value={t.slug}>
                    {label(t)}
                  </option>
                ))}
              </select>
            </label>
            {projects.length ? (
              <label className={cn(pill, "border-hairline bg-surface text-fg")}>
                <FolderOpen size={13} className="shrink-0 text-fg-subtle" aria-hidden />
                <select value={project} onChange={(e) => setProject(e.target.value)} aria-label={L({ ko: "프로젝트", en: "Project" })} className="max-w-[40vw] min-w-0 cursor-pointer truncate bg-transparent outline-none sm:max-w-[180px]">
                  <option value="">{L({ ko: "프로젝트 없음", en: "No project" })}</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <span className="hidden items-center gap-1 text-2xs text-fg-subtle sm:inline-flex">
              <Paperclip size={12} aria-hidden /> {L({ ko: "자료는 다음 화면에서 올려요", en: "Attach files on the next screen" })}
            </span>
          </div>
          <button type="submit" disabled={pending || !chosen} className={cn(primaryButton, "h-9 px-4 text-sm disabled:opacity-60 max-sm:w-full max-sm:justify-center")}>
            {pending ? <Loader2 size={14} className="animate-spin" aria-hidden /> : null} {L({ ko: "만들기", en: "Create" })} <ArrowRight size={14} aria-hidden />
          </button>
        </div>
      </div>
      {suggested.length > 1 ? (
        <div className="flex flex-wrap items-center justify-center gap-1.5" aria-label={L({ ko: "추천 도구", en: "Suggested tools" })}>
          <span className="text-2xs text-fg-subtle">{L({ ko: "이런 도구도 맞아요", en: "Also a good fit" })}</span>
          {suggested.map((sl) => {
            const t = tools.find((x) => x.slug === sl);
            if (!t) return null;
            return (
              <button
                key={sl}
                type="button"
                aria-pressed={chosen === sl}
                onClick={() => {
                  setSlug(sl);
                  setPicked(true);
                }}
                className={cn("rounded-full border px-3 py-1 text-xs transition-colors", chosen === sl ? "border-accent bg-accent-dim text-accent" : "border-hairline bg-surface text-fg-muted hover:text-fg")}
              >
                {label(t)}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-wrap justify-center gap-2" aria-label={L({ ko: "바로 시작할 예시", en: "Starters" })}>
          {STARTERS.map((st) => {
            const t = catalogTool(st.slug);
            if (!t) return null;
            return (
              <button
                key={st.slug}
                type="button"
                onClick={() => {
                  setBrief(L(st.brief));
                  setSlug(st.slug);
                  setPicked(true);
                }}
                className="rounded-full border border-hairline bg-surface px-3 py-1 text-xs text-fg-muted transition-colors hover:border-accent/60 hover:text-accent"
              >
                {L(st.label)}
              </button>
            );
          })}
        </div>
      )}
    </form>
  );
}

const EXAMPLES = [
  { ko: "4월 한정 딸기 타르트를 동네 20~30대에게 알리고 싶어요", en: "Launch an April-only strawberry tart to locals in their 20s–30s" },
  { ko: "스마트스토어에 올릴 수제 잼 상세페이지를 만들어 줘", en: "A product page for handmade jam on my online store" },
  { ko: "정부 지원사업에 낼 30쪽 사업계획서 초안", en: "A 30-page business plan draft for a government grant" },
  { ko: "카페 이름에 어울리는 로고 방향 4가지", en: "Four logo directions for my café" },
  { ko: "경쟁 카페 3곳과 비교해서 우리 강점을 정리해 줘", en: "Compare us with three rival cafés and find our edge" },
];

const STARTERS: { slug: string; label: { ko: string; en: string }; brief: { ko: string; en: string } }[] = [
  { slug: "sales-page", label: { ko: "상세페이지", en: "Product page" }, brief: { ko: "온라인 스토어에 올릴 상세페이지 — 제품: ", en: "A product page for my online store — product: " } },
  { slug: "ad-factory", label: { ko: "광고 문구", en: "Ad copy" }, brief: { ko: "인스타그램 광고 문구 — 상품: ", en: "Instagram ad copy — product: " } },
  { slug: "logo-lab", label: { ko: "로고", en: "Logo" }, brief: { ko: "브랜드 로고 방향 — 이름: ", en: "Logo directions — brand name: " } },
  { slug: "campaign-planner", label: { ko: "홍보 계획", en: "Promotion plan" }, brief: { ko: "다음 달 홍보 계획 — 목표: ", en: "Next month's promotion — goal: " } },
  { slug: "doc-studio", label: { ko: "사업계획서", en: "Business plan" }, brief: { ko: "사업계획서 — 독자(은행·투자자·지원사업): ", en: "Business plan — reader (bank, investor, grant): " } },
  { slug: "proposal-forge", label: { ko: "제안서", en: "Proposal" }, brief: { ko: "제안서 — 제안 대상과 내용: ", en: "Proposal — to whom and what: " } },
  { slug: "market-desk", label: { ko: "시장 조사", en: "Market research" }, brief: { ko: "시장 조사 — 알고 싶은 것: ", en: "Market research — what I need to know: " } },
  { slug: "web-builder", label: { ko: "홈페이지", en: "Website" }, brief: { ko: "홈페이지 — 업종과 방문자가 할 일: ", en: "Website — business and what visitors should do: " } },
  { slug: "prompt-maker", label: { ko: "프롬프트", en: "Prompt" }, brief: { ko: "ChatGPT에게 시킬 프롬프트 — 원하는 결과: ", en: "A ChatGPT prompt — the result I want: " } },
];

export function Dashboard({
  name,
  projects,
  projectCount,
  runs,
  recommended,
  lastTool,
  usage,
}: {
  name: string | null;
  projects: { id: string; name: string; description: string; runs: number }[];
  projectCount: number;
  runs: DashboardRun[];
  recommended: string[];
  lastTool: string | null;
  usage: { balance: number | null; used30: number; runs30: number; keyConnected?: boolean; team?: boolean; paid?: boolean; plan?: string };
}) {
  const L = useBi();
  const { locale } = useLocale();
  const projectName = new Map(projects.map((p) => [p.id, p.name]));
  const live = runs.find((r) => LIVE.has(r.status));
  const latest = live ?? runs.find((r) => r.status === "done");
  const latestProject = latest?.projectId
    ? projects.find((p) => p.id === latest.projectId)
    : projects[0];
  const last = lastTool ? catalogTool(lastTool) : undefined;
  // The same hand-offs a result page offers (ones that carry the result
  // in), in the catalog's preferred order.
  const rank = (slug: string) => {
    const i = last?.next.indexOf(slug) ?? -1;
    return i < 0 ? 99 : i;
  };
  const handoffs = lastTool
    ? chainTargets(lastTool)
        .map((m) => catalogTool(m.id))
        .filter((t): t is NonNullable<typeof t> => !!t && !!t.engine && !t.hidden)
        .sort((a, b) => rank(a.slug) - rank(b.slug))
    : [];
  // Only members who spend credits can run low (Free has none to spend).
  const low = !OWN_KEY_ONLY && !!usage.paid && usage.balance !== null && usage.balance < 200;

  const news = PATCH_NOTES[0];
  const recentRuns = runs.slice(0, 3);
  const row = "group flex items-center gap-3 rounded-xl border border-hairline bg-surface p-3 transition-colors hover:border-accent/50";

  return (
    <div className="mx-auto max-w-[980px] px-4 pt-5 pb-12 md:px-8">
      {/* Slim status row */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-fg-muted">
          <span className="rounded-full bg-surface-2 px-2.5 py-1 font-medium text-fg">
            <strong className="font-mono"><CountUp value={usage.runs30} /></strong>{L({ ko: "개 결과 (30일)", en: " results (30d)" })}
          </span>
          {OWN_KEY_ONLY ? (
            <Link href="/account/api-key" className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium", usage.keyConnected || usage.team ? "bg-grounded/10 text-grounded" : "bg-accent-dim text-accent")}>
              <KeyRound size={12} aria-hidden />
              {usage.keyConnected ? L({ ko: "API 연결됨", en: "API connected" }) : usage.team ? L({ ko: "팀 테스트 키", en: "Team test key" }) : L({ ko: "API 키 등록하기", en: "Add my API key" })}
            </Link>
          ) : (
            <Link href="/account/membership" className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium", low ? "bg-danger/10 text-danger" : "bg-surface-2 text-fg")}>
              <Coins size={12} className={low ? "" : "text-accent"} aria-hidden />
              {usage.balance === null ? "—" : <strong className="font-mono"><CountUp value={usage.balance} /></strong>} {L({ ko: "크레딧", en: "credits" })}
              {!usage.paid && !usage.team ? <span className="text-accent">· {L({ ko: "플랜 고르기", en: "Choose a plan" })}</span> : null}
            </Link>
          )}
          {news ? (
            <Link href="/help/whats-new" className="hidden min-w-0 truncate font-medium text-accent hover:underline md:inline">
              <Sparkles size={12} className="mr-1 inline" aria-hidden />
              {L({ ko: `새 소식 ${news.version}: `, en: `New in ${news.version}: ` })}
              {L(news.title)} →
            </Link>
          ) : null}
        </div>
      </div>

      {/* What shall we make? */}
      <section className="mx-auto mt-10 max-w-[760px] md:mt-14">
        <Reveal>
          <p className="text-center text-sm font-semibold text-accent">
            {name ? L({ ko: `${name}님, 안녕하세요`, en: `Hello, ${name}` }) : L({ ko: "안녕하세요", en: "Hello" })}
          </p>
          <h1 className="mt-1.5 text-center font-display text-[clamp(1.9rem,4.2vw,2.8rem)] leading-[1.1] font-bold tracking-[-0.02em] break-keep text-fg">
            {L({ ko: "무엇을 만들어 볼까요?", en: "What shall we make today?" })}
          </h1>
          <p className="mt-2 text-center text-sm break-keep text-fg-muted">
            {L({ ko: "한 줄로 적으면 맞는 도구를 자동으로 골라요. 아래에서 직접 바꿀 수도 있어요.", en: "Write it in one line and we pick the tool. You can change it below." })}
          </p>
        </Reveal>
        <Reveal delay={0.06} className="mt-6">
          <QuickCreate projects={projects.map((p) => ({ id: p.id, name: p.name }))} />
        </Reveal>
      </section>

      <hr className="mt-10 border-hairline" />

      {/* Continue working · Try next */}
      <div className="mt-8 grid gap-6 md:grid-cols-12">
        <section className="md:col-span-7" aria-labelledby="continue-title">
          <div className="flex items-center justify-between">
            <h2 id="continue-title" className="text-xs font-bold tracking-wider text-accent uppercase">{L({ ko: "이어서 하기", en: "Continue working" })}</h2>
            <Link href="/projects" className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
              <Plus size={12} aria-hidden /> {L({ ko: "새 프로젝트", en: "New project" })}
            </Link>
          </div>
          {recentRuns.length ? (
            <ul className="mt-2.5 space-y-2">
              {recentRuns.map((r) => {
                const t = catalogTool(r.toolId);
                return (
                  <li key={r.id}>
                    <Link href={`/library/${r.id}`} className={row}>
                      <IconTile icon={t?.icon ?? Sparkles} tone={toolTone(r.toolId)} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold text-fg group-hover:text-accent">{runName(r, L)}</span>
                          <StatusChip status={r.status} />
                        </span>
                        <span className="block truncate font-mono text-2xs text-fg-subtle">
                          {r.projectId && projectName.get(r.projectId) ? `${projectName.get(r.projectId)} · ` : ""}
                          {formatDateTime(r.createdAt, locale)}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs font-semibold text-accent opacity-80 group-hover:opacity-100">{L({ ko: "열기", en: "Open" })} →</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="mt-2.5 rounded-xl border border-dashed border-hairline-str p-5 text-center text-sm break-keep text-fg-muted">
              {L({ ko: "아직 만든 결과가 없어요. 위에 한 줄 적거나, 오른쪽 도구로 시작해 보세요.", en: "No results yet. Write a line above, or start with a tool on the right." })}
            </div>
          )}
          {!live && latest && handoffs.length ? (
            <div className="mt-3">
              <p className="text-2xs text-fg-subtle">{L({ ko: "방금 결과로 이어서 만들기", en: "Carry the latest result into" })}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {handoffs.slice(0, 3).map((t) => (
                  <Link
                    key={t.slug}
                    href={`/tools/${t.slug}/run?fromRun=${latest.id}${latest.projectId ? `&project=${latest.projectId}` : ""}`}
                    className="inline-flex items-center gap-1 rounded-full border border-hairline px-2.5 py-1 text-xs text-fg hover:border-accent/50 hover:text-accent"
                  >
                    {toolNumber(t.slug)}. {L(t.name)} <ArrowRight size={11} aria-hidden />
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
          {runs.length > 3 ? (
            <Link href="/library" className="mt-3 inline-block text-xs text-fg-muted hover:text-fg">{L({ ko: "모든 결과 보기 →", en: "All results →" })}</Link>
          ) : null}
        </section>

        <section className="md:col-span-5" aria-labelledby="next-title">
          <h2 id="next-title" className="text-xs font-bold tracking-wider text-studio-warning uppercase">{L({ ko: "다음에 해 볼 것", en: "Try next" })}</h2>
          <ul className="mt-2.5 space-y-2">
            {recommended.map((slug) => {
              const t = catalogTool(slug)!;
              const m = t.engine ? getTool(t.engine) : undefined;
              return (
                <li key={slug}>
                  <Link href={`/tools/${slug}/run${latestProject ? `?project=${latestProject.id}` : ""}`} className={row}>
                    <IconTile icon={t.icon} tone={t.category} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold break-keep text-fg group-hover:text-accent">
                        <span className="font-mono text-fg-subtle">{toolNumber(slug)}.</span> {L(t.name)}
                      </span>
                      <span className="line-clamp-1 text-2xs break-keep text-fg-muted">{L(t.promise)}</span>
                    </span>
                    {m && !OWN_KEY_ONLY ? <span className="shrink-0 font-mono text-2xs text-fg-subtle">{m.estimatedCredits}</span> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
          <Link href="/tools" className="mt-3 inline-block text-xs text-fg-muted hover:text-fg">{L({ ko: "도구 16개 순서대로 보기 →", en: "All 16 tools, in order →" })}</Link>
        </section>
      </div>

      <UpgradeCard plan={usage.plan} host={usage.team} className="mt-8" />

      {/* Projects */}
      <section className="mt-10" aria-labelledby="projects-title">
        <div className="flex items-center justify-between">
          <h2 id="projects-title" className="text-xs font-bold tracking-wider text-fg-muted uppercase">
            {L({ ko: `프로젝트 ${projectCount}`, en: `Projects ${projectCount}` })}
          </h2>
          <Link href="/projects" className="text-xs text-accent hover:underline">{L({ ko: "전체 보기", en: "All" })}</Link>
        </div>
        {projects.length ? (
          <ul className="mt-2.5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {projects.slice(0, 6).map((p) => (
              <li key={p.id}>
                <Link href={`/projects/${p.id}`} className="block rounded-xl border border-hairline bg-surface p-3.5 hover:border-accent/50">
                  <span className="flex items-center gap-2 text-sm font-semibold text-fg">
                    <FolderKanban size={14} className="shrink-0 text-accent" aria-hidden /> <span className="truncate">{p.name}</span>
                  </span>
                  {p.description ? <span className="mt-1 block truncate text-xs text-fg-muted">{p.description}</span> : null}
                  <span className="mt-2 block text-2xs text-fg-subtle">{L({ ko: `결과 ${p.runs}개`, en: `${p.runs} results` })}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <Link href="/projects" className="mt-2.5 flex items-center gap-3 rounded-xl border border-dashed border-hairline-str p-4 text-sm text-fg-muted hover:text-fg">
            <Plus size={16} aria-hidden /> <span className="break-keep">{L({ ko: "프로젝트를 만들면 사업 정보를 기억해서 도구마다 미리 채워 줘요.", en: "A project remembers your business and pre-fills every tool." })}</span>
          </Link>
        )}
      </section>
    </div>
  );
}
