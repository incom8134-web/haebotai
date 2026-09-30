import { fmt } from "./charts.ts";
import type { Report, ReportSection } from "./types.ts";
import { keep, num, obj, objs, PALETTES, str, strs } from "./util.ts";

// 오퍼 설계소: the offer as a document — promise, value stack, the three
// packages, bonuses, guarantee and urgency, objection answers, CTA and
// the two sales messages.

export const TIER_LABELS: Record<string, string> = { entry: "입문", core: "핵심", premium: "프리미엄" };

export function offerArchitectReport(o: Record<string, unknown>): Report {
  const target = obj(o.target);
  const stack = objs(o.value_stack).map((v) => ({ item: str(v.item), does: str(v.what_it_does), why: str(v.why_it_matters) })).filter((v) => v.item);
  const packages = objs(o.packages).map((p) => ({ tier: str(p.tier), name: str(p.name), price: num(p.price_krw), includes: strs(p.includes), bestFor: str(p.best_for) })).filter((p) => p.name);
  const bonuses = objs(o.bonuses).map((b) => ({ name: str(b.name), why: str(b.why) })).filter((b) => b.name);
  const g = obj(o.guarantee);
  const u = obj(o.urgency);
  const objections = objs(o.objections).map((x) => ({ q: str(x.objection), a: str(x.answer) })).filter((x) => x.q);
  const cta = obj(o.cta);
  const msg = obj(o.sales_message);
  const sections: ReportSection[] = [];

  sections.push({
    id: "promise",
    kicker: "핵심",
    title: str(o.headline) || str(o.offer_name) || "오퍼",
    lead: str(o.subheadline) || undefined,
    blocks: keep([
      { type: "callout", label: "핵심 약속", text: str(o.core_promise) },
      {
        type: "cards",
        columns: 3,
        items: [
          { title: "누구에게", lines: [str(target.who)].filter(Boolean) },
          { title: "지금 상황", lines: [str(target.situation)].filter(Boolean) },
          { title: "원하는 결과", lines: [str(target.desired_outcome)].filter(Boolean) },
        ].filter((c) => c.lines.length),
      },
      { type: "text", title: "포지셔닝", text: str(o.positioning_line) },
    ]),
  });

  sections.push({
    id: "value",
    kicker: "가치",
    title: "고객이 받는 것",
    blocks: keep([stack.length > 0 && { type: "table", header: ["구성", "하는 일", "왜 중요한가"], rows: stack.map((v) => [v.item, v.does, v.why]) }]),
  });

  sections.push({
    id: "packages",
    kicker: "패키지",
    title: "세 가지 선택지",
    blocks: keep([
      packages.length > 0 && {
        type: "chart",
        chart: { kind: "circles", items: packages.map((p) => ({ label: `${TIER_LABELS[p.tier] ?? p.tier} · ${p.name}`, value: fmt(p.price, "원"), note: p.bestFor })) },
      },
      packages.length > 0 && {
        type: "cards",
        columns: 3,
        items: packages.map((p) => ({ title: p.name, kicker: TIER_LABELS[p.tier] ?? p.tier, badge: fmt(p.price, "원"), lines: p.includes })),
      },
      bonuses.length > 0 && { type: "bullets", title: "보너스", items: bonuses.map((b) => `${b.name} — ${b.why}`) },
    ]),
  });

  sections.push({
    id: "trust",
    kicker: "신뢰",
    title: "보증, 긴급성, 망설임에 대한 답",
    blocks: keep([
      !!str(g.terms) && { type: "text", title: `보증 · ${str(g.type)}`, text: `${str(g.terms)}${str(g.caution) ? `\n주의: ${str(g.caution)}` : ""}`, half: true },
      !!str(u.mechanism) && { type: "text", title: "긴급성", text: `${str(u.mechanism)}${str(u.honest_note) ? `\n${str(u.honest_note)}` : ""}`, half: true },
      objections.length > 0 && { type: "table", header: ["망설임", "답"], rows: objections.map((x) => [x.q, x.a]) },
    ]),
  });

  sections.push({
    id: "copy",
    kicker: "문구",
    title: "바로 쓰는 판매 문구",
    blocks: keep([
      !!str(cta.button) && { type: "callout", label: "버튼", text: `${str(cta.button)}${str(cta.microcopy) ? `\n${str(cta.microcopy)}` : ""}` },
      { type: "text", title: "짧은 메시지", text: str(msg.short) },
      { type: "text", title: "긴 메시지", text: str(msg.long) },
    ]),
  });

  const prices = packages.map((p) => p.price).filter((p) => p > 0);
  return {
    palette: PALETTES["offer-architect"],
    hero: {
      eyebrow: "오퍼 설계소",
      title: str(o.offer_name) || str(o.headline) || "오퍼",
      subtitle: str(o.core_promise) || undefined,
      kpis: prices.length ? [{ label: "가격대", value: `${fmt(Math.min(...prices), "원")}~${fmt(Math.max(...prices), "원")}` }, { label: "구성 블록", value: `${stack.length}개` }] : [],
    },
    sections: sections.filter((s) => s.blocks.length),
  };
}
