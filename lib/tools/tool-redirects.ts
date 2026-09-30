// Old tool URLs (ids before the 25-tool redesign) → where they live now.
// Plain data so next.config.ts can turn them into real 308 redirects;
// catalog.test.ts checks it stays in step with lib/tools/catalog.ts.
// "" = retired with no direct successor (goes to the tools list).
export const TOOL_REDIRECTS: Record<string, string> = {
  money: "idea-radar",
  trend: "trend-radar",
  strategy: "campaign-planner",
  calendar: "ops-planner",
  blog: "seo-composer",
  copy: "ad-factory",
  keyword: "seo-keywords",
  image: "ad-photo",
  "brand-model": "ad-model",
  logo: "logo-lab",
  sangsepage: "sales-page",
  homepage: "web-builder",
  presentation: "pitch-director",
  proposal: "proposal-forge",
  "business-plan": "doc-studio",
  place: "seo-composer",
  prompt: "",
  grant: "doc-studio",
};
