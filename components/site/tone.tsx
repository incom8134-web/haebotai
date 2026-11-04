import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import { catalogTool } from "@/lib/tools/catalog";
import type { CategoryId } from "@/lib/tools/types";
import { cn } from "@/lib/utils";

// Tool-area colour (app/globals.css --cat-*): every tool, chip and tile
// takes its hue from its category, so a tool looks the same on every page.
// Class names are spelled out in full so Tailwind can see them.

export type Tone = CategoryId | "accent";

export const TONE: Record<Tone, { tile: string; chip: string; dot: string; text: string; hover: string; wash: string; hero: string }> = {
  discover: { tile: "bg-cat-discover/14 text-cat-discover", chip: "bg-cat-discover/12 text-cat-discover", dot: "bg-cat-discover", text: "text-cat-discover", hover: "hover:border-cat-discover/50", wash: "bg-cat-discover/[0.06]", hero: "bg-[color-mix(in_oklch,var(--cat-discover)_7%,var(--color-surface))]" },
  brand: { tile: "bg-cat-brand/14 text-cat-brand", chip: "bg-cat-brand/12 text-cat-brand", dot: "bg-cat-brand", text: "text-cat-brand", hover: "hover:border-cat-brand/50", wash: "bg-cat-brand/[0.06]", hero: "bg-[color-mix(in_oklch,var(--cat-brand)_7%,var(--color-surface))]" },
  campaign: { tile: "bg-cat-campaign/14 text-cat-campaign", chip: "bg-cat-campaign/12 text-cat-campaign", dot: "bg-cat-campaign", text: "text-cat-campaign", hover: "hover:border-cat-campaign/50", wash: "bg-cat-campaign/[0.06]", hero: "bg-[color-mix(in_oklch,var(--cat-campaign)_7%,var(--color-surface))]" },
  operate: { tile: "bg-cat-operate/14 text-cat-operate", chip: "bg-cat-operate/12 text-cat-operate", dot: "bg-cat-operate", text: "text-cat-operate", hover: "hover:border-cat-operate/50", wash: "bg-cat-operate/[0.06]", hero: "bg-[color-mix(in_oklch,var(--cat-operate)_7%,var(--color-surface))]" },
  research: { tile: "bg-cat-research/14 text-cat-research", chip: "bg-cat-research/12 text-cat-research", dot: "bg-cat-research", text: "text-cat-research", hover: "hover:border-cat-research/50", wash: "bg-cat-research/[0.06]", hero: "bg-[color-mix(in_oklch,var(--cat-research)_7%,var(--color-surface))]" },
  accent: { tile: "bg-studio-cyan/12 text-studio-cyan", chip: "bg-studio-cyan/12 text-studio-cyan", dot: "bg-studio-cyan", text: "text-studio-cyan", hover: "hover:border-studio-cyan/50", wash: "bg-studio-cyan/[0.06]", hero: "bg-[color-mix(in_oklch,var(--studio-cyan)_7%,var(--color-surface))]" },
};

