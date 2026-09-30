import "server-only";
import { generateOutput } from "@/lib/tools/generate";
import type { Source } from "@/lib/tools/registry/shared";
import type { AgentSpec } from "../types";

// The one-shot pipeline as a single stage: for engines the agents don't
// drive yet (a member's own Claude key) and tools with nothing to plan
// (the grant lookup). Same behaviour as before the agent runtime — only
// now it runs as a background job the page follows.

export function legacySpec(toolId: string): AgentSpec {
  return {
    id: toolId,
    objective: "",
    firstStage: "generate",
    stages: {
      generate: {
        id: "generate",
        label: { ko: "생성", en: "Generating" },
        maxSeconds: 270,
        async run(ctx) {
          const r = await generateOutput(ctx.manifest, ctx.input, ctx.state.profile, ctx.signal, ctx.storage, ctx.state.provider);
          ctx.addUsage(r.usage);
          ctx.state.work.final = r.output;
          ctx.state.sources = r.sources;
          return { next: "finalize" };
        },
      },
    },
    finalize: (state) => ({ output: state.work.final, sources: state.sources as Source[] }),
  };
}
