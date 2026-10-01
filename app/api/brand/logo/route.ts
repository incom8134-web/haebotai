import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { limitSensitive } from "@/lib/rate-limit";
import { LOGO_MAX_BYTES, ownsPath, sniffLogoType } from "@/lib/brand-logo-check";

// The brand logo on /brand: an uploaded file, or a logo the 로고 tool made
// (copied out of `exports`, so deleting that run keeps the brand logo).
// Stored in the private `logos` bucket under the member's folder (0001
// storage policies) and recorded as brands.logo_path.

const SIGN_SECONDS = 60 * 60;

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function save(supabase: Supabase, userId: string, bytes: Uint8Array) {
  const type = sniffLogoType(bytes);
  if (!type) return Response.json({ error: "PNG, JPG, WEBP 이미지만 올릴 수 있어요" }, { status: 415 });
  if (bytes.byteLength > LOGO_MAX_BYTES) return Response.json({ error: "5MB 이하 이미지만 올릴 수 있어요" }, { status: 413 });

  const path = `${userId}/logo-${Date.now()}.${type.ext}`;
  const { error: upErr } = await supabase.storage.from("logos").upload(path, bytes, { contentType: type.mime, upsert: false });
  if (upErr) return Response.json({ error: "로고를 저장하지 못했어요" }, { status: 500 });

  const { data: brand } = await supabase.from("brands").select("id, logo_path").eq("user_id", userId).maybeSingle();
  const { error: dbErr } = brand
    ? await supabase.from("brands").update({ logo_path: path }).eq("id", brand.id)
    : await supabase.from("brands").insert({ user_id: userId, name: "", logo_path: path });
  if (dbErr) {
    await supabase.storage.from("logos").remove([path]);
    return Response.json({ error: "로고를 저장하지 못했어요" }, { status: 500 });
  }
  // The old file goes once the new one is recorded.
  if (brand?.logo_path && brand.logo_path !== path && ownsPath(brand.logo_path, userId)) {
    await supabase.storage.from("logos").remove([brand.logo_path]);
  }
  const { data: signed } = await supabase.storage.from("logos").createSignedUrl(path, SIGN_SECONDS);
  return Response.json({ ok: true, path, url: signed?.signedUrl ?? null });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다" }, { status: 401 });
  const limited = await limitSensitive("brand-logo", user.id);
  if (limited) return limited;

  // From a logo run: { assetId } is that run's image path in `exports`.
  if (request.headers.get("content-type")?.includes("application/json")) {
    const body = (await request.json().catch(() => ({}))) as { assetId?: unknown };
    if (!ownsPath(body.assetId, user.id)) return Response.json({ error: "로고를 찾을 수 없어요" }, { status: 404 });
    const { data: blob, error } = await supabase.storage.from("exports").download(body.assetId);
    if (error || !blob) return Response.json({ error: "로고를 찾을 수 없어요" }, { status: 404 });
    return save(supabase, user.id, new Uint8Array(await blob.arrayBuffer()));
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return Response.json({ error: "이미지 파일을 골라 주세요" }, { status: 400 });
  if (file.size > LOGO_MAX_BYTES) return Response.json({ error: "5MB 이하 이미지만 올릴 수 있어요" }, { status: 413 });
  return save(supabase, user.id, new Uint8Array(await file.arrayBuffer()));
}

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다" }, { status: 401 });
  const { data: brand } = await supabase.from("brands").select("id, logo_path").eq("user_id", user.id).maybeSingle();
  if (!brand?.logo_path) return Response.json({ ok: true });
  const { error } = await supabase.from("brands").update({ logo_path: null }).eq("id", brand.id);
  if (error) return Response.json({ error: "로고를 지우지 못했어요" }, { status: 500 });
  if (ownsPath(brand.logo_path, user.id)) await supabase.storage.from("logos").remove([brand.logo_path]);
  return Response.json({ ok: true });
}
