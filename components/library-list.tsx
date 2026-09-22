"use client";

import Link from "next/link";
import { FileQuestion, Inbox } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { getTool } from "@/lib/tools/registry";
import { useLocale, useT } from "@/lib/i18n/context";
import type { DictKey } from "@/lib/i18n/dictionaries";

export interface LibraryRun {
  id: string;
  toolId: string | null;
  toolNameKo: string;
  toolNameEn: string;
  status: string;
  credits: number | null;
  createdAt: string;
}

const STATUS_KEY: Record<string, DictKey> = {
  pending: "status_pending",
  streaming: "status_streaming",
  done: "status_done",
  cancelled: "status_cancelled",
  error: "status_error",
};

function LibraryList({ runs }: { runs: LibraryRun[] }) {
  const { locale } = useLocale();
  const t = useT();

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 pb-10 md:px-8 md:pt-10">
      <h1 className="font-display text-[clamp(2rem,4vw,3rem)] leading-[1.05] font-bold tracking-[-0.02em] break-keep text-fg">
        {t("library")}
      </h1>
      <p className="mt-3 text-base leading-relaxed break-keep text-fg-muted">{t("library_desc")}</p>

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
                    {locale === "en" ? run.toolNameEn : run.toolNameKo}
                  </p>
                  <p className="font-mono text-2xs text-fg-subtle">
                    {new Date(run.createdAt).toLocaleString(
                      locale === "en" ? "en-US" : "ko-KR",
                    )}
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
