import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ApiKeyPanel } from "@/components/account/account-view";
import { getApiKeyStatus } from "@/lib/api-keys";
import { cookies } from "next/headers";

export const metadata = { title: "내 API 키 — 해봇 AI" };

// ?next= — the request the member was on when the key was missing (a tool
// page, often from 바로 만들기). Only same-site paths are followed.
function safeNext(raw: string | undefined) {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : null;
}

export default async function ApiKeyPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [apiKey, { next }, jar] = await Promise.all([getApiKeyStatus(), searchParams, cookies()]);
  const locale = jar.get("locale")?.value === "en" ? "en" : "ko";
  const back = safeNext(next);
  return (
    <>
      {back ? (
        <div className="mx-auto max-w-[1100px] px-4 pt-6 md:px-8">
          <Link
            href={back}
            className="inline-flex items-center gap-2 rounded-2xl border border-accent/40 bg-accent-dim px-4 py-2.5 text-sm font-semibold break-keep text-fg hover:border-accent"
          >
            <ArrowLeft size={15} aria-hidden />
            {locale === "en" ? "Key saved? Back to your request" : "키를 등록했다면, 작성하던 요청으로 돌아가기"}
          </Link>
        </div>
      ) : null}
      <ApiKeyPanel apiKey={apiKey} />
    </>
  );
}
