import type { LongDocument } from "./document.ts";

// What the agent core needs from the outside world. The real port
// (lib/agents/specs/document.ts) wires Gemini, Google Search grounding,
// the image model and the PDF renderer; tests pass a scripted fake, so
// every workflow can be exercised end to end without a network.

export interface Usage {
  inputTokens?: number | null;
  outputTokens?: number | null;
}

export interface JsonCall {
  /** What the call is for (analysis, contract, plan, section, critic, design, synthesis…). */
  task: string;
  /** fast: Flash (long context, cheap). smart: Pro, falling back to Flash. */
  tier: "fast" | "smart";
  system: string;
  prompt: string;
  schema: object;
  maxOutputTokens?: number;
  thinking?: "low" | "medium" | "high";
  timeoutMs?: number;
  /** Attach the uploaded PDFs/images themselves (a scanned PDF has no text to extract). */
  attachSources?: boolean;
}

export interface ModelPort {
  json(call: JsonCall): Promise<{ data: unknown; usage: Usage }>;
  search(question: string, context: string): Promise<{ findings: string; sources: { url: string; title: string; domain?: string }[]; usage: Usage }>;
  /** Renders the document as the PDF export would and returns its page count. */
  render?(doc: LongDocument, eyebrow: string): Promise<number | null>;
  /** Illustrations for the document, planned as one consistent set (key → stored image). */
  images?(items: { key: string; prompt: string }[], context: string): Promise<Map<string, { url: string }>>;
}
