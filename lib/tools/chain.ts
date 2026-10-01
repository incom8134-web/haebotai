// HAEBOT_A_TOOLS_SPEC.md Part 2 §② / Part 6 T4 — typed output→input
// chaining for the Category 1 pairs declared via `acceptsChainFrom`.
// "money → calendar carries data with zero file handling": this is the
// mapping that makes that literal. Genuinely tool-pair-specific (there's
// no generic way to know which field of tool B a JSON blob from tool A
// belongs in without an LLM doing the mapping), so — like the output
// renderer — it's the one place per-pair code is expected.

type Loose = Record<string, unknown>;
const o = (v: unknown): Loose => (v && typeof v === "object" && !Array.isArray(v) ? (v as Loose) : {});
const arr = (v: unknown): Loose[] => (Array.isArray(v) ? v.map(o) : []);
const s = (v: unknown): string => (typeof v === "string" ? v : "");
const lines = (...xs: (string | false | undefined)[]) => xs.filter(Boolean).join("\n");

// 2.0 discover tools. `pick` is the idea the member chose on the result
// (an index into ideas[]); without it the recommended idea is used.
function seedFromDiscover(targetId: string, sourceId: string, source: unknown, pick?: number): Loose | null {
  const out = o(source);
  // Research targets first: their sources (market-gap, idea-radar…) also
  // have their own branches below that end in a catch-all return.
  if (targetId === "market-desk") {
    if (sourceId === "market-gap") {
      const g = arr(out.gaps)[pick ?? 0] ?? arr(out.gaps)[0];
      return { question: g ? `${s(g.title)} — ${s(g.opportunity)}의 수요가 실제로 있는지` : "", market: s(out.market_summary).slice(0, 120) };
    }
    if (sourceId === "idea-radar") {
      const ideas = arr(out.ideas);
      const idea = ideas[pick !== undefined && ideas[pick] ? pick : 0];
      return idea ? { question: `${s(idea.name)}을(를) 살 고객이 충분한지, 지금 무엇에 얼마를 쓰는지`, decision: `${s(idea.name)}을(를) 시작할지` } : {};
    }
  }
  if (targetId === "competitor-lens") {
    if (sourceId === "market-gap") return { business: s(arr(out.gaps)[0]?.opportunity), competitors: arr(out.solutions).map((x) => s(x.name)).filter(Boolean).slice(0, 6) };
    if (sourceId === "brand-dna") return { business: lines(s(o(out.essence).one_line), s(o(out.positioning).statement)) };
  }
  if (sourceId === "insight-miner" && targetId === "persona-mapper") {
    // Real customer words, so the persona rests on evidence rather than guesses.
    const quotes = arr(out.themes).flatMap((t) => (Array.isArray(t.quotes) ? (t.quotes as unknown[]).map(s) : [])).filter(Boolean);
    return { customer_data: quotes.map((q) => `- ${q}`).join("\n") };
  }
  if (sourceId === "competitor-lens") {
    const opp = arr(out.opportunities)[0];
    if (targetId === "brand-dna") return { offering: s(o(out.us).position), competitors: arr(out.competitors).map((c) => s(c.name)).filter(Boolean).slice(0, 5) };
    if (targetId === "offer-architect") return { differentiation: opp ? `${s(opp.title)}: ${s(opp.move)}` : "" };
  }
  if (sourceId === "persona-mapper") {
    const p = arr(out.personas)[0];
    if (!p) return {};
    const frustrations = Array.isArray(p.frustrations) ? (p.frustrations as unknown[]).map(s) : [];
    if (targetId === "hook-lab") return { audience: `${s(p.name)} (${s(p.age_range)}, ${s(p.situation)})`, topic: frustrations[0] ?? "" };
    if (targetId === "strategy") return { customer_voice: s(p.quote) };
  }
  if (sourceId === "idea-radar") {
    const ideas = arr(out.ideas);
    const recommended = ideas.findIndex((i) => s(i.name) === s(o(out.recommendation).pick));
    const idea = ideas[pick !== undefined && ideas[pick] ? pick : Math.max(0, recommended)];
    if (!idea) return {};
    const customer = o(idea.customer);
    const who = s(customer.who);
    const description = lines(`${s(idea.name)} — ${s(idea.one_liner)}`, s(idea.problem) && `문제: ${s(idea.problem)}`, s(idea.value_proposition) && `가치: ${s(idea.value_proposition)}`);
    switch (targetId) {
      case "revenue-mapper":
        return { idea: lines(description, s(o(idea.revenue).model) && `수익 방식: ${s(o(idea.revenue).model)}`), customers: who };
      case "offer-architect":
        return { product: description, target_customer: who, problem: s(idea.problem) };
      case "market-gap":
        return { market: s(idea.name), customer: who, known_problems: s(idea.problem) };
      case "mvp-blueprint":
        return { idea: lines(description, s(idea.mvp) && `MVP: ${s(idea.mvp)}`), target_user: who };
      case "trend":
        return { ideas: ideas.slice(0, 3).map((i) => s(i.name)).filter(Boolean) };
      case "calendar":
        return { model: lines(description, s(o(idea.first_validation).action) && `첫 검증: ${s(o(idea.first_validation).action)}`) };
      case "strategy":
        return { context: description };
      case "brand-dna":
        return { offering: description, target_customer: who };
    }
    return {};
  }
  if (sourceId === "revenue-mapper") {
    const mix = o(out.recommended_mix);
    const ue = o(out.unit_economics);
    if (targetId === "offer-architect") {
      const ladder = arr(out.ladder).map((l) => Number(l.price_krw)).filter((n) => Number.isFinite(n) && n > 0);
      return {
        product: lines(s(out.business_summary), s(mix.start_with) && `먼저 팔 것: ${s(mix.start_with)}`),
        target_customer: s(arr(out.segments)[0]?.name),
        ...(ladder.length ? { price_min: Math.min(...ladder), price_max: Math.max(...ladder) } : {}),
      };
    }
    if (targetId === "business-plan") {
      const price = Number(ue.price_krw);
      const variable = Number(ue.variable_cost_krw);
      return {
        item: lines(s(out.business_summary), s(mix.start_with) && `핵심 수익원: ${s(mix.start_with)}`),
        ...(price > 0 ? { unit_price: price } : {}),
        ...(price > 0 && variable >= 0 && variable < price ? { variable_cost_rate: Math.round((variable / price) * 100) } : {}),
      };
    }
    return {};
  }
  if (sourceId === "offer-architect") {
    const packages = arr(out.packages);
    const core = packages.find((p) => p.tier === "core") ?? packages[0];
    const target = o(out.target);
    if (targetId === "sangsepage")
      return {
        product_name: s(out.offer_name),
        features: arr(out.value_stack).map((v) => s(v.item)).filter(Boolean).slice(0, 5),
        ...(Number(core?.price_krw) > 0 ? { price: Number(core?.price_krw) } : {}),
        target_customer: s(target.who),
      };
    if (targetId === "copy")
      return { offer: lines(s(out.offer_name), s(out.core_promise), s(o(out.sales_message).short)), audience: s(target.who) };
    if (targetId === "brand-dna") return { offering: lines(s(out.offer_name), s(out.core_promise)), target_customer: s(target.who) };
    return {};
  }
  if (sourceId === "market-gap") {
    const gap = arr(out.gaps)[pick ?? 0] ?? arr(out.gaps)[0];
    if (!gap) return {};
    const idea = lines(`${s(gap.title)}: ${s(gap.opportunity)}`, s(gap.differentiation) && `차별화: ${s(gap.differentiation)}`);
    if (targetId === "mvp-blueprint") return { idea };
    if (targetId === "idea-radar") return { interests: [s(gap.title)].filter(Boolean), target_customer: s(arr(out.needs)[0]?.who) };
    return {};
  }
  if (targetId === "hook-lab") {
    if (sourceId === "strategy") {
      const t = arr(out.territories).find((x) => s(x.name) === s(out.recommended_territory)) ?? arr(out.territories)[0];
      return { topic: lines(s(t?.idea), s(t?.example_line) && `예: ${s(t?.example_line)}`), audience: s(arr(out.segments)[0]?.name) };
    }
    if (sourceId === "brand-dna")
      return {
        // topic is the form's required field: what the brand promises and
        // its first key message are what hooks should be about.
        topic: lines(s(o(out.essence).promise), s(([] as unknown[]).concat(o(out.messaging).key_messages ?? [])[0])),
        product: s(o(out.essence).one_line),
        audience: s(o(out.positioning).for_whom),
      };
    if (sourceId === "offer-architect") return { topic: s(out.core_promise), product: s(out.offer_name), audience: s(o(out.target).who) };
  }
  if (targetId === "content-transformer") {
    if (sourceId === "blog") return { source: s(out.body_markdown), source_type: "blog" };
    if (sourceId === "strategy") return { source: lines(s(out.positioning_statement), s(out.promise), ...arr(out.territories).map((t) => `${s(t.name)}: ${s(t.idea)}`)), source_type: "notes" };
  }
  if (sourceId === "meeting-action") {
    const actions = arr(out.actions).map((a) => `${s(a.task)} (${s(a.owner) || "미정"}${s(a.due) ? `, ${s(a.due)}` : ""})`);
    if (targetId === "calendar") return { model: lines(s(out.title), ...actions), milestones: arr(out.decisions).map((d) => s(d.decision)).filter(Boolean).slice(0, 5) };
    if (targetId === "sop-builder") return { process: lines(s(out.summary), ...actions) };
    return {};
  }
  if (targetId === "copy" && sourceId === "hook-lab") {
    const best = o(out.best);
    return { offer: s(best.text), must_include: [] };
  }
  if (sourceId === "brand-dna") {
    const essence = o(out.essence);
    const pos = o(out.positioning);
    const voice = o(out.voice);
    const visual = o(out.visual);
    const palette = arr(out.palette).map((c) => `${s(c.name)} ${s(c.hex)}`.trim()).filter(Boolean);
    const brief = lines(
      s(essence.one_line),
      s(pos.statement) && `포지셔닝: ${s(pos.statement)}`,
      Array.isArray(voice.tone_words) && `말투: ${(voice.tone_words as unknown[]).map(s).join(", ")}`,
      palette.length > 0 && `브랜드 색: ${palette.join(", ")}`,
      s(o(o(out.typography).heading).family) && `제목 서체: ${s(o(o(out.typography).heading).family)}`,
    );
    switch (targetId) {
      case "logo":
        return {
          brand_name: s(o(out._source_input).brand_name),
          keywords: [...(Array.isArray(visual.mood_words) ? (visual.mood_words as unknown[]).map(s) : []), ...(Array.isArray(voice.tone_words) ? (voice.tone_words as unknown[]).map(s) : [])]
            .filter(Boolean)
            .slice(0, 5),
        };
      case "homepage":
        return { content: lines(s(o(out._source_input).brand_name) && `브랜드: ${s(o(out._source_input).brand_name)}`, brief) };
      case "sangsepage":
        return { target_customer: s(pos.for_whom) };
      case "strategy":
        return { context: brief };
      case "copy":
        return { offer: brief, audience: s(pos.for_whom) };
    }
    return {};
  }
  if (sourceId === "mvp-blueprint") {
    if (targetId === "homepage")
      return { content: lines(s(out.product_one_liner), s(out.core_job) && `핵심: ${s(out.core_job)}`, s(out.target_user) && `대상: ${s(out.target_user)}`) };
    if (targetId === "calendar")
      return {
        model: s(out.product_one_liner),
        milestones: arr(out.stages).map((st) => s(st.name)).filter(Boolean).slice(0, 5),
      };
    return {};
  }
  if (sourceId === "market-desk") {
    // The decision the research was for, and what it concluded.
    const business = lines(s(out.decision), s(out.summary));
    if (targetId === "competitor-lens" || targetId === "persona-mapper") return { business };
    return {};
  }
  if (sourceId === "business-plan") {
    const sections = o(out.sections);
    const kind = s(out.plan_type);
    const reader = /정부|지원/.test(kind) ? "정부지원사업 심사위원" : /투자|IR/i.test(kind) ? "투자자" : /대출|은행/.test(kind) ? "금융기관 심사역" : "";
    const summary = lines(
      s(out.title),
      s(out.one_liner),
      s(sections.problem) && `문제: ${s(sections.problem)}`,
      s(sections.solution) && `해결: ${s(sections.solution)}`,
      arr(out.revenue_streams).length > 0 && `수익: ${arr(out.revenue_streams).map((r) => s(r.name)).filter(Boolean).join(", ")}`,
    );
    if (targetId === "presentation") return { brief: summary, audience: reader, purpose: "pitch" };
    if (targetId === "proposal") return { target: reader, content: summary };
    return {};
  }
  return null;
}

