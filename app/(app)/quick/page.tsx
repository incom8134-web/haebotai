import { QuickStart } from "@/components/quick/quick-start";
import { getCurrentUser } from "@/lib/supabase/user";
import { titled } from "@/lib/site/meta";

export const generateMetadata = titled("바로 만들기", "Quick start", {
  description: "SNS 게시물, 홍보 문구, 홍보 이미지를 한 줄로 바로 만들어요.",
});

export default async function QuickPage() {
  const user = await getCurrentUser();
  return <QuickStart signedIn={!!user} />;
}
