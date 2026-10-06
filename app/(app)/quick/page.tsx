import { QuickStart } from "@/components/quick/quick-start";
import { getCurrentUser } from "@/lib/supabase/user";

export const metadata = {
  title: "바로 만들기 — 해봇 AI",
  description: "SNS 게시물, 홍보 문구, 릴스·쇼츠 아이디어를 한 줄로 바로 만들어요.",
};

export default async function QuickPage() {
  const user = await getCurrentUser();
  return <QuickStart signedIn={!!user} />;
}
