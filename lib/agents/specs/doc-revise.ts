import "server-only";
import { ThinkingLevel } from "@google/genai";
import { PRO_TEXT_MODEL } from "@/lib/ai/gemini-studio";
import type { TokenUsage } from "@/lib/ai/types";
import { smartCall } from "../calls";
import { parseBlocks, type DocBlock, type LongDocument } from "../core/document";
import { routeRevision } from "../core/revise-request";
import { BLOCK_TYPES, parseSection, SECTION_SCHEMA, WRITER_SYSTEM } from "../core/write";

// A follow-up on a finished document (app/api/runs/[runId]/regenerate):
// the change is routed to the smallest edit that does it — the design
// alone (no words touched, no model call, no credits), the visual
// strategy alone, or only the sections named — and everything else is
// kept exactly. The result is a new version; the original stays.

type DocRevision =
  | { ok: true; doc: LongDocument; usage: TokenUsage; free: boolean; note: string; changed: string[] }
  | { ok: false; error: string; status: number };

const ZERO: TokenUsage = { inputTokens: 0, outputTokens: 0 };
const add = (a: TokenUsage, b: TokenUsage): TokenUsage => ({ inputTokens: (a.inputTokens ?? 0) + (b.inputTokens ?? 0), outputTokens: (a.outputTokens ?? 0) + (b.outputTokens ?? 0) });

function outline(doc: LongDocument, mark: Set<string>): string {
  let chapter = 0;
  return doc.sections.map((s) => `${mark.has(s.id) ? "▶" : " "} ${s.level <= 1 ? `${++chapter}.` : "  -"} [${s.id}] ${s.title}${s.summary ? ` — ${s.summary}` : ""}`).join("\n");
}

const VISUALS_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      maxItems: 10,
      items: {
        type: "object",
        properties: {
          section_id: { type: "string" },
          block: (SECTION_SCHEMA.properties.blocks as { items: object }).items,
        },
        required: ["section_id", "block"],
      },
    },
  },
  required: ["items"],
} as const;

export async function reviseDocument(opts: {
  doc: LongDocument;
  instruction: string;
  /** "document" (route from the instruction) or "doc:<section id>". */
  target: string;
  contractText: string;
  requestText: string;
  signal: AbortSignal;
}): Promise<DocRevision> {
  const doc: LongDocument = structuredClone(opts.doc);
  const picked = opts.target.startsWith("doc:") ? opts.target.slice(4) : "";
  const route = picked && doc.sections.some((s) => s.id === picked) ? ({ kind: "sections", ids: [picked] } as const) : routeRevision(opts.instruction, doc);

  if (route.kind === "unknown") return { ok: false, status: 400, error: "어느 섹션을 바꿀지 골라 주세요. (디자인만 바꾸기, 이미지·도표 조정은 그대로 적으면 돼요)" };

  if (route.kind === "design") {
    doc.design = { ...doc.design, ...route.patch };
    return { ok: true, doc, usage: ZERO, free: true, note: route.note, changed: [] };
  }

  if (route.kind === "visuals") {
    if (route.fewerImages) for (const s of doc.sections) s.blocks = s.blocks.filter((b) => b.type !== "image");
    let usage = ZERO;
    const changed: string[] = [];
    if (route.moreDiagrams) {
      const r = await smartCall({
        model: PRO_TEXT_MODEL,
        system: [WRITER_SYSTEM, "이번 작업은 시각 자료만 추가합니다. 본문 문장은 바꾸지 않습니다. 각 시각 자료는 그 섹션에 이미 있는 내용·수치를 도표(process), 표(table), 일정(timeline), 차트(chart)로 보여 주는 것이어야 합니다."].join("\n"),
        prompt: [opts.contractText, `[요청] ${opts.instruction}`, "[문서]", JSON.stringify(doc.sections.map((s) => ({ id: s.id, title: s.title, blocks: s.blocks }))).slice(0, 150_000), `블록 type은 ${BLOCK_TYPES.filter((t) => t !== "image" && t !== "paragraph" && t !== "bullets").join(", ")} 중에서.`].join("\n\n"),
        schema: VISUALS_SCHEMA,
        signal: opts.signal,
        thinking: ThinkingLevel.LOW,
        timeoutMs: 120_000,
        maxOutputTokens: 16_000,
      });
      usage = r.usage;
      const items = ((r.data as { items?: { section_id?: string; block?: Record<string, unknown> }[] })?.items ?? []).map((i) => {
        const b = { ...(i.block ?? {}) };
        if (b.type === "kpis") b.items = b.kpi_items ?? b.items;
        if (b.type === "timeline") b.items = b.timeline_items ?? b.items;
        return { id: String(i.section_id ?? ""), blocks: parseBlocks([b]).filter((x: DocBlock) => x.type !== "paragraph" && x.type !== "bullets" && x.type !== "image") };
      });
      for (const it of items) {
        const s = doc.sections.find((x) => x.id === it.id);
        if (s && it.blocks.length) {
          s.blocks.push(...it.blocks);
          changed.push(s.id);
        }
      }
    }
    return { ok: true, doc, usage, free: !route.moreDiagrams, note: route.moreDiagrams ? `도표 ${changed.length}곳 추가${route.fewerImages ? ", 이미지 제거" : ""}` : "이미지를 뺐어요", changed };
  }

  // Only the named sections are rewritten; the rest stays byte for byte.
  const ids = route.ids.slice(0, 4);
  const mark = new Set(ids);
  let usage = ZERO;
  const results = await Promise.allSettled(
    ids.map(async (id) => {
      const s = doc.sections.find((x) => x.id === id)!;
      const r = await smartCall({
        model: PRO_TEXT_MODEL,
        system: WRITER_SYSTEM,
        prompt: [
          opts.contractText,
          `[원래 요청]\n${opts.requestText.slice(0, 8000)}`,
          `[문서 전체 구조 — ▶가 고칠 섹션]\n${outline(doc, mark)}`,
          `[사용자의 수정 요청 — 이 섹션에만 적용] ${opts.instruction}`,
          `[지금의 섹션]\n${JSON.stringify({ title: s.title, blocks: s.blocks })}`,
          "요청한 방향으로 이 섹션만 다시 쓰세요. 다른 섹션과 모순되지 않게 하고, 지금 섹션과 원래 요청에 없는 사실(수치·이름·실적)은 만들지 마세요. 요청과 관계없는 좋은 부분은 살리세요.",
        ].join("\n\n"),
        schema: SECTION_SCHEMA,
        signal: opts.signal,
        thinking: ThinkingLevel.LOW,
        timeoutMs: 150_000,
        maxOutputTokens: 24_000,
      });
      usage = add(usage, r.usage);
      const next = parseSection(r.data, { id: s.id, title: s.title, level: s.level, purpose: s.purpose ?? "", sourceRefs: s.sourceRefs, requirements: [], mustCover: [], research: [], weight: 1, targetChars: 0, visual: { kind: "none", purpose: "", spec: "" } }, "rewritten");
      if (!next) throw new Error("섹션 응답을 해석하지 못했습니다");
      return next;
    }),
  );
  const changed: string[] = [];
  results.forEach((r) => {
    if (r.status !== "fulfilled") return;
    const i = doc.sections.findIndex((x) => x.id === r.value.id);
    if (i >= 0) {
      doc.sections[i] = r.value;
      changed.push(r.value.id);
    }
  });
  if (!changed.length) return { ok: false, status: 502, error: "다시 만들지 못했어요. 크레딧은 돌려드렸어요." };
  return { ok: true, doc, usage, free: false, note: `${changed.length}개 섹션만 고쳤어요`, changed };
}
