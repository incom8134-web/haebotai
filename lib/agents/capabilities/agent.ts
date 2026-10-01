import "server-only";
import { strategizeStage, understandStage } from "../specs/common";
import { strategyNote } from "./strategy-notes";
import type { Capability } from "./types";

// Capabilities every agentic plan starts with: understand the request and
// choose how to solve it.

export const understandRequest: Capability = {
  id: "understand_request",
  label: { ko: "요청 이해", en: "Understanding the request" },
  maxSeconds: () => 30,
  async run(ctx, flow) {
    return (await understandStage(flow.next).run(ctx)).next;
  },
};

export const chooseStrategy: Capability = {
  id: "choose_strategy",
  label: { ko: "전략 선택", en: "Choosing a strategy" },
  maxSeconds: () => 100,
  // Without a strategy the agent still works from the request.
  skipTo: (flow) => flow.next,
  async run(ctx, flow) {
    return (await strategizeStage(flow.next, strategyNote).run(ctx)).next;
  },
};
