"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Coins,
  FolderKanban,
  FolderPlus,
  Loader2,
  Plus,
  Search,
  Sparkles,
  KeyRound,
} from "lucide-react";
import { catalogTool, publicTools } from "@/lib/tools/catalog";
import { routeBrief } from "@/lib/tools/route-brief";
import { CategoryRail, CountUp, HeroBackdrop, PromoStrip, Reveal, ResultGallery, useRotatingExample, WorkflowShowcase } from "@/components/studio/studio-extras";
import { chainTargets, getTool } from "@/lib/tools/registry";
import { briefField } from "@/lib/tools/brief";
import { formatDateTime } from "@/lib/format-date";
import { useBi, useLocale } from "@/lib/i18n/context";
import { primaryButton, secondaryButton } from "@/components/site/page";
import { cn } from "@/lib/utils";
import { OWN_KEY_ONLY } from "@/lib/site/access";

// The member's home. Everything here is real account state — no sample
// numbers: what's running or just finished, the projects, the latest
// results, what to run next (from the last result and the onboarding
// goal), a one-line quick start, and credits actually spent.

export interface DashboardRun {
  id: string;
  toolId: string;
  status: string;
  title: string | null;
  projectId: string | null;
  createdAt: string;
}

const LIVE = new Set(["pending", "streaming"]);

