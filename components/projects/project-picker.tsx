"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FolderKanban } from "lucide-react";
import { useBi } from "@/lib/i18n/context";
import { prefillFromFacts, type Facts } from "@/lib/projects/facts";
import type { ToolField } from "@/lib/tools/types";

// Above a tool's form: which project this run belongs to. Choosing one
// fills the fields the project already knows (shown, editable) and makes
// the finished run add what it learns back to the project.

export function ProjectPicker({
  projects,
  value,
  onChange,
  inputs,
  onFill,
}: {
  projects: { id: string; name: string }[];
  value: string;
  onChange: (id: string) => void;
  inputs: ToolField[];
  onFill: (values: Record<string, string | string[]>) => void;
}) {
  const L = useBi();
  const [note, setNote] = useState<string | null>(null);

  // Opened with ?project=: fill once, as if it had just been chosen.
  const started = useRef(false);
  useEffect(() => {
    if (started.current || !value) return;
    started.current = true;
    void choose(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function choose(id: string) {
    onChange(id);
    setNote(null);
    if (!id) return;
    try {
      const res = await fetch(`/api/projects/${id}/facts`);
      if (!res.ok) return;
      const { facts } = (await res.json()) as { facts: Facts };
      const { values, filled } = prefillFromFacts(inputs, facts);
      if (filled.length) {
        onFill(values);
        const labels = filled.map((f) => inputs.find((i) => i.id === f)?.label ?? f);
        setNote(L({ ko: `프로젝트에서 ${labels.join(", ")} 칸을 채웠어요. 고쳐도 돼요.`, en: `Filled ${labels.length} field(s) from the project. Edit freely.` }));
      } else {
        setNote(L({ ko: "이 도구에 채울 프로젝트 정보가 아직 없어요. 실행이 끝나면 결과가 프로젝트에 쌓여요.", en: "Nothing to pre-fill yet. This run's results will be added to the project." }));
      }
    } catch {
      /* the form still works without the project's facts */
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-hairline bg-surface px-3 py-2">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <FolderKanban className="size-3.5 text-accent" aria-hidden />
        <label htmlFor="project-picker" className="text-fg-muted">
          {L({ ko: "프로젝트", en: "Project" })}
        </label>
        <select id="project-picker" value={value} onChange={(e) => choose(e.target.value)} className="min-w-0 max-w-56 rounded-md border border-hairline bg-bg px-2 py-1 text-xs text-fg">
          <option value="">{L({ ko: "선택 안 함", en: "None" })}</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <Link href="/projects" className="ml-auto text-2xs text-fg-subtle underline-offset-2 hover:text-fg hover:underline">
          {projects.length ? L({ ko: "프로젝트 관리", en: "Manage" }) : L({ ko: "새 프로젝트 만들기", en: "Create a project" })}
        </Link>
      </div>
      {note ? <p className="mt-1.5 text-2xs text-fg-muted break-keep" aria-live="polite">{note}</p> : null}
    </div>
  );
}
