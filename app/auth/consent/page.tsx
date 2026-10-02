"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, LoaderCircle } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useBi } from "@/lib/i18n/context";
import { BUSINESS } from "@/lib/site/business";
import { REFERRAL, normalizeReferralCode } from "@/lib/referral";
import { OWN_KEY_ONLY } from "@/lib/site/access";

// The consent step right after Google/Kakao sign-in (lib/consent.ts). Each item
// is its own checkbox — nothing is pre-checked, required and optional are
// labelled, and the collection and overseas-transfer notices the law
// requires are shown here, not only behind a link. "Agree to all" is a
// shortcut that still shows every item.

type Key = "age14" | "terms" | "privacy" | "overseas" | "marketing";
type Bi = { ko: string; en: string };

interface Item {
  key: Key;
  required: boolean;
  label: Bi;
  href?: string;
  detail?: { head: Bi[]; rows: Bi[][] } | Bi;
}

const ITEMS: Item[] = [
  { key: "age14", required: true, label: { ko: "만 14세 이상입니다", en: "I am 14 or older" }, detail: { ko: "만 14세 미만은 법정대리인 동의가 필요해 가입할 수 없습니다.", en: "Children under 14 need a guardian's consent under Korean law, so they can't sign up." } },
  { key: "terms", required: true, label: { ko: "이용약관 동의", en: "Terms of Service" }, href: "/legal/terms" },
  {
    key: "privacy",
    required: true,
    label: { ko: "개인정보 수집·이용 동의", en: "Collection and use of personal information" },
    href: "/legal/privacy",
    detail: {
      head: [{ ko: "항목", en: "Items" }, { ko: "목적", en: "Purpose" }, { ko: "보유 기간", en: "Kept" }],
      rows: [
        [{ ko: "구글·카카오 계정 이메일·이름·계정 식별자", en: "Google/Kakao email, name, account ID" }, { ko: "회원 식별, 로그인, 고객 응대", en: "Identify you, sign-in, support" }, { ko: "탈퇴 시까지", en: "Until you leave" }],
        [{ ko: "도구 입력 내용·업로드 파일·결과물, 실행 기록", en: "Tool inputs, uploads, results, run history" }, { ko: "결과물 생성과 보관함 제공", en: "Generate and keep your results" }, { ko: "삭제 또는 탈퇴 시까지", en: "Until deleted or you leave" }],
        [{ ko: "결제 기록(주문번호·금액·일시)", en: "Payment records (order, amount, date)" }, { ko: "결제·환불 처리", en: "Payments and refunds" }, { ko: "5년 (전자상거래법)", en: "5 years (e-commerce law)" }],
        [{ ko: "접속 IP·기기 정보·접속 일시", en: "IP, device, access time" }, { ko: "부정 이용 방지, 보안", en: "Abuse prevention, security" }, { ko: "3개월", en: "3 months" }],
      ],
    },
  },
  {
    key: "overseas",
    required: true,
    label: { ko: "개인정보 국외 이전 동의", en: "Transfer of personal information abroad" },
    href: "/legal/privacy#overseas",
    detail: {
      head: [{ ko: "이전받는 자 (국가)", en: "Recipient (country)" }, { ko: "항목·목적", en: "Items · purpose" }, { ko: "보유 기간", en: "Kept" }],
      rows: [
        [{ ko: "Google LLC (미국)", en: "Google LLC (USA)" }, { ko: "로그인 정보, 도구 입력 내용 — 로그인과 AI 결과물 생성", en: "Sign-in data, tool inputs — sign-in and AI generation" }, { ko: "처리 후 각 사 정책 (학습 미이용)", en: "Per provider policy (not used for training)" }],
        [{ ko: "Vercel Inc. (미국 법인, 서버는 서울)", en: "Vercel Inc. (US company, servers in Seoul)" }, { ko: "요청 처리 중 정보 — 서비스 호스팅", en: "Request data — hosting" }, { ko: "처리 후 즉시", en: "Deleted after processing" }],
        [{ ko: "Supabase Inc. (미국 법인, 저장은 서울)", en: "Supabase Inc. (US company, stored in Seoul)" }, { ko: "회원 정보·결과물 — 인증과 저장", en: "Account data, results — auth and storage" }, { ko: "탈퇴 시까지", en: "Until you leave" }],
        [{ ko: "Upstash, Inc. (미국 법인)", en: "Upstash, Inc. (US company)" }, { ko: "회원 식별자·요청 시각 — 요청 횟수 제한", en: "User ID, request time — rate limiting" }, { ko: "수 분 ~ 하루 이내 자동 삭제", en: "Auto-deleted within minutes to a day" }],
      ],
    },
  },
  {
    key: "marketing",
    required: false,
    label: { ko: "이벤트·새 기능 소식 이메일 수신", en: "Emails about events and new features" },
    detail: { ko: "동의하지 않아도 모든 기능을 똑같이 쓸 수 있어요. 언제든 [내 계정]이나 메일 하단의 수신거부 링크로 끌 수 있어요.", en: "Everything works the same if you say no. Turn it off any time in Account or with the link in any email." },
  },
];

