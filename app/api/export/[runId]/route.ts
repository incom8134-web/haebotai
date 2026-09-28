import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildProposalDocx, buildBusinessPlanDocx } from "@/lib/tools/export/docx";
import { buildBusinessPlanXlsx } from "@/lib/tools/export/xlsx";
import { buildExportDoc } from "@/lib/tools/export/document";
import { buildGenericDocx } from "@/lib/tools/export/generic-docx";
import { buildMarkdown } from "@/lib/tools/export/markdown";
import { getTool } from "@/lib/tools/registry";
import { getBusinessProfile } from "@/lib/profile";
import { orderLike } from "@/lib/tools/output-order";
import type { Source } from "@/lib/tools/registry/shared";
import { exportLimiter, checkRateLimit } from "@/lib/rate-limit";
import { getOutputSchema } from "@/lib/tools/schemas";
import { z } from "zod";

// Every finished run exports to .md / .docx / .pdf / .pptx through one
// document model (lib/tools/export/document.ts); proposal and
// business-plan keep their bespoke .docx layouts, and business-plan adds
// the financial .xlsx (HAEBOT_A_TOOLS_SPEC.md §5.1 / §5.2). Generated server-side (docx/exceljs stay out of the
// client bundle) from the already-persisted run row, keyed by runId so
// this works identically for a just-finished run and one from history.

const CONTENT_TYPES = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  md: "text/markdown; charset=utf-8",
} as const;
type Format = keyof typeof CONTENT_TYPES;
const isFormat = (f: string | null): f is Format => f !== null && f in CONTENT_TYPES;

export async function GET(request: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const format = new URL(request.url).searchParams.get("format");
  if (!isFormat(format)) {
    return Response.json({ error: "지원하지 않는 내보내기 형식입니다" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다" }, { status: 401 });

  const rate = await checkRateLimit(exportLimiter, user.id);
  if (!rate.ok) {
    return Response.json(
      { error: "요청이 너무 잦습니다. 잠시 후 다시 시도해주세요." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }

  const { data: run } = await supabase
    .from("generations")
    .select("tool_id, input, output, status, sources, created_at")
    .eq("id", runId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!run || run.status !== "done" || !run.output) {
    return Response.json({ error: "결과를 찾을 수 없습니다" }, { status: 404 });
  }

  const manifest = getTool(run.tool_id);
  const toolName = manifest?.name_ko ?? run.tool_id;
  const date = new Date(run.created_at ?? Date.now()).toISOString().slice(0, 10);
  const filename = `${toolName}-${date}.${format}`;

  let buffer: Buffer;
  if (run.tool_id === "proposal" && format === "docx") {
    buffer = await buildProposalDocx(run.output);
  } else if (run.tool_id === "business-plan" && format === "docx") {
    buffer = await buildBusinessPlanDocx(run.output);
  } else if (format === "xlsx") {
    if (run.tool_id !== "business-plan") return Response.json({ error: "이 도구는 해당 형식으로 내보낼 수 없습니다" }, { status: 400 });
    buffer = await buildBusinessPlanXlsx(run.output, run.input ?? {});
  } else {
    const profile = await getBusinessProfile();
    const doc = buildExportDoc({
      toolName,
      toolId: run.tool_id,
      // Older runs were stored in whatever key order the model returned.
      output: orderLike(getOutputSchema(run.tool_id) ?? z.unknown(), run.output),
      sources: (run.sources as Source[] | null) ?? [],
      brandName: profile?.brand_name ?? null,
      createdAt: run.created_at,
    });
    // pdfkit and pptxgenjs load only for their own format, so a problem
    // loading one of them can't take down every other export.
    try {
      buffer =
        format === "md" ? Buffer.from(buildMarkdown(doc), "utf8")
        : format === "pdf" ? await (await import("@/lib/tools/export/pdf")).buildPdf(doc)
        : format === "pptx" ? await (await import("@/lib/tools/export/pptx")).buildPptx(doc)
        : await buildGenericDocx(doc);
    } catch (err) {
      console.error(`export ${format} failed`, err);
      return Response.json({ error: `${format.toUpperCase()} 파일을 만들지 못했습니다`, detail: err instanceof Error ? err.message.slice(0, 300) : String(err) }, { status: 500 });
    }
  }

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": CONTENT_TYPES[format],
      // RFC 5987: the Korean tool name needs the UTF-8 form; the plain
      // `filename` is an ASCII fallback for old clients.
      "Content-Disposition": `attachment; filename="haebot-${run.tool_id}-${date}.${format}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
