"use client";

import { useState } from "react";
import { Check, Copy, Gift } from "lucide-react";
import { PageHeader, secondaryButton } from "@/components/site/page";
import { useBi } from "@/lib/i18n/context";
import { REFERRAL } from "@/lib/referral";
import type { ReferralStatus } from "@/lib/referral-server";
import { cn } from "@/lib/utils";

export function ReferralPanel({ status, link }: { status: ReferralStatus | null; link: string | null }) {
  const L = useBi();
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!link) return;
    const ok = await navigator.clipboard.writeText(link).then(() => true, () => false);
    if (!ok) {
      window.prompt(L({ ko: "아래 링크를 복사해 주세요", en: "Copy this link" }), link);
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <PageHeader
        title={L({ ko: "친구 초대", en: "Invite friends" })}
        lead={L({ ko: `친구가 초대 링크로 가입해 첫 결과물을 만들면, 나는 ${REFERRAL.referrerBonus} 크레딧, 친구는 ${REFERRAL.refereeBonus} 크레딧을 받아요.`, en: `When a friend signs up through your link and makes their first result, you get ${REFERRAL.referrerBonus} credits and they get ${REFERRAL.refereeBonus}.` })}
      />
      {!status || !link ? (
        <p className="glass rounded-[24px] p-6 text-sm text-fg-muted">{L({ ko: "친구 초대는 곧 열려요.", en: "Invites are coming soon." })}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
          <section className="glass-strong rounded-[28px] p-6">
            <p className="flex items-center gap-2 font-semibold"><Gift size={18} className="text-studio-cyan" aria-hidden /> {L({ ko: "내 초대 링크", en: "Your invite link" })}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <code className="min-w-0 flex-1 truncate rounded-xl bg-surface-2/60 px-3 py-2.5 font-mono text-sm">{link}</code>
              <button type="button" onClick={copy} className={cn(secondaryButton, "h-10")}>
                {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />} {copied ? L({ ko: "복사됨", en: "Copied" }) : L({ ko: "복사", en: "Copy" })}
              </button>
            </div>
            <p className="mt-3 font-mono text-xs text-fg-subtle">{L({ ko: "초대 코드", en: "Code" })} · {status.code}</p>
          </section>
          <section className="glass rounded-[28px] p-6">
            <p className="text-sm text-fg-muted">{L({ ko: "가입한 친구", en: "Friends joined" })}</p>
            <p className="mt-1 font-display text-4xl font-bold">{status.invited}</p>
            <p className="mt-2 text-sm text-fg-muted">
              {L({ ko: `받은 크레딧 ${status.earned.toLocaleString()} · 최대 ${REFERRAL.maxRewardedInvites}명까지 보상`, en: `${status.earned.toLocaleString()} credits earned · rewards for up to ${REFERRAL.maxRewardedInvites} friends` })}
            </p>
            {status.pending ? (
              <p className="mt-1 text-xs text-fg-subtle">
                {L({ ko: `${status.pending}명은 첫 결과물을 만들면 지급돼요`, en: `${status.pending} pending — paid when they make their first result` })}
              </p>
            ) : null}
          </section>
        </div>
      )}
      <ul className="mt-6 list-disc space-y-1 pl-5 text-xs break-keep text-fg-subtle">
        <li>{L({ ko: "친구가 링크로 들어와 30일 안에 처음 가입하거나, 가입할 때 초대 코드를 입력하면 적용돼요. 가입 후 7일이 지난 계정은 받을 수 없어요.", en: "Applies when a friend signs up within 30 days of opening your link, or enters your code at sign-up. Accounts older than 7 days can't redeem." })}</li>
        <li>{L({ ko: "크레딧은 친구의 첫 실행이 성공적으로 끝났을 때 두 사람에게 지급돼요.", en: "Credits go to both of you when your friend's first run finishes successfully." })}</li>
        <li>{L({ ko: "본인 초대, 여러 계정을 만들어 받는 행위는 이용약관 위반으로 크레딧이 회수될 수 있어요.", en: "Inviting yourself or farming with extra accounts breaks the Terms and credits may be revoked." })}</li>
      </ul>
    </>
  );
}
