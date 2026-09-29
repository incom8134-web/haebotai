"use client";

import { useBi } from "@/lib/i18n/context";

// The strategy's recommended direction as pictures: one wide scene and
// two square details, all in one color grade, so the plan has a look.

export function MoodBoard({ images }: { images: { url: string; caption?: string }[] }) {
  const L = useBi();
  if (!images.length) return null;
  const [wide, ...rest] = images;
  return (
    <section className="mt-3">
      <p className="text-2xs text-fg-subtle">{L({ ko: "추천 방향 무드보드", en: "Mood board for the recommended direction" })}</p>
      <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
        <figure className="col-span-2 row-span-2 overflow-hidden rounded-2xl border border-hairline">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={wide.url} alt={wide.caption ?? ""} className="aspect-[16/10] size-full object-cover md:aspect-auto" />
        </figure>
        {rest.map((img) => (
          <figure key={img.url} className="col-span-1 overflow-hidden rounded-2xl border border-hairline md:col-span-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt={img.caption ?? ""} className="aspect-square size-full object-cover md:aspect-[16/7.6]" />
          </figure>
        ))}
      </div>
      <ul className="mt-2 flex flex-col gap-0.5">
        {images.map((img, i) => (img.caption ? <li key={i} className="text-2xs text-fg-subtle">{i + 1}. {img.caption}</li> : null))}
      </ul>
    </section>
  );
}
