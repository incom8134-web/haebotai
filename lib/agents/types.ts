// The agent runtime's data model (docs/ai-architecture-proposal.md §3).
//
// A run is no longer one request that streams a model call. It is a job:
// the run route records it and returns; the orchestrator (runner.ts) works
// through the agent's stages — strategy, research, draft, critique,
// revise, … — saving the run state after every stage, and hands off to a
// fresh function invocation when the current one is running out of time.
// The page follows along through /api/runs/[runId]/events.
//
// Everything here is plain JSON: it lives in generations.output._agent
// while the run is in progress.

import type { BusinessProfile } from "@/lib/tools/types";
import type { Source } from "@/lib/tools/registry/shared";
import type { ProviderId, TokenUsage } from "@/lib/ai/types";

export type Bi = { ko: string; en: string };

export type AgentEventKind = "stage" | "intent" | "strategy" | "critique" | "revision" | "note" | "handoff";

export interface AgentEvent {
  at: string;
  kind: AgentEventKind;
  /** The stage this event belongs to. */
  stage: string;
  /** "start" while a stage runs, "done" / "skipped" when it ends. */
  status: "start" | "done" | "skipped";
  label: Bi;
  /** A short, user-facing detail (the chosen strategy, "3 issues found"…). */
  detail?: Bi;
}

/** The request as understood before any work starts (lib/agents/intent.ts). */
export interface Intent {
  subject: string;
  usesProfile: boolean;
  /** Free text: "luxury lead-generation site", "investor pitch", "local F&B plan"… */
  kind: string;
  audience: string[];
  goal: string;
  positioning: string;
  tone: { words: string; formality: "formal" | "neutral" | "casual"; energy: "calm" | "balanced" | "energetic" };
  mustInclude: string[];
  avoid: string[];
  unknowns: { item: string; critical: boolean; assumption: string }[];
  /** Short understanding the page shows: "법률사무소의 신뢰 중심 예약 사이트". */
  summary: string;
}

export interface Question {
  id: string;
  question: string;
  options: string[];
  /** Index into options used when the member skips. */
  defaultIndex: number;
  allowFreeText: boolean;
}

/** How this request will be solved (lib/agents/strategy.ts). */
export interface Strategy {
  considered: { name: string; summary: string; fit: number; why: string }[];
  chosen: string;
  rationale: string;
  /** The structure decided for THIS request, in order. */
  blueprint: { part: string; purpose: string; notes: string }[];
  /** What a great result must do for this request (the critic's checklist). */
  rubric: string[];
  emphasize: string[];
  omit: string[];
  /** Named strategy from the agent's library, if the chosen one is from it. */
  libraryId?: string;
}

export interface CritiqueIssue {
  severity: "high" | "medium" | "low";
  type: "structure" | "generic" | "fact" | "tone" | "hierarchy" | "cta" | "missing" | "repetition" | "design" | "other";
  where: string;
  problem: string;
  fix: string;
}

export interface Critique {
  score: number;
  verdict: "pass" | "revise";
  issues: CritiqueIssue[];
  strengths: string[];
}

export interface AgentRunState {
  v: 1;
  toolId: string;
  provider: ProviderId;
  userId: string;
  runId: string;
  /** Where to reach this deployment for a continuation (the first request's origin). */
  origin: string;
  /** Whether the run uses the member's own API key (decided and charged at the start). */
  ownKey: boolean;
  /** The "참고 자료" payload as submitted; files stay in storage until the run ends. */
  referenceRaw: unknown;
  profile: BusinessProfile | null;
  intent: Intent | null;
  /** Member's answers to the clarifying questions (question → answer). */
  answers: { question: string; answer: string }[];
  /** A strategy the member asked for ("다른 전략으로 다시 만들기"). */
  strategyOverride: string | null;
  strategy: Strategy | null;
  /** Stage bookkeeping. */
  stage: string;
  stagesDone: string[];
  /** Times a stage was restarted in a fresh invocation after running out of time. */
  retries: Record<string, number>;
  /** Agent-specific working data (drafts, plans, photos, critiques…). */
  work: Record<string, unknown>;
  usage: TokenUsage;
  sources: Source[];
  events: AgentEvent[];
  invocations: number;
  startedAt: string;
  heartbeatAt: string;
  creditsReserved: number;
}

export interface StageContext {
  state: AgentRunState;
  manifest: import("@/lib/tools/types").ToolManifest;
  /** Form values plus the rebuilt reference bundle (input._reference) and directives (_intent, _strategy…). */
  input: Record<string, unknown>;
  signal: AbortSignal;
  /** Seconds left in this function invocation. */
  secondsLeft: () => number;
  emit: (e: Omit<AgentEvent, "at">) => void;
  addUsage: (u: TokenUsage) => void;
  /** Storage for uploads (service-role client; paths are always under the member's folder). */
  storage: import("@/lib/ai/types").ImageStorageContext;
  /** The member's own API keys for this provider (decrypted per invocation, never stored). */
  apiKeys: string[];
}

export interface StageResult {
  /** Next stage id, or "finalize". */
  next: string;
}

export interface Stage {
  id: string;
  label: Bi;
  /** Roughly how long it may take; the runner hands off first if the invocation can't fit it. */
  maxSeconds: number;
  /** Optional stages are skipped (not failed) when they error or run out of time; the run continues at skipTo. */
  optional?: { skipTo: string };
  run(ctx: StageContext): Promise<StageResult>;
}

export interface AgentSpec {
  id: string;
  /** What "done well" means for this agent. */
  objective: string;
  firstStage: string;
  stages: Record<string, Stage>;
  /** The final output and sources stored on the run (the runner adds meta and runs the safety checks). */
  finalize(state: AgentRunState): { output: unknown; sources: Source[] };
}
