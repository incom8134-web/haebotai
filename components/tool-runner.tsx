"use client";

import { toolSlug } from "@/lib/tools/catalog";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { AlertTriangle, RotateCcw, SquarePen, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Segmented } from "@/components/site/page";
import type { ToolFormValues } from "@/components/tool-form";
import { RunResult } from "@/components/run-result";
import { RunProgress } from "@/components/run-progress";
import { AgentTimeline } from "@/components/agent/agent-timeline";
import { QuestionCard } from "@/components/agent/question-card";
import type { AgentEvent, Intent, Question } from "@/lib/agents/types";
import { emptyReference, ReferencePanel, uploadReferenceFiles, type ReferenceValue } from "@/components/tools/reference-panel";
import { getTool } from "@/lib/tools/registry";
import { CATEGORY_LABELS } from "@/lib/tools/registry/categories";
import { seedFromChain } from "@/lib/tools/chain";
import { seedFromBrief } from "@/lib/tools/brief";
import { getToolContent } from "@/lib/tools/content";
import { RunGuide } from "@/components/tools/run-guide";
import { getExperience } from "@/lib/tools/experience";
import { cn } from "@/lib/utils";
import { ExField } from "@/components/tools/experience/controls";
import { FreeRequest } from "@/components/tools/free-request";
import { localizeField } from "@/lib/tools/fields-en";
import { presetValues } from "@/lib/tools/presets-en";
import { Stage } from "@/components/tools/experience/stage";
import { useLocale, useT, useBi } from "@/lib/i18n/context";
import { useLocalValue } from "@/lib/hooks/use-local-list";
import { resolveCost } from "@/lib/ai/resolve-provider";
import { mapRunError } from "@/lib/ai/client-error-messages";
import { PROVIDER_LABEL, type ProviderId } from "@/lib/ai/types";
import type { DictKey } from "@/lib/i18n/dictionaries";
import type { Source } from "@/lib/tools/registry/shared";
import type { BusinessProfile } from "@/lib/tools/types";

// HAEBOT_A_TOOLS_SPEC.md §3.3 / §3.2 / §5.2 — profile chips show exactly
// what context a tool is using (removing one overrides that run only, it
// never edits the saved profile); the run itself streams from the T2
// route handler with a cancel that appears after 5s, per §3.2's
// non-negotiables.

const PROFILE_LABEL_KEYS: Record<keyof BusinessProfile, DictKey> = {
  brand_name: "profile_brand_name",
  industry: "profile_industry",
  business_stage: "profile_chip_stage",
  target_customer: "profile_target_customer",
  tone: "profile_tone",
  voice_examples: "profile_voice_examples",
  brand_colors: "profile_brand_colors",
  logo_asset_id: "profile_chip_logo",
  region: "profile_region",
  weekly_hours: "profile_weekly_hours",
  budget_band: "profile_budget_band",
};

function formatProfileValue(
  value: BusinessProfile[keyof BusinessProfile],
): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (Array.isArray(value)) return value.length ? value.join(", ") : null;
  return String(value);
}

type RunPhase = "idle" | "understanding" | "asking" | "streaming" | "done" | "cancelled" | "error";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// Dropzone hands up raw File objects (ToolForm's "image" field kind);
// the run request is plain JSON, so convert each File[] value to base64
// data URLs before it's sent. generate.ts's collectInputImages() parses
// them back into request parts server-side.
async function serializeValues(values: ToolFormValues): Promise<ToolFormValues> {
  const entries = await Promise.all(
    Object.entries(values).map(async ([key, value]) => {
      if (Array.isArray(value) && value.length > 0 && value.every((v) => v instanceof File)) {
        return [key, await Promise.all((value as File[]).map(fileToDataUrl))] as const;
      }
      return [key, value] as const;
    }),
  );
  return Object.fromEntries(entries);
}

interface ChainedFrom {
  runId: string;
  toolId: string;
  output: unknown;
  /** Which item of the source result was chosen (?pick=), e.g. one idea card. */
  pick?: number;
}

