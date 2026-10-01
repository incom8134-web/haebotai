"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import { catalogTool } from "@/lib/tools/catalog";
import { getTool } from "@/lib/tools/registry";
import { ONBOARDING_GOALS, type GoalId } from "@/lib/site/onboarding";
import { useBi } from "@/lib/i18n/context";
import { primaryButton, secondaryButton } from "@/components/site/page";
import { cn } from "@/lib/utils";

// First visit (docs/redesign-plan.md §5): what are you building → the
// project's basics → recommended tools and a first task. Three short
// screens, every one skippable. What's typed lands in a real project and
// its memory, so the first tool opens already filled in.

const YEAR = 60 * 60 * 24 * 365;
function remember(goal: GoalId | null) {
  document.cookie = `haebot-onboarded=1; path=/; max-age=${YEAR}; samesite=lax`;
  if (goal)
    document.cookie = `haebot-goal=${goal}; path=/; max-age=${YEAR}; samesite=lax`;
}

const field =
  "w-full rounded-xl border border-hairline bg-surface px-3.5 py-2.5 text-[15px] text-fg outline-none transition-colors placeholder:text-fg-subtle focus:border-accent";

export function OnboardingFlow({ name }: { name: string | null }) {
  const L = useBi();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [goal, setGoal] = useState<GoalId | null>(null);
  const [project, setProject] = useState({ name: "", product: "", target: "" });
  const [projectId, setProjectId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function createProject() {
    setSaving(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: project.name,
          description: project.product,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      const facts = [
        ["company_name", project.name],
        ["product", project.product],
        ["target_customer", project.target],
      ].filter(([, v]) => v.trim());
      // Memory is a convenience: a fact that fails to save doesn't stop onboarding.
      await Promise.all(
        facts.map(([key, value]) =>
          fetch(`/api/projects/${json.id}/facts`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key, value: value.trim() }),
          }).catch(() => null),
        ),
      );
      setProjectId(json.id);
      setStep(2);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const tools = (
    ONBOARDING_GOALS.find((g) => g.id === goal) ?? ONBOARDING_GOALS[0]
  ).tools;
  const runHref = (slug: string) =>
    `/tools/${slug}/run${projectId ? `?project=${projectId}` : ""}`;

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-2xl flex-col px-4 pt-8 pb-12 md:pt-14">
      <div className="flex items-center gap-3">
        <ol
          className="flex flex-1 gap-1.5"
          aria-label={L({
            ko: `3단계 중 ${step + 1}단계`,
            en: `Step ${step + 1} of 3`,
          })}
        >
          {[0, 1, 2].map((i) => (
            <li
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full",
                i <= step ? "bg-accent" : "bg-fg/10",
              )}
            />
          ))}
        </ol>
        <Link
          href="/studio"
          onClick={() => remember(goal)}
          className="text-sm text-fg-muted hover:text-fg"
        >
          {L({ ko: "건너뛰기", en: "Skip" })}
        </Link>
      </div>

      {step === 0 ? (
        <section className="mt-10" aria-labelledby="ob-title">
          <p className="text-sm font-medium text-accent">
            {name
              ? L({ ko: `${name}님, 반가워요`, en: `Welcome, ${name}` })
              : L({ ko: "반가워요", en: "Welcome" })}
          </p>
          <h1
            id="ob-title"
            className="mt-2 font-display text-[clamp(1.8rem,4vw,2.4rem)] leading-tight font-bold tracking-[-0.02em] break-keep text-fg"
          >
            {L({ ko: "무엇을 하고 싶으세요?", en: "What are you working on?" })}
          </h1>
          <p className="mt-2 text-base break-keep text-fg-muted">
            {L({
              ko: "고른 목표에 맞춰 먼저 쓸 도구를 추천해 드려요. 나중에 언제든 바꿀 수 있어요.",
              en: "We'll suggest which tools to start with. You can change this any time.",
            })}
          </p>
          <div
            role="radiogroup"
            aria-labelledby="ob-title"
            className="mt-7 grid gap-2.5 sm:grid-cols-2"
          >
            {ONBOARDING_GOALS.map((g) => (
              <button
                key={g.id}
                type="button"
                role="radio"
                aria-checked={goal === g.id}
                onClick={() => setGoal(g.id)}
                className={cn(
                  "flex items-start gap-3 rounded-2xl border p-4 text-left transition-colors",
                  goal === g.id
                    ? "border-accent bg-accent-dim"
                    : "border-hairline bg-surface hover:border-accent/40",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border",
                    goal === g.id
                      ? "border-accent bg-accent text-white"
                      : "border-hairline-str",
                  )}
                >
                  {goal === g.id ? <Check size={12} aria-hidden /> : null}
                </span>
                <span>
                  <span className="block font-semibold break-keep text-fg">
                    {L(g.title)}
                  </span>
                  <span className="mt-0.5 block text-sm break-keep text-fg-muted">
                    {L(g.body)}
                  </span>
                </span>
              </button>
            ))}
          </div>
          <div className="mt-8 flex justify-end">
            <button
              type="button"
              disabled={!goal}
              onClick={() => {
                remember(goal);
                setStep(1);
              }}
              className={cn(primaryButton, "h-11 px-5 disabled:opacity-50")}
            >
              {L({ ko: "다음", en: "Next" })}{" "}
              <ArrowRight size={15} aria-hidden />
            </button>
          </div>
        </section>
      ) : null}

      {step === 1 ? (
        <section className="mt-10" aria-labelledby="ob-title">
          <h1
            id="ob-title"
            className="font-display text-[clamp(1.8rem,4vw,2.4rem)] leading-tight font-bold tracking-[-0.02em] break-keep text-fg"
          >
            {L({ ko: "프로젝트를 만들어요", en: "Start a project" })}
          </h1>
          <p className="mt-2 text-base break-keep text-fg-muted">
            {L({
              ko: "여기 적은 내용은 프로젝트가 기억하고, 도구를 열 때마다 입력칸에 미리 채워져요.",
              en: "The project remembers this and fills it into every tool you open.",
            })}
          </p>
          <form
            className="mt-7 flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (project.name.trim()) void createProject();
            }}
          >
            <label className="flex flex-col gap-1.5 text-sm font-medium text-fg">
              {L({ ko: "사업·브랜드 이름", en: "Business or brand name" })}{" "}
              <span className="sr-only">
                ({L({ ko: "필수", en: "required" })})
              </span>
              <input
                required
                maxLength={80}
                value={project.name}
                onChange={(e) =>
                  setProject({ ...project, name: e.target.value })
                }
                placeholder={L({
                  ko: "예: 달빛 양조 시음 키트",
                  en: "e.g. Moonlight tasting kit",
                })}
                className={field}
                autoFocus
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-fg">
              <span>
                {L({
                  ko: "무엇을 만들거나 파나요",
                  en: "What do you make or sell?",
                })}{" "}
                <span className="font-normal text-fg-subtle">
                  ({L({ ko: "선택", en: "optional" })})
                </span>
              </span>
              <textarea
                rows={2}
                maxLength={300}
                value={project.product}
                onChange={(e) =>
                  setProject({ ...project, product: e.target.value })
                }
                placeholder={L({
                  ko: "예: 지역 양조장 전통주 4종 미니 병과 페어링 카드가 든 시음 키트",
                  en: "e.g. A tasting kit of four local brews with pairing cards",
                })}
                className={field}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-fg">
              <span>
                {L({ ko: "누구를 위한 건가요", en: "Who is it for?" })}{" "}
                <span className="font-normal text-fg-subtle">
                  ({L({ ko: "선택", en: "optional" })})
                </span>
              </span>
              <input
                maxLength={200}
                value={project.target}
                onChange={(e) =>
                  setProject({ ...project, target: e.target.value })
                }
                placeholder={L({
                  ko: "예: 집들이 선물을 고르는 20~30대",
                  en: "e.g. People in their 20s–30s buying housewarming gifts",
                })}
                className={field}
              />
            </label>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setStep(0)}
                className={cn(secondaryButton, "h-11 px-4")}
              >
                <ArrowLeft size={15} aria-hidden />{" "}
                {L({ ko: "이전", en: "Back" })}
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="ml-auto px-3 text-sm text-fg-muted hover:text-fg"
              >
                {L({
                  ko: "프로젝트 없이 계속",
                  en: "Continue without a project",
                })}
              </button>
              <button
                type="submit"
                disabled={!project.name.trim() || saving}
                className={cn(primaryButton, "h-11 px-5 disabled:opacity-50")}
              >
                {saving
                  ? L({ ko: "만드는 중…", en: "Creating…" })
                  : L({ ko: "프로젝트 만들기", en: "Create project" })}{" "}
                <ArrowRight size={15} aria-hidden />
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="mt-10" aria-labelledby="ob-title">
          <h1
            id="ob-title"
            className="font-display text-[clamp(1.8rem,4vw,2.4rem)] leading-tight font-bold tracking-[-0.02em] break-keep text-fg"
          >
            {L({ ko: "이 순서로 시작해 보세요", en: "Start in this order" })}
          </h1>
          <p className="mt-2 text-base break-keep text-fg-muted">
            {projectId
              ? L({
                  ko: `'${project.name}' 프로젝트에서 열려요. 앞 도구의 결과가 다음 도구로 이어져요.`,
                  en: `They open in '${project.name}'. Each result carries into the next tool.`,
                })
              : L({
                  ko: "앞 도구의 결과를 다음 도구로 이어서 쓸 수 있어요.",
                  en: "Each result can carry into the next tool.",
                })}
          </p>
          <ol className="mt-7 space-y-2.5">
            {tools.map((slug, i) => {
              const t = catalogTool(slug)!;
              const m = t.engine ? getTool(t.engine) : undefined;
              const first = i === 0;
              return (
                <li
                  key={slug}
                  className={cn(
                    "flex items-center gap-4 rounded-2xl border p-4",
                    first
                      ? "border-accent/50 bg-accent-dim"
                      : "border-hairline bg-surface",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-10 shrink-0 place-items-center rounded-xl",
                      first
                        ? "bg-accent text-white"
                        : "bg-surface-2 text-accent",
                    )}
                  >
                    <t.icon size={18} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold break-keep text-fg">
                        {L(t.name)}
                      </span>
                      {first ? (
                        <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-white">
                          {L({ ko: "첫 작업", en: "First task" })}
                        </span>
                      ) : (
                        <span className="font-mono text-2xs text-fg-subtle">
                          {i + 1}
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-sm break-keep text-fg-muted">
                      {L(t.promise)}
                    </span>
                    {m ? (
                      <span className="mt-1 block font-mono text-2xs text-fg-subtle">
                        {m.estimatedCredits}{" "}
                        {L({ ko: "크레딧", en: "credits" })} · ~
                        {Math.max(1, Math.round(m.estimatedSeconds / 60))}
                        {L({ ko: "분", en: " min" })}
                      </span>
                    ) : null}
                  </span>
                  {first ? (
                    <Link
                      href={runHref(slug)}
                      onClick={() => remember(goal)}
                      className={cn(primaryButton, "h-10 shrink-0 px-4")}
                    >
                      {L({ ko: "시작하기", en: "Start" })}
                    </Link>
                  ) : (
                    <Link
                      href={runHref(slug)}
                      onClick={() => remember(goal)}
                      className="shrink-0 text-sm text-fg-muted hover:text-fg"
                      aria-label={L({
                        ko: `${t.name.ko} 열기`,
                        en: `Open ${t.name.en}`,
                      })}
                    >
                      <ArrowRight size={16} aria-hidden />
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
          <div className="mt-8 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className={cn(secondaryButton, "h-11 px-4")}
            >
              <ArrowLeft size={15} aria-hidden />{" "}
              {L({ ko: "이전", en: "Back" })}
            </button>
            <Link
              href="/studio"
              onClick={() => remember(goal)}
              className="ml-auto text-sm text-fg-muted hover:text-fg"
            >
              {L({ ko: "대시보드로 가기", en: "Go to the dashboard" })}
            </Link>
          </div>
          <p className="mt-6 text-2xs text-fg-subtle">
            {L({
              ko: "가입 크레딧 500이면 위 세 도구를 모두 써 볼 수 있어요.",
              en: "Your 500 sign-up credits cover all three.",
            })}
          </p>
        </section>
      ) : null}
    </div>
  );
}
