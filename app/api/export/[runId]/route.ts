import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildProposalDocx, buildBusinessPlanDocx } from "@/lib/tools/export/docx";
import { buildBusinessPlanXlsx } from "@/lib/tools/export/xlsx";
import { exportLimiter, checkRateLimit } from "@/lib/rate-limit";

// HAEBOT_A_TOOLS_SPEC.md §5.1 / §5.2 — proposal -> .docx, business-plan
// -> .docx + .xlsx. Generated server-side (docx/exceljs stay out of the
// client bundle) from the already-persisted run row, keyed by runId so
// this works identically for a just-finished run and one from history.

const CONTENT_TYPES = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
} as const;

export async function GET(request: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const format = new URL(request.url).searchParams.get("format");
  if (format !== "docx" && format !== "xlsx") {
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
    .select("tool_id, input, output, status")
    .eq("id", runId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!run || run.status !== "done" || !run.output) {
    return Response.json({ error: "결과를 찾을 수 없습니다" }, { status: 404 });
  }

  let buffer: Buffer;
  let filename: string;

  if (run.tool_id === "proposal" && format === "docx") {
    buffer = await buildProposalDocx(run.output);
    filename = "proposal.docx";
  } else if (run.tool_id === "business-plan" && format === "docx") {
    buffer = await buildBusinessPlanDocx(run.output);
    filename = "business-plan.docx";
  } else if (run.tool_id === "business-plan" && format === "xlsx") {
    buffer = await buildBusinessPlanXlsx(run.output, run.input ?? {});
    filename = "business-plan.xlsx";
  } else {
    return Response.json({ error: "이 도구는 해당 형식으로 내보낼 수 없습니다" }, { status: 400 });
  }

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": CONTENT_TYPES[format],
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
