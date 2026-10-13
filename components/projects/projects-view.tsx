"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, FolderKanban, Plus } from "lucide-react";
import { toast } from "sonner";
import { useBi, useLocale } from "@/lib/i18n/context";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { IconTile, PageHero, TONE, toneFor } from "@/components/site/tone";
import { cn } from "@/lib/utils";

// The projects list and a create form. A project is a business or an
// initiative: tools run inside it read what it knows and add to it.

export function ProjectsView({ projects }: { projects: { id: string; name: string; description: string; updated_at: string; runs: number }[] }) {
  const L = useBi();
  const { locale } = useLocale();
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, description }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      router.push(`/projects/${json.id}`);
    } catch (err) {
      toast.error((err as Error).message || L({ ko: "만들지 못했어요", en: "Couldn't create it" }));
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 pt-6 pb-10 md:px-8 md:pt-10">
      <PageHero
        icon={FolderKanban}
        tone="discover"
        eyebrow={L({ ko: "사업별 기억", en: "Memory per business" })}
        title={L({ ko: "프로젝트", en: "Projects" })}
        lead={L({ ko: "사업이나 프로젝트마다 기억을 따로 둡니다. 프로젝트 안에서 도구를 실행하면 알고 있는 내용이 미리 채워지고, 결과에서 정해진 것(고객, 포지셔닝, 색, 가격…)이 다시 쌓여요.", en: "Each business or project keeps its own memory. Tools run inside a project start pre-filled with what it knows, and add what each result establishes — customer, positioning, colours, pricing…" })}
        className="mb-2"
      />

      <form onSubmit={create} className="mt-6 grid gap-2 rounded-2xl border border-hairline bg-surface p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_auto] sm:items-end">
        <label className="flex flex-col gap-1 text-xs text-fg-muted">
          {L({ ko: "이름", en: "Name" })}
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required placeholder={L({ ko: "예: 온샘소아과", en: "e.g. Onsaem Clinic" })} className="rounded-lg border border-hairline bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-accent" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-fg-muted">
          {L({ ko: "한 줄 설명 (선택)", en: "One-line description (optional)" })}
          <input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} placeholder={L({ ko: "예: 저녁 진료 소아과 개원 준비", en: "e.g. opening an evening pediatric clinic" })} className="rounded-lg border border-hairline bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-accent" />
        </label>
        <Button type="submit" disabled={busy || !name.trim()}>
          <Plus className="size-4" aria-hidden /> {L({ ko: "만들기", en: "Create" })}
        </Button>
      </form>

      {projects.length === 0 ? (
        <EmptyState icon={FolderKanban} title={L({ ko: "아직 프로젝트가 없어요", en: "No projects yet" })} description={L({ ko: "위에서 첫 프로젝트를 만들어 보세요.", en: "Create your first one above." })} className="mt-6" />
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {projects.map((p) => {
            const tone = toneFor(p.id);
            return (
              <li key={p.id}>
                <Link href={`/projects/${p.id}`} className={cn("group flex h-full flex-col rounded-[20px] border border-hairline p-5 transition-[border-color,transform] duration-300 hover:-translate-y-0.5", TONE[tone].wash, TONE[tone].hover)}>
                  <span className="flex items-start gap-3">
                    <IconTile icon={FolderKanban} tone={tone} size="lg" />
                    <span className="min-w-0">
                      <span className="block truncate text-lg font-bold text-fg">{p.name}</span>
                      {p.description ? <span className="mt-0.5 line-clamp-2 block text-sm text-fg-muted break-keep">{p.description}</span> : null}
                    </span>
                  </span>
                  <span className="mt-auto flex items-center justify-between gap-2 pt-4 text-2xs" suppressHydrationWarning>
                    <span className="flex items-center gap-2">
                      <span className={cn("rounded-full px-2.5 py-1 font-semibold", TONE[tone].chip)}>{L({ ko: `결과 ${p.runs}개`, en: `${p.runs} results` })}</span>
                      <span className="text-fg-subtle">{new Date(p.updated_at).toLocaleDateString(locale === "en" ? "en-US" : "ko-KR", { timeZone: "Asia/Seoul" })}</span>
                    </span>
                    <ArrowRight size={16} className={cn("transition-transform group-hover:translate-x-0.5", TONE[tone].text)} aria-hidden />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