function Card({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[22px] border border-hairline bg-surface p-5",
        className,
      )}
      aria-label={title}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-fg">{title}</h2>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

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
        {L({ ko: "실패 · 환불됨", en: "Failed · refunded" })}
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
  // Tools whose form has a free-text field a one-line brief can go into.
  const tools = useMemo(
    () =>
      publicTools().filter(
        (t) =>
          t.engine &&
          !t.hidden &&
          getTool(t.engine) &&
          briefField(getTool(t.engine)!),
      ),
    [],
  );
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
  const chosen = !picked && suggested[0] ? suggested[0] : slug;
  const go = () => {
    const q = new URLSearchParams();
    if (brief.trim()) q.set("brief", brief.trim());
    if (project) q.set("project", project);
    const qs = q.toString();
    start(() => router.push(`/tools/${chosen}/run${qs ? `?${qs}` : ""}`));
  };
  const example = useRotatingExample(EXAMPLES.map((e) => L(e)));
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        go();
      }}
    >
      <div className="rounded-[22px] border border-hairline-str bg-surface/90 p-2 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.5)] backdrop-blur focus-within:border-accent">
        <textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              go();
            }
          }}
          rows={3}
          maxLength={600}
          aria-label={L({ ko: "하고 싶은 일", en: "What you want to make" })}
          placeholder={example}
          className="w-full resize-none rounded-2xl bg-transparent px-3 py-2.5 text-base text-fg outline-none placeholder:text-fg-subtle"
        />
        <div className="flex flex-wrap items-center gap-2 border-t border-hairline px-2 pt-2">
          <label className="flex min-w-0 basis-full items-center gap-1.5 text-xs text-fg-muted sm:basis-0 sm:flex-1">
            <span className="w-12 shrink-0 sm:w-auto">{L({ ko: "도구", en: "Tool" })}</span>
            <select
              value={chosen}
              onChange={(e) => {
                setSlug(e.target.value);
                setPicked(true);
              }}
              className="min-w-0 flex-1 rounded-lg border border-hairline bg-bg px-2 py-1.5 text-sm text-fg"
            >
              {tools.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {L(t.name)}
                </option>
              ))}
            </select>
          </label>
          {projects.length ? (
            <label className="flex min-w-0 basis-full items-center gap-1.5 text-xs text-fg-muted sm:basis-0 sm:flex-1">
              <span className="w-12 shrink-0 sm:w-auto">{L({ ko: "프로젝트", en: "Project" })}</span>
              <select value={project} onChange={(e) => setProject(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-hairline bg-bg px-2 py-1.5 text-sm text-fg">
                <option value="">{L({ ko: "없음", en: "None" })}</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <button type="submit" disabled={pending || !chosen} className={cn(primaryButton, "h-10 w-full justify-center px-5 disabled:opacity-60 sm:w-auto")}>
            {pending ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <Sparkles size={15} aria-hidden />} {L({ ko: "만들기 시작", en: "Start" })}
          </button>
        </div>
      </div>
      {suggested.length ? (
        <div className="flex flex-wrap items-center gap-1.5" aria-label={L({ ko: "추천 도구", en: "Suggested tools" })}>
          <span className="text-2xs text-fg-subtle">{L({ ko: "이런 도구가 맞아요", en: "Good fits" })}</span>
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
                className={cn("rounded-full border px-2.5 py-1 text-xs transition-colors", chosen === sl ? "border-accent bg-accent-dim text-accent" : "border-hairline bg-surface text-fg-muted hover:text-fg")}
              >
                {L(t.name)}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5" aria-label={L({ ko: "바로 시작할 예시", en: "Starters" })}>
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
                className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface/80 px-3 py-1.5 text-xs text-fg backdrop-blur transition-[transform,border-color] hover:-translate-y-0.5 hover:border-accent/50"
              >
                <t.icon size={13} className="text-accent" aria-hidden /> {L(st.label)}
              </button>
            );
          })}
        </div>
      )}
      <p className="text-2xs text-fg-subtle">
        {L({
          ko: "도구 화면에서 내용을 확인하고 실행해요. 자료(PDF·Word·PPT)는 도구 화면에서 올릴 수 있어요.",
          en: "You review it on the tool page before running — opening costs nothing. Upload PDFs, Word or PowerPoint files there.",
        })}
      </p>
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
  { slug: "hook-lab", label: { ko: "광고 카피", en: "Ad copy" }, brief: { ko: "인스타그램 광고에 쓸 후킹 문구 — 상품: ", en: "Instagram ad hooks — product: " } },
  { slug: "logo-lab", label: { ko: "로고", en: "Logo" }, brief: { ko: "브랜드 로고 방향 — 이름: ", en: "Logo directions — brand name: " } },
  { slug: "campaign-planner", label: { ko: "캠페인", en: "Campaign" }, brief: { ko: "다음 달 캠페인 계획 — 목표: ", en: "Next month's campaign — goal: " } },
  { slug: "doc-studio", label: { ko: "사업계획서", en: "Business plan" }, brief: { ko: "사업계획서 — 독자(은행·투자자·지원사업): ", en: "Business plan — reader (bank, investor, grant): " } },
  { slug: "proposal-forge", label: { ko: "제안서", en: "Proposal" }, brief: { ko: "제안서 — 제안 대상과 내용: ", en: "Proposal — to whom and what: " } },
  { slug: "market-desk", label: { ko: "시장 조사", en: "Market research" }, brief: { ko: "시장 조사 — 알고 싶은 것: ", en: "Market research — what I need to know: " } },
  { slug: "web-builder", label: { ko: "홈페이지", en: "Website" }, brief: { ko: "홈페이지 — 업종과 방문자가 할 일: ", en: "Website — business and what visitors should do: " } },
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
  usage: { balance: number | null; used30: number; runs30: number; keyConnected?: boolean; team?: boolean };
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
  const low = !OWN_KEY_ONLY && usage.balance !== null && usage.balance < 100;

  return (
    <div className="mx-auto max-w-[1180px] px-4 pt-6 pb-12 md:px-8 md:pt-8">
      <section className="relative overflow-hidden rounded-[32px] border border-hairline bg-surface px-5 py-7 md:px-10 md:py-10">
        <HeroBackdrop />
        <div className="relative grid gap-8 lg:grid-cols-[1.45fr_1fr] lg:items-center">
          <div>
            <Reveal>
              <p className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface/80 px-3 py-1 text-xs text-fg-muted backdrop-blur">
                <Sparkles size={12} className="text-accent" aria-hidden />
                {name ? L({ ko: `${name}님, 안녕하세요`, en: `Hello, ${name}` }) : L({ ko: "안녕하세요", en: "Hello" })}
              </p>
            </Reveal>
            <Reveal delay={0.05}>
              <h1 className="mt-3 font-display text-[clamp(2rem,4.4vw,3.2rem)] leading-[1.08] font-bold tracking-[-0.02em] break-keep text-fg">
                {L({ ko: "무엇을 만들어 볼까요?", en: "What shall we make?" })}
              </h1>
              <p className="mt-2 max-w-xl text-base break-keep text-fg-muted">
                {runs.length
                  ? L({ ko: "한 줄로 적으면 맞는 도구를 골라 드려요. 하던 일은 아래에서 이어서 할 수 있어요.", en: "Write it in a line and we'll pick the tool. Your recent work is just below." })
                  : L({ ko: "한 줄로 적으면 맞는 도구를 골라 드려요. 첫 결과까지 몇 분이면 돼요.", en: "Write it in a line and we'll pick the tool. A first result takes minutes." })}
              </p>
            </Reveal>
            <Reveal delay={0.1} className="mt-5">
              <QuickCreate projects={projects.map((p) => ({ id: p.id, name: p.name }))} />
            </Reveal>
          </div>
          <Reveal delay={0.15}>
            <div className="grid grid-cols-2 gap-3">
              {OWN_KEY_ONLY ? (
                <div className={cn("col-span-2 rounded-[22px] border p-4 backdrop-blur", usage.keyConnected || usage.team ? "border-hairline bg-surface/85" : "border-accent/40 bg-accent-dim")}>
                  <p className="flex items-center gap-1.5 text-xs text-fg-muted">
                    <KeyRound size={13} className="text-accent" aria-hidden /> {L({ ko: "내 API 키", en: "My API key" })}
                  </p>
                  <p className="mt-1 font-display text-2xl font-bold break-keep text-fg">
                    {usage.keyConnected ? L({ ko: "연결됨", en: "Connected" }) : usage.team ? L({ ko: "팀 테스트 키 사용 중", en: "Using the team test key" }) : L({ ko: "아직 없어요", en: "Not added yet" })}
                  </p>
                  {!usage.keyConnected && !usage.team ? (
                    <p className="mt-1 text-xs break-keep text-fg-muted">{L({ ko: "도구를 쓰려면 Google AI Studio 키가 필요해요. 무료 발급, 5분.", en: "Tools run on your own Google AI Studio key. Free to get, about 5 minutes." })}</p>
                  ) : null}
                  <Link href="/account/api-key" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
                    {usage.keyConnected ? L({ ko: "키 관리", en: "Manage key" }) : L({ ko: "API 키 등록하기", en: "Add my API key" })} <ArrowRight size={12} aria-hidden />
                  </Link>
                </div>
              ) : (
                <div className="col-span-2 rounded-[22px] border border-hairline bg-surface/85 p-4 backdrop-blur">
                  <p className="flex items-center gap-1.5 text-xs text-fg-muted">
                    <Coins size={13} className="text-accent" aria-hidden /> {L({ ko: "남은 크레딧", en: "Credits left" })}
                  </p>
                  <p className="mt-1 font-display text-4xl font-bold text-fg">{usage.balance === null ? "—" : <CountUp value={usage.balance} />}</p>
                  <Link href="/account/membership" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
                    {L({ ko: "충전·플랜", en: "Plans" })} <ArrowRight size={12} aria-hidden />
                  </Link>
                </div>
              )}
              <div className="rounded-[22px] border border-hairline bg-surface/85 p-4 backdrop-blur">
                <p className="text-xs text-fg-muted">{L({ ko: "30일 완료", en: "Done, 30 days" })}</p>
                <p className="mt-1 font-display text-2xl font-bold text-fg"><CountUp value={usage.runs30} /></p>
              </div>
              <div className="rounded-[22px] border border-hairline bg-surface/85 p-4 backdrop-blur">
                <p className="text-xs text-fg-muted">{L({ ko: "프로젝트", en: "Projects" })}</p>
                <p className="mt-1 font-display text-2xl font-bold text-fg"><CountUp value={projectCount} /></p>
              </div>
              <Link href="/projects" className={cn(secondaryButton, "h-10 justify-center bg-surface/85 px-3 backdrop-blur")}>
                <FolderPlus size={15} aria-hidden /> {L({ ko: "새 프로젝트", en: "New project" })}
              </Link>
              <Link href="/tools" className={cn(secondaryButton, "h-10 justify-center bg-surface/85 px-3 backdrop-blur")}>
                <Search size={15} aria-hidden /> {L({ ko: "도구 찾기", en: "Find a tool" })}
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <div className="mt-4">
        <PromoStrip />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        {/* Continue working */}
        <Card title={L({ ko: "이어서 하기", en: "Continue working" })}>
          {latest ? (
            <div className="flex flex-col gap-3">
              <Link
                href={`/library/${latest.id}`}
                className="group flex items-center gap-3 rounded-2xl border border-hairline bg-bg p-3.5 hover:border-accent/40"
              >
                {(() => {
                  const t = catalogTool(latest.toolId);
                  return t ? (
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-dim text-accent">
                      <t.icon size={18} aria-hidden />
                    </span>
                  ) : null;
                })()}
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-semibold text-fg">
                      {runName(latest, L)}
                    </span>
                    <StatusChip status={latest.status} />
                  </span>
                  <span className="mt-0.5 block font-mono text-2xs text-fg-subtle">
                    {formatDateTime(latest.createdAt, locale)}
                    {latest.projectId && projectName.get(latest.projectId)
                      ? ` · ${projectName.get(latest.projectId)}`
                      : ""}
                  </span>
                </span>
                <ArrowRight
                  size={16}
                  className="shrink-0 text-fg-subtle transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
              {!live && handoffs.length ? (
                <div>
                  <p className="text-2xs text-fg-subtle">
                    {L({
                      ko: "이 결과로 이어서 만들기",
                      en: "Carry this result into",
                    })}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {handoffs.slice(0, 3).map((t) => {
                      const slug = t.slug;
                      return t.engine ? (
                        <Link
                          key={slug}
                          href={`/tools/${slug}/run?fromRun=${latest.id}${latest.projectId ? `&project=${latest.projectId}` : ""}`}
                          className="inline-flex items-center gap-1 rounded-full border border-hairline px-2.5 py-1 text-xs text-fg hover:border-accent/50 hover:text-accent"
                        >
                          {L(t.name)} <ArrowRight size={11} aria-hidden />
                        </Link>
                      ) : null;
                    })}
                  </div>
                </div>
              ) : null}
              {latestProject ? (
                <Link
                  href={`/projects/${latestProject.id}`}
                  className="flex items-center gap-2 text-xs text-fg-muted hover:text-fg"
                >
                  <FolderKanban size={13} className="text-accent" aria-hidden />{" "}
                  {L({
                    ko: `'${latestProject.name}' 프로젝트 열기`,
                    en: `Open '${latestProject.name}'`,
                  })}
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-hairline-str p-5 text-center">
              <p className="text-sm break-keep text-fg-muted">
                {L({
                  ko: "아직 만든 결과가 없어요. 추천 도구나 바로 시작하기로 첫 결과를 만들어 보세요.",
                  en: "No results yet. Try a recommended tool or the quick start.",
                })}
              </p>
            </div>
          )}
        </Card>

        {/* Recommended */}
        <Card title={L({ ko: "다음에 해 볼 것", en: "Try next" })}>
          <ul className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {recommended.map((slug) => {
              const t = catalogTool(slug)!;
              const m = t.engine ? getTool(t.engine) : undefined;
              return (
                <li key={slug}>
                  <Link
                    href={`/tools/${slug}/run${latestProject ? `?project=${latestProject.id}` : ""}`}
                    className="flex h-full flex-col rounded-2xl border border-hairline bg-bg p-3.5 hover:border-accent/40"
                  >
                    <span className="grid size-8 place-items-center rounded-lg bg-accent-dim text-accent">
                      <t.icon size={15} aria-hidden />
                    </span>
                    <span className="mt-3 text-sm font-semibold break-keep text-fg">
                      {L(t.name)}
                    </span>
                    <span className="mt-1 line-clamp-2 text-xs leading-relaxed break-keep text-fg-muted">
                      {L(t.promise)}
                    </span>
                    {m && !OWN_KEY_ONLY ? (
                      <span className="mt-auto pt-2 font-mono text-2xs text-fg-subtle">
                        {m.estimatedCredits}{" "}
                        {L({ ko: "크레딧", en: "credits" })}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>

      </div>

      {low ? (
        <p className="mt-3 rounded-2xl border border-danger/30 bg-danger/5 px-4 py-2.5 text-xs break-keep text-danger">
          {L({ ko: "크레딧이 얼마 남지 않았어요. 내 API 키를 등록하면 크레딧 없이 쓸 수 있어요.", en: "Running low. With your own API key, runs cost no credits." })}{" "}
          <Link href="/account/api-key" className="font-semibold underline">{L({ ko: "API 키 연결", en: "Connect a key" })}</Link>
        </p>
      ) : null}

      <div className="mt-10">
        <CategoryRail />
      </div>
      <div className="mt-10">
        <WorkflowShowcase projectId={latestProject?.id} />
      </div>
      <div className="mt-10">
        <ResultGallery />
      </div>

      <div className="mt-10 grid gap-4 lg:grid-cols-2">
        {/* Projects */}
        <Card
          title={L({
            ko: `프로젝트 ${projectCount}`,
            en: `Projects ${projectCount}`,
          })}
          action={
            <Link
              href="/projects"
              className="text-xs text-accent hover:underline"
            >
              {L({ ko: "전체 보기", en: "All" })}
            </Link>
          }
        >
          {projects.length ? (
            <ul className="grid gap-2 sm:grid-cols-2">
              {projects.slice(0, 4).map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/projects/${p.id}`}
                    className="block rounded-2xl border border-hairline bg-bg p-3.5 hover:border-accent/40"
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold text-fg">
                      <FolderKanban
                        size={14}
                        className="shrink-0 text-accent"
                        aria-hidden
                      />{" "}
                      <span className="truncate">{p.name}</span>
                    </span>
                    {p.description ? (
                      <span className="mt-1 block truncate text-xs text-fg-muted">
                        {p.description}
                      </span>
                    ) : null}
                    <span className="mt-2 block text-2xs text-fg-subtle">
                      {L({ ko: `결과 ${p.runs}개`, en: `${p.runs} results` })}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Link
              href="/projects"
              className="flex items-center gap-3 rounded-2xl border border-dashed border-hairline-str p-4 text-sm text-fg-muted hover:text-fg"
            >
              <Plus size={16} aria-hidden />{" "}
              <span className="break-keep">
                {L({
                  ko: "프로젝트를 만들면 사업 정보를 기억해서 도구마다 미리 채워 줘요.",
                  en: "A project remembers your business and pre-fills every tool.",
                })}
              </span>
            </Link>
          )}
        </Card>

        {/* Recent results */}
        <Card
          title={L({ ko: "최근 결과", en: "Recent results" })}
          action={
            <Link
              href="/library"
              className="text-xs text-accent hover:underline"
            >
              {L({ ko: "보관함", en: "Library" })}
            </Link>
          }
        >
          {runs.length ? (
            <ul className="divide-y divide-hairline">
              {runs.slice(0, 6).map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/library/${r.id}`}
                    className="flex items-center gap-3 py-2.5 hover:text-accent"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm text-fg">
                          {runName(r, L)}
                        </span>
                        <StatusChip status={r.status} />
                      </span>
                      <span className="block font-mono text-2xs text-fg-subtle">
                        {formatDateTime(r.createdAt, locale)}
                      </span>
                    </span>
                    {r.projectId && projectName.get(r.projectId) ? (
                      <span className="max-w-[40%] shrink-0 truncate rounded bg-accent-dim px-1.5 py-0.5 text-[10px] text-accent">
                        {projectName.get(r.projectId)}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-fg-muted">
              {L({
                ko: "결과는 모두 보관함에 저장돼요.",
                en: "Every result is saved to your Library.",
              })}
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
