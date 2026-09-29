import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StudioWorkspace } from "@/components/studio/studio-workspace";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// Auth-free preview of the Studio UI with no profile and no runs — handy
// for design work without a Supabase session. Dev only.
export default function DevPreview() {
  if (process.env.NODE_ENV === "production") notFound();
  return <StudioWorkspace profile={null} recentRuns={[]} />;
}
