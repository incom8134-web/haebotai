// Eval harness for the agent pipeline (docs/ai-architecture-proposal.md §8).
// Runs golden requests that should come out DIFFERENT — a law office and a
// techno party, a bank-loan plan and a VC plan, a sales deck and a lesson —
// through the real routes (intent → run → events) and reports, per case:
// time, credits, strategy chosen vs. considered, review scores, questions
// asked; and across cases of the same tool: how similar their structures
// are (lower is better), plus guard checks (the service's own name leaking
// into results, invented-looking facts left unmarked).
//
//   EVAL_BASE=http://localhost:3000 EVAL_COOKIE='sb-…-auth-token=…' node scripts/eval/run.mjs [case…]
//
// Use a throwaway test account, never a real member's session. Runs spend
// real model calls and the account's credits.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const BASE = process.env.EVAL_BASE ?? "http://localhost:3000";
const COOKIE = process.env.EVAL_COOKIE;
if (!COOKIE) throw new Error("EVAL_COOKIE is required (a throwaway test account's auth cookie)");
const golden = JSON.parse(readFileSync(new URL("./golden.json", import.meta.url), "utf8"));
const keys = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(golden);
const OUT = new URL("./results/", import.meta.url);
mkdirSync(OUT, { recursive: true });

const headers = { Cookie: COOKIE, "Content-Type": "application/json" };

async function follow(runId) {
  let since = 0;
  const steps = [];
  for (let attempt = 0; attempt < 12; attempt++) {
    const res = await fetch(`${BASE}/api/runs/${runId}/events?since=${since}`, { headers });
    const text = await res.text();
    for (const line of text.split("\n")) {
      if (!line) continue;
      const e = JSON.parse(line);
      if (e.type === "step") {
        since++;
        steps.push(e.event);
      } else if (e.type === "done" || e.type === "error" || e.type === "cancelled") return { final: e, steps };
    }
  }
  return { final: { type: "timeout" }, steps };
}

async function runCase(key) {
  const c = golden[key];
  const started = Date.now();
  const body = { values: c.values, provider: "google" };
  const intentRes = await fetch(`${BASE}/api/tools/${c.tool}/intent`, { method: "POST", headers, body: JSON.stringify(body) }).then((r) => r.json()).catch(() => ({}));
  const questions = intentRes.questions ?? [];
  const answers = questions.map((q) => ({ question: q.question, answer: q.options[q.defaultIndex] }));
  const start = await fetch(`${BASE}/api/tools/${c.tool}/run`, {
    method: "POST",
    headers,
    body: JSON.stringify({ ...body, agent: { intent: intentRes.intent ?? null, answers, strategyOverride: c.override ?? null } }),
  }).then((r) => r.json());
  if (!start.runId) return { key, tool: c.tool, error: start.error ?? "start failed" };
  const { final, steps } = await follow(start.runId);
  const output = final.output ?? {};
  const agent = output.agent ?? {};
  const shown = JSON.stringify({ ...output, agent: undefined });
  const result = {
    key,
    tool: c.tool,
    status: final.type,
    error: final.error,
    seconds: Math.round((Date.now() - started) / 1000),
    credits: final.creditsUsed,
    questions: questions.map((q) => q.question),
    strategy: agent.strategy?.chosen,
    considered: agent.strategy?.considered?.map((x) => `${x.name} (${x.fit})`),
    blueprint: agent.strategy?.blueprint ?? [],
    scores: agent.review?.scores ?? [],
    handoffs: steps.filter((s) => s.kind === "handoff").length,
    guards: {
      serviceName: (shown.match(/해봇/g) ?? []).length,
      marked: (shown.match(/\[(입력|확인) 필요/g) ?? []).length,
    },
  };
  writeFileSync(new URL(`${key}.json`, OUT), JSON.stringify({ ...result, output }, null, 1));
  return result;
}

const words = (parts) => new Set(parts.join(" ").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").split(" ").filter((w) => w.length > 1));
const jaccard = (a, b) => {
  const A = words(a), B = words(b);
  let i = 0;
  for (const w of A) if (B.has(w)) i++;
  return A.size + B.size - i ? i / (A.size + B.size - i) : 0;
};

const results = [];
for (let i = 0; i < keys.length; i += 3) results.push(...(await Promise.all(keys.slice(i, i + 3).map(runCase))));
console.table(results.map((r) => ({ case: r.key, status: r.status ?? r.error, s: r.seconds, credits: r.credits, strategy: r.strategy, scores: r.scores?.join("→"), asked: r.questions?.length, handoffs: r.handoffs, "해봇": r.guards?.serviceName })));

// Structural diversity: same-tool pairs should not share a blueprint.
const byTool = {};
for (const r of results) if (r.blueprint?.length) (byTool[r.tool] ??= []).push(r);
for (const [tool, rs] of Object.entries(byTool)) {
  for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) {
    console.log(`${tool}: ${rs[i].key} vs ${rs[j].key} — structure similarity ${jaccard(rs[i].blueprint, rs[j].blueprint).toFixed(2)}, strategies "${rs[i].strategy}" / "${rs[j].strategy}"`);
  }
}
const leaks = results.filter((r) => r.guards?.serviceName);
if (leaks.length) console.log("GUARD: service name in results:", leaks.map((r) => r.key).join(", "));
writeFileSync(new URL("summary.json", OUT), JSON.stringify(results, null, 1));
