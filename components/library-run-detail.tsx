"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { RunResult } from "@/components/run-result";
import { RunActions } from "@/components/projects/run-actions";
import { RegeneratePanel } from "@/components/projects/regenerate-panel";
import { getTool } from "@/lib/tools/registry";
import { useLocale, useT } from "@/lib/i18n/context";
import type { DictKey } from "@/lib/i18n/dictionaries";
import type { Source } from "@/lib/tools/registry/shared";
import type { ProviderId } from "@/lib/ai/types";
import { formatDateTime } from "@/lib/format-date";

const STATUS_KEY: Record<string, DictKey> = {
  pending: "status_pending",
  streaming: "status_streaming",
  done: "status_done",
  cancelled: "status_cancelled",
  error: "status_error",
};

function LibraryRunDetail({
  toolId,
  runId,
  status,
  input,
  output,
  sources,
  creditsUsed,
  provider,
  error,
  createdAt,
  title = null,
  projectId = null,
  parentRunId = null,
  childRunIds = [],
  projects = [],
  versioned = false,
  shareToken,
}: {
  toolId: string;
  runId: string;
  status: string;
  input?: Record<string, unknown>;
  output: unknown;
  sources: Source[];
  creditsUsed: number | null;
  provider?: ProviderId | null;
  error: string | null;
  createdAt: string;
  title?: string | null;
  projectId?: string | null;
  parentRunId?: string | null;
  childRunIds?: string[];
  projects?: { id: string; name: string }[];
  versioned?: boolean;
  /** The live public link's token; null for none, undefined before migration 0017. */
  shareToken?: string | null;
}) {
  const { locale } = useLocale();
  const t = useT();
  const manifest = getTool(toolId);
  if (!manifest) return notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 pb-10 md:px-8 md:pt-10">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/library" />}>
              {t("library")}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>
              {locale === "en" ? manifest.name_en : manifest.name_ko}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mt-3 flex items-center justify-between gap-3">
        <h1 className="font-display text-[clamp(2rem,4vw,3rem)] leading-[1.05] font-bold tracking-[-0.02em] break-keep text-fg">
          {title || (locale === "en" ? manifest.name_en : manifest.name_ko)}
        </h1>
        {/* Fixed to Korea time so the server (UTC) and the browser render the same text. */}
        <span className="shrink-0 font-mono text-2xs text-fg-subtle" suppressHydrationWarning>
          {formatDateTime(createdAt, locale)}
        </span>
      </div>

      <RunActions
        runId={runId}
        toolId={toolId}
        status={status}
        title={title}
        projectId={projectId}
        projects={projects}
        parentRunId={parentRunId}
        childRunIds={childRunIds}
        versioned={versioned}
        shareToken={shareToken}
      />

      <div className="mt-6">
        {status === "done" ? (
          <RunResult
            manifest={manifest}
            input={input}
            output={output}
            sources={sources}
            creditsUsed={creditsUsed}
            provider={provider}
            runId={runId}
          />
        ) : null}
        {status === "done" && versioned ? (
          <RegeneratePanel runId={runId} toolId={toolId} output={output} estimatedCredits={manifest.estimatedCredits} />
        ) : null}
        {status === "done" ? null : status === "error" ? (
          <div className="glass rounded-[20px] p-4 ">
            <p className="text-sm text-danger">{error ?? t("status_error")}</p>
          </div>
        ) : (
          <div className="glass rounded-[20px] p-4 ">
            <p className="text-sm text-fg-muted">{t(STATUS_KEY[status] ?? "status_pending")}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export { LibraryRunDetail };
