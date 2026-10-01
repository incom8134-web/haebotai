"use client";

import Link from "next/link";
import { useState } from "react";
import { FileQuestion, Inbox } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { getTool } from "@/lib/tools/registry";
import { useLocale, useT } from "@/lib/i18n/context";
import type { DictKey } from "@/lib/i18n/dictionaries";
import { formatDateTime } from "@/lib/format-date";

export interface LibraryRun {
  id: string;
  toolId: string | null;
  toolNameKo: string;
  toolNameEn: string;
  status: string;
  credits: number | null;
  createdAt: string;
  title?: string | null;
  projectId?: string | null;
}

const STATUS_KEY: Record<string, DictKey> = {
  pending: "status_pending",
  streaming: "status_streaming",
  done: "status_done",
  cancelled: "status_cancelled",
  error: "status_error",
};

function LibraryList({ runs: all, projects = [] }: { runs: LibraryRun[]; projects?: { id: string; name: string }[] }) {
  const { locale } = useLocale();
  const t = useT();
  const [project, setProject] = useState("");
  const projectName = new Map(projects.map((p) => [p.id, p.name]));
  const runs = all.filter((r) => !project || (project === "none" ? !r.projectId : r.projectId === project));

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 pb-10 md:px-8 md:pt-10">
      <h1 className="font-display text-[clamp(2rem,4vw,3rem)] leading-[1.05] font-bold tracking-[-0.02em] break-keep text-fg">
        {t("library")}
      </h1>
      <p className="mt-3 text-base leading-relaxed break-keep text-fg-muted">{t("library_desc")}</p>

      {projects.length ? (
        <label className="mt-5 flex items-center gap-2 text-xs text-fg-muted">
          {locale === "en" ? "Project" : "프로젝트"}
          <select value={project} onChange={(e) => setProject(e.target.value)} className="rounded-md border border-hairline bg-surface px-2 py-1 text-xs text-fg">
            <option value="">{locale === "en" ? "All" : "전체"}</option>
            <option value="none">{locale === "en" ? "No project" : "프로젝트 없음"}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>
      ) : null}

      {runs.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={t("library_empty")}
          description={t("library_empty_hint")}
          className="mt-6"
        />
      ) : null}

      <div className="mt-6 flex flex-col gap-2">
        {runs.map((run) => {
          const Icon = (run.toolId ? getTool(run.toolId)?.icon : undefined) ?? FileQuestion;
          return (
            <Link
              key={run.id}
              href={`/library/${run.id}`}
              className="flex items-center justify-between glass rounded-[20px] px-3 py-2  transition-all duration-(--dur-fast) hover:-translate-y-px hover:border-hairline-str hover:bg-surface-2 hover:"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-dim">
                  <Icon className="size-4 text-accent" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm text-fg">
                    {run.title || (locale === "en" ? run.toolNameEn : run.toolNameKo)}
                    {run.title ? <span className="ml-1.5 text-2xs text-fg-subtle">{locale === "en" ? run.toolNameEn : run.toolNameKo}</span> : null}
                    {run.projectId && projectName.get(run.projectId) ? (
                      <span className="ml-1.5 rounded bg-accent-dim px-1.5 py-0.5 text-[10px] text-accent">{projectName.get(run.projectId)}</span>
                    ) : null}
                  </p>
                  <p className="font-mono text-2xs text-fg-subtle">
                    {formatDateTime(run.createdAt, locale)}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="font-mono text-2xs text-fg-subtle">
                  {run.credits} {t("credits")}
                </span>
                <Badge
                  variant={run.status === "error" ? "destructive" : "secondary"}
                >
                  {t(STATUS_KEY[run.status] ?? "status_pending")}
                </Badge>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export { LibraryList };
