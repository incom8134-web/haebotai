// Single place to change the Anthropic model used across every tool.
// Verified against platform.claude.com/docs (2026-09-22): Claude Sonnet 5
// is the current Sonnet-tier model and one of the models structured
// outputs (output_config.format / messages.parse) actually supports —
// Sonnet 4.6 is not on that list.
export const ANTHROPIC_MODEL = "claude-sonnet-5";

// Generous per-tool output ceiling. Hitting it mid-generation is treated
// as a failed run (never a silently truncated "success" — see
// lib/ai/anthropic.ts), so this errs high rather than low.
// business-plan/proposal produce the longest documents (multi-section
// docs with financial tables); everything else needs far less.
const MAX_TOKENS_BY_TOOL: Record<string, number> = {
  "business-plan": 16000,
  proposal: 16000,
};
const MAX_TOKENS_DEFAULT = 8000;

export function anthropicMaxTokens(toolId: string): number {
  return MAX_TOKENS_BY_TOOL[toolId] ?? MAX_TOKENS_DEFAULT;
}
