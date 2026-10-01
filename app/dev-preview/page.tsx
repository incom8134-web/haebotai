import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Dashboard } from "@/components/studio/dashboard";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// Auth-free preview of the dashboard with no projects and no runs — handy
// for design work without a Supabase session. Dev only.
export default function DevPreview() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <Dashboard
      name={null}
      projects={[]}
      projectCount={0}
      runs={[]}
      recommended={["idea-radar", "brand-dna", "offer-architect"]}
      lastTool={null}
      usage={{ balance: 500, used30: 0, runs30: 0 }}
    />
  );
}
