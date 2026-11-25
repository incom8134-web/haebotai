import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Font assets are included in the export route by next.config.ts.
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
