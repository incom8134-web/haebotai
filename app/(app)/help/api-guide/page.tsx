import { ApiGuide } from "@/components/help/help-pages";
import { titled } from "@/lib/site/meta";

export const generateMetadata = titled("API 키 설명서", "API key manual");

export default function ApiGuidePage() {
  return <ApiGuide />;
}
