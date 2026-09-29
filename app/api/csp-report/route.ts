// Receives Content-Security-Policy-Report-Only violations (next.config.ts)
// and logs a compact line per report, tagged so Vercel log search can
// group them. Nothing is stored.

type Report = { "document-uri"?: string; "violated-directive"?: string; "effective-directive"?: string; "blocked-uri"?: string };

export async function POST(request: Request) {
  const text = (await request.text().catch(() => "")).slice(0, 8_000);
  let reports: Report[] = [];
  try {
    const parsed = JSON.parse(text) as { "csp-report"?: Report } | { body?: Report & { documentURL?: string; effectiveDirective?: string; blockedURL?: string } }[];
    if (Array.isArray(parsed)) {
      reports = parsed.map((r) => ({ "document-uri": r.body?.documentURL, "effective-directive": r.body?.effectiveDirective, "blocked-uri": r.body?.blockedURL }));
    } else if (parsed["csp-report"]) {
      reports = [parsed["csp-report"]];
    }
  } catch {
    return new Response(null, { status: 204 });
  }
  for (const r of reports.slice(0, 10)) {
    console.warn("[csp-report]", r["effective-directive"] ?? r["violated-directive"], r["blocked-uri"], "on", r["document-uri"]);
  }
  return new Response(null, { status: 204 });
}
