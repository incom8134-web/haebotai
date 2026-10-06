import { DeleteAccountPanel } from "@/components/account/account-view";
import { getBalance } from "@/lib/credits";

export const metadata = { title: "회원 탈퇴 — AI 해바" };

export default async function DeleteAccountPage() {
  const balance = await getBalance();
  return <DeleteAccountPanel balance={balance} />;
}
