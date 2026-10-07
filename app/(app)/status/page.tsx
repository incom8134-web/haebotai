import { StatusView } from "@/components/site/status-view";
import { getStatus } from "@/lib/status";
import { titled } from "@/lib/site/meta";

export const generateMetadata = titled("서비스 상태", "Service status", { description: "AI 해바 서비스의 실시간 운영 상태" });

export default async function StatusPage() {
  return <StatusView report={await getStatus()} />;
}
