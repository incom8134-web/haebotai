import type { LucideIcon } from "lucide-react";
import type { z } from "zod";

// HAEBOT_A_TOOLS_SPEC.md §3.1 / §3.3

export type CategoryId = "ideas" | "content" | "design" | "sales" | "docs";

export interface FieldOption {
  value: string;
  label: string;
  hint?: string;
}

export type ToolField =
  | { kind: "text"; id: string; label: string; placeholder?: string; max?: number; required?: boolean }
  | { kind: "textarea"; id: string; label: string; placeholder?: string; rows?: number; max?: number; required?: boolean }
  | { kind: "select"; id: string; label: string; options: FieldOption[]; required?: boolean }
  | { kind: "multiselect"; id: string; label: string; options: FieldOption[]; max?: number }
  | { kind: "number"; id: string; label: string; min?: number; max?: number; unit?: string; required?: boolean }
  | { kind: "image"; id: string; label: string; maxFiles?: number; maxMB?: number }
  | { kind: "url"; id: string; label: string; required?: boolean }
  | { kind: "chips"; id: string; label: string; placeholder?: string; max?: number };

export interface BusinessProfile {
  brand_name: string;
  industry: string;
  business_stage: "idea" | "pre_launch" | "under_1y" | "1_3y" | "over_3y";
  target_customer: string;
  tone: string[];
  voice_examples: string[];
  brand_colors: string[];
  logo_asset_id?: string;
  region?: string;
  weekly_hours?: number;
  budget_band?: string;
}

export interface ToolManifest<TOutput = unknown> {
  id: string;
  category: CategoryId;
  name_ko: string;
  name_en: string;
  summary: string;
  icon: LucideIcon;

  inputs: ToolField[];
  usesProfile: (keyof BusinessProfile)[];
  acceptsChainFrom?: string[];

  outputSchema: z.ZodType<TOutput>;
  outputRenderer: "document" | "cards" | "images" | "calendar" | "table" | "code";

  grounding: {
    requireSources: boolean;
    webSearch: boolean;
    estimateBadge: boolean;
  };

  model: "gemini-3.6-flash" | "gemini-3.1-flash-image";
  estimatedCredits: number;
  estimatedSeconds: number;

  /** Listed but not runnable yet — cards show 준비 중, the run page and run
   *  route refuse it before any credits are reserved. */
  comingSoon?: boolean;
}
