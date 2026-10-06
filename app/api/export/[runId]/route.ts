import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
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
// document model (lib/tools/export/document.ts) — for the data tools
// that model carries the same report (KPI tiles, tables, charts) as the
// result page — and business-plan adds the financial .xlsx (HAEBOT_A_TOOLS_SPEC.md §5.1 / §5.2). Generated server-side (docx/exceljs stay out of the
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

// The download buttons are plain links, so a failure lands on a page
// the user sees: answer those with a short readable page (and a way
// back) instead of raw JSON. fetch() callers still get JSON.
function fail(request: NextRequest, status: number, message: string, headers: HeadersInit = {}, detail?: string): Response {
  if (request.headers.get("sec-fetch-dest") !== "document") {
    return Response.json(detail ? { error: message, detail } : { error: message }, { status, headers });
  }
  const escape = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>다운로드 실패 · AI 해바</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0e1116;color:#e8eaed;font-family:system-ui,-apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif}main{max-width:420px;padding:32px 24px;text-align:center}h1{font-size:20px;margin:0 0 8px}p{color:#aeb4bb;line-height:1.6;margin:0 0 24px}a{display:inline-block;padding:12px 20px;border-radius:12px;background:#16b364;color:#fff;text-decoration:none;font-weight:600}</style></head>
<body><main><h1>${escape(message)}</h1><p>${status === 401 ? "로그인한 뒤 다시 받아 주세요." : "잠시 후 다시 시도해 주세요. 계속 안 되면 다른 형식(PDF·Word)으로 받아 보세요."}</p><a href="javascript:history.back()">결과로 돌아가기</a></main></body></html>`;
  return new Response(html, { status, headers: { ...headers, "Content-Type": "text/html; charset=utf-8" } });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const format = new URL(request.url).searchParams.get("format");
  if (!isFormat(format)) {
    return fail(request, 400, "지원하지 않는 내보내기 형식입니다");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(request, 401, "로그인이 필요합니다");

  const rate = await checkRateLimit(exportLimiter, user.id);
  if (!rate.ok) {
    return fail(request, 429, "요청이 너무 잦습니다. 잠시 후 다시 시도해주세요.", { "Retry-After": String(rate.retryAfterSeconds) });
  }

  const { data: run } = await supabase
    .from("generations")
    .select("tool_id, input, output, status, sources, created_at")
    .eq("id", runId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!run || run.status !== "done" || !run.output) {
    return fail(request, 404, "결과를 찾을 수 없습니다");
  }

  const manifest = getTool(run.tool_id);
  // The document belongs to the user's project: no service branding.
  const toolName = (manifest?.name_ko ?? run.tool_id).replace(/^해봇\s*/, "");
  const date = new Date(run.created_at ?? Date.now()).toISOString().slice(0, 10);
  const filename = `${toolName}-${date}.${format}`;

  let buffer: Buffer;
  if (format === "xlsx") {
    if (run.tool_id !== "business-plan") return fail(request, 400, "이 도구는 해당 형식으로 내보낼 수 없습니다");
    buffer = await buildBusinessPlanXlsx(run.output, run.input ?? {});
  } else {
    const profile = await getBusinessProfile();
    const doc = buildExportDoc({
      toolName,
      toolId: run.tool_id,
      // Older runs were stored in whatever key order the model returned.
      output: orderLike(getOutputSchema(run.tool_id) ?? z.unknown(), run.output),
      input: run.input,
      sources: (run.sources as Source[] | null) ?? [],
      // The business this run was for (lib/tools/request-brief.ts); the
      // saved profile only when the run was about the account's own business.
      brandName: exportBrandName(run.output, profile?.brand_name ?? null),
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
      return fail(request, 500, `${format.toUpperCase()} 파일을 만들지 못했습니다`, {}, err instanceof Error ? err.message.slice(0, 300) : String(err));
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

function exportBrandName(output: unknown, profileBrand: string | null): string | null {
  const brief = (output as { request_brief?: { subject?: unknown; uses_profile?: unknown } } | null)?.request_brief;
  const subject = typeof brief?.subject === "string" ? brief.subject.trim() : "";
  if (subject) return subject;
  return brief?.uses_profile === false ? null : profileBrand;
}
