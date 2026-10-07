"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileQuestion, Inbox, Search, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { getTool } from "@/lib/tools/registry";
import { useLocale, useT } from "@/lib/i18n/context";
import type { DictKey } from "@/lib/i18n/dictionaries";
import { formatDateTime } from "@/lib/format-date";
import { cn } from "@/lib/utils";

interface LibraryRun {
  id: string;
  toolId: string | null;
  toolNameKo: string;
  toolNameEn: string;
  status: string;
  credits: number | null;
  createdAt: string;
  title?: string | null;
  projectId?: string | null;
  pinned?: boolean;
}

const STATUS_KEY: Record<string, DictKey> = {
  pending: "status_pending",
  streaming: "status_streaming",
  done: "status_done",
  cancelled: "status_cancelled",
  error: "status_error",
};

function LibraryList({ runs: initial, projects = [], canPin = false }: { runs: LibraryRun[]; projects?: { id: string; name: string }[]; canPin?: boolean }) {
  const { locale } = useLocale();
  const t = useT();
  const router = useRouter();
  const en = locale === "en";
  const [all, setAll] = useState(initial);
  const [project, setProject] = useState("");
  const [tool, setTool] = useState("");
  const [query, setQuery] = useState("");
  const [onlyPinned, setOnlyPinned] = useState(false);
  const projectName = new Map(projects.map((p) => [p.id, p.name]));
  const toolOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of all) if (r.toolId && !seen.has(r.toolId)) seen.set(r.toolId, en ? r.toolNameEn : r.toolNameKo);
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [all, en]);
  const q = query.trim().toLowerCase();
  const runs = all
    .filter((r) => !project || (project === "none" ? !r.projectId : r.projectId === project))
    .filter((r) => !tool || r.toolId === tool)
    .filter((r) => !onlyPinned || r.pinned)
    .filter((r) => !q || [r.title, r.toolNameKo, r.toolNameEn, r.projectId ? projectName.get(r.projectId) : ""].some((x) => x?.toLowerCase().includes(q)))
    // Starred results first, newest first within each group.
    .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned));

  async function togglePin(run: LibraryRun) {
    const pinned = !run.pinned;
    setAll((xs) => xs.map((x) => (x.id === run.id ? { ...x, pinned } : x)));
    const res = await fetch(`/api/runs/${run.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pinned }) }).catch(() => null);
    if (!res?.ok) {
      setAll((xs) => xs.map((x) => (x.id === run.id ? { ...x, pinned: !pinned } : x)));
      toast.error(en ? "Couldn't update the star" : "즐겨찾기를 바꾸지 못했어요");
    }
  }

  async function remove(run: LibraryRun) {
    if (!window.confirm(en ? "Delete this result? This can't be undone." : "이 결과를 삭제할까요? 되돌릴 수 없어요.")) return;
    const res = await fetch(`/api/runs/${run.id}`, { method: "DELETE" }).catch(() => null);
    if (res?.ok) {
      setAll((xs) => xs.filter((x) => x.id !== run.id));
      router.refresh();
    } else toast.error(((await res?.json().catch(() => ({}))) as { error?: string })?.error ?? (en ? "Couldn't delete" : "삭제하지 못했어요"));
  }

  const filtered = !!(project || tool || q || onlyPinned);
  const control = "rounded-md border border-hairline bg-surface px-2 py-1 text-xs text-fg";

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 pb-10 md:px-8 md:pt-10">
      <h1 className="font-display text-[clamp(2rem,4vw,3rem)] leading-[1.05] font-bold tracking-[-0.02em] break-keep text-fg">
        {t("library")}
      </h1>
      <p className="mt-3 text-base leading-relaxed break-keep text-fg-muted">{t("library_desc")}</p>

      {all.length ? (
        <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-fg-muted">
          <label className="flex min-w-[12rem] flex-1 items-center gap-1.5 rounded-md border border-hairline bg-surface px-2 py-1 focus-within:border-accent">
            <Search className="size-3.5 shrink-0 text-fg-subtle" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={en ? "Search names, tools, projects" : "이름·도구·프로젝트로 찾기"}
              aria-label={en ? "Search the library" : "보관함 검색"}
              className="min-w-0 flex-1 bg-transparent text-xs text-fg outline-none placeholder:text-fg-subtle"
            />
          </label>
          {toolOptions.length > 1 ? (
            <select value={tool} onChange={(e) => setTool(e.target.value)} aria-label={en ? "Tool" : "도구"} className={control}>
              <option value="">{en ? "All tools" : "모든 도구"}</option>
              {toolOptions.map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
          ) : null}
          {projects.length ? (
            <select value={project} onChange={(e) => setProject(e.target.value)} aria-label={en ? "Project" : "프로젝트"} className={control}>
              <option value="">{en ? "All projects" : "모든 프로젝트"}</option>
              <option value="none">{en ? "No project" : "프로젝트 없음"}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          ) : null}
          {canPin ? (
            <button type="button" aria-pressed={onlyPinned} onClick={() => setOnlyPinned((v) => !v)} className={cn(control, "inline-flex items-center gap-1", onlyPinned && "border-warn text-fg")}>
              <Star className={cn("size-3", onlyPinned && "fill-warn text-warn")} aria-hidden /> {en ? "Starred" : "즐겨찾기"}
            </button>
          ) : null}
        </div>
      ) : null}

      {runs.length === 0 && filtered ? (
        <p className="mt-6 text-sm text-fg-muted">{en ? "No results match these filters." : "조건에 맞는 결과가 없어요."}</p>
      ) : null}
      {runs.length === 0 && !filtered ? (
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
            <div key={run.id} className="group flex items-center gap-1 glass rounded-[20px] pr-2 transition-all duration-(--dur-fast) hover:-translate-y-px hover:border-hairline-str hover:bg-surface-2">
            <Link
              href={`/library/${run.id}`}
              className="flex min-w-0 flex-1 items-center justify-between gap-2 py-2 pl-3"
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
              {canPin ? (
                <button
                  type="button"
                  onClick={() => togglePin(run)}
                  aria-pressed={!!run.pinned}
                  aria-label={run.pinned ? (en ? "Unstar" : "즐겨찾기 해제") : en ? "Star" : "즐겨찾기"}
                  className="grid size-8 shrink-0 place-items-center rounded-lg text-fg-subtle hover:bg-surface hover:text-fg"
                >
                  <Star className={cn("size-4", run.pinned && "fill-warn text-warn")} aria-hidden />
                </button>
              ) : null}
              {run.status !== "pending" && run.status !== "streaming" ? (
                <button
                  type="button"
                  onClick={() => remove(run)}
                  aria-label={en ? "Delete" : "삭제"}
                  className="grid size-8 shrink-0 place-items-center rounded-lg text-fg-subtle opacity-60 hover:bg-danger/10 hover:text-danger group-hover:opacity-100"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { LibraryList };
