// What to call the member: the name Google gave, else nothing (never the
// email address — it would show on screen-shares and screenshots).
export function displayName(
  meta: Record<string, unknown> | null | undefined,
): string | null {
  const raw = [meta?.full_name, meta?.name].find(
    (v) => typeof v === "string" && v.trim(),
  );
  return raw ? (raw as string).trim().slice(0, 40) : null;
}
