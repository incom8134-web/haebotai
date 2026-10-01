import "server-only";
import { ThinkingLevel, type Part } from "@google/genai";
import { groundedSearch, TEXT_MODEL, toGeminiParts } from "@/lib/ai/gemini";
import { documentIllustrations, PRO_TEXT_MODEL } from "@/lib/ai/gemini-studio";
import { referenceOf } from "@/lib/tools/generate-prompt";
import type { ExportDoc } from "@/lib/tools/export/document";
import { jsonCall, smartCall } from "../calls";
import type { LongDocument } from "../core/document";
import type { ModelPort } from "../core/port";
import type { StageContext } from "../types";

// The agent core's port on Gemini: JSON calls on Flash (long context) or
// Pro (falling back to Flash), one grounded Google search per research
// question, document illustrations from the image model, and a real PDF
// render (the same writer as the download) for page counts. Runs inside
// the runner's key context, so a member's own Gemini key pays for it.

const THINK = { low: ThinkingLevel.LOW, medium: ThinkingLevel.MEDIUM, high: ThinkingLevel.HIGH } as const;

export function geminiPort(ctx: StageContext, toExport?: (doc: LongDocument, eyebrow: string) => ExportDoc): ModelPort {
  const attachments = async (): Promise<Part[]> => {
    const ref = referenceOf(ctx.input);
    return ref ? toGeminiParts([...ref.documents, ...ref.images], ctx.signal) : [];
  };
  return {
    async json(call) {
      const parts = call.attachSources ? await attachments() : undefined;
      const opts = {
        model: call.tier === "smart" ? PRO_TEXT_MODEL : TEXT_MODEL,
        system: call.system,
        prompt: call.prompt,
        schema: call.schema,
        signal: ctx.signal,
        thinking: call.thinking ? THINK[call.thinking] : undefined,
        timeoutMs: call.timeoutMs,
        parts,
        maxOutputTokens: call.maxOutputTokens,
      };
      return call.tier === "smart" ? smartCall(opts) : jsonCall(opts);
    },
    search: (prompt) => groundedSearch(prompt, ctx.signal),
    ...(toExport
      ? {
          async render(doc: LongDocument, eyebrow: string) {
            const { buildPdf } = await import("@/lib/tools/export/pdf");
            const pdf = await buildPdf(toExport(doc, eyebrow));
            // Page objects in the file (not the /Pages tree).
            return (pdf.toString("latin1").match(/\/Type\s*\/Page(?![s\w])/g) ?? []).length || null;
          },
        }
      : {}),
    async images(items, context) {
      const r = await documentIllustrations(items, context, ctx.storage, ctx.signal);
      ctx.addUsage(r.usage);
      return new Map([...r.shots].map(([k, v]) => [k, { url: v.url }]));
    },
  };
}
