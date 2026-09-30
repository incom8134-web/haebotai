"use client";

import { GapMap } from "./gap-map";
import { IdeaBoard } from "./idea-board";
import { MvpBoard } from "./mvp-board";
import { OfferBlocks } from "./offer-blocks";
import { RevenueMap } from "./revenue-map";

type View = (props: { output: Record<string, unknown>; runId?: string }) => React.ReactNode;

// The discover tools' own result views (their exports use the report
// builders in lib/tools/report instead).
export const DISCOVER_VIEWS: Record<string, View> = {
  "idea-radar": IdeaBoard,
  "revenue-mapper": RevenueMap,
  "offer-architect": OfferBlocks,
  "market-gap": GapMap,
  "mvp-blueprint": MvpBoard,
};
