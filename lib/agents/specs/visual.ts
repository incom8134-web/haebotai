import "server-only";
import { drawLogo, geminiAdapter, planLogo, type LogoPlan } from "@/lib/ai/gemini";
import { orderLike } from "@/lib/tools/output-order";
import { outputSchemaFor } from "@/lib/tools/schemas";
import { guideFor } from "../library";
import { directives, runCritic, strategizeStage, understandStage } from "./common";
import { withBrief } from "./generic";
import type { AgentSpec, Critique } from "../types";

// Visual agents. Photos (image, brand-model): the strategy decides the
// shoot — what each frame must sell, the light, set and mood from the
// request's tone — and the shot plan and image model follow it. Logo: a
// strategist reasons about personality, symbolism, category conventions
// and small-size use, four genuinely different directions are planned,
// a critic checks them BEFORE anything is drawn (drawing is the expensive
// part), weak plans are re-planned once, then the marks are drawn and
// typeset.

export function photoSpec(toolId: string): AgentSpec {
  return {
    id: toolId,
    objective: guideFor(toolId).objective,
    firstStage: "understand",
    stages: {
      understand: understandStage("strategize"),
      strategize: strategizeStage(
        "render",
        () => "[촬영 조건] 설계도의 각 부분은 사진 한 컷입니다. 컷마다 그 사진이 파는 것, 앵글·거리·빛·배경·소품·색감을 notes에 적으세요. 톤에 맞는 빛과 분위기(예: 격식이면 절제된 스튜디오광, 활기면 강한 색과 역동적 앵글)를 고르세요.",
      ),
      render: {
        id: "render",
        label: { ko: "촬영", en: "Shooting" },
        maxSeconds: 150,
        async run(ctx) {
          const r = await geminiAdapter.generateImages(ctx.manifest, directives(ctx.state, ctx.input), ctx.state.profile, ctx.signal, ctx.storage);
          ctx.addUsage(r.usage);
          ctx.state.work.final = orderLike(outputSchemaFor(ctx.manifest.id), r.output);
          return { next: "finalize" };
        },
      },
    },
    finalize: (state) => ({ output: withBrief(state, state.work.final), sources: [] }),
  };
}

export function logoSpec(): AgentSpec {
  return {
    id: "logo",
    objective: guideFor("logo").objective,
    firstStage: "understand",
    stages: {
      understand: understandStage("strategize"),
      strategize: strategizeStage(
        "concepts",
        () =>
          "[로고 조건] 설계도는 서로 확실히 다른 로고 방향 4개입니다(조형 방식이 달라야 함: 예 워드마크, 상징 심볼, 모노그램, 엠블럼, 캐릭터 중 이 브랜드에 맞는 것). 부분마다 상징의 출처(이름의 뜻, 제품, 장소, 이야기), 업종 관습을 따르는지 깨는지, 32px 파비콘과 단색에서 읽히는 이유를 notes에 적으세요. rubric에는 브랜드 성격 형용사와 피할 인상을 넣으세요.",
      ),
      concepts: {
        id: "concepts",
        label: { ko: "로고 방향 기획", en: "Planning directions" },
        maxSeconds: 70,
        async run(ctx) {
          const critiques = (ctx.state.work.critiques as Critique[] | undefined) ?? [];
          const replan = ctx.state.work.plans !== undefined && critiques.length > 0;
          const input = directives(ctx.state, ctx.input);
          if (replan) input._revision = { draft: JSON.stringify(ctx.state.work.plans), critique: critiques[critiques.length - 1] };
          const r = await planLogo(ctx.manifest, input, ctx.state.profile, ctx.signal);
          ctx.addUsage(r.usage);
          ctx.state.work.plans = r.plans;
          ctx.state.work.replanned = replan;
          return { next: replan ? "draw" : "critique" };
        },
      },
      critique: {
        id: "critique",
        label: { ko: "방향 검토", en: "Reviewing directions" },
        maxSeconds: 60,
        optional: { skipTo: "draw" },
        async run(ctx) {
          const plans = ctx.state.work.plans as LogoPlan[];
          const c = await runCritic(
            ctx,
            `[로고 방향 4개 — 그리기 전 기획안. 서로 충분히 다른지, 브랜드 성격과 맞는지, 작은 크기·단색에서 읽힐지, 업종 클리셰인지 보세요]\n${JSON.stringify(plans.map(({ name, concept_rationale, symbol, color_hex, font_weight }) => ({ name, concept_rationale, symbol, color_hex, font_weight })))}`,
            0,
          );
          return { next: c && c.verdict === "revise" && c.issues.some((i) => i.severity !== "low") ? "concepts" : "draw" };
        },
      },
      draw: {
        id: "draw",
        label: { ko: "심볼 그리기와 조판", en: "Drawing and typesetting" },
        maxSeconds: 150,
        async run(ctx) {
          const r = await drawLogo(ctx.manifest, directives(ctx.state, ctx.input), ctx.state.profile, ctx.state.work.plans as LogoPlan[], ctx.signal, ctx.storage);
          ctx.addUsage(r.usage);
          ctx.state.work.final = orderLike(outputSchemaFor("logo"), r.output);
          return { next: "finalize" };
        },
      },
    },
    finalize: (state) => ({ output: withBrief(state, state.work.final), sources: [] }),
  };
}
