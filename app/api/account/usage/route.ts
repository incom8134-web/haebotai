import { createClient } from "@/lib/supabase/server";
import { getTool } from "@/lib/tools/registry";
import { buildUsageCsv } from "@/lib/usage-csv";
import { checkRateLimit, exportLimiter } from "@/lib/rate-limit";

// The signed-in user's run history (last 12 months) as CSV, for
// accounting and for reconciling own-key spend with the provider's bill.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다" }, { status: 401 });

  const rate = await checkRateLimit(exportLimiter, user.id);
  if (!rate.ok) return Response.json({ error: "요청이 너무 잦습니다. 잠시 후 다시 시도해주세요." }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } });

  const since = new Date();
  since.setFullYear(since.getFullYear() - 1);
  const { data, error } = await supabase
    .from("generations")
    .select("id, created_at, tool_id, provider, status, credits_used, input_tokens, output_tokens")
    .eq("user_id", user.id)
    .not("tool_id", "is", null)
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false })
    .limit(5000);
  if (error) return Response.json({ error: "내역을 불러오지 못했습니다" }, { status: 500 });

  const csv = buildUsageCsv(
    (data ?? []).map((r) => ({
      createdAt: r.created_at,
      tool: getTool(r.tool_id)?.name_ko ?? r.tool_id,
      provider: r.provider,
      status: r.status,
      creditsUsed: r.credits_used,
      inputTokens: r.input_tokens,
      outputTokens: r.output_tokens,
      runId: r.id,
    })),
  );
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="haebot-usage-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
