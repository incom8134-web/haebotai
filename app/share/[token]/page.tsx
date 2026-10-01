import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { resignOutput } from "@/lib/run-assets-server";
import { getOutputSchema } from "@/lib/tools/schemas";
import { orderLike } from "@/lib/tools/output-order";
import { publicInput, SHARE_TOKEN } from "@/lib/share";
import type { Source } from "@/lib/tools/registry/shared";
import { SharedResult } from "@/components/share/shared-result";

// A result its owner chose to share (app/api/runs/[runId]/share). Read
// with the service role by the unguessable token; a revoked link, or a
// result deleted since, is simply not found. Never indexed.

export const metadata: Metadata = {
  title: "공유된 결과",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

async function load(token: string) {
  if (!SHARE_TOKEN.test(token)) return null;
  const admin = createAdminClient();
  const { data: share } = await admin.from("run_shares").select("run_id, user_id").eq("token", token).is("revoked_at", null).maybeSingle();
  if (!share) return null;
  const { data: run } = await admin
    .from("generations")
    .select("tool_id, status, input, output, sources, title, created_at")
    .eq("id", share.run_id)
    .eq("user_id", share.user_id)
    .maybeSingle();
  if (!run || run.status !== "done" || !run.tool_id) return null;
  const ordered = orderLike(getOutputSchema(run.tool_id) ?? z.unknown(), run.output);
  // The run's working notes aren't part of the result.
  const clean = ordered && typeof ordered === "object" && !Array.isArray(ordered) ? Object.fromEntries(Object.entries(ordered).filter(([k]) => k !== "agent" && k !== "_agent")) : ordered;
  const output = await resignOutput(admin, clean, share.user_id);
  return { toolId: run.tool_id as string, title: (run.title as string | null) ?? null, output, input: publicInput(run.input as Record<string, unknown> | null), sources: ((run.sources ?? []) as Source[]), createdAt: run.created_at as string };
}

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await load(token).catch(() => null);
  if (!data) notFound();
  return <SharedResult {...data} />;
}
