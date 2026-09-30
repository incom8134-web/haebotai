"use client";

import { useState } from "react";
import { Pencil, ShieldCheck } from "lucide-react";
import { useBi } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import { TIER_LABELS } from "@/lib/tools/report/offer-architect";
import { obj, objs, str, strs } from "@/lib/tools/report/util";
import { CopyButton, Kicker, won } from "./shared";

// 오퍼 설계소 result: the offer as blocks the member can edit in place and
// copy one by one — headline, promise, value stack, the three packages
// (core highlighted), bonuses, guarantee and urgency with their honesty
// notes, objection answers, CTA and the two sales messages.

function EditableBlock({ label, initial, multiline = true, big = false }: { label: string; initial: string; multiline?: boolean; big?: boolean }) {
  const L = useBi();
  const [text, setText] = useState(initial);
  const [editing, setEditing] = useState(false);
  if (!initial) return null;
  return (
    <div className="rounded-2xl border border-hairline bg-surface p-4">
      <div className="flex items-center gap-2">
        <Kicker>{label}</Kicker>
        <span className="ml-auto flex gap-1.5">
          <button
            type="button"
            onClick={() => setEditing((e) => !e)}
            aria-pressed={editing}
            className="inline-flex items-center gap-1 rounded-md border border-hairline px-2 py-1 text-2xs text-fg-muted hover:text-fg"
          >
            <Pencil className="size-3" aria-hidden /> {editing ? L({ ko: "완료", en: "Done" }) : L({ ko: "고치기", en: "Edit" })}
          </button>
          <CopyButton text={text} />
        </span>
      </div>
      {editing ? (
        multiline ? (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={Math.min(10, Math.max(2, text.split("\n").length + 1))}
            aria-label={label}
            className="mt-2 w-full rounded-lg border border-hairline bg-bg p-2 text-sm leading-relaxed text-fg outline-none focus:border-accent"
          />
        ) : (
          <input value={text} onChange={(e) => setText(e.target.value)} aria-label={label} className="mt-2 w-full rounded-lg border border-hairline bg-bg p-2 text-sm text-fg outline-none focus:border-accent" />
        )
      ) : (
        <p className={cn("mt-2 whitespace-pre-wrap text-fg break-keep", big ? "text-xl leading-snug font-bold" : "text-sm leading-relaxed")}>{text}</p>
      )}
    </div>
  );
}

