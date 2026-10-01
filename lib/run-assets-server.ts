import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { assetPaths, withSignedUrls } from "./run-assets";

// Stored image URLs are signed once at generation time; re-signing on read
// keeps an old result (or a shared one) from showing broken images.

const SIGN_SECONDS = 60 * 60 * 24;

export async function resignOutput<T>(db: SupabaseClient, output: T, userId: string): Promise<T> {
  const paths = assetPaths(output, userId);
  if (!paths.length) return output;
  const { data, error } = await db.storage.from("exports").createSignedUrls(paths, SIGN_SECONDS);
  if (error || !data) return output;
  const signed = new Map<string, string>();
  for (const row of data) if (row.path && row.signedUrl && !row.error) signed.set(row.path, row.signedUrl);
  return withSignedUrls(output, userId, signed);
}

/**
 * The images a run made that can go when it's deleted: all of them except
 * any another version of the same result still shows (a partial redo
 * copies the untouched sections, images included). Call BEFORE deleting
 * the row — deleting it unlinks its versions. [] when unsure.
 */
export async function runAssetsToRemove(db: SupabaseClient, userId: string, run: { id: string; output: unknown; parent_run_id?: string | null }): Promise<string[]> {
  const paths = assetPaths(run.output, userId);
  if (!paths.length) return [];
  try {
    // The version family: up to the root, then everything below it.
    let root = run.id;
    let parent = run.parent_run_id ?? null;
    for (let i = 0; parent && i < 20; i++) {
      root = parent;
      const { data } = await db.from("generations").select("parent_run_id").eq("id", parent).eq("user_id", userId).maybeSingle();
      parent = (data?.parent_run_id as string | null | undefined) ?? null;
    }
    const keep = new Set<string>();
    const seen = new Set<string>();
    let frontier = [root];
    for (let i = 0; frontier.length && i < 20; i++) {
      const ids = frontier.join(",");
      const { data, error } = await db.from("generations").select("id, output").eq("user_id", userId).or(`id.in.(${ids}),parent_run_id.in.(${ids})`);
      if (error) return [];
      const next: string[] = [];
      for (const row of data ?? []) {
        if (seen.has(row.id)) continue;
        seen.add(row.id);
        next.push(row.id);
        if (row.id !== run.id) for (const p of assetPaths(row.output, userId)) keep.add(p);
      }
      frontier = next;
    }
    return paths.filter((p) => !keep.has(p));
  } catch (err) {
    console.warn("[runs] asset lookup failed", err);
    return [];
  }
}
