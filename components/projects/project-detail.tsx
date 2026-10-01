"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useBi, useLocale } from "@/lib/i18n/context";
import { FACT_KEYS, FACT_LABELS, type FactKey, type Facts } from "@/lib/projects/facts";
import { getTool } from "@/lib/tools/registry";
import { toolSlug } from "@/lib/tools/catalog";
import { Button } from "@/components/ui/button";

// One project: its name and description, what it knows (each fact
// editable, with the tool and result it came from), tools to start inside
// it, and its results.

const START = ["brand-dna", "offer-architect", "persona-mapper", "campaign-planner", "web-builder", "sales-page"];

export function ProjectDetail({
  project,
  facts,
  meta,
  runs,
}: {
  project: { id: string; name: string; description: string };
  facts: Facts;
  meta: Record<string, { source_tool: string | null; source_run_id: string | null; updated_at: string }>;
  runs: { id: string; tool_id: string | null; title: string | null; status: string; created_at: string }[];
}) {
  const L = useBi();
  const { locale } = useLocale();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [draft, setDraft] = useState<Facts>(facts);
  const [saving, setSaving] = useState<string | null>(null);

  async function saveProject() {
    const res = await fetch(`/api/projects/${project.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, description }) });
    if (res.ok) {
      setEditing(false);
      router.refresh();
    } else toast.error((await res.json()).error);
  }

  async function saveFact(key: FactKey) {
    setSaving(key);
    const res = await fetch(`/api/projects/${project.id}/facts`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, value: draft[key] ?? "" }) });
    setSaving(null);
    if (res.ok) {
      toast.success(L({ ko: "저장했어요", en: "Saved" }));
      router.refresh();
    } else toast.error((await res.json()).error);
  }

  async function remove() {
    if (!window.confirm(L({ ko: "이 프로젝트를 삭제할까요? 결과는 보관함에 남고, 프로젝트 기억만 지워져요.", en: "Delete this project? Results stay in the library; only the project's memory is removed." }))) return;
    const res = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
    if (res.ok) router.push("/projects");
    else toast.error((await res.json()).error);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 pb-10 md:px-8 md:pt-10">
      <Link href="/projects" className="text-xs text-fg-subtle hover:text-fg">
        ← {L({ ko: "프로젝트", en: "Projects" })}
      </Link>
      {editing ? (
        <div className="mt-3 flex flex-col gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} aria-label={L({ ko: "이름", en: "Name" })} className="rounded-lg border border-hairline bg-bg px-3 py-2 text-xl font-bold text-fg outline-none focus:border-accent" />
          <input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} aria-label={L({ ko: "설명", en: "Description" })} className="rounded-lg border border-hairline bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-accent" />
          <div className="flex gap-2">
            <Button size="sm" onClick={saveProject}>{L({ ko: "저장", en: "Save" })}</Button>
            <Button size="sm" variant="secondary" onClick={() => setEditing(false)}>{L({ ko: "취소", en: "Cancel" })}</Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-[clamp(1.8rem,4vw,2.6rem)] leading-tight font-bold break-keep text-fg">{project.name}</h1>
            {project.description ? <p className="mt-1 text-sm text-fg-muted break-keep">{project.description}</p> : null}
          </div>
          <button type="button" onClick={() => setEditing(true)} aria-label={L({ ko: "이름 바꾸기", en: "Rename" })} className="rounded-md border border-hairline p-2 text-fg-muted hover:text-fg">
            <Pencil className="size-4" />
          </button>
          <button type="button" onClick={remove} aria-label={L({ ko: "프로젝트 삭제", en: "Delete project" })} className="rounded-md border border-hairline p-2 text-fg-muted hover:text-danger">
            <Trash2 className="size-4" />
          </button>
        </div>
      )}

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-fg">{L({ ko: "이 프로젝트가 알고 있는 것", en: "What this project knows" })}</h2>
        <p className="mt-1 text-xs text-fg-muted break-keep">{L({ ko: "도구를 이 프로젝트에서 실행하면 아래 내용으로 칸이 채워지고, 결과에서 정해진 내용이 자동으로 갱신돼요. 직접 고쳐도 됩니다.", en: "Tools run in this project are pre-filled from these, and results update them. Edit them yourself any time." })}</p>
        <ul className="mt-3 flex flex-col gap-2">
          {FACT_KEYS.map((key) => {
            const m = meta[key];
            const changed = (draft[key] ?? "") !== (facts[key] ?? "");
            const tool = m?.source_tool ? getTool(m.source_tool) : undefined;
            return (
              <li key={key} className="rounded-xl border border-hairline bg-surface p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <label htmlFor={`fact-${key}`} className="text-xs font-semibold text-fg">{L(FACT_LABELS[key])}</label>
                  {tool && m?.source_run_id ? (
                    <Link href={`/library/${m.source_run_id}`} className="text-2xs text-fg-subtle underline-offset-2 hover:underline">
                      {L({ ko: `${tool.name_ko}에서`, en: `from ${tool.name_en}` })}
                    </Link>
                  ) : facts[key] ? (
                    <span className="text-2xs text-fg-subtle">{L({ ko: "직접 입력", en: "Entered by you" })}</span>
                  ) : null}
                  {changed ? (
                    <Button size="sm" className="ml-auto" disabled={saving === key} onClick={() => saveFact(key)}>
                      {L({ ko: "저장", en: "Save" })}
                    </Button>
                  ) : null}
                </div>
                <textarea
                  id={`fact-${key}`}
                  value={draft[key] ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                  rows={(draft[key] ?? "").length > 80 ? 3 : 1}
                  maxLength={2000}
                  placeholder={L({ ko: "아직 없음", en: "Not set" })}
                  className="mt-1.5 w-full resize-y rounded-lg border border-hairline bg-bg px-2.5 py-1.5 text-sm text-fg outline-none focus:border-accent"
                />
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-fg">{L({ ko: "이 프로젝트에서 시작하기", en: "Start a tool in this project" })}</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {START.map((slug) => {
            const t = getTool(slug);
            if (!t) return null;
            return (
              <Link key={slug} href={`/tools/${toolSlug(slug)}/run?project=${project.id}`} className="inline-flex items-center gap-1 rounded-full border border-hairline px-3 py-1.5 text-xs text-fg hover:border-accent hover:text-accent">
                {locale === "en" ? t.name_en : t.name_ko} <ArrowRight className="size-3" aria-hidden />
              </Link>
            );
          })}
          <Link href="/tools" className="inline-flex items-center rounded-full px-3 py-1.5 text-xs text-fg-subtle hover:text-fg">{L({ ko: "모든 도구 →", en: "All tools →" })}</Link>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-fg">{L({ ko: `결과 ${runs.length}개`, en: `${runs.length} results` })}</h2>
        <ul className="mt-2 flex flex-col gap-1.5">
          {runs.map((r) => {
            const t = r.tool_id ? getTool(r.tool_id) : undefined;
            return (
              <li key={r.id}>
                <Link href={`/library/${r.id}`} className="flex items-center gap-2 rounded-xl border border-hairline bg-surface px-3 py-2 text-sm hover:border-hairline-str">
                  <span className="min-w-0 flex-1 truncate text-fg">{r.title || (locale === "en" ? t?.name_en : t?.name_ko) || r.tool_id}</span>
                  {r.title ? <span className="text-2xs text-fg-subtle">{locale === "en" ? t?.name_en : t?.name_ko}</span> : null}
                  <span className="text-2xs text-fg-subtle" suppressHydrationWarning>
                    {new Date(r.created_at).toLocaleDateString(locale === "en" ? "en-US" : "ko-KR", { timeZone: "Asia/Seoul" })}
                  </span>
                </Link>
              </li>
            );
          })}
          {runs.length === 0 ? <li className="text-xs text-fg-subtle">{L({ ko: "아직 이 프로젝트에서 만든 결과가 없어요.", en: "No results in this project yet." })}</li> : null}
        </ul>
      </section>
    </div>
  );
}
