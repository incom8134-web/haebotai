// HAEBOT_A_TOOLS_SPEC.md Part 2 §② / Part 6 T4 — typed output→input
// chaining for the Category 1 pairs declared via `acceptsChainFrom`.
// "money → calendar carries data with zero file handling": this is the
// mapping that makes that literal. Genuinely tool-pair-specific (there's
// no generic way to know which field of tool B a JSON blob from tool A
// belongs in without an LLM doing the mapping), so — like the output
// renderer — it's the one place per-pair code is expected.

export function seedFromChain(targetId: string, sourceId: string, sourceOutput: unknown): Record<string, unknown> {
  const output = sourceOutput as {
    models?: { name: string }[];
    ideas?: { name: string }[];
    combinations?: string[];
  };

  if (targetId === "trend" && sourceId === "money") {
    return { ideas: (output.models ?? []).slice(0, 3).map((m) => m.name) };
  }

  if (targetId === "calendar" && sourceId === "money") {
    return { model: output.models?.[0]?.name ?? "" };
  }

  if (targetId === "calendar" && sourceId === "trend") {
    return { model: output.ideas?.[0]?.name ?? "" };
  }

  if (targetId === "blog" && sourceId === "keyword") {
    return { topic: output.combinations?.[0] ?? "" };
  }

  if (targetId === "place" && sourceId === "keyword") {
    return { current_info: `현재 상위 키워드: ${(output.combinations ?? []).join(", ")}` };
  }

  if (targetId === "sangsepage" && sourceId === "keyword") {
    return { features: (output.combinations ?? []).slice(0, 5) };
  }

  return {};
}
