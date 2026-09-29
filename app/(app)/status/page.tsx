import { StatusView } from "@/components/site/status-view";
import { getStatus } from "@/lib/status";

export const metadata = { title: "서비스 상태 — 해봇 AI", description: "해봇 AI 서비스의 실시간 운영 상태" };

export default async function StatusPage() {
  return <StatusView report={await getStatus()} />;
}
