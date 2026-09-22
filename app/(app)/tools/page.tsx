import { ToolsView } from "@/components/tools/tools-view";
import type { CategoryId } from "@/lib/tools/types";

const CATEGORIES: CategoryId[] = ["ideas", "content", "design", "sales", "docs"];

export const metadata = { title: "도구 — 해봇 AI" };

export default async function ToolsPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  return <ToolsView initialCategory={CATEGORIES.includes(category as CategoryId) ? (category as CategoryId) : "all"} />;
}
