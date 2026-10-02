import "server-only";
import { analyzeSource, chooseStrategy, planWorkflowCapability, taskContract, understandRequest } from "./agent";
import { assembleSite, buildSite, critiqueSite, reviseSite, siteArtDirection } from "./site";
import { critiqueLogoPlans, drawLogo, oneShot, planLogo, renderPhotos } from "./visual";
import { analyzeCompetitors, critiqueOutput, finishOutput, researchAudience, researchTopic, reviseOutput, writeDraft } from "./writing";
import type { Capability } from "./types";

// Every capability a plan can use (docs/ai-architecture-v2.md §4.3).

export const CAPABILITIES: Record<string, Capability> = Object.fromEntries(
  [
    understandRequest,
    analyzeSource,
    taskContract,
    chooseStrategy,
    planWorkflowCapability(() => new Set(Object.keys(CAPABILITIES))),
    researchTopic,
    analyzeCompetitors,
    researchAudience,
    writeDraft,
    critiqueOutput,
    reviseOutput,
    finishOutput,
    siteArtDirection,
    buildSite,
    critiqueSite,
    reviseSite,
    assembleSite,
    renderPhotos,
    planLogo,
    critiqueLogoPlans,
    drawLogo,
    oneShot,
  ].map((c) => [c.id, c]),
);

export type { Capability } from "./types";
