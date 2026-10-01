// Partial regeneration (docs/redesign-plan.md §4.4): which parts of a
// result can be rewritten on their own, and what it costs. Shared by the
// regenerate route and the result page so both agree.

// Results built around images or a whole page can't have one part
// rewritten without the images or markup going stale.
const NO_REGENERATE_TOOLS = new Set(["logo", "image", "brand-model", "homepage", "presentation", "grant", "money", "prompt", "place"]);
// Bookkeeping keys, never offered.
const META_KEYS = new Set(["agent", "_agent", "request_brief", "creative_direction", "sources", "char_count", "html", "rendered_images", "mood_board", "project_files", "sitemap", "design"]);

export const regenerateCost = (estimatedCredits: number) => Math.max(5, Math.round(estimatedCredits * 0.25));

/** Top-level keys of this result that can be rewritten on their own. */
export function regeneratableSections(toolId: string, output: unknown): string[] {
  if (NO_REGENERATE_TOOLS.has(toolId) || !output || typeof output !== "object" || Array.isArray(output)) return [];
  return Object.entries(output as Record<string, unknown>)
    .filter(([key, value]) => !META_KEYS.has(key) && !key.startsWith("_") && value !== null && value !== "")
    // A part that carries generated images (an ad visual, a cover photo) would lose them.
    .filter(([, value]) => !/"(image_url|cover_image_url|url)"\s*:\s*"(https?:|data:)/.test(JSON.stringify(value)))
    .map(([key]) => key);
}

export const REGENERATE_PRESETS = [
  { ko: "더 짧고 간결하게", en: "Shorter and tighter" },
  { ko: "더 구체적인 예시와 숫자로", en: "More concrete, with examples" },
  { ko: "더 고급스럽고 차분한 톤으로", en: "More premium, calmer tone" },
  { ko: "완전히 다른 방향으로", en: "A completely different direction" },
  { ko: "초보자도 이해하기 쉽게", en: "Easier for beginners" },
];
