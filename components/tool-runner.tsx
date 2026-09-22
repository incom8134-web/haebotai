"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { X } from "lucide-react";
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
import { ToolForm, type ToolFormValues } from "@/components/tool-form";
import { RunResult } from "@/components/run-result";
import { getTool } from "@/lib/tools/registry";
import { CATEGORY_LABELS } from "@/lib/tools/registry/categories";
import { seedFromChain } from "@/lib/tools/chain";
import { seedFromBrief } from "@/lib/tools/brief";
import { getToolContent } from "@/lib/tools/content";
import { RunGuide } from "@/components/tools/run-guide";
import { getExperience } from "@/lib/tools/experience";
import { cn } from "@/lib/utils";
import { ExField } from "@/components/tools/experience/controls";
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

type RunPhase = "idle" | "streaming" | "done" | "cancelled" | "error";

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

  const [values, setValues] = useState<ToolFormValues>(() =>
    chainedFrom
      ? seedFromChain(toolId, chainedFrom.toolId, chainedFrom.output)
      : initialPreset !== undefined && getToolContent(toolId)?.presets[initialPreset]
        ? { ...getToolContent(toolId)!.presets[initialPreset].values }
        : manifest
          ? seedFromBrief(manifest, initialBrief)
          : {},
  );
  const [excludedProfileKeys, setExcludedProfileKeys] = useState<Set<string>>(
    new Set(),
  );
  const [phase, setPhase] = useState<RunPhase>("idle");
  const [streamedText, setStreamedText] = useState("");
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
  const abortRef = useRef<AbortController | null>(null);

  if (!manifest) return notFound();

  const profileChips = profile
    ? manifest.usesProfile
        .map((key) => ({ key, display: formatProfileValue(profile[key]) }))
        .filter(
          (c): c is { key: keyof BusinessProfile; display: string } =>
            c.display !== null,
        )
    : [];

  async function handleRun() {
    setPhase("streaming");
    setStreamedText("");
    setFinal(null);
    setErrorMsg(null);
    setShowCancel(false);

    const controller = new AbortController();
    abortRef.current = controller;
    const cancelTimer = setTimeout(() => setShowCancel(true), 5000);

    try {
      const serialized = await serializeValues(values);
      const res = await fetch(`/api/tools/${toolId}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...serialized,
          provider,
          ...(chainedFrom ? { chainedFromRunId: chainedFrom.runId } : {}),
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({ error: null }));
        setPhase("error");
        setErrorMsg(data.error ? mapRunError(data.error) : { ko: t("run_failed"), en: t("run_failed") });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line) continue;
          const event = JSON.parse(line);
          if (event.type === "chunk")
            setStreamedText((prev) => prev + event.text);
          else if (event.type === "done") {
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
            setPhase("error");
            setErrorMsg(mapRunError(event.error));
          }
        }
      }
    } catch {
      setPhase(controller.signal.aborted ? "cancelled" : "error");
      if (!controller.signal.aborted) setErrorMsg({ ko: t("network_error"), en: t("network_error") });
    } finally {
      clearTimeout(cancelTimer);
      setShowCancel(false);
      abortRef.current = null;
    }
  }

  const side = (
    <aside className="min-w-0 space-y-4 lg:sticky lg:top-24">
      {exp && exp.layout !== "steps" ? <Stage exp={exp} values={values} /> : null}
      <RunGuide
        toolId={toolId}
        onPreset={(i) => {
          const preset = getToolContent(toolId)?.presets[i];
          if (preset) setValues({ ...preset.values });
        }}
      />
    </aside>
  );

  return (
    <div className="mx-auto max-w-[1240px] px-4 pt-6 pb-10 md:px-6 md:pt-10">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <Link href={`/tools?category=${manifest.category}`} className="hover:text-fg">
              {CATEGORY_LABELS[manifest.category][locale]}
            </Link>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <Link href={`/tools/${manifest.id}`} className="hover:text-fg">
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
          <Link href="/account/api-key" className="text-accent hover:underline">
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
                {section.fields.map((fid) => {
                  const field = manifest.inputs.find((f) => f.id === fid);
                  if (!field) return null;
                  return <ExField key={fid} field={field} ui={exp.ui[fid]} value={values[fid]} onChange={(v) => setValues((p) => ({ ...p, [fid]: v }))} />;
                })}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div className="glass mt-6 rounded-[24px] p-5 md:p-6">
          <ToolForm fields={manifest.inputs} values={values} onChange={(id, v) => setValues((p) => ({ ...p, [id]: v }))} />
        </div>
      )}

      <div className="mt-6 flex items-center gap-2">
        <Button
          onClick={handleRun}
          loading={phase === "streaming"}
          shortcut="⌘↵"
          className="studio-gradient-bg h-11 rounded-2xl px-5 text-white shadow-[inset_0_1px_0_oklch(1_0_0/30%),0_12px_32px_-12px_var(--studio-violet)] transition-transform duration-500 ease-[var(--spring)] hover:-translate-y-0.5"
        >
          {t("run")}
        </Button>
        {phase === "streaming" && showCancel ? (
          <Button variant="ghost" onClick={() => abortRef.current?.abort()}>
            {t("cancel")}
          </Button>
        ) : null}
      </div>

      {phase === "streaming" ? (
        <div className="mt-6 glass rounded-[20px] p-4 ">
          <p className="font-mono text-2xs text-fg-subtle">{t("running")}</p>
          <pre className="mt-2 overflow-x-auto font-mono text-xs text-fg-muted">
            {streamedText}
          </pre>
        </div>
      ) : null}

      {phase === "done" && final ? (
        <div className="mt-6">
          <RunResult
            manifest={manifest}
            input={final.input}
            output={final.output}
            sources={final.sources}
            creditsUsed={final.creditsUsed}
            runId={final.runId}
            provider={final.provider}
          />
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
            <Link href={errorMsg.link} className="mt-1 inline-block text-sm text-accent hover:underline">
              {L({ ko: "API 키 관리로 이동", en: "Go to API key settings" })}
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
