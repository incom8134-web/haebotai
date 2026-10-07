import "server-only";
import { isAllowedImageUrl } from "./document.ts";

// docx / pdf / pptx embed images as bytes, so result images (signed
// storage URLs) are fetched server-side. A failed or slow fetch just
// drops that image from the file rather than failing the export.
// pdfkit only reads PNG and JPEG.

export interface FetchedImage {
  data: Buffer;
  type: "png" | "jpg";
}

async function fetchImage(url: string): Promise<FetchedImage | null> {
  if (!isAllowedImageUrl(url, process.env.NEXT_PUBLIC_SUPABASE_URL)) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000), cache: "no-store" });
    if (!res.ok) return null;
    const data = Buffer.from(await res.arrayBuffer());
    if (data[0] === 0x89 && data[1] === 0x50) return { data, type: "png" };
    if (data[0] === 0xff && data[1] === 0xd8) return { data, type: "jpg" };
    return null;
  } catch {
    return null;
  }
}

export async function fetchAll(urls: string[]): Promise<Map<string, FetchedImage>> {
  const unique = [...new Set(urls)].slice(0, 12);
  const results = await Promise.all(unique.map(async (u) => [u, await fetchImage(u)] as const));
  return new Map(results.filter((r): r is readonly [string, FetchedImage] => r[1] !== null));
}

/** Pixel size from the PNG IHDR or the JPEG SOF marker, for aspect-correct embedding. */
export function imageSize(img: FetchedImage): { width: number; height: number } {
  const d = img.data;
  if (img.type === "png" && d.length > 24) return { width: d.readUInt32BE(16), height: d.readUInt32BE(20) };
  let i = 2;
  while (i + 9 < d.length) {
    if (d[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = d[i + 1];
    const len = d.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { width: d.readUInt16BE(i + 7), height: d.readUInt16BE(i + 5) };
    }
    i += 2 + len;
  }
  return { width: 1, height: 1 };
}

/** Fit into a max box, keeping aspect ratio. */
export function fit(size: { width: number; height: number }, maxW: number, maxH: number): { width: number; height: number } {
  const scale = Math.min(maxW / size.width, maxH / size.height, 1e9);
  return { width: Math.round(size.width * scale), height: Math.round(size.height * scale) };
}