export function OfferBlocks({ output }: { output: Record<string, unknown> }) {
  const L = useBi();
  const target = obj(output.target);
  const stack = objs(output.value_stack);
  const packages = objs(output.packages);
  const bonuses = objs(output.bonuses);
  const g = obj(output.guarantee);
  const u = obj(output.urgency);
  const objections = objs(output.objections);
  const cta = obj(output.cta);
  const msg = obj(output.sales_message);

  return (
    <div className="mt-3 flex flex-col gap-4">
      <div className="rounded-2xl bg-fg p-5 text-bg">
        <p className="text-2xs font-semibold tracking-wide opacity-70">{str(output.offer_name)}</p>
        <p className="mt-1 text-2xl leading-tight font-bold break-keep">{str(output.headline)}</p>
        {str(output.subheadline) ? <p className="mt-2 text-sm leading-relaxed opacity-80 break-keep">{str(output.subheadline)}</p> : null}
        {str(cta.button) ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white">{str(cta.button)}</span>
            {str(cta.microcopy) ? <span className="text-xs opacity-70">{str(cta.microcopy)}</span> : null}
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <EditableBlock label={L({ ko: "핵심 약속", en: "Core promise" })} initial={str(output.core_promise)} big />
        <EditableBlock label={L({ ko: "포지셔닝 한 줄", en: "Positioning line" })} initial={str(output.positioning_line)} />
      </div>

      {str(target.who) ? (
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            [L({ ko: "누구에게", en: "For" }), str(target.who)],
            [L({ ko: "지금 상황", en: "Situation" }), str(target.situation)],
            [L({ ko: "원하는 결과", en: "Desired outcome" }), str(target.desired_outcome)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-surface-2 p-3">
              <p className="text-2xs text-fg-subtle">{k}</p>
              <p className="mt-0.5 text-sm text-fg break-keep">{v}</p>
            </div>
          ))}
        </div>
      ) : null}

      {stack.length ? (
        <section>
          <Kicker>{L({ ko: "받는 것", en: "What's inside" })}</Kicker>
          <ol className="mt-2 grid gap-2 sm:grid-cols-2">
            {stack.map((v, i) => (
              <li key={i} className="flex gap-3 rounded-xl border border-hairline bg-surface p-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-dim text-2xs font-bold text-accent">{i + 1}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-fg break-keep">{str(v.item)}</span>
                  <span className="mt-0.5 block text-xs text-fg-muted break-keep">{str(v.what_it_does)}</span>
                  <span className="mt-0.5 block text-2xs text-fg-subtle break-keep">{str(v.why_it_matters)}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {packages.length ? (
        <section>
          <Kicker>{L({ ko: "패키지", en: "Packages" })}</Kicker>
          <div className="mt-2 grid gap-3 md:grid-cols-3">
            {packages.map((p, i) => {
              const core = str(p.tier) === "core";
              return (
                <article key={i} className={cn("flex flex-col rounded-2xl border p-4", core ? "border-accent bg-accent-dim md:-my-2 md:py-6" : "border-hairline bg-surface")}>
                  <p className="text-2xs font-semibold text-fg-subtle">{TIER_LABELS[str(p.tier)] ?? str(p.tier)}{core ? ` · ${L({ ko: "추천", en: "Recommended" })}` : ""}</p>
                  <h4 className="mt-0.5 text-base font-bold text-fg break-keep">{str(p.name)}</h4>
                  <p className="mt-1 text-xl font-bold tabular-nums text-fg">{won(Number(p.price_krw))}</p>
                  <ul className="mt-3 flex flex-1 flex-col gap-1 text-xs text-fg-muted">
                    {strs(p.includes).map((x, j) => (
                      <li key={j} className="break-keep">✓ {x}</li>
                    ))}
                  </ul>
                  {str(p.best_for) ? <p className="mt-3 border-t border-hairline pt-2 text-2xs text-fg-subtle break-keep">{L({ ko: "이런 분께", en: "Best for" })}: {str(p.best_for)}</p> : null}
                </article>
              );
            })}
          </div>
          {bonuses.length ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {bonuses.map((b, i) => (
                <li key={i} className="rounded-full border border-hairline px-3 py-1 text-xs text-fg" title={str(b.why)}>
                  🎁 {str(b.name)} <span className="text-fg-subtle">— {str(b.why)}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        {str(g.terms) ? (
          <div className="rounded-2xl border border-hairline p-4">
            <p className="flex items-center gap-1.5 text-2xs font-semibold text-grounded">
              <ShieldCheck className="size-3.5" aria-hidden /> {L({ ko: "보증", en: "Guarantee" })} · {str(g.type)}
            </p>
            <p className="mt-1 text-sm text-fg break-keep">{str(g.terms)}</p>
            {str(g.caution) ? <p className="mt-1.5 text-2xs text-fg-subtle break-keep">{L({ ko: "주의", en: "Note" })}: {str(g.caution)}</p> : null}
          </div>
        ) : null}
        {str(u.mechanism) ? (
          <div className="rounded-2xl border border-hairline p-4">
            <p className="text-2xs font-semibold text-fg-subtle">{L({ ko: "지금 사야 하는 이유", en: "Why now" })}</p>
            <p className="mt-1 text-sm text-fg break-keep">{str(u.mechanism)}</p>
            {str(u.honest_note) ? <p className="mt-1.5 text-2xs text-fg-subtle break-keep">{str(u.honest_note)}</p> : null}
          </div>
        ) : null}
      </div>

      {objections.length ? (
        <section>
          <Kicker>{L({ ko: "망설임과 답", en: "Objections" })}</Kicker>
          <div className="mt-2 flex flex-col gap-1.5">
            {objections.map((x, i) => (
              <details key={i} className="group rounded-xl border border-hairline bg-surface px-3 py-2">
                <summary className="cursor-pointer text-sm font-medium text-fg break-keep">“{str(x.objection)}”</summary>
                <div className="mt-1.5 flex items-start gap-2">
                  <p className="flex-1 text-sm leading-relaxed text-fg-muted break-keep">{str(x.answer)}</p>
                  <CopyButton text={str(x.answer)} />
                </div>
              </details>
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <EditableBlock label={L({ ko: "짧은 판매 문구 (SNS)", en: "Short message (social)" })} initial={str(msg.short)} />
        <EditableBlock label={L({ ko: "긴 판매 문구 (상세페이지 첫 화면)", en: "Long message (page intro)" })} initial={str(msg.long)} />
      </div>
    </div>
  );
}
