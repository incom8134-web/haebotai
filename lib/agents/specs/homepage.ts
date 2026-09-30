import "server-only";
import { assembleHomepage, planSite, reviseSite, shootSite, siteProblems, sitePrefix, writeSite, type SitePlan } from "@/lib/ai/gemini-studio";
import { orderLike } from "@/lib/tools/output-order";
import { outputSchemaFor } from "@/lib/tools/schemas";
import { clip } from "../critic";
import { guideFor } from "../library";
import { directives, runCritic, strategizeStage, understandStage } from "./common";
import { withBrief } from "./generic";
import type { AgentSpec, Critique, StageContext } from "../types";

// The homepage agent: understand → site strategy (role, what the first
// screen must prove, section order, how much motion) → art direction →
// photos + page → creative director's critique → full revision → pick the
// better page → assemble (photos, fonts, TypeScript, import map). Each
// step is its own stage, so the whole run can take longer than one
// function invocation without cutting the review.

interface Page {
  html: string;
  score: number | null;
  problems: string[];
}

const pages = (ctx: StageContext) => ((ctx.state.work.pages as Page[] | undefined) ??= []);

export function homepageSpec(): AgentSpec {
  return {
    id: "homepage",
    objective: guideFor("homepage").objective,
    firstStage: "understand",
    stages: {
      understand: understandStage("strategize"),
      strategize: strategizeStage(
        "plan",
        () =>
          "[사이트 조건] 설계도의 각 부분은 사이트의 섹션이며, 순서는 방문자의 의사결정 순서입니다. notes에 그 섹션이 보여 줄 구체 내용과 형식(사진, 카드, 표, 지도, 폼, 3D 장면)을 적으세요. 첫 화면이 먼저 증명할 것과 3D·모션의 양(없음 포함)을 rubric에 넣으세요.",
      ),
      plan: {
        id: "plan",
        label: { ko: "아트 디렉션", en: "Art direction" },
        maxSeconds: 90,
        async run(ctx) {
          const { plan, usage } = await planSite(ctx.manifest, directives(ctx.state, ctx.input), ctx.state.profile, ctx.signal);
          ctx.addUsage(usage);
          ctx.state.work.plan = plan;
          ctx.state.work.prefix = sitePrefix();
          ctx.emit({ kind: "note", stage: "plan", status: "done", label: { ko: `콘셉트: ${plan.concept}`, en: `Concept: ${plan.concept}` } });
          return { next: "build" };
        },
      },
      build: {
        id: "build",
        label: { ko: "사진 촬영과 페이지 제작", en: "Photos and page" },
        maxSeconds: 210,
        async run(ctx) {
          const plan = ctx.state.work.plan as SitePlan;
          const input = directives(ctx.state, ctx.input);
          const photos = shootSite(plan, ctx.storage, ctx.signal);
          const page = await writeSite(ctx.manifest, input, ctx.state.profile, plan, String(ctx.state.work.prefix), ctx.signal);
          ctx.addUsage(page.usage);
          const shots = await photos;
          shots.forEach((s) => ctx.addUsage(s.usage));
          ctx.state.work.shots = shots.map((s) => ({ url: s.url }));
          pages(ctx).push({ html: page.html, score: null, problems: siteProblems(plan, page.html) });
          return { next: "critique" };
        },
      },
      critique: {
        id: "critique",
        label: { ko: "크리에이티브 디렉터 검토", en: "Creative review" },
        maxSeconds: 80,
        optional: { skipTo: "assemble" },
        async run(ctx) {
          const list = pages(ctx);
          const latest = list[list.length - 1];
          const plan = ctx.state.work.plan as SitePlan;
          const draft = [
            `[아트 디렉션] ${JSON.stringify({ concept: plan.concept, big_idea: plan.big_idea, hero: plan.hero_archetype, sections: plan.sections.map((s) => s.title), scene: plan.experience?.scene })}`,
            latest.problems.length ? `[자동 점검에서 발견된 문제] ${latest.problems.join(" / ")}` : "",
            "[HTML]",
            clip(latest.html, 50_000),
          ]
            .filter(Boolean)
            .join("\n");
          const c = await runCritic(ctx, draft, list.length - 1);
          if (!c) return { next: list.length > 1 ? "assemble" : "revise" };
          latest.score = c.score;
          // One full revision; a second only when the first still fails and there's time for it.
          const revisions = list.length - 1;
          if (c.verdict === "pass" && latest.problems.length === 0) return { next: "assemble" };
          return { next: revisions === 0 || (revisions === 1 && c.score < 70) ? "revise" : "assemble" };
        },
      },
      revise: {
        id: "revise",
        label: { ko: "페이지 개선", en: "Improving the page" },
        maxSeconds: 210,
        optional: { skipTo: "assemble" },
        async run(ctx) {
          const plan = ctx.state.work.plan as SitePlan;
          const list = pages(ctx);
          const latest = list[list.length - 1];
          const critiques = (ctx.state.work.critiques as Critique[] | undefined) ?? [];
          const c = critiques[critiques.length - 1];
          const critiqueText = [
            ...(c ? c.issues.map((i, n) => `${n + 1}. [${i.severity}] ${i.where}: ${i.problem} → ${i.fix}`) : []),
            ...latest.problems.map((p) => `- (automatic check) ${p}`),
            c?.strengths.length ? `Keep: ${c.strengths.join(" / ")}` : "",
          ]
            .filter(Boolean)
            .join("\n");
          const page = await reviseSite(ctx.manifest, directives(ctx.state, ctx.input), ctx.state.profile, plan, String(ctx.state.work.prefix), latest.html, critiqueText, ctx.signal);
          ctx.addUsage(page.usage);
          list.push({ html: page.html, score: null, problems: siteProblems(plan, page.html) });
          ctx.emit({ kind: "revision", stage: "revise", status: "done", label: { ko: `${list.length - 1}차 개선본`, en: `Revision ${list.length - 1}` } });
          // A second review only when the first found serious problems.
          return { next: c && c.score < 70 ? "critique" : "assemble" };
        },
      },
      assemble: {
        id: "assemble",
        label: { ko: "사이트 완성", en: "Assembling the site" },
        maxSeconds: 30,
        async run(ctx) {
          const plan = ctx.state.work.plan as SitePlan;
          const list = pages(ctx);
          // Fewest automatic problems first, then the critic's score; ties go to the later page.
          const best = list.reduce((a, b) => {
            if (b.problems.length !== a.problems.length) return b.problems.length < a.problems.length ? b : a;
            return (b.score ?? a.score ?? 0) >= (a.score ?? 0) ? b : a;
          });
          const shots = (ctx.state.work.shots as { url: string | null }[] | undefined) ?? [];
          ctx.state.work.final = orderLike(outputSchemaFor("homepage"), assembleHomepage(directives(ctx.state, ctx.input), plan, best.html, shots));
          ctx.state.work.pages = list.map((p) => ({ html: "", score: p.score, problems: p.problems }));
          return { next: "finalize" };
        },
      },
    },
    finalize: (state) => ({ output: withBrief(state, state.work.final), sources: [] }),
  };
}
