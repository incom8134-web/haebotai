import { notFound, permanentRedirect } from "next/navigation";
import { ToolHome } from "@/components/tools/tool-home";
import { ToolUpcoming } from "@/components/tools/tool-upcoming";
import { getTool } from "@/lib/tools/registry";
import { getToolContent } from "@/lib/tools/content";
import { redirectFor } from "@/lib/tools/catalog";
import { toolPack } from "@/lib/tools/pack";

// Tool overview page: what the tool makes, presets to start from, sample
// output, how-to, tips, chaining and FAQ. Running happens at ./run.
// Old tool URLs (the ids before the 25-tool redesign) redirect here to
// their successor; tools still being built get an honest preview page.
export async function generateMetadata({ params }: { params: Promise<{ toolId: string }> }) {
  const { toolId } = await params;
  const tool = getTool(toolId);
  if (!tool) return {};
  const content = getToolContent(tool.id);
  return { title: `${tool.name_ko} — 해봇 AI`, description: content?.description.ko ?? tool.summary };
}

export default async function ToolHomePage({ params }: { params: Promise<{ toolId: string }> }) {
  const { toolId } = await params;
  const moved = redirectFor(toolId);
  if (moved !== null) permanentRedirect(moved ? `/tools/${moved}` : "/tools");
  const tool = getTool(toolId);
  if (!tool || tool.retired) notFound();
  if (tool.slug && tool.slug !== toolId) permanentRedirect(`/tools/${tool.slug}`);
  if (tool.comingSoon) return <ToolUpcoming slug={tool.slug ?? toolId} />;
  if (!getToolContent(tool.id)) notFound();
  return <ToolHome toolId={tool.id} pack={toolPack(tool.id)} />;
}
