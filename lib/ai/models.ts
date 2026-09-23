// Single place to change the model used per provider across every tool.
// Verified against platform.claude.com/docs (2026-09-22): Claude Sonnet 5
// is the current Sonnet-tier model and one of the models structured
// outputs (output_config.format / messages.parse) actually supports —
// Sonnet 4.6 is not on that list.
export const ANTHROPIC_MODEL = "claude-sonnet-5";

// Verified against developers.openai.com/api/docs/models (2026-09-23):
// GPT-5.6 Terra is the current balanced tier — competitive with GPT-5.5
// at roughly half the cost, with structured_outputs, web_search and
// image_input all listed as supported features on the Responses API.
// Sol (flagship reasoning) is overkill and costlier for these tools;
// Luna (cheapest/fastest) is the wrong end to default a paid feature to.
export const OPENAI_MODEL = "gpt-5.6-terra";

// Verified against node_modules/openai/resources/images.d.ts (2026-09-23):
// gpt-image-1.5 is GA and the documented default for images.edit() —
// cheaper and faster than gpt-image-1 with no quality tradeoff for new
// integrations.
export const OPENAI_IMAGE_MODEL = "gpt-image-1.5";

// Generous per-tool output ceiling. Hitting it mid-generation is treated
// as a failed run (never a silently truncated "success" — see
// lib/ai/anthropic.ts and lib/ai/openai.ts), so this errs high rather
// than low — sized per tool by output shape (a full HTML page or an
// 8-10 section document needs far more room than a single card of
// scores). Shared across providers: the sizing reasoning is about the
// tool's output shape, not which model produces it.
const MAX_TOKENS_BY_TOOL: Record<string, number> = {
  "business-plan": 16000, // multi-section doc + financial tables
  proposal: 16000, // multi-section doc
  homepage: 16000, // a full single-file HTML page as one string field
  sangsepage: 16000, // 8-10 long sections, each with real body copy
  blog: 12000, // body_markdown alone can run to the 4000자 option
  presentation: 12000, // up to 12 slides, each with speaker notes
  logo: 10000, // 6 full SVG documents plus specs per concept
  calendar: 10000, // 13 weeks x ~5 tasks — many small repeated objects
  trend: 10000, // up to 8 ideas, each with 8 scores + sources
};
const MAX_TOKENS_DEFAULT = 8000;

export function maxTokensForTool(toolId: string): number {
  return MAX_TOKENS_BY_TOOL[toolId] ?? MAX_TOKENS_DEFAULT;
}