function ToolRunner({
  toolId,
  profile,
  chainedFrom,
  initialBrief,
  initialPreset,
  availableProviders,
  supportedProviders,
  defaultProvider,
  hasOwnKey,
  isStudent,
  balance,
}: {
  toolId: string;
  profile: BusinessProfile | null;
  chainedFrom: ChainedFrom | null;
  /** Free-text brief handed over from the Studio (?brief=). */
  initialBrief?: string;
  /** Index into this tool's presets (lib/tools/content.json), from ?preset=. */
  initialPreset?: number;
  /** Engines this tool supports AND the user actually has a usable key for (google always included). */
  availableProviders: ProviderId[];
  /** Every engine this tool's capability entry lists, regardless of key status — used only to decide whether to show the "register a key" hint. */
  supportedProviders: ProviderId[];
  defaultProvider: ProviderId;
  /** Which of availableProviders the user has their own (non-broken) key for — drives the live cost line. */
  hasOwnKey: Partial<Record<ProviderId, boolean>>;
  isStudent: boolean;
  balance: number | null;
}) {
  const manifest = getTool(toolId);
  const exp = getExperience(toolId);
  const { locale } = useLocale();
  const t = useT();
  const L = useBi();
  const [savedProvider, setSavedProvider] = useLocalValue(`haebot-engine-${toolId}`);
  const provider =
    savedProvider && availableProviders.includes(savedProvider as ProviderId)
      ? (savedProvider as ProviderId)
      : defaultProvider;
  const cost = manifest ? resolveCost(provider, !!hasOwnKey[provider], isStudent, manifest.estimatedCredits) : 0;

  const [values, setValues] = useState<ToolFormValues>(() => {
    if (chainedFrom) return seedFromChain(toolId, chainedFrom.toolId, chainedFrom.output, chainedFrom.pick);
    const preset = initialPreset !== undefined ? getToolContent(toolId)?.presets[initialPreset] : undefined;
    if (preset) return { ...presetValues(toolId, initialPreset!, preset.values, locale) };
    const brief = manifest ? seedFromBrief(manifest, initialBrief) : {};
    if (Object.keys(brief).length) return brief;
    // A cold visit (no chain, no ?preset=, no brief) opens with the
    // tool's first example pre-filled rather than blank fields — same
    // promise ToolHome's example gallery already makes ("opens with the
    // form filled in"), just honored on a direct /run visit too.
    return { ...presetValues(toolId, 0, getToolContent(toolId)?.presets[0]?.values ?? {}, locale) };
  });
  // The language is read on the client after the first render, so a form
  // seeded with a preset in Korean switches to the English sample values
  // once English is known — only while the user hasn't edited it.
  const seeded = useRef<{ index: number; values: ToolFormValues } | null>(null);
  if (seeded.current === null && !chainedFrom && !initialBrief) {
    const index = initialPreset ?? 0;
    const preset = getToolContent(toolId)?.presets[index];
    if (preset) seeded.current = { index, values: { ...preset.values } };
  }
  useEffect(() => {
    const seed = seeded.current;
    if (!seed || locale !== "en") return;
    setValues((current) => {
      const untouched = Object.keys(seed.values).every((k) => JSON.stringify(current[k]) === JSON.stringify(seed.values[k]));
      return untouched ? { ...current, ...presetValues(toolId, seed.index, seed.values, "en") } : current;
    });
  }, [locale, toolId]);
  const [excludedProfileKeys, setExcludedProfileKeys] = useState<Set<string>>(
    new Set(),
  );
  const [phase, setPhase] = useState<RunPhase>("idle");
  const [reference, setReference] = useState<ReferenceValue>(() => emptyReference(toolId));
  const [final, setFinal] = useState<{
    input: ToolFormValues;
    output: unknown;
    sources: Source[];
    creditsUsed: number;
    runId: string;
    provider: ProviderId;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<ReturnType<typeof mapRunError> | null>(null);
  const [showCancel, setShowCancel] = useState(false);
  // Cancel is only offered once the server has created the run: before
  // that there is nothing to cancel (and nothing to refund) on the server.
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [cancelNote, setCancelNote] = useState<string | null>(null);
  // The run's live steps, the understood request, and pending questions.
  const [steps, setSteps] = useState<AgentEvent[]>([]);
  const [understood, setUnderstood] = useState("");
  const [asking, setAsking] = useState<{ intent: Intent | null; questions: Question[]; base: Record<string, unknown>; serialized: ToolFormValues } | null>(null);
  const lastIntent = useRef<Intent | null>(null);
  const router = useRouter();
  const abortRef = useRef<AbortController | null>(null);
  const formTopRef = useRef<HTMLDivElement | null>(null);
  const runIdRef = useRef<string | null>(null);

  // ⌘/Ctrl + Enter runs the tool from anywhere on the page (the Run button shows the hint).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !e.isComposing) {
        e.preventDefault();
        document.querySelector<HTMLButtonElement>("[data-run-button]")?.click();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  if (!manifest) return notFound();

  // After a result: start over with an empty form, or run the same inputs
  // again for a fresh version (a new creative direction each time).
  function startNew() {
    setValues({});
    setExcludedProfileKeys(new Set());
    setReference(emptyReference(toolId));
    setFinal(null);
    setErrorMsg(null);
    setPhase("idle");
    formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  const nextActions = (
    <div className="flex flex-wrap items-center gap-2">
      <Button onClick={startNew} className="studio-gradient-bg h-10 rounded-2xl px-4 text-white">
        <SquarePen className="size-4" aria-hidden /> {L({ ko: "새로 만들기", en: "Start new" })}
      </Button>
      <Button variant="secondary" onClick={() => handleRun()} className="h-10 rounded-2xl px-4">
        <RotateCcw className="size-4" aria-hidden /> {L({ ko: "같은 조건으로 다시 만들기", en: "Run again with the same inputs" })}
      </Button>
      <span className="text-2xs text-fg-subtle">{L({ ko: `다시 만들기는 크레딧 ${cost}가 다시 들어요`, en: `Running again uses ${cost} credits` })}</span>
    </div>
  );

  const profileChips = profile
    ? manifest.usesProfile
        .map((key) => ({ key, display: formatProfileValue(profile[key]) }))
        .filter(
          (c): c is { key: keyof BusinessProfile; display: string } =>
            c.display !== null,
        )
    : [];

  // A run: read the request (understanding + at most three questions,
  // only when something critical is missing) → start the job → follow its
  // steps. The job runs on the server whether or not this page stays open.
  async function handleRun(opts?: { strategyOverride?: string }) {
    if (phase === "streaming" || phase === "understanding") return;
    setFinal(null);
    setErrorMsg(null);
    setShowCancel(false);
    setCancelNote(null);
    setActiveRunId(null);
    setSteps([]);
    setAsking(null);
    setUnderstood("");

    let serialized: ToolFormValues;
    let referencePayload: { mode: string; text: string; files: { name: string; path: string }[] } | undefined;
    try {
      setPhase("understanding");
      serialized = await serializeValues(values);
      // "참고 자료": sent beside the form values; the server validates it,
      // reads the documents and keeps only text and file names on the run.
      let referenceFiles: { name: string; path: string }[] = [];
      try {
        referenceFiles = await uploadReferenceFiles(reference.files);
      } catch (err) {
        setPhase("error");
        const msg = err instanceof Error ? err.message : "참고 파일을 올리지 못했습니다";
        setErrorMsg({ ko: msg, en: "Couldn't upload the reference files. Please try again." });
        return;
      }
      referencePayload =
        reference.text.trim() || reference.files.length
          ? { mode: reference.mode, text: reference.text, files: referenceFiles }
          : undefined;
    } catch {
      setPhase("error");
      setErrorMsg({ ko: t("network_error"), en: t("network_error") });
      return;
    }

    const base = {
      values: serialized,
      provider,
      ...(excludedProfileKeys.size ? { excludeProfile: [...excludedProfileKeys] } : {}),
      ...(referencePayload ? { reference: referencePayload } : {}),
    };
    // Understanding first. Never blocks the run: on any failure the run
    // works it out itself.
    let intent: Intent | null = null;
    let questions: Question[] = [];
    if (!opts?.strategyOverride) {
      try {
        const res = await fetch(`/api/tools/${toolId}/intent`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(base),
          signal: AbortSignal.timeout(30_000),
        });
        if (res.ok) {
          const data = (await res.json()) as { intent: Intent | null; questions: Question[] };
          intent = data.intent;
          questions = data.questions ?? [];
        }
      } catch {
        /* run without it */
      }
    } else {
      intent = lastIntent.current;
    }
    lastIntent.current = intent;
    if (intent?.summary) setUnderstood(intent.summary);
    if (questions.length) {
      setAsking({ intent, questions, base, serialized });
      setPhase("asking");
      return;
    }
    await startRun(base, serialized, { intent, answers: [], strategyOverride: opts?.strategyOverride ?? null });
  }

  async function startRun(
    base: Record<string, unknown>,
    serialized: ToolFormValues,
    agent: { intent: Intent | null; answers: { question: string; answer: string }[]; strategyOverride: string | null },
  ) {
    setAsking(null);
    setPhase("streaming");
    const controller = new AbortController();
    abortRef.current = controller;
    runIdRef.current = null;
    const cancelTimer = setTimeout(() => setShowCancel(true), 5000);
    let finished = false;
    try {
      const res = await fetch(`/api/tools/${toolId}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...base, agent, ...(chainedFrom ? { chainedFromRunId: chainedFrom.runId } : {}) }),
        signal: controller.signal,
      });
      const started = (await res.json().catch(() => ({}))) as { runId?: string; provider?: ProviderId; error?: string };
      if (!res.ok || !started.runId) {
        setPhase("error");
        setErrorMsg(started.error ? mapRunError(started.error) : { ko: t("run_failed"), en: t("run_failed") });
        return;
      }
      const runId = started.runId;
      runIdRef.current = runId;
      setActiveRunId(runId);

      // Follow the job. Each connection lasts a few minutes; reconnect
      // from the last seen step until the run ends.
      let since = 0;
      let failures = 0;
      while (!finished && !controller.signal.aborted) {
        let res2: Response;
        try {
          res2 = await fetch(`/api/runs/${runId}/events?since=${since}`, { signal: controller.signal, cache: "no-store" });
        } catch {
          if (controller.signal.aborted) break;
          if (++failures > 6) break;
          await new Promise((r) => setTimeout(r, 1500 * failures));
          continue;
        }
        if (!res2.ok || !res2.body) {
          if (++failures > 6) break;
          await new Promise((r) => setTimeout(r, 1500 * failures));
          continue;
        }
        failures = 0;
        const reader = res2.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            for (const line of lines) {
              if (!line) continue;
              let event;
              try {
                event = JSON.parse(line);
              } catch {
                continue;
              }
              if (event.type === "step" && event.event) {
                since += 1;
                setSteps((prev) => [...prev, event.event as AgentEvent]);
              } else if (event.type === "done") {
                finished = true;
                setPhase("done");
                setFinal({
                  input: serialized,
                  output: event.output,
                  sources: event.sources ?? [],
                  creditsUsed: event.creditsUsed,
                  runId: event.runId,
                  provider: event.provider ?? provider,
                });
              } else if (event.type === "error") {
                finished = true;
                setPhase("error");
                setErrorMsg(mapRunError(event.error));
              } else if (event.type === "cancelled") {
                finished = true;
                setPhase("cancelled");
              }
            }
          }
        } catch {
          if (controller.signal.aborted) break;
        }
      }
      if (!finished && !controller.signal.aborted) {
        setPhase("error");
        setErrorMsg({ ko: "연결이 끊겨 진행 상황을 받지 못했어요. 작업은 계속되니 잠시 뒤 보관함에서 결과를 확인해 주세요. 실패한 실행의 크레딧은 자동으로 돌아가요.", en: "Lost the connection to the run. It keeps going — check the Library shortly. Failed runs are refunded automatically." });
      }
    } catch {
      setPhase(controller.signal.aborted ? "cancelled" : "error");
      if (!controller.signal.aborted) setErrorMsg({ ko: t("network_error"), en: t("network_error") });
    } finally {
      clearTimeout(cancelTimer);
      setShowCancel(false);
      setActiveRunId(null);
      abortRef.current = null;
      runIdRef.current = null;
      // Credits changed (charged, or refunded): refresh the balance in the
      // shell and on this page. Client state here is kept.
      router.refresh();
    }
  }

  // Record the cancel on the server first (that's what stops the job and
  // refunds), then stop following it.
  async function handleCancel() {
    const runId = runIdRef.current;
    if (!runId) return;
    setShowCancel(false);
    const res = await fetch(`/api/runs/${runId}/cancel`, { method: "POST", keepalive: true }).catch(() => null);
    const data = res ? ((await res.json().catch(() => ({}))) as { cancelled?: boolean }) : {};
    if (data.cancelled) {
      abortRef.current?.abort();
      setPhase("cancelled");
      return;
    }
    // Too late to cancel (already finishing): let the result arrive rather
    // than claim a refund that didn't happen.
    setCancelNote(L({ ko: "이미 거의 끝나서 취소할 수 없어요. 결과가 곧 나와요.", en: "It's nearly done, so it can't be cancelled — the result is on its way." }));
  }

  const side = (
    <aside className="min-w-0 space-y-4 lg:sticky lg:top-24">
      {exp && exp.layout !== "steps" ? <Stage exp={exp} values={values} /> : null}
      <RunGuide
        toolId={toolId}
        onPreset={(i) => {
          const preset = getToolContent(toolId)?.presets[i];
          if (preset) setValues({ ...presetValues(toolId, i, preset.values, locale) });
        }}
      />
    </aside>
  );

  return (
    <div ref={formTopRef} className="mx-auto max-w-[1240px] scroll-mt-20 px-4 pt-6 pb-10 md:px-6 md:pt-10">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <Link href={`/tools?category=${manifest.category}`} className="hover:text-fg">
              {CATEGORY_LABELS[manifest.category][locale]}
            </Link>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <Link href={`/tools/${toolSlug(manifest.id)}`} className="hover:text-fg">
              {locale === "en" ? "Overview" : "소개·예시"}
            </Link>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>
              {locale === "en" ? manifest.name_en : manifest.name_ko}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Story header — each tool opens with its own promise. */}
      <header className="mt-4 max-w-3xl">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="studio-gradient-bg inline-flex size-9 shrink-0 items-center justify-center rounded-xl text-white">
            <manifest.icon className="size-[18px]" aria-hidden />
          </span>
          <span className="text-sm font-semibold break-keep">{locale === "en" ? manifest.name_en : manifest.name_ko}</span>
          <span className="rounded-full border border-hairline px-2.5 py-0.5 font-mono text-2xs whitespace-nowrap text-fg-subtle">
            {t("estimated_credits")} {cost} {t("credits")} · ~{manifest.estimatedSeconds}
            {t("seconds")}
          </span>
        </div>
        <h1 className="mt-4 font-display text-[clamp(1.75rem,4vw,2.6rem)] leading-[1.12] font-bold tracking-[-0.02em] [text-wrap:balance] break-keep text-fg">
          {exp ? exp.hero.title[locale] : locale === "en" ? manifest.name_en : manifest.name_ko}
        </h1>
        <p className="mt-3 text-base leading-relaxed [text-wrap:pretty] break-keep text-fg-muted">{exp ? exp.hero.story[locale] : manifest.summary}</p>
        {cost > 0 && balance !== null ? (
          balance < cost ? (
            <p role="alert" className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm break-keep text-fg">
              <AlertTriangle size={15} className="shrink-0 text-danger" aria-hidden />
              {L({ ko: `크레딧이 부족해요 — 필요 ${cost} · 보유 ${balance.toLocaleString()}`, en: `Not enough credits — needs ${cost}, you have ${balance.toLocaleString()}` })}
              <Link href="/account/membership" className="font-medium text-studio-cyan hover:underline">{L({ ko: "충전하기", en: "Top up" })}</Link>
              <Link href="/account/api-key" className="font-medium text-studio-cyan hover:underline">{L({ ko: "내 API 키 연결", en: "Connect your API key" })}</Link>
            </p>
          ) : (
            <p className="mt-2 text-2xs text-fg-subtle">{L({ ko: `이번 실행 ${cost} 크레딧 · 실행 후 약 ${(balance - cost).toLocaleString()} 남음`, en: `This run uses ${cost} credits · about ${(balance - cost).toLocaleString()} left after` })}</p>
          )
        ) : null}
      </header>

      {exp?.layout === "steps" ? (
        <div className="mt-8">
          <Stage exp={exp} values={values} compact />
        </div>
      ) : null}

      <div
        className={cn(
          "mt-8 grid gap-6 lg:items-start",
          exp?.layout === "canvas" ? "lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]" : "lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]",
        )}
      >
      {exp?.layout === "canvas" ? side : null}
      <div className="min-w-0">

      {chainedFrom ? (
        <div className="mt-4 rounded-md border border-accent/30 bg-accent-dim px-3 py-2 text-xs text-fg-muted">
          {(locale === "en"
            ? getTool(chainedFrom.toolId)?.name_en
            : getTool(chainedFrom.toolId)?.name_ko) ?? chainedFrom.toolId}{" "}
          {t("chained_from_suffix")}
        </div>
      ) : null}

      {profileChips.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {profileChips.map(({ key, display }) =>
            excludedProfileKeys.has(key) ? null : (
              <Badge key={key} variant="secondary" className="gap-1">
                {t(PROFILE_LABEL_KEYS[key])}: {display}
                <button
                  type="button"
                  aria-label={`${t(PROFILE_LABEL_KEYS[key])} ${t("remove")}`}
                  onClick={() =>
                    setExcludedProfileKeys((prev) => new Set(prev).add(key))
                  }
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ),
          )}
        </div>
      )}

      {availableProviders.length > 1 ? (
        <div className="mt-4">
          <Segmented
            value={provider}
            onChange={(v) => setSavedProvider(v)}
            label={L({ ko: "엔진 선택", en: "Choose engine" })}
            options={availableProviders.map((p) => ({ value: p, label: PROVIDER_LABEL[p] }))}
          />
        </div>
      ) : supportedProviders.length > 1 ? (
        <p className="mt-4 text-xs text-fg-subtle">
          {L({ ko: "Claude/ChatGPT 엔진을 쓰려면 API 키를 등록하세요 → ", en: "Register an API key to use the Claude/ChatGPT engine → " })}
          <Link href="/account/api-key" className="text-studio-cyan underline underline-offset-2">
            {L({ ko: "API 키 관리", en: "Manage API keys" })}
          </Link>
        </p>
      ) : null}

      {exp ? (
        <ol className="mt-5 space-y-4">
          {exp.sections.map((section, si) => (
            <li key={section.title.en} className="glass rounded-[24px] p-5 md:p-6">
              <div className="mb-5 flex items-start gap-3">
                <span className="studio-gradient-bg grid size-7 shrink-0 place-items-center rounded-full font-mono text-xs text-white">{si + 1}</span>
                <div className="min-w-0">
                  <h2 className="text-base leading-snug font-semibold break-keep">{section.title[locale]}</h2>
                  <p className="mt-0.5 text-sm leading-relaxed break-keep text-fg-muted">{section.hint[locale]}</p>
                </div>
              </div>
              <div className="space-y-5">
                {section.fields.filter((fid) => fid !== "free_request").map((fid) => {
                  const field = manifest.inputs.find((f) => f.id === fid);
                  if (!field) return null;
                  return <ExField key={fid} field={localizeField(toolId, field, locale)} ui={exp.ui[fid]} value={values[fid]} onChange={(v) => setValues((p) => ({ ...p, [fid]: v }))} />;
                })}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div className="glass mt-6 rounded-[24px] p-5 md:p-6">
          <div className="space-y-5">
            {manifest.inputs
              .filter((f) => f.id !== "free_request")
              .map((field) => (
                <ExField key={field.id} field={localizeField(toolId, field, locale)} value={values[field.id]} onChange={(v) => setValues((p) => ({ ...p, [field.id]: v }))} />
              ))}
          </div>
        </div>
      )}

      <FreeRequest toolId={toolId} value={typeof values.free_request === "string" ? values.free_request : ""} onChange={(v) => setValues((p) => ({ ...p, free_request: v }))} />

      <ReferencePanel toolId={toolId} value={reference} onChange={setReference} />

      <div className="mt-6 flex items-center gap-2">
        <Button
          data-run-button
          onClick={() => handleRun()}
          loading={phase === "streaming" || phase === "understanding"}
          shortcut="⌘↵"
          className="studio-gradient-bg h-11 rounded-2xl px-5 text-white shadow-[inset_0_1px_0_oklch(1_0_0/30%),0_12px_32px_-12px_var(--studio-violet)] transition-transform duration-500 ease-[var(--spring)] hover:-translate-y-0.5"
        >
          {t("run")}
        </Button>
        {phase === "streaming" && showCancel && activeRunId ? (
          <Button variant="ghost" onClick={handleCancel}>
            {t("cancel")}
          </Button>
        ) : null}
      </div>
      {phase === "streaming" && cancelNote ? <p role="status" className="mt-2 text-xs text-fg-muted">{cancelNote}</p> : null}

      {phase === "understanding" ? (
        <p role="status" className="mt-4 text-sm text-fg-muted">
          {L({ ko: "요청을 읽고 있어요…", en: "Reading your request…" })}
        </p>
      ) : null}

      {phase === "asking" && asking ? (
        <QuestionCard
          summary={understood}
          questions={asking.questions}
          onSubmit={(answers) => startRun(asking.base, asking.serialized, { intent: asking.intent, answers, strategyOverride: null })}
          onCancel={() => {
            setAsking(null);
            setPhase("idle");
          }}
        />
      ) : null}

      {phase === "streaming" ? (
        <>
          <RunProgress
            toolId={manifest.id}
            toolName={locale === "en" ? manifest.name_en : manifest.name_ko}
            estimatedSeconds={manifest.estimatedSeconds}
            live={steps.length > 0}
          />
          {understood ? <p className="mt-3 text-xs break-keep text-fg-muted">{L({ ko: `이해한 요청: ${understood}`, en: `Understood: ${understood}` })}</p> : null}
          <AgentTimeline events={steps} />
        </>
      ) : null}

      {phase === "done" && final ? (
        <div className="mt-6">
          <div className="mb-3">{nextActions}</div>
          <RunResult
            manifest={manifest}
            input={final.input}
            output={final.output}
            sources={final.sources}
            creditsUsed={final.creditsUsed}
            runId={final.runId}
            provider={final.provider}
            onRerunWithStrategy={(chosen) => handleRun({ strategyOverride: chosen })}
          />
          <div className="mt-5 glass rounded-[20px] p-4">
            <p className="mb-2.5 text-sm font-medium">{L({ ko: "다음은 무엇을 할까요?", en: "What next?" })}</p>
            {nextActions}
          </div>
        </div>
      ) : null}

      {phase === "cancelled" ? (
        <div className="mt-6 glass rounded-[20px] p-4 ">
          <p className="text-sm text-fg-muted">{t("cancelled_refunded")}</p>
        </div>
      ) : null}

      {phase === "error" && errorMsg ? (
        <div className="mt-6 glass rounded-[20px] p-4 ">
          <p className="text-sm text-danger">{L(errorMsg)}</p>
          {errorMsg.link ? (
            <Link href={errorMsg.link} className="mt-1 inline-block text-sm text-studio-cyan underline underline-offset-2">
              {L(errorMsg.linkLabel ?? { ko: "API 키 관리로 이동", en: "Go to API key settings" })}
            </Link>
          ) : null}
        </div>
      ) : null}
      </div>
      {exp?.layout === "canvas" ? null : side}
      </div>
    </div>
  );
}

export { ToolRunner };
