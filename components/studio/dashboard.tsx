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
} from "lucide-react";
import { catalogTool, publicTools } from "@/lib/tools/catalog";
import { routeBrief } from "@/lib/tools/route-brief";
import { chainTargets, getTool } from "@/lib/tools/registry";
import { briefField } from "@/lib/tools/brief";
import { formatDateTime } from "@/lib/format-date";
import { useBi, useLocale } from "@/lib/i18n/context";
import { primaryButton, secondaryButton } from "@/components/site/page";
import { cn } from "@/lib/utils";

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
  return (
    <Card title={L({ ko: "바로 시작하기", en: "Quick start" })}>
      <form
        className="flex flex-col gap-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          go();
        }}
      >
        <textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          rows={3}
          maxLength={600}
          aria-label={L({ ko: "하고 싶은 일", en: "What you want to make" })}
          placeholder={L({
            ko: "하고 싶은 일을 한두 줄로 — 예: 4월 한정 딸기 타르트를 동네 20~30대에게 알리고 싶어요",
            en: "A line or two — e.g. Launch an April-only strawberry tart to locals in their 20s–30s",
          })}
          className="rounded-xl border border-hairline bg-bg px-3 py-2.5 text-sm text-fg outline-none placeholder:text-fg-subtle focus:border-accent"
        />
        {suggested.length ? (
          <div className="flex flex-wrap items-center gap-1.5" aria-label={L({ ko: "추천 도구", en: "Suggested tools" })}>
            <span className="text-2xs text-fg-subtle">{L({ ko: "이런 도구가 맞아요", en: "Good fits" })}</span>
            {suggested.map((s) => {
              const t = tools.find((x) => x.slug === s);
              if (!t) return null;
              return (
                <button
                  key={s}
                  type="button"
                  aria-pressed={chosen === s}
                  onClick={() => {
                    setSlug(s);
                    setPicked(true);
                  }}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs transition-colors",
                    chosen === s ? "border-accent bg-accent-dim text-accent" : "border-hairline text-fg-muted hover:text-fg",
                  )}
                >
                  {L(t.name)}
                </button>
              );
            })}
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex min-w-0 flex-1 items-center gap-1.5 text-xs text-fg-muted">
            <span className="shrink-0">{L({ ko: "도구", en: "Tool" })}</span>
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
            <label className="flex min-w-0 flex-1 items-center gap-1.5 text-xs text-fg-muted">
              <span className="shrink-0">
                {L({ ko: "프로젝트", en: "Project" })}
              </span>
              <select
                value={project}
                onChange={(e) => setProject(e.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-hairline bg-bg px-2 py-1.5 text-sm text-fg"
              >
                <option value="">{L({ ko: "없음", en: "None" })}</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <button
            type="submit"
            disabled={pending || !chosen}
            className={cn(primaryButton, "h-9 px-4 disabled:opacity-60")}
          >
            {pending ? (
              <Loader2 size={14} className="animate-spin" aria-hidden />
            ) : (
              <Sparkles size={14} aria-hidden />
            )}{" "}
            {L({ ko: "열기", en: "Open" })}
          </button>
        </div>
        <p className="text-2xs text-fg-subtle">
          {L({
            ko: "도구 화면에서 내용을 확인하고 실행해요. 열기만 해서는 크레딧이 들지 않아요.",
            en: "You review it on the tool page before running — opening costs nothing.",
          })}
        </p>
      </form>
    </Card>
  );
}

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
  usage: { balance: number | null; used30: number; runs30: number };
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
  const low = usage.balance !== null && usage.balance < 100;

  return (
    <div className="mx-auto max-w-[1180px] px-4 pt-6 pb-12 md:px-8 md:pt-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[clamp(1.9rem,3.6vw,2.6rem)] leading-tight font-bold tracking-[-0.02em] break-keep text-fg">
            {name
              ? L({ ko: `${name}님, 안녕하세요`, en: `Hello, ${name}` })
              : L({ ko: "안녕하세요", en: "Hello" })}
          </h1>
          <p className="mt-1.5 text-base break-keep text-fg-muted">
            {runs.length
              ? L({
                  ko: "하던 일을 이어서 하거나, 다음 도구로 넘어가 보세요.",
                  en: "Pick up where you left off, or move on to the next tool.",
                })
              : L({
                  ko: "첫 결과를 만들어 볼까요? 아래에서 바로 시작할 수 있어요.",
                  en: "Ready for a first result? Start right below.",
                })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/projects" className={cn(secondaryButton, "h-10 px-4")}>
            <FolderPlus size={15} aria-hidden />{" "}
            {L({ ko: "새 프로젝트", en: "New project" })}
          </Link>
          <Link href="/tools" className={cn(secondaryButton, "h-10 px-4")}>
            <Search size={15} aria-hidden />{" "}
            {L({ ko: "도구 찾기", en: "Find a tool" })}
          </Link>
        </div>
      </header>

      <div className="mt-8 grid gap-4 lg:grid-cols-[1.25fr_1fr]">
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

        <QuickCreate
          projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* Recommended */}
        <Card
          title={L({ ko: "다음에 해 볼 것", en: "Try next" })}
          className="lg:col-span-2"
        >
          <ul className="grid gap-2 sm:grid-cols-3">
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
                    {m ? (
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

        {/* Usage */}
        <Card
          title={L({ ko: "크레딧", en: "Credits" })}
          action={
            <Link
              href="/account/membership"
              className="text-xs text-accent hover:underline"
            >
              {L({ ko: "충전·플랜", en: "Plans" })}
            </Link>
          }
        >
          <p className="flex items-baseline gap-2">
            <Coins size={16} className="self-center text-accent" aria-hidden />
            <span className="font-display text-3xl font-bold text-fg">
              {usage.balance === null
                ? "—"
                : usage.balance.toLocaleString("en-US")}
            </span>
            <span className="text-sm text-fg-muted">
              {L({ ko: "남음", en: "left" })}
            </span>
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl bg-surface-2 px-3 py-2">
              <dt className="text-fg-subtle">
                {L({ ko: "최근 30일 사용", en: "Used, 30 days" })}
              </dt>
              <dd className="mt-0.5 font-mono text-sm text-fg">
                {usage.used30.toLocaleString("en-US")}
              </dd>
            </div>
            <div className="rounded-xl bg-surface-2 px-3 py-2">
              <dt className="text-fg-subtle">
                {L({ ko: "완료한 실행", en: "Finished runs" })}
              </dt>
              <dd className="mt-0.5 font-mono text-sm text-fg">
                {usage.runs30}
              </dd>
            </div>
          </dl>
          {low ? (
            <p className="mt-3 text-xs break-keep text-danger">
              {L({
                ko: "크레딧이 얼마 남지 않았어요. 내 API 키를 등록하면 크레딧 없이 쓸 수 있어요.",
                en: "Running low. With your own API key, runs cost no credits.",
              })}
            </p>
          ) : (
            <p className="mt-3 text-2xs break-keep text-fg-subtle">
              {L({
                ko: "실패하거나 취소한 실행은 자동으로 환불돼요.",
                en: "Failed and cancelled runs are refunded automatically.",
              })}
            </p>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
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
