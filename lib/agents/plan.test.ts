import { test } from "node:test";
import assert from "node:assert/strict";
import { agenticFor, defaultPlan, FINALIZE, flowFor, planCapabilities } from "./plan.ts";

const ids = (toolId: string, provider = "google") => defaultPlan(toolId, provider).steps.map((s) => s.id);

test("default plans keep the v1 stage ids, so runs in flight across a deploy carry on", () => {
  assert.deepEqual(ids("presentation"), ["understand", "analyze", "contract", "strategize", "planning", "research", "draft", "critique", "revise", "polish"]);
  assert.deepEqual(ids("copy"), ["understand", "analyze", "contract", "strategize", "planning", "research", "draft", "critique", "revise", "polish"]);
  assert.deepEqual(ids("homepage"), ["understand", "strategize", "plan", "build", "critique", "revise", "assemble"]);
  assert.deepEqual(ids("logo"), ["understand", "strategize", "concepts", "critique", "draw"]);
  assert.deepEqual(ids("image"), ["understand", "strategize", "render"]);
  assert.deepEqual(ids("brand-model"), ["understand", "strategize", "render"]);
  assert.deepEqual(ids("grant"), ["generate"]);
  assert.deepEqual(ids("copy", "anthropic"), ["generate"]);
});

test("one-shot plans store the output as produced; agent plans add the brief", () => {
  assert.equal(defaultPlan("grant", "google").finalize, "raw");
  assert.equal(defaultPlan("copy", "anthropic").finalize, "raw");
  assert.equal(defaultPlan("copy", "google").finalize, "brief");
  assert.equal(agenticFor("grant", "google"), false);
  assert.equal(agenticFor("copy", "openai"), false);
  assert.equal(agenticFor("copy", "google"), true);
});

test("flows reproduce the v1 transitions", () => {
  const generic = defaultPlan("copy", "google");
  assert.equal(flowFor(generic, "research")!.next, "draft");
  const critique = flowFor(generic, "critique")!;
  assert.equal(critique.find("revise_output"), "revise");
  assert.equal(critique.after("revise_output"), "polish");
  assert.equal(flowFor(generic, "revise")!.find("critique_output"), "critique");
  assert.equal(flowFor(generic, "revise")!.next, "polish");
  assert.equal(flowFor(generic, "polish")!.next, FINALIZE);

  const site = defaultPlan("homepage", "google");
  assert.equal(flowFor(site, "critique")!.after("revise_site"), "assemble");
  assert.equal(flowFor(site, "strategize")!.next, "plan");

  const logo = defaultPlan("logo", "google");
  assert.equal(flowFor(logo, "concepts")!.find("draw_logo"), "draw");
  assert.equal(flowFor(logo, "critique")!.find("plan_logo"), "concepts");
  assert.equal(flowFor(logo, "critique")!.next, "draw");
});

test("a capability missing from the plan falls back to the next step", () => {
  const plan = { v: 1 as const, source: "planner" as const, finalize: "brief" as const, steps: [{ id: "a", capability: "write_draft" }, { id: "b", capability: "critique_output" }] };
  const flow = flowFor(plan, "b")!;
  assert.equal(flow.find("revise_output"), null);
  assert.equal(flow.after("revise_output"), FINALIZE);
  assert.equal(flowFor(plan, "zzz"), null);
  assert.deepEqual(planCapabilities(plan), ["write_draft", "critique_output"]);
});