function Detail({ item }: { item: Item }) {
  const L = useBi();
  const [open, setOpen] = useState(false);
  if (!item.detail) return null;
  const d = item.detail;
  if ("ko" in d) return <p className="mt-1 pl-8 text-xs leading-relaxed text-fg-muted break-keep">{L(d)}</p>;
  return (
    <div className="mt-1 pl-8">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="inline-flex items-center gap-1 rounded text-xs text-fg-muted underline underline-offset-2 hover:text-fg">
        {L({ ko: open ? "요약 접기" : "무엇을 왜 얼마나 보관하는지 보기", en: open ? "Hide summary" : "What, why and for how long" })}
        <ChevronDown className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {open ? (
        <div className="mt-2 overflow-x-auto rounded-xl border border-hairline">
          <table className="w-full text-left text-[11px] leading-relaxed">
            <thead className="bg-surface-2 text-fg">
              <tr>{d.head.map((h, i) => <th key={i} scope="col" className="px-2.5 py-1.5 font-medium">{L(h)}</th>)}</tr>
            </thead>
            <tbody className="text-fg-muted">
              {d.rows.map((r, i) => (
                <tr key={i} className="border-t border-hairline">{r.map((c, j) => <td key={j} className="px-2.5 py-1.5 align-top break-keep">{L(c)}</td>)}</tr>
              ))}
            </tbody>
          </table>
          {item.key === "overseas" ? (
            <p className="border-t border-hairline px-2.5 py-1.5 text-[11px] text-fg-muted break-keep">
              {L({ ko: "이전 시기·방법: 서비스를 이용할 때마다 암호화된 네트워크(HTTPS)로 전송. 동의를 거부할 수 있으나, 서비스 제공에 필수라 거부하면 가입할 수 없습니다.", en: "When and how: sent over encrypted HTTPS whenever you use the service. You may refuse, but it's required to provide the service, so you can't sign up without it." })}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ConsentForm() {
  const L = useBi();
  const router = useRouter();
  const params = useSearchParams();
  const rawNext = params.get("next");
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/studio";
  const [checked, setChecked] = useState<Record<Key, boolean>>({ age14: false, terms: false, privacy: false, overseas: false, marketing: false });
  const [busy, setBusy] = useState<"" | "save" | "leave" | "delete">("");
  const [error, setError] = useState("");
  // Optional invite code typed by hand (an invite link sets it on its own).
  const [code, setCode] = useState("");
  const [codeNote, setCodeNote] = useState("");
  const [done, setDone] = useState(false);
  const allRequired = ITEMS.filter((i) => i.required).every((i) => checked[i.key]);
  const all = ITEMS.every((i) => checked[i.key]);

  const setAll = (v: boolean) => setChecked({ age14: v, terms: v, privacy: v, overseas: v, marketing: v });

  async function submit() {
    if (done) {
      window.location.assign(next);
      return;
    }
    const typed = code.trim() ? normalizeReferralCode(code) : null;
    if (code.trim() && !typed) {
      setError(L({ ko: "초대 코드는 영문·숫자 8자리예요. 없으면 비워 두세요.", en: "Invite codes are 8 letters and numbers. Leave it empty if you don't have one." }));
      return;
    }
    setBusy("save");
    setError("");
    const res = await fetch("/api/account/consent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...checked, ...(typed ? { referralCode: typed } : {}) }) });
    const body = (await res.json().catch(() => ({}))) as { error?: string; referral?: string };
    if (!res.ok) {
      setError(body.error ?? L({ ko: "저장하지 못했어요.", en: "Couldn't save." }));
      setBusy("");
      return;
    }
    // A typed code that didn't take: say so before moving on (consent is saved).
    if (typed && body.referral && body.referral !== "ok" && body.referral !== "already") {
      setCodeNote(
        body.referral === "self"
          ? L({ ko: "내 초대 코드는 쓸 수 없어요.", en: "You can't use your own code." })
          : body.referral === "not_new"
            ? L({ ko: "가입한 지 7일이 지난 계정은 초대 코드를 쓸 수 없어요.", en: "Invite codes only work for accounts under 7 days old." })
            : L({ ko: "초대 코드를 찾지 못했어요. 동의는 저장됐으니 계속하면 돼요.", en: "That invite code wasn't found. Your consent is saved — you can continue." }),
      );
      setDone(true);
      setBusy("");
      return;
    }
    // The API already set a fresh session cookie that carries the consent;
    // a full navigation makes sure every request uses it.
    window.location.assign(next);
  }

  async function leave() {
    setBusy("leave");
    await createClient().auth.signOut();
    router.replace("/");
  }

  async function under14() {
    if (!window.confirm(L({ ko: "만 14세 미만은 가입할 수 없어 방금 만든 계정과 정보를 모두 삭제합니다. 계속할까요?", en: "Children under 14 can't sign up, so the account just created and its data will be deleted. Continue?" }))) return;
    setBusy("delete");
    await fetch("/api/account/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm: "탈퇴" }) });
    await createClient().auth.signOut().catch(() => {});
    router.replace("/");
  }

  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col justify-center px-4 py-10">
      <div className="glass-strong rounded-[28px] p-6 sm:p-8">
        <BrandMark size={40} />
        <h1 className="mt-5 font-display text-2xl leading-tight font-bold break-keep">{L({ ko: "시작하기 전에 확인해 주세요", en: "Before you start" })}</h1>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted break-keep">
          {L({ ko: `${BUSINESS.serviceName}를 쓰려면 아래 필수 항목에 동의가 필요해요. 선택 항목은 동의하지 않아도 됩니다.`, en: "The required items below are needed to use the service. Optional items are up to you." })}
        </p>

        <fieldset className="mt-6">
          <legend className="sr-only">{L({ ko: "동의 항목", en: "Consent items" })}</legend>
          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-hairline bg-surface-2 px-4 py-3 text-sm font-semibold">
            <input type="checkbox" className="size-5 accent-[var(--studio-cyan)]" checked={all} onChange={(e) => setAll(e.target.checked)} />
            {L({ ko: "전체 동의 (선택 항목 포함)", en: "Agree to all (including optional)" })}
          </label>
          <ul className="mt-3 flex flex-col gap-3">
            {ITEMS.map((item) => (
              <li key={item.key}>
                <div className="flex items-center gap-3">
                  <input
                    id={`c-${item.key}`}
                    type="checkbox"
                    className="size-5 shrink-0 accent-[var(--studio-cyan)]"
                    checked={checked[item.key]}
                    onChange={(e) => setChecked((c) => ({ ...c, [item.key]: e.target.checked }))}
                    aria-describedby={item.detail ? `d-${item.key}` : undefined}
                  />
                  <label htmlFor={`c-${item.key}`} className="flex-1 cursor-pointer text-sm break-keep">
                    <span className={item.required ? "font-semibold text-fg" : "font-semibold text-fg-muted"}>[{L(item.required ? { ko: "필수", en: "Required" } : { ko: "선택", en: "Optional" })}]</span> {L(item.label)}
                  </label>
                  {item.href ? (
                    <Link href={item.href} target="_blank" rel="noopener" className="shrink-0 text-xs text-fg-muted underline underline-offset-2 hover:text-fg">
                      {L({ ko: "전문 보기", en: "Read" })}
                      <span className="sr-only"> ({L(item.label)}, {L({ ko: "새 창", en: "new tab" })})</span>
                    </Link>
                  ) : null}
                </div>
                <div id={`d-${item.key}`}>
                  <Detail item={item} />
                </div>
              </li>
            ))}
          </ul>
        </fieldset>

        {OWN_KEY_ONLY ? null : (
        <details className="mt-4 rounded-2xl border border-hairline px-4 py-3 text-sm" open={!!code}>
          <summary className="cursor-pointer text-fg-muted">{L({ ko: "초대 코드가 있어요 (선택)", en: "I have an invite code (optional)" })}</summary>
          <input
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setCodeNote("");
            }}
            maxLength={8}
            autoComplete="off"
            spellCheck={false}
            aria-label={L({ ko: "초대 코드", en: "Invite code" })}
            placeholder="ABCD2345"
            className="mt-2 w-full rounded-xl border border-hairline bg-bg px-3 py-2 font-mono text-sm tracking-widest uppercase outline-none focus:border-accent"
          />
          <p className="mt-1.5 text-2xs text-fg-subtle break-keep">
            {L({ ko: `첫 결과물을 만들면 나는 ${REFERRAL.refereeBonus}, 초대한 친구는 ${REFERRAL.referrerBonus} 크레딧을 받아요.`, en: `After your first result you get ${REFERRAL.refereeBonus} credits and your friend gets ${REFERRAL.referrerBonus}.` })}
          </p>
        </details>
        )}

        {codeNote ? (
          <p role="status" className="mt-4 rounded-xl bg-warn/15 px-3 py-2 text-sm text-fg">
            {codeNote}
          </p>
        ) : null}

        {error ? (
          <p role="alert" className="mt-4 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <Button className="mt-6 w-full" size="lg" disabled={!allRequired || !!busy} onClick={submit}>
          {busy === "save" ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
          {done ? L({ ko: "계속하기", en: "Continue" }) : L({ ko: "동의하고 시작하기", en: "Agree and continue" })}
        </Button>
        {!allRequired ? <p className="mt-2 text-center text-xs text-fg-muted">{L({ ko: "필수 항목 4개에 모두 동의하면 시작할 수 있어요.", en: "Agree to the 4 required items to continue." })}</p> : null}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-fg-muted">
          <button type="button" onClick={leave} disabled={!!busy} className="underline underline-offset-2 hover:text-fg">
            {L({ ko: "동의하지 않고 나가기 (로그아웃)", en: "Don't agree — sign out" })}
          </button>
          <button type="button" onClick={under14} disabled={!!busy} className="underline underline-offset-2 hover:text-fg">
            {L({ ko: "만 14세 미만이에요 (계정 삭제)", en: "I'm under 14 — delete the account" })}
          </button>
        </div>
      </div>
    </main>
  );
}

export default function ConsentPage() {
  return (
    <Suspense>
      <ConsentForm />
    </Suspense>
  );
}