/** One frosted-glass illustration per tool area (made with Gemini, public/images/areas). */
export const AREA_ART: Record<CategoryId, string> = {
  discover: "/images/areas/discover.webp",
  research: "/images/areas/research.webp",
  brand: "/images/areas/brand.webp",
  campaign: "/images/areas/campaign.webp",
  operate: "/images/areas/operate.webp",
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

const SIZES = { sm: { box: "size-8 rounded-[10px]", icon: 16, art: "size-9", px: 36 }, md: { box: "size-10 rounded-xl", icon: 19, art: "size-12", px: 48 }, lg: { box: "size-12 rounded-2xl", icon: 22, art: "size-14", px: 56 }, xl: { box: "size-16 rounded-[20px]", icon: 30, art: "size-24", px: 96 } } as const;

// 3D glass icons (made with Gemini, backgrounds removed, public/images/icons):
// one per tool and per main page. They sit on transparent backgrounds, so the
// same file works in light and dark.
const ICON = (name: string) => `/images/icons/${name}.webp`;
const TOOL_ART = new Set(["idea-radar", "offer-architect", "market-desk", "persona-mapper", "brand-dna", "logo-lab", "sales-page", "web-builder", "campaign-planner", "ad-factory", "seo-composer", "content-transformer", "doc-studio", "pitch-director", "ops-planner", "prompt-maker"]);

/** The 3D icon for a tool (slug or stored engine id); a tool's extra modes use their parent's. */
export function toolArt(slugOrEngine: string | null | undefined): string | undefined {
  const t = slugOrEngine ? catalogTool(slugOrEngine) : undefined;
  const slug = t?.hidden ? t.hidden.parent : t?.slug;
  return slug && TOOL_ART.has(slug) ? ICON(`tool-${slug}`) : undefined;
}

/** The 3D icon for one of the app's main pages, by its path. */
export const PAGE_ART: Record<string, string> = {
  "/studio": ICON("page-studio"),
  "/tools": ICON("page-tools"),
  "/library": ICON("page-library"),
  "/projects": ICON("page-projects"),
  "/links": ICON("page-links"),
  "/brand": ICON("page-profile"),
  "/account": ICON("page-account"),
  "/account/credits": ICON("page-credits"),
  "/account/membership": ICON("page-membership"),
  "/help/contact": ICON("page-support"),
  "/help/faq": ICON("page-faq"),
  "/help/whats-new": ICON("page-new"),
};

/** A tinted rounded tile with the icon in the tone's colour — or, given `art`, the 3D glass icon itself. */
export function IconTile({ icon: Icon, tone, size = "md", className, art }: { icon: LucideIcon; tone: Tone; size?: keyof typeof SIZES; className?: string; art?: string }) {
  const s = SIZES[size];
  if (art)
    return (
      <span className={cn("relative -m-1 shrink-0 drop-shadow-[0_6px_10px_rgb(30_40_80/0.18)] dark:drop-shadow-[0_6px_14px_rgb(124_58_237/0.35)]", s.art, className)} aria-hidden>
        <Image src={art} alt="" fill sizes={`${s.px}px`} className="object-contain" />
      </span>
    );
  return (
    <span className={cn("grid shrink-0 place-items-center", s.box, TONE[tone].tile, className)} aria-hidden>
      <Icon size={s.icon} strokeWidth={2.1} />
    </span>
  );
}

/** The top of an app page: a tinted panel with a large icon, the title and what the page is for. */
export function PageHero({ icon, tone, eyebrow, title, lead, actions, className, art }: { icon: LucideIcon; tone: Tone; eyebrow?: string; title: string; lead?: React.ReactNode; actions?: React.ReactNode; className?: string; art?: string }) {
  return (
    <header className={cn("glass mb-8 flex flex-col gap-5 rounded-[28px] p-6 sm:flex-row sm:items-center md:p-8", TONE[tone].hero, className)}>
      {art ? (
        <span className="relative size-24 shrink-0 animate-[float_6s_ease-in-out_infinite] drop-shadow-[0_14px_22px_rgb(30_40_80/0.22)] motion-reduce:animate-none md:size-28 dark:drop-shadow-[0_14px_26px_rgb(124_58_237/0.45)]" aria-hidden>
          <Image src={art} alt="" fill priority sizes="112px" className="object-contain" />
        </span>
      ) : (
        <IconTile icon={icon} tone={tone} size="xl" className="shadow-[inset_0_1px_0_oklch(1_0_0/40%)]" />
      )}
      <div className="min-w-0 flex-1">
        {eyebrow ? <p className={cn("text-sm font-bold tracking-wide", TONE[tone].text)}>{eyebrow}</p> : null}
        <h1 className="font-display text-[clamp(2.1rem,4.2vw,3.1rem)] leading-[1.08] font-bold tracking-[-0.02em] break-keep text-fg">{title}</h1>
        {lead ? <div className="mt-2 max-w-3xl text-lg leading-relaxed break-keep text-fg-muted">{lead}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}
