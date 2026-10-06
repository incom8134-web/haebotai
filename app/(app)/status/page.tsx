import { StatusView } from "@/components/site/status-view";
import { getStatus } from "@/lib/status";

export const metadata = { title: "서비스 상태 — AI 해바", description: "AI 해바 서비스의 실시간 운영 상태" };

export default async function StatusPage() {
  return <StatusView report={await getStatus()} />;
}
