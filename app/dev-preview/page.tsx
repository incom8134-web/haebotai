import { StudioWorkspace } from "@/components/studio/studio-workspace";

// Auth-free preview of the Studio UI with no profile and no runs — handy
// for design work without a Supabase session.
export default function DevPreview() {
  return <StudioWorkspace profile={null} recentRuns={[]} />;
}
