import { AdminOverviewView } from "@/components/admin/admin-view";
import { getOverview } from "@/lib/admin";
import { getTool } from "@/lib/tools/registry";

export const metadata = { title: "운영 현황 — AI 해바", robots: { index: false } };

export default async function AdminOverviewPage() {
  const overview = await getOverview();
  const toolNames = Object.fromEntries(
    overview.topTools7d.flatMap(({ toolId }) => {
      const tool = getTool(toolId);
      return tool ? [[toolId, { ko: tool.name_ko, en: tool.name_en }]] : [];
    }),
  );
  return <AdminOverviewView overview={overview} toolNames={toolNames} />;
}
