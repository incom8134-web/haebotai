import { UseCasesView } from "@/components/site/use-cases-view";
import { titled } from "@/lib/site/meta";

export const generateMetadata = titled("활용 사례", "Use cases", { description: "AI 해바 도구를 이어서 쓰는 대표적인 방법" });

export default function UseCasesPage() {
  return <UseCasesView />;
}
