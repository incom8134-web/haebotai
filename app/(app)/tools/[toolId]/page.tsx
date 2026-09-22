import { notFound } from "next/navigation";
import { ToolHome } from "@/components/tools/tool-home";
import { getTool } from "@/lib/tools/registry";
import { getToolContent } from "@/lib/tools/content";

// Tool overview page: what the tool makes, presets to start from, sample
// output, how-to, tips, chaining and FAQ. Running happens at ./run.
export async function generateMetadata({ params }: { params: Promise<{ toolId: string }> }) {
  const { toolId } = await params;
  const tool = getTool(toolId);
  const content = getToolContent(toolId);
  if (!tool || !content) return {};
  return { title: `${tool.name_ko} — 해봇 AI`, description: content.description.ko };
}

export default async function ToolHomePage({ params }: { params: Promise<{ toolId: string }> }) {
  const { toolId } = await params;
  if (!getTool(toolId) || !getToolContent(toolId)) notFound();
  return <ToolHome toolId={toolId} />;
}
