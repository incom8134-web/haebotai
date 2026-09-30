import type { CategoryId } from "../types";
import { CATEGORIES } from "../catalog";

// Category labels for the sidebar, palette and tool pages (lib/tools/catalog.ts).
export const CATEGORY_LABELS: Record<CategoryId, { ko: string; en: string }> = Object.fromEntries(
  Object.entries(CATEGORIES).map(([id, c]) => [id, c.name]),
) as Record<CategoryId, { ko: string; en: string }>;
