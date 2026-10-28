import { UserGuide } from "@/components/help/help-pages";
import { titled } from "@/lib/site/meta";

export const generateMetadata = titled("도구 사용 설명서", "Tool user guide", {
  description: "가입부터 결과물 내려받기, 인기 도구 6가지까지 실제 화면으로 따라 하는 AI 해바 사용 설명서 (PDF).",
});

export default function UserGuidePage() {
  return <UserGuide />;
}
