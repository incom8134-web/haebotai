// Pure checks for a brand logo upload (app/api/brand/logo): the file's own
// bytes decide its type, not the name or the browser's claim. SVG is left
// out on purpose — it can carry script.

export const LOGO_MAX_BYTES = 5 * 1024 * 1024;

export type LogoType = { mime: "image/png" | "image/jpeg" | "image/webp"; ext: "png" | "jpg" | "webp" };

export function sniffLogoType(bytes: Uint8Array): LogoType | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return { mime: "image/png", ext: "png" };
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return { mime: "image/webp", ext: "webp" };
  return null;
}

/** A stored path the member owns: `<their id>/<file>` with no traversal. */
export function ownsPath(path: unknown, userId: string): path is string {
  return typeof path === "string" && path.startsWith(`${userId}/`) && !path.includes("..") && path.length < 300;
}
