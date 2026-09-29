import { limitSensitive } from "@/lib/rate-limit";
import { requestMeta, setMarketing, verifyUnsubscribeToken } from "@/lib/consent-server";

// One-click unsubscribe (RFC 8058 List-Unsubscribe-Post, and the button
// on /unsubscribe). No login needed: the signed token in the link proves
// the email was ours to that member. Always answers the same way, so it
// can't be used to probe which ids exist.
export async function POST(request: Request) {
  const url = new URL(request.url);
  let u = url.searchParams.get("u") ?? "";
  let t = url.searchParams.get("t") ?? "";
  if (!u || !t) {
    const form = await request.formData().catch(() => null);
    u = String(form?.get("u") ?? u);
    t = String(form?.get("t") ?? t);
  }
  const limited = await limitSensitive("unsubscribe", request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown");
  if (limited) return limited;
  if (!u || !t || !verifyUnsubscribeToken(u, t)) return Response.json({ error: "링크가 올바르지 않습니다" }, { status: 400 });
  try {
    await setMarketing(u, false, "unsubscribe_link", requestMeta(request));
  } catch (err) {
    // A deleted account has nothing left to unsubscribe.
    console.warn("unsubscribe", u, (err as Error).message);
  }
  return Response.json({ ok: true });
}
