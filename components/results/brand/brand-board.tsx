"use client";

import { useMemo } from "react";
import { useBi } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import { contrast, DIMENSIONS, readPalette, ROLE_LABELS, textOn } from "@/lib/tools/report/brand-dna";
import { PALETTES } from "@/lib/tools/report/util";
import { obj, objs, str, strs } from "@/lib/tools/report/util";
import { Chart } from "@/components/results/report-view";
import { CopyButton, Kicker, SectionTitle } from "@/components/results/discover/shared";

// 브랜드 DNA 스튜디오 result: the brand board. The hero is set in the
// brand's own primary colour and heading font (loaded from Google Fonts),
// the palette shows each colour's role and the readable text colour on it
// with its WCAG contrast ratio, the type specimen uses the real fonts, and
// voice, taglines and positioning can be copied line by line.

const ROLE_EN: Record<string, string> = { primary: "Primary", secondary: "Secondary", accent: "Accent", neutral: "Neutral", background: "Background" };
const fontHref = (families: string[]) =>
  `https://fonts.googleapis.com/css2?${families.map((f) => `family=${f.replace(/ /g, "+")}:wght@400;700`).join("&")}&display=swap`;

export function BrandBoard({ output, input }: { output: Record<string, unknown>; input?: Record<string, unknown> }) {
  const L = useBi();
  const palette = useMemo(() => readPalette(output), [output]);
  const essence = obj(output.essence);
  const arche = obj(output.archetype);
  const dims = obj(output.dimensions);
  const pos = obj(output.positioning);
  const voice = obj(output.voice);
  const type = obj(output.typography);
  const heading = obj(type.heading);
  const body = obj(type.body);
  const visual = obj(output.visual);
  const msg = obj(output.messaging);
  const name = str(input?.brand_name) || str(essence.one_line);

  const primary = palette.find((c) => c.role === "primary") ?? palette[0];
  const bg = palette.find((c) => c.role === "background");
  const onPrimary = primary ? textOn(primary.hex) : null;
  // Charts sit on the light page: use the first brand colour that shows up on white.
  const chartColor = palette.find((c) => contrast(c.hex, "#FFFFFF") >= 3)?.hex;
  const families = [str(heading.family), str(body.family)].filter(Boolean);
  const headFont = str(heading.family) ? `"${str(heading.family)}", sans-serif` : undefined;
  const bodyFont = str(body.family) ? `"${str(body.family)}", sans-serif` : undefined;
  const cssVars = palette.map((c, i) => `--brand-${c.role || i}${palette.filter((p) => p.role === c.role).length > 1 ? `-${i}` : ""}: ${c.hex}; /* ${c.name} */`).join("\n");

  return (
    <div className="mt-3 flex flex-col gap-6">
      {/* No `precedence`: React would hold the page until Google Fonts
          loads, and where it's blocked the whole result re-renders on the
          client. The specimens just swap in when the font arrives. */}
      {families.length ? <link rel="stylesheet" href={fontHref(families)} /> : null}

      <header
        className="relative overflow-hidden rounded-2xl border border-hairline-str p-6 md:p-8"
        style={{ background: primary?.hex ?? "var(--color-fg)", color: onPrimary?.color ?? "var(--color-bg)" }}
      >
        <p className="text-2xs font-semibold tracking-wide opacity-75">
          {L({ ko: "브랜드 보드", en: "Brand board" })}
          {str(arche.name) ? ` · ${str(arche.name)}` : ""}
        </p>
        <p className="mt-2 text-3xl leading-tight font-bold break-keep md:text-4xl" style={{ fontFamily: headFont }}>
          {name}
        </p>
        {str(essence.one_line) && str(essence.one_line) !== name ? (
          <p className="mt-2 max-w-xl text-base leading-relaxed opacity-90 break-keep" style={{ fontFamily: bodyFont }}>
            {str(essence.one_line)}
          </p>
        ) : null}
        {palette.length ? (
          <div className="mt-5 flex gap-1.5" aria-hidden>
            {palette.map((c) => (
              <span key={c.hex + c.name} className="h-2 flex-1 rounded-full ring-1 ring-black/10" style={{ background: c.hex }} />
            ))}
          </div>
        ) : null}
      </header>

      {output.summary ? <p className="text-sm leading-relaxed text-fg-muted break-keep">{String(output.summary)}</p> : null}

      <section className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="rounded-2xl border border-hairline bg-surface p-4">
          <Kicker>{L({ ko: "성격의 비율", en: "Personality mix" })}</Kicker>
          <Chart
            half
            palette={chartColor ? [chartColor, ...PALETTES["brand-dna"]] : PALETTES["brand-dna"]}
            spec={{ kind: "radar", axes: DIMENSIONS.map((d) => L(d)), series: [{ name, values: DIMENSIONS.map((d) => Math.max(0, Math.min(10, Number(dims[d.key]) || 0))) }], max: 10 }}
          />
          {str(arche.why) ? <p className="mt-2 text-xs leading-relaxed text-fg-muted break-keep">{str(arche.why)}</p> : null}
        </div>
        <div className="flex flex-col gap-2">
          {objs(output.traits).map((t, i) => (
            <div key={i} className="rounded-xl border border-hairline bg-surface p-3">
              <p className="text-sm font-bold text-fg">{str(t.trait)}</p>
              <p className="mt-1 text-xs leading-relaxed text-fg break-keep">
                <span className="mr-1 font-semibold text-grounded">○</span>
                {str(t.means)}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-fg-muted break-keep">
                <span className="mr-1 font-semibold text-danger">✕</span>
                {str(t.not)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {str(pos.statement) ? (
        <section className="rounded-2xl border border-accent/30 bg-accent-dim p-4">
          <div className="flex items-start gap-2">
            <Kicker>{L({ ko: "포지셔닝", en: "Positioning" })}</Kicker>
            <CopyButton text={str(pos.statement)} className="ml-auto" />
          </div>
          <p className="mt-1 text-base leading-relaxed font-semibold text-fg break-keep">{str(pos.statement)}</p>
          <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
            {[
              [L({ ko: "누구를 위해", en: "For" }), str(pos.for_whom)],
              [L({ ko: "무엇으로", en: "Category" }), str(pos.category)],
              [L({ ko: "무엇이 다른가", en: "Difference" }), str(pos.difference)],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="text-fg-subtle">{k}</p>
                <p className="mt-0.5 text-fg break-keep">{v}</p>
              </div>
            ))}
          </div>
          {strs(pos.reasons_to_believe).length ? (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {strs(pos.reasons_to_believe).map((r, i) => (
                <li key={i} className="rounded-full bg-surface px-2.5 py-1 text-xs text-fg">✓ {r}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {palette.length ? (
        <section>
          <div className="flex items-end gap-2">
            <SectionTitle kicker={L({ ko: "색", en: "Colour" })} title={L({ ko: "팔레트와 글자 대비", en: "Palette and text contrast" })} />
            <CopyButton text={cssVars} label={L({ ko: "CSS 변수로 복사", en: "Copy as CSS" })} className="mb-3 ml-auto" />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {palette.map((c, i) => {
              const t = textOn(c.hex);
              const pass = t.ratio >= 4.5;
              return (
                <div key={i} className="overflow-hidden rounded-2xl border border-hairline bg-surface">
                  <div className="flex h-24 flex-col justify-between p-3" style={{ background: c.hex, color: t.color }}>
                    <span className="text-2xs font-semibold opacity-80">{L({ ko: ROLE_LABELS[c.role] ?? c.role, en: ROLE_EN[c.role] ?? c.role })}</span>
                    <span className="text-lg font-bold" style={{ fontFamily: headFont }}>
                      {L({ ko: "가나다 Aa", en: "Aa 가나다" })}
                    </span>
                  </div>
                  <div className="p-3">
                    <div className="flex items-center gap-2">
                      <p className="min-w-0 flex-1 truncate text-sm font-semibold text-fg">{c.name}</p>
                      <CopyButton text={c.hex} label={c.hex} />
                    </div>
                    {c.usage ? <p className="mt-1 text-2xs leading-relaxed text-fg-muted break-keep">{c.usage}</p> : null}
                    <p className={cn("mt-1.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium", pass ? "bg-grounded-dim text-grounded" : "bg-warn/15 text-fg")}>
                      {t.color === "#FFFFFF" ? L({ ko: "흰 글자", en: "White text" }) : L({ ko: "검은 글자", en: "Dark text" })} {t.ratio.toFixed(1)}:1 {pass ? "AA" : L({ ko: "큰 글자만", en: "large text only" })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {families.length ? (
        <section>
          <SectionTitle kicker={L({ ko: "서체", en: "Type" })} title={L({ ko: "제목과 본문", en: "Heading and body" })} />
          <div className="rounded-2xl border border-hairline p-5" style={{ background: bg?.hex, color: bg ? textOn(bg.hex).color : undefined }}>
            <p className="text-3xl leading-tight font-bold break-keep" style={{ fontFamily: headFont }}>
              {strs(msg.taglines)[0] || name}
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed break-keep" style={{ fontFamily: bodyFont }}>
              {str(msg.elevator_pitch) || str(essence.purpose)}
            </p>
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {[
              [L({ ko: "제목", en: "Heading" }), heading],
              [L({ ko: "본문", en: "Body" }), body],
            ].map(([label, f]) => {
              const font = f as Record<string, unknown>;
              if (!str(font.family)) return null;
              return (
                <div key={label as string} className="rounded-xl bg-surface-2 p-3 text-xs">
                  <p className="text-fg-subtle">{label as string}</p>
                  <p className="mt-0.5 text-sm font-semibold text-fg">
                    <a href={`https://fonts.google.com/specimen/${str(font.family).replace(/ /g, "+")}`} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
                      {str(font.family)}
                    </a>{" "}
                    <span className="font-normal text-fg-subtle">{str(font.weight)}</span>
                  </p>
                  <p className="mt-1 leading-relaxed text-fg-muted break-keep">{str(font.why)}</p>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <section>
        <SectionTitle kicker={L({ ko: "목소리", en: "Voice" })} title={strs(voice.tone_words).join(" · ") || L({ ko: "말투", en: "Tone" })} />
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-hairline p-4">
            <p className="text-2xs font-semibold text-grounded">{L({ ko: "이렇게 말해요", en: "Do" })}</p>
            <ul className="mt-1.5 flex flex-col gap-1 text-sm text-fg">
              {strs(voice.do).map((d, i) => (
                <li key={i} className="break-keep">○ {d}</li>
              ))}
            </ul>
            <p className="mt-3 text-2xs font-semibold text-danger">{L({ ko: "이렇게는 말하지 않아요", en: "Don't" })}</p>
            <ul className="mt-1.5 flex flex-col gap-1 text-sm text-fg-muted">
              {strs(voice.dont).map((d, i) => (
                <li key={i} className="break-keep">✕ {d}</li>
              ))}
            </ul>
          </div>
          <ul className="flex flex-col gap-2">
            {objs(voice.samples).map((s, i) => (
              <li key={i} className="rounded-2xl border border-hairline bg-surface p-3">
                <div className="flex items-center gap-2">
                  <p className="text-2xs text-fg-subtle">{str(s.context)}</p>
                  <CopyButton text={str(s.line)} className="ml-auto" />
                </div>
                <p className="mt-1 text-sm leading-relaxed text-fg break-keep" style={{ fontFamily: bodyFont }}>
                  {str(s.line)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-hairline p-4">
          <Kicker>{L({ ko: "태그라인", en: "Taglines" })}</Kicker>
          <ol className="mt-2 flex flex-col gap-2">
            {strs(msg.taglines).map((t, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-lg font-bold text-fg break-keep" style={{ fontFamily: headFont }}>
                  {t}
                </span>
                <CopyButton text={t} className="ml-auto" />
              </li>
            ))}
          </ol>
          {strs(msg.key_messages).length ? (
            <ul className="mt-3 flex flex-col gap-1 border-t border-hairline pt-3 text-xs text-fg-muted">
              {strs(msg.key_messages).map((m, i) => (
                <li key={i} className="break-keep">· {m}</li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="rounded-2xl border border-hairline p-4">
          <Kicker>{L({ ko: "시각 방향", en: "Visual direction" })}</Kicker>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {strs(visual.mood_words).map((m) => (
              <span key={m} className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-fg">{m}</span>
            ))}
          </div>
          {str(visual.imagery) ? <p className="mt-2 text-sm leading-relaxed text-fg break-keep">{str(visual.imagery)}</p> : null}
          {str(visual.shapes) ? <p className="mt-1 text-xs leading-relaxed text-fg-muted break-keep">{str(visual.shapes)}</p> : null}
          {strs(visual.avoid).length ? (
            <p className="mt-2 text-xs text-fg-muted break-keep">
              <span className="font-semibold text-danger">{L({ ko: "피할 것", en: "Avoid" })}</span> {strs(visual.avoid).join(" · ")}
            </p>
          ) : null}
        </div>
      </section>

      {objs(output.values).length || objs(output.touchpoints).length ? (
        <section className="grid gap-3 md:grid-cols-2">
          {objs(output.values).length ? (
            <div>
              <Kicker>{L({ ko: "가치", en: "Values" })}</Kicker>
              <dl className="mt-2 flex flex-col gap-2">
                {objs(output.values).map((v, i) => (
                  <div key={i} className="rounded-xl bg-surface-2 p-3">
                    <dt className="text-sm font-semibold text-fg">{str(v.value)}</dt>
                    <dd className="mt-0.5 text-xs text-fg-muted break-keep">{str(v.in_practice)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}
          {objs(output.touchpoints).length ? (
            <div>
              <Kicker>{L({ ko: "접점별 적용", en: "At each touchpoint" })}</Kicker>
              <dl className="mt-2 flex flex-col gap-2">
                {objs(output.touchpoints).map((t, i) => (
                  <div key={i} className="rounded-xl border border-hairline p-3">
                    <dt className="text-sm font-semibold text-fg">{str(t.touchpoint)}</dt>
                    <dd className="mt-0.5 text-xs text-fg-muted break-keep">{str(t.apply)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
