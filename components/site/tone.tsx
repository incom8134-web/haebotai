import type { LucideIcon } from "lucide-react";
import { catalogTool } from "@/lib/tools/catalog";
import type { CategoryId } from "@/lib/tools/types";
import { cn } from "@/lib/utils";

// Tool-area colour (app/globals.css --cat-*): every tool, chip and tile
// takes its hue from its category, so a tool looks the same on every page.
// Class names are spelled out in full so Tailwind can see them.

export type Tone = CategoryId | "accent";

export const TONE: Record<Tone, { tile: string; chip: string; dot: string; text: string; hover: string; wash: string; hero: string }> = {
  discover: { tile: "bg-cat-discover/14 text-cat-discover", chip: "bg-cat-discover/12 text-cat-discover", dot: "bg-cat-discover", text: "text-cat-discover", hover: "hover:border-cat-discover/50", wash: "bg-cat-discover/[0.06]", hero: "bg-[linear-gradient(135deg,color-mix(in_oklch,var(--cat-discover)_18%,var(--color-surface)),var(--color-surface)_72%)]" },
  brand: { tile: "bg-cat-brand/14 text-cat-brand", chip: "bg-cat-brand/12 text-cat-brand", dot: "bg-cat-brand", text: "text-cat-brand", hover: "hover:border-cat-brand/50", wash: "bg-cat-brand/[0.06]", hero: "bg-[linear-gradient(135deg,color-mix(in_oklch,var(--cat-brand)_18%,var(--color-surface)),var(--color-surface)_72%)]" },
  campaign: { tile: "bg-cat-campaign/14 text-cat-campaign", chip: "bg-cat-campaign/12 text-cat-campaign", dot: "bg-cat-campaign", text: "text-cat-campaign", hover: "hover:border-cat-campaign/50", wash: "bg-cat-campaign/[0.06]", hero: "bg-[linear-gradient(135deg,color-mix(in_oklch,var(--cat-campaign)_18%,var(--color-surface)),var(--color-surface)_72%)]" },
  operate: { tile: "bg-cat-operate/14 text-cat-operate", chip: "bg-cat-operate/12 text-cat-operate", dot: "bg-cat-operate", text: "text-cat-operate", hover: "hover:border-cat-operate/50", wash: "bg-cat-operate/[0.06]", hero: "bg-[linear-gradient(135deg,color-mix(in_oklch,var(--cat-operate)_18%,var(--color-surface)),var(--color-surface)_72%)]" },
  research: { tile: "bg-cat-research/14 text-cat-research", chip: "bg-cat-research/12 text-cat-research", dot: "bg-cat-research", text: "text-cat-research", hover: "hover:border-cat-research/50", wash: "bg-cat-research/[0.06]", hero: "bg-[linear-gradient(135deg,color-mix(in_oklch,var(--cat-research)_18%,var(--color-surface)),var(--color-surface)_72%)]" },
  accent: { tile: "bg-studio-cyan/12 text-studio-cyan", chip: "bg-studio-cyan/12 text-studio-cyan", dot: "bg-studio-cyan", text: "text-studio-cyan", hover: "hover:border-studio-cyan/50", wash: "bg-studio-cyan/[0.06]", hero: "bg-[linear-gradient(135deg,color-mix(in_oklch,var(--studio-cyan)_18%,var(--color-surface)),var(--color-surface)_72%)]" },
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

const SIZES = { sm: { box: "size-8 rounded-[10px]", icon: 16 }, md: { box: "size-10 rounded-xl", icon: 19 }, lg: { box: "size-12 rounded-2xl", icon: 22 }, xl: { box: "size-16 rounded-[20px]", icon: 30 } } as const;

/** A tinted rounded tile with the icon in the tone's colour. */
export function IconTile({ icon: Icon, tone, size = "md", className }: { icon: LucideIcon; tone: Tone; size?: keyof typeof SIZES; className?: string }) {
  const s = SIZES[size];
  return (
    <span className={cn("grid shrink-0 place-items-center", s.box, TONE[tone].tile, className)} aria-hidden>
      <Icon size={s.icon} strokeWidth={2.1} />
    </span>
  );
}

/** The top of an app page: a tinted panel with a large icon, the title and what the page is for. */
export function PageHero({ icon, tone, eyebrow, title, lead, actions, className }: { icon: LucideIcon; tone: Tone; eyebrow?: string; title: string; lead?: React.ReactNode; actions?: React.ReactNode; className?: string }) {
  return (
    <header className={cn("glass mb-8 flex flex-col gap-5 rounded-[28px] p-6 sm:flex-row sm:items-center md:p-8", TONE[tone].hero, className)}>
      <IconTile icon={icon} tone={tone} size="xl" className="shadow-[inset_0_1px_0_oklch(1_0_0/40%)]" />
      <div className="min-w-0 flex-1">
        {eyebrow ? <p className={cn("text-sm font-bold tracking-wide", TONE[tone].text)}>{eyebrow}</p> : null}
        <h1 className="font-display text-[clamp(2.1rem,4.2vw,3.1rem)] leading-[1.08] font-bold tracking-[-0.02em] break-keep text-fg">{title}</h1>
        {lead ? <div className="mt-2 max-w-3xl text-lg leading-relaxed break-keep text-fg-muted">{lead}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}
