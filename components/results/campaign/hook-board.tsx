"use client";

import { useState } from "react";
import { Clapperboard, Star, Trophy } from "lucide-react";
import { useBi } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import { obj, objs, str, strs } from "@/lib/tools/report/util";
import { CopyButton, Kicker, useLocalSet } from "@/components/results/discover/shared";

// 훅 연구소 result: hook cards grouped by family. Each card shows the line,
// the on-screen text, what the first 3 seconds show and the line that
// follows; a platform filter swaps in that platform's version. Hooks can
// be starred (kept in this browser) and copied.

export const FAMILY_LABELS: Record<string, { ko: string; en: string }> = {
  question: { ko: "질문", en: "Question" },
  contrarian: { ko: "통념 뒤집기", en: "Myth-busting" },
  number: { ko: "숫자", en: "Number" },
  story: { ko: "이야기", en: "Story" },
  pain: { ko: "불편 찌르기", en: "Pain point" },
  curiosity: { ko: "호기심 공백", en: "Curiosity gap" },
  before_after: { ko: "전후 비교", en: "Before / after" },
  proof: { ko: "증거", en: "Proof" },
};
const PLATFORM_LABELS: Record<string, { ko: string; en: string }> = {
  reels: { ko: "릴스", en: "Reels" },
  shorts: { ko: "쇼츠", en: "Shorts" },
  tiktok: { ko: "틱톡", en: "TikTok" },
  threads: { ko: "스레드", en: "Threads" },
  blog: { ko: "블로그", en: "Blog" },
  ad: { ko: "광고", en: "Ad" },
};

