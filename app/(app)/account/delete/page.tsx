import { DeleteAccountPanel } from "@/components/account/account-view";
import { getBalance } from "@/lib/credits";
import { titled } from "@/lib/site/meta";

export const generateMetadata = titled("회원 탈퇴", "Delete account");

export default async function DeleteAccountPage() {
  const balance = await getBalance();
  return <DeleteAccountPanel balance={balance} />;
}
