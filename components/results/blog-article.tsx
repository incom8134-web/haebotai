"use client";

import { useBi } from "@/lib/i18n/context";

import { Fragment } from "react";

// The blog result as the finished post: cover photo, the chosen title
// (other candidates as chips), the search description, the body with its
// photos placed after the sections they belong to, and the hashtags.
// A tiny markdown renderer covers what the tool writes (## / ### headings,
// lists, **bold**, links) without pulling in a markdown library.

interface Slot {
  after_section?: string;
  purpose?: string;
  image_url?: string;
}

export interface BlogOutput {
  titles?: string[];
  meta_description?: string;
  body_markdown?: string;
  hashtags?: string[];
  char_count?: number;
  image_slots?: Slot[];
  cover_image_url?: string;
}

function inline(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\((https?:[^)\s]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) out.push(<strong key={m.index} className="font-semibold text-fg">{m[1]}</strong>);
    else out.push(<a key={m.index} href={m[3]} target="_blank" rel="noreferrer" className="text-accent underline underline-offset-2">{m[2]}</a>);
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const norm = (t: string) => t.replace(/[#*\s]/g, "").toLowerCase();

function Photo({ slot }: { slot: Slot }) {
  if (!slot.image_url) return null;
  return (
    <figure className="my-5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={slot.image_url} alt={slot.purpose ?? ""} loading="lazy" className="w-full rounded-2xl border border-hairline object-cover" />
      {slot.purpose ? <figcaption className="mt-1.5 text-center text-2xs text-fg-subtle">{slot.purpose}</figcaption> : null}
    </figure>
  );
}

export function BlogArticle({ post }: { post: BlogOutput }) {
  const L = useBi();
  const [title, ...otherTitles] = post.titles ?? [];
  const slots = post.image_slots ?? [];
  const placed = new Set<number>();
  const lines = (post.body_markdown ?? "").split("\n");

  // Group lines into blocks, and after each section's heading block run,
  // drop in the photo planned for that section.
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  let heading = "";
  const flushList = (k: number) => {
    if (!list.length) return;
    blocks.push(
      <ul key={`ul${k}`} className="my-3 flex list-disc flex-col gap-1.5 pl-5 text-[15px] leading-relaxed text-fg-muted marker:text-accent">
        {list.map((l, i) => <li key={i}>{inline(l)}</li>)}
      </ul>,
    );
    list = [];
  };
  const placeFor = (section: string, k: number) => {
    slots.forEach((s, i) => {
      if (!placed.has(i) && s.after_section && section && norm(s.after_section).includes(norm(section).slice(0, 8))) {
        placed.add(i);
        blocks.push(<Photo key={`ph${k}-${i}`} slot={s} />);
      }
    });
  };
  lines.forEach((raw, k) => {
    const line = raw.trimEnd();
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      flushList(k);
      if (heading) placeFor(heading, k);
      heading = h[2];
      const Tag = h[1].length <= 2 ? "h2" : "h3";
      blocks.push(
        <Tag key={k} className={Tag === "h2" ? "mt-8 mb-2 text-xl font-bold leading-snug text-fg break-keep" : "mt-5 mb-1.5 text-base font-semibold text-fg break-keep"}>
          {inline(h[2])}
        </Tag>,
      );
    } else if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      list.push(line.replace(/^\s*([-*]|\d+\.)\s+/, ""));
    } else if (line.trim() === "") {
      flushList(k);
    } else if (!/^!\[/.test(line)) {
      flushList(k);
      blocks.push(<p key={k} className="my-3 text-[15px] leading-[1.85] text-fg-muted break-keep">{inline(line)}</p>);
    }
  });
  flushList(lines.length);
  if (heading) placeFor(heading, lines.length);
  const leftovers = slots.filter((_, i) => !placed.has(i));

  return (
    <article className="mt-3 overflow-hidden rounded-2xl border border-hairline">
      {post.cover_image_url ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={post.cover_image_url} alt="" className="aspect-[16/8] w-full object-cover" />
      ) : null}
      <div className="px-5 py-6 md:px-8">
        {title ? <h1 className="text-2xl leading-snug font-bold text-fg break-keep md:text-3xl">{title}</h1> : null}
        {post.meta_description ? (
          <p className="mt-3 rounded-xl bg-surface-2/60 p-3 text-sm leading-relaxed text-fg-muted break-keep">
            <span className="mr-1.5 text-2xs font-semibold text-accent">{L({ ko: "검색 설명", en: "Meta description" })}</span>
            {post.meta_description}
          </p>
        ) : null}
        <div className="mt-2">
          {blocks.map((b, i) => (
            <Fragment key={i}>{b}</Fragment>
          ))}
        </div>
        {leftovers.map((s, i) => (
          <Photo key={`left${i}`} slot={s} />
        ))}
        {post.hashtags?.length ? (
          <div className="mt-6 flex flex-wrap gap-1.5 border-t border-hairline pt-4">
            {post.hashtags.map((t) => (
              <span key={t} className="rounded-full bg-accent/10 px-2.5 py-1 text-xs text-accent">
                {t.startsWith("#") ? t : `#${t}`}
              </span>
            ))}
          </div>
        ) : null}
        {otherTitles.length ? (
          <div className="mt-5">
            <p className="text-2xs text-fg-subtle">{L({ ko: "다른 제목 후보", en: "Other title options" })}</p>
            <ul className="mt-1.5 flex flex-col gap-1">
              {otherTitles.map((t) => (
                <li key={t} className="text-sm text-fg break-keep">· {t}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {typeof post.char_count === "number" ? <p className="mt-4 font-mono text-2xs text-fg-subtle">{L({ ko: `본문 ${post.char_count.toLocaleString("ko-KR")}자`, en: `${post.char_count.toLocaleString()} characters` })}</p> : null}
      </div>
    </article>
  );
}
