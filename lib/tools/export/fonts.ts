import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Pretendard ships static .otf files via npm (same source as
// lib/tools/render/sangsepage.ts); traced into the export route by
// next.config.ts outputFileTracingIncludes.
const FONT_DIR = join(process.cwd(), "node_modules/pretendard/dist/public/static");

/** Font file paths, for renderers that load fonts by path (resvg). */
export const pretendardFiles = () => [join(FONT_DIR, "Pretendard-Regular.otf"), join(FONT_DIR, "Pretendard-Bold.otf")];

let cache: { regular: Buffer; bold: Buffer } | null = null;
export function pretendard(): { regular: Buffer; bold: Buffer } {
  cache ??= {
    regular: readFileSync(join(FONT_DIR, "Pretendard-Regular.otf")),
    bold: readFileSync(join(FONT_DIR, "Pretendard-Bold.otf")),
  };
  return cache;
}
