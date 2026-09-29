"use client";

import { useBi } from "@/lib/i18n/context";

// Campaign copy shown the way it will run: the core message, then each
// angle as a feed-ad mockup (its own photo, headline, body and CTA),
// channel-specific versions, and the words to keep out of every ad.

interface Angle {
  motivation?: string;
  headline?: string;
  body?: string;
  cta?: string;
  image_url?: string;
}

export interface CopyOutput {
  core_message?: string;
  angles?: Angle[];
  channel_versions?: { channel?: string; copy?: string; note?: string }[];
  words_to_avoid?: string[];
}

export function AdCreatives({ copy, brand }: { copy: CopyOutput; brand?: string }) {
  const L = useBi();
  const name = brand || L({ ko: "우리 가게", en: "Your shop" });
  return (
    <div className="mt-3 flex flex-col gap-5">
      {copy.core_message ? (
        <div className="studio-gradient-bg rounded-2xl p-5 text-white">
          <p className="text-2xs font-semibold tracking-wide opacity-80">{L({ ko: "핵심 메시지", en: "Core message" })}</p>
          <p className="mt-1.5 text-lg leading-snug font-bold break-keep md:text-xl">{copy.core_message}</p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {(copy.angles ?? []).map((a, i) => (
          <article key={i} className="overflow-hidden rounded-2xl border border-hairline bg-surface">
            <header className="flex items-center gap-2 px-3 py-2.5">
              <span className="studio-gradient-bg grid size-7 place-items-center rounded-full text-2xs font-bold text-white">{name.slice(0, 1)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-fg">{name}</span>
                <span className="block text-2xs text-fg-subtle">{L({ ko: "광고", en: "Ad" })} · {a.motivation}</span>
              </span>
            </header>
            {a.image_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={a.image_url} alt={a.headline ?? ""} loading="lazy" className="aspect-[4/5] w-full object-cover" />
            ) : (
              <div className="studio-gradient-bg grid aspect-[4/5] place-items-center p-6 text-center text-lg font-bold text-white break-keep">{a.headline}</div>
            )}
            <div className="flex items-center justify-between gap-3 border-b border-hairline bg-surface-2/60 px-3 py-2.5">
              <p className="min-w-0 text-sm font-semibold leading-snug text-fg break-keep">{a.headline}</p>
              {a.cta ? <span className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">{a.cta}</span> : null}
            </div>
            {a.body ? <p className="px-3 py-3 text-sm leading-relaxed text-fg-muted break-keep">{a.body}</p> : null}
          </article>
        ))}
      </div>

      {copy.channel_versions?.length ? (
        <div>
          <p className="text-2xs text-fg-subtle">{L({ ko: "채널별 버전", en: "By channel" })}</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {copy.channel_versions.map((c, i) => (
              <div key={i} className="rounded-xl border border-hairline p-3">
                <p className="text-xs font-semibold text-accent">{c.channel}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-fg break-keep">{c.copy}</p>
                {c.note ? <p className="mt-1.5 text-2xs text-fg-subtle">{c.note}</p> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {copy.words_to_avoid?.length ? (
        <div>
          <p className="text-2xs text-fg-subtle">{L({ ko: "쓰지 말아야 할 표현", en: "Words to avoid" })}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {copy.words_to_avoid.map((w) => (
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
