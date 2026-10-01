"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GitBranch, Link2, Link2Off, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useBi } from "@/lib/i18n/context";
import { toolSlug } from "@/lib/tools/catalog";

// A saved result's library actions: rename, move to a project, run again
// with the same inputs, delete — and its versions (the result it was
// revised from, and revisions made from it).

export function RunActions({
  runId,
  toolId,
  status,
  title,
  projectId,
  projects,
  parentRunId,
  childRunIds,
  versioned,
  shareToken,
}: {
  runId: string;
  toolId: string;
  status: string;
  title: string | null;
  projectId: string | null;
  projects: { id: string; name: string }[];
  parentRunId: string | null;
  childRunIds: string[];
  /** False before migration 0016: rename / move / versions aren't stored yet. */
  versioned: boolean;
  /** The live public link's token; null for none, undefined when sharing isn't available. */
  shareToken?: string | null;
}) {
  const L = useBi();
  const router = useRouter();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(title ?? "");

  async function patch(body: Record<string, unknown>) {
    const res = await fetch(`/api/runs/${runId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) router.refresh();
    else toast.error((await res.json()).error);
    return res.ok;
  }

  async function remove() {
    if (!window.confirm(L({ ko: "이 결과를 삭제할까요? 되돌릴 수 없어요.", en: "Delete this result? This can't be undone." }))) return;
    const res = await fetch(`/api/runs/${runId}`, { method: "DELETE" });
    if (res.ok) router.push("/library");
    else toast.error((await res.json()).error);
  }

  const busy = status === "pending" || status === "streaming";
  const [token, setToken] = useState(shareToken ?? null);
  const [sharing, setSharing] = useState(false);
  const shareUrl = (t: string) => `${window.location.origin}/share/${t}`;

  async function copyLink(t: string) {
    const url = shareUrl(t);
    const ok = await navigator.clipboard.writeText(url).then(() => true, () => false);
    if (ok) toast.success(L({ ko: "공유 링크를 복사했어요. 링크를 가진 누구나 이 결과를 볼 수 있어요.", en: "Link copied. Anyone with the link can view this result." }));
    else window.prompt(L({ ko: "아래 링크를 복사해 주세요", en: "Copy this link" }), url);
  }

  async function share() {
    if (token) return copyLink(token);
    if (!window.confirm(L({ ko: "공유 링크를 만들까요? 링크를 가진 누구나 로그인 없이 이 결과(출처와 입력 일부 포함)를 볼 수 있어요. 언제든 끌 수 있어요.", en: "Create a share link? Anyone with it can view this result (with its sources and some inputs) without signing in. You can turn it off any time." }))) return;
    setSharing(true);
    const res = await fetch(`/api/runs/${runId}/share`, { method: "POST" }).catch(() => null);
    setSharing(false);
    const body = (await res?.json().catch(() => ({}))) as { token?: string; error?: string } | undefined;
    if (res?.ok && body?.token) {
      setToken(body.token);
      await copyLink(body.token);
    } else toast.error(body?.error ?? L({ ko: "공유 링크를 만들지 못했어요", en: "Couldn't create a link" }));
  }

  async function unshare() {
    if (!window.confirm(L({ ko: "공유를 끌까요? 지금 링크는 더 이상 열리지 않아요.", en: "Turn off sharing? The current link will stop working." }))) return;
    setSharing(true);
    const res = await fetch(`/api/runs/${runId}/share`, { method: "DELETE" }).catch(() => null);
    setSharing(false);
    if (res?.ok) {
      setToken(null);
      toast.success(L({ ko: "공유를 껐어요", en: "Sharing turned off" }));
    } else toast.error(L({ ko: "공유를 끄지 못했어요", en: "Couldn't turn off sharing" }));
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      {renaming ? (
        <form
          className="flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await patch({ title: name })) setRenaming(false);
          }}
        >
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} autoFocus aria-label={L({ ko: "결과 이름", en: "Result name" })} placeholder={L({ ko: "예: 봄 시즌 상세페이지 최종", en: "e.g. Spring page — final" })} className="min-w-0 flex-1 rounded-lg border border-hairline bg-bg px-3 py-1.5 text-sm text-fg outline-none focus:border-accent" />
          <button type="submit" className="rounded-lg bg-accent px-3 text-xs font-semibold text-white">{L({ ko: "저장", en: "Save" })}</button>
          <button type="button" onClick={() => setRenaming(false)} className="rounded-lg border border-hairline px-3 text-xs text-fg-muted">{L({ ko: "취소", en: "Cancel" })}</button>
        </form>
      ) : null}
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        {versioned ? (
          <>
            <button type="button" onClick={() => setRenaming(true)} className="inline-flex items-center gap-1 rounded-full border border-hairline px-2.5 py-1 text-fg-muted hover:text-fg">
              <Pencil className="size-3" aria-hidden /> {L({ ko: "이름 바꾸기", en: "Rename" })}
            </button>
            <label className="inline-flex items-center gap-1 rounded-full border border-hairline py-0.5 pr-1 pl-2.5 text-fg-muted">
              {L({ ko: "프로젝트", en: "Project" })}
              <select value={projectId ?? ""} onChange={(e) => patch({ projectId: e.target.value || null })} className="rounded-full bg-transparent px-1 py-0.5 text-xs text-fg">
                <option value="">{L({ ko: "없음", en: "None" })}</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
          </>
        ) : null}
        <Link href={`/tools/${toolSlug(toolId)}/run?fromInput=${runId}${projectId ? `&project=${projectId}` : ""}`} className="inline-flex items-center gap-1 rounded-full border border-hairline px-2.5 py-1 text-fg-muted hover:text-fg">
          <RotateCcw className="size-3" aria-hidden /> {L({ ko: "같은 입력으로 다시", en: "Run again" })}
        </Link>
        {shareToken !== undefined && status === "done" ? (
          <>
            <button type="button" onClick={share} disabled={sharing} className="inline-flex items-center gap-1 rounded-full border border-hairline px-2.5 py-1 text-fg-muted hover:text-fg disabled:opacity-60">
              <Link2 className="size-3" aria-hidden /> {token ? L({ ko: "공유 링크 복사", en: "Copy share link" }) : L({ ko: "공유 링크 만들기", en: "Share link" })}
            </button>
            {token ? (
              <button type="button" onClick={unshare} disabled={sharing} className="inline-flex items-center gap-1 rounded-full border border-hairline px-2.5 py-1 text-fg-muted hover:text-fg disabled:opacity-60">
                <Link2Off className="size-3" aria-hidden /> {L({ ko: "공유 끄기", en: "Stop sharing" })}
              </button>
            ) : null}
          </>
        ) : null}
        {!busy ? (
          <button type="button" onClick={remove} className="inline-flex items-center gap-1 rounded-full border border-hairline px-2.5 py-1 text-fg-muted hover:border-danger/40 hover:text-danger">
            <Trash2 className="size-3" aria-hidden /> {L({ ko: "삭제", en: "Delete" })}
          </button>
        ) : null}
      </div>
      {parentRunId || childRunIds.length ? (
        <p className="flex flex-wrap items-center gap-1.5 text-2xs text-fg-subtle">
          <GitBranch className="size-3" aria-hidden /> {L({ ko: "버전", en: "Versions" })}:
          {parentRunId ? (
            <Link href={`/library/${parentRunId}`} className="rounded bg-surface-2 px-1.5 py-0.5 text-fg hover:text-accent">← {L({ ko: "이전 버전", en: "Previous" })}</Link>
          ) : null}
          <span className="rounded bg-accent-dim px-1.5 py-0.5 text-accent">{L({ ko: "지금 보는 버전", en: "This version" })}</span>
          {childRunIds.map((id, i) => (
            <Link key={id} href={`/library/${id}`} className="rounded bg-surface-2 px-1.5 py-0.5 text-fg hover:text-accent">
              {L({ ko: `고친 버전 ${i + 1}`, en: `Revision ${i + 1}` })} →
            </Link>
          ))}
        </p>
      ) : null}
    </div>
  );
}