export function HookBoard({ output, runId }: { output: Record<string, unknown>; runId?: string }) {
  const L = useBi();
  // Hooks are stored flat with their family (see lib/tools/schemas/hook-lab.ts).
  const allHooks = objs(output.hooks);
  const families = objs(output.families).map((f) => ({
    family: str(f.family),
    why: str(f.why_it_works),
    hooks: allHooks.filter((h) => str(h.family) === str(f.family)).map((h) => ({
      text: str(h.text),
      onScreen: str(h.on_screen),
      scene: str(h.first_scene),
      follow: str(h.follow_line),
      strength: Math.max(0, Math.min(10, Number(h.strength) || 0)),
      variants: objs(h.variants).map((v) => ({ platform: str(v.platform), text: str(v.text) })),
    })),
  }));
  const platforms = [...new Set(families.flatMap((f) => f.hooks.flatMap((h) => h.variants.map((v) => v.platform))))].filter(Boolean);
  const [platform, setPlatform] = useState<string>("");
  const [onlyFav, setOnlyFav] = useState(false);
  const [favs, toggle] = useLocalSet(`haebot-hook-fav-${runId ?? "draft"}`);
  const best = obj(output.best);

  return (
    <div className="mt-3 flex flex-col gap-5">
      {str(output.audience_insight) ? (
        <p className="rounded-xl bg-surface-2 p-3 text-sm leading-relaxed text-fg break-keep">
          <b className="font-semibold">{L({ ko: "보는 사람이 멈추는 이유", en: "Why they'll stop" })}</b> {str(output.audience_insight)}
        </p>
      ) : null}
      {str(best.text) ? (
        <div className="rounded-2xl border border-accent/30 bg-accent-dim p-4">
          <p className="flex items-center gap-1.5 text-2xs font-semibold text-accent">
            <Trophy className="size-3.5" aria-hidden /> {L({ ko: "먼저 찍어 볼 훅", en: "Shoot this first" })}
          </p>
          <div className="mt-1 flex items-start gap-2">
            <p className="flex-1 text-lg leading-snug font-bold text-fg break-keep">{str(best.text)}</p>
            <CopyButton text={str(best.text)} />
          </div>
          {str(best.reason) ? <p className="mt-1 text-sm text-fg-muted break-keep">{str(best.reason)}</p> : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={L({ ko: "플랫폼", en: "Platform" })}>
        {["", ...platforms].map((p) => (
          <button
            key={p || "all"}
            type="button"
            aria-pressed={platform === p}
            onClick={() => setPlatform(p)}
            className={cn("rounded-full border px-2.5 py-1 text-xs", platform === p ? "border-accent bg-accent text-white" : "border-hairline text-fg-muted hover:text-fg")}
          >
            {p ? L(PLATFORM_LABELS[p] ?? { ko: p, en: p }) : L({ ko: "기본 문장", en: "Base line" })}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={onlyFav}
          onClick={() => setOnlyFav((v) => !v)}
          className={cn("ml-auto inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs", onlyFav ? "border-warn bg-warn/15 text-fg" : "border-hairline text-fg-muted")}
        >
          <Star className="size-3" aria-hidden /> {L({ ko: "즐겨찾기만", en: "Starred" })} {favs.size ? `(${favs.size})` : ""}
        </button>
      </div>

      {families.map((f, fi) => {
        const hooks = f.hooks.map((h, hi) => ({ ...h, key: `${fi}-${hi}` })).filter((h) => !onlyFav || favs.has(h.key));
        if (!hooks.length) return null;
        return (
          <section key={fi}>
            <div className="flex flex-wrap items-baseline gap-2">
              <Kicker>{L(FAMILY_LABELS[f.family] ?? { ko: f.family, en: f.family })}</Kicker>
              {f.why ? <p className="text-xs text-fg-muted break-keep">{f.why}</p> : null}
            </div>
            <div className="mt-2 grid gap-3 md:grid-cols-2">
              {hooks.map((h) => {
                const line = platform ? h.variants.find((v) => v.platform === platform)?.text || h.text : h.text;
                return (
                  <article key={h.key} className="flex flex-col rounded-2xl border border-hairline bg-surface p-4">
                    <div className="flex items-start gap-2">
                      <p className="flex-1 text-base leading-snug font-bold text-fg break-keep">{line}</p>
                      <button type="button" aria-pressed={favs.has(h.key)} aria-label={L({ ko: "즐겨찾기", en: "Star" })} onClick={() => toggle(h.key)} className="p-1 text-fg-subtle hover:text-fg">
                        <Star className={cn("size-4", favs.has(h.key) && "fill-warn text-warn")} aria-hidden />
                      </button>
                    </div>
                    {h.onScreen ? (
                      <p className="mt-2 self-start rounded-md bg-fg px-2 py-1 text-sm font-bold text-bg break-keep" title={L({ ko: "화면 글자", en: "On-screen text" })}>
                        {h.onScreen}
                      </p>
                    ) : null}
                    {h.scene ? (
                      <p className="mt-2 flex gap-1.5 text-xs leading-relaxed text-fg-muted break-keep">
                        <Clapperboard className="mt-0.5 size-3.5 shrink-0 text-ai" aria-label={L({ ko: "첫 장면", en: "First scene" })} />
                        {h.scene}
                      </p>
                    ) : null}
                    {h.follow ? (
                      <p className="mt-1.5 text-xs leading-relaxed text-fg break-keep">
                        <span className="text-fg-subtle">→ </span>
                        {h.follow}
                      </p>
                    ) : null}
                    <div className="mt-auto flex items-center gap-2 pt-3">
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                        <span className="block h-full rounded-full bg-accent" style={{ width: `${h.strength * 10}%` }} />
                      </span>
                      <span className="text-2xs tabular-nums text-fg-subtle">
                        {L({ ko: "강도", en: "Strength" })} {h.strength}
                      </span>
                      <CopyButton text={[line, h.onScreen && `[화면] ${h.onScreen}`, h.follow].filter(Boolean).join("\n")} />
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}

      {strs(output.avoid).length ? (
        <div>
          <p className="text-2xs text-fg-subtle">{L({ ko: "쓰지 말아야 할 첫 문장", en: "Openings to avoid" })}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {strs(output.avoid).map((w) => (
              <span key={w} className="rounded-full border border-danger/30 bg-danger/10 px-2.5 py-1 text-xs text-danger line-through decoration-danger/60">
                {w}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
