import { ApiKeyPanel } from "@/components/account/account-view";
import { getApiKeyStatus } from "@/lib/api-keys";

export const metadata = { title: "내 API 키 — 해봇 AI" };

export default async function ApiKeyPage() {
  return <ApiKeyPanel apiKey={await getApiKeyStatus()} />;
}
