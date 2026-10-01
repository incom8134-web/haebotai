import "server-only";
import { drawLogo as drawLogoMarks, geminiAdapter, planLogo as planLogoDirections, type LogoPlan } from "@/lib/ai/gemini";
import { orderLike } from "@/lib/tools/output-order";
import { outputSchemaFor } from "@/lib/tools/schemas";
import { generateOutput } from "@/lib/tools/generate";
import { directives, runCritic } from "../specs/common";
import type { Critique } from "../types";
import type { Capability } from "./types";

// Visual capabilities. Photos (image, brand-model): the strategy decides
// the shoot and the shot plan and image model follow it. Logo: four
// genuinely different directions are planned, a critic checks them BEFORE
// anything is drawn (drawing is the expensive part), weak plans are
// re-planned once, then the marks are drawn and typeset.
//
// Also the one-shot pipeline as a single capability, for engines the
// agents don't drive yet (a member's own Claude key) and tools with
// nothing to plan (the grant lookup).

export const renderPhotos: Capability = {
  id: "render_photos",
  label: { ko: "촬영", en: "Shooting" },
  maxSeconds: () => 150,
  async run(ctx, flow) {
    const r = await geminiAdapter.generateImages(ctx.manifest, directives(ctx.state, ctx.input), ctx.state.profile, ctx.signal, ctx.storage);
    ctx.addUsage(r.usage);
    ctx.state.work.final = orderLike(outputSchemaFor(ctx.manifest.id), r.output);
    return flow.next;
  },
};

export const planLogo: Capability = {
  id: "plan_logo",
  label: { ko: "로고 방향 기획", en: "Planning directions" },
  maxSeconds: () => 70,
  async run(ctx, flow) {
    const critiques = (ctx.state.work.critiques as Critique[] | undefined) ?? [];
    const replan = ctx.state.work.plans !== undefined && critiques.length > 0;
    const input = directives(ctx.state, ctx.input);
    if (replan) input._revision = { draft: JSON.stringify(ctx.state.work.plans), critique: critiques[critiques.length - 1] };
    const r = await planLogoDirections(ctx.manifest, input, ctx.state.profile, ctx.signal);
    ctx.addUsage(r.usage);
    ctx.state.work.plans = r.plans;
    ctx.state.work.replanned = replan;
    return replan ? (flow.find("draw_logo") ?? flow.next) : flow.next;
  },
};

export const critiqueLogoPlans: Capability = {
  id: "critique_logo_plans",
  label: { ko: "방향 검토", en: "Reviewing directions" },
  maxSeconds: () => 60,
  skipTo: (flow) => flow.next,
  async run(ctx, flow) {
    const plans = ctx.state.work.plans as LogoPlan[];
    const c = await runCritic(
      ctx,
      `[로고 방향 4개 — 그리기 전 기획안. 서로 충분히 다른지, 브랜드 성격과 맞는지, 작은 크기·단색에서 읽힐지, 업종 클리셰인지 보세요]\n${JSON.stringify(plans.map(({ name, concept_rationale, symbol, color_hex, font_weight }) => ({ name, concept_rationale, symbol, color_hex, font_weight })))}`,
      0,
    );
    const replan = flow.find("plan_logo");
    return c && c.verdict === "revise" && c.issues.some((i) => i.severity !== "low") && replan ? replan : flow.next;
  },
};

export const drawLogo: Capability = {
  id: "draw_logo",
  label: { ko: "심볼 그리기와 조판", en: "Drawing and typesetting" },
  maxSeconds: () => 150,
  async run(ctx, flow) {
    const r = await drawLogoMarks(ctx.manifest, directives(ctx.state, ctx.input), ctx.state.profile, ctx.state.work.plans as LogoPlan[], ctx.signal, ctx.storage);
    ctx.addUsage(r.usage);
    ctx.state.work.final = orderLike(outputSchemaFor("logo"), r.output);
    return flow.next;
  },
};

export const oneShot: Capability = {
  id: "one_shot",
  label: { ko: "생성", en: "Generating" },
  maxSeconds: () => 270,
  async run(ctx, flow) {
    const r = await generateOutput(ctx.manifest, ctx.input, ctx.state.profile, ctx.signal, ctx.storage, ctx.state.provider);
    ctx.addUsage(r.usage);
    ctx.state.work.final = r.output;
    ctx.state.sources = r.sources;
    return flow.next;
  },
};
