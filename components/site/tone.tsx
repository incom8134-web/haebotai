import type { LucideIcon } from "lucide-react";
import { catalogTool } from "@/lib/tools/catalog";
import type { CategoryId } from "@/lib/tools/types";
import { cn } from "@/lib/utils";

// Tool-area colour (app/globals.css --cat-*): every tool, chip and tile
// takes its hue from its category, so a tool looks the same on every page.
// Class names are spelled out in full so Tailwind can see them.

export type Tone = CategoryId | "accent";

export const TONE: Record<Tone, { tile: string; chip: string; dot: string; text: string; hover: string; wash: string }> = {
  discover: { tile: "bg-cat-discover/14 text-cat-discover", chip: "bg-cat-discover/12 text-cat-discover", dot: "bg-cat-discover", text: "text-cat-discover", hover: "hover:border-cat-discover/50", wash: "bg-cat-discover/[0.06]" },
  brand: { tile: "bg-cat-brand/14 text-cat-brand", chip: "bg-cat-brand/12 text-cat-brand", dot: "bg-cat-brand", text: "text-cat-brand", hover: "hover:border-cat-brand/50", wash: "bg-cat-brand/[0.06]" },
  campaign: { tile: "bg-cat-campaign/14 text-cat-campaign", chip: "bg-cat-campaign/12 text-cat-campaign", dot: "bg-cat-campaign", text: "text-cat-campaign", hover: "hover:border-cat-campaign/50", wash: "bg-cat-campaign/[0.06]" },
  operate: { tile: "bg-cat-operate/14 text-cat-operate", chip: "bg-cat-operate/12 text-cat-operate", dot: "bg-cat-operate", text: "text-cat-operate", hover: "hover:border-cat-operate/50", wash: "bg-cat-operate/[0.06]" },
  research: { tile: "bg-cat-research/14 text-cat-research", chip: "bg-cat-research/12 text-cat-research", dot: "bg-cat-research", text: "text-cat-research", hover: "hover:border-cat-research/50", wash: "bg-cat-research/[0.06]" },
  accent: { tile: "bg-studio-cyan/12 text-studio-cyan", chip: "bg-studio-cyan/12 text-studio-cyan", dot: "bg-studio-cyan", text: "text-studio-cyan", hover: "hover:border-studio-cyan/50", wash: "bg-studio-cyan/[0.06]" },
};

/** The tone for a catalog slug or engine id (library rows store engine ids). */
export function toolTone(slugOrEngine: string | null | undefined): Tone {
  return (slugOrEngine && catalogTool(slugOrEngine)?.category) || "accent";
}

/** A stable tone for things with no category (projects, links): picked from their id. */
export function toneFor(key: string): Tone {
  const tones: Tone[] = ["research", "campaign", "discover", "operate", "brand"];
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return tones[h % tones.length];
}

const SIZES = { sm: { box: "size-8 rounded-[10px]", icon: 16 }, md: { box: "size-10 rounded-xl", icon: 19 }, lg: { box: "size-12 rounded-2xl", icon: 22 } } as const;

/** A tinted rounded tile with the icon in the tone's colour. */
export function IconTile({ icon: Icon, tone, size = "md", className }: { icon: LucideIcon; tone: Tone; size?: keyof typeof SIZES; className?: string }) {
  const s = SIZES[size];
  return (
    <span className={cn("grid shrink-0 place-items-center", s.box, TONE[tone].tile, className)} aria-hidden>
      <Icon size={s.icon} strokeWidth={2.1} />
    </span>
  );
}
