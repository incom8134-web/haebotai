import Image from "next/image";
import { cn } from "@/lib/utils";

// The AI 해바 mark (public/brand, rendered from public/brand/haeba-mark-source.png by
// scripts/brand/render-brand.mjs — the gradient H rising over the 지니에듀테크 gem). The
// wordmark next to it is live text in the theme's own colour, so the
// logo reads on both the light and dark themes — the full-logo PNG has
// navy text that disappears on dark.
export function BrandMark({ size = 32, className, priority }: { size?: number; className?: string; priority?: boolean }) {
  const src = size <= 32 ? "/brand/haeba-mark-64.png" : size <= 64 ? "/brand/haeba-mark-128.png" : "/brand/haeba-mark-256.png";
  return <Image src={src} alt="" width={size} height={size} priority={priority} className={cn("shrink-0", className)} />;
}