export function seedFromChain(targetId: string, sourceId: string, sourceOutput: unknown, pick?: number): Record<string, unknown> {
  const discover = seedFromDiscover(targetId, sourceId, sourceOutput, pick);
  if (discover) return discover;
  const output = sourceOutput as {
    models?: { name: string }[];
    ideas?: { name: string }[];
    combinations?: string[];
  };

  if (targetId === "trend" && sourceId === "money") {
    return { ideas: (output.models ?? []).slice(0, 3).map((m) => m.name) };
  }

  if (targetId === "calendar" && sourceId === "money") {
    return { model: output.models?.[0]?.name ?? "" };
  }

  if (targetId === "business-plan" && sourceId === "trend") {
    const top = (sourceOutput as { ideas?: { name?: string; one_liner?: string; target_customer?: string }[] }).ideas?.[0];
    return top ? { item: [top.name, top.one_liner, top.target_customer && `대상: ${top.target_customer}`].filter(Boolean).join("\n") } : {};
  }

  if (targetId === "calendar" && sourceId === "trend") {
    return { model: output.ideas?.[0]?.name ?? "" };
  }

  if (targetId === "copy" && sourceId === "strategy") {
    const strategy = sourceOutput as {
      positioning_statement?: string;
      recommended_territory?: string;
      offers?: { name: string; what: string }[];
      segments?: { name: string }[];
      reasons_to_believe?: string[];
    };
    const offer = strategy.offers?.[0];
    return {
      offer: [offer ? `${offer.name}: ${offer.what}` : strategy.positioning_statement, strategy.recommended_territory && `방향: ${strategy.recommended_territory}`]
        .filter(Boolean)
        .join("\n"),
      audience: strategy.segments?.[0]?.name ?? "",
      must_include: (strategy.reasons_to_believe ?? []).slice(0, 3),
    };
  }

  if (targetId === "blog" && sourceId === "keyword") {
    return { topic: output.combinations?.[0] ?? "" };
  }

  if (targetId === "copy" && sourceId === "keyword") {
    const kw = o(sourceOutput);
    const combos = (output.combinations ?? []).filter(Boolean).slice(0, 5);
    return { offer: lines(s(kw.summary), combos.length > 0 && `반영할 검색어: ${combos.join(", ")}`) };
  }

  if (sourceId === "strategy" && (targetId === "presentation" || targetId === "strategy")) {
    const st = o(sourceOutput);
    const territory = arr(st.territories).find((t) => s(t.name) === s(st.recommended_territory)) ?? arr(st.territories)[0];
    if (targetId === "presentation")
      return {
        brief: lines(s(st.positioning_statement), s(st.promise) && `약속: ${s(st.promise)}`, territory && `방향: ${s(territory.name)} — ${s(territory.idea)}`),
        audience: s(arr(st.segments)[0]?.name),
        purpose: "launch",
      };
  }

  if (sourceId === "trend" && (targetId === "presentation" || targetId === "strategy")) {
    const tr = o(sourceOutput);
    const ideas = arr(tr.ideas);
    const top = ideas.find((i) => s(i.name) === s(tr.recommended)) ?? ideas[0];
    const angles = Array.isArray(top?.differentiation_angles) ? (top.differentiation_angles as unknown[]).map(s).filter(Boolean) : [];
    if (targetId === "strategy")
      return top ? { context: lines(`${s(top.name)} — ${s(top.one_liner)}`, s(top.target_customer) && `대상: ${s(top.target_customer)}`, angles.length > 0 && `차별화: ${angles.join(" / ")}`) } : {};
    return {
      brief: lines(s(tr.summary), ...ideas.slice(0, 3).map((i) => `- ${s(i.name)}: ${s(i.one_liner)}${s(i.verdict) ? ` (${s(i.verdict)})` : ""}`)),
      purpose: "report",
    };
  }

  if (targetId === "place" && sourceId === "keyword") {
    return { current_info: `현재 상위 키워드: ${(output.combinations ?? []).join(", ")}` };
  }

  if (targetId === "sangsepage" && sourceId === "keyword") {
    return { features: (output.combinations ?? []).slice(0, 5) };
  }

  return {};
}
