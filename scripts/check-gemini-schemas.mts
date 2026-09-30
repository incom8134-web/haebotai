// Sends every tool's output schema to Gemini with a tiny prompt and
// reports which ones the API rejects. Gemini's structured output refuses
// schemas it finds too complex with a bare 400 "invalid argument"; the
// limit isn't documented, so check new or changed schemas here before
// shipping.
//
//   node --experimental-strip-types scripts/check-gemini-schemas.mts [toolId…]
//
// Needs GOOGLE_GENAI_API_KEY in .env.local. Costs a few tokens per tool.
import { readdirSync, readFileSync } from "node:fs";
import { zodToJsonSchema } from "../lib/ai/schema.ts";

const root = new URL("../", import.meta.url);
const env = Object.fromEntries(
  readFileSync(new URL(".env.local", root), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]),
);
const dir = new URL("lib/tools/schemas/", root);
const all = readdirSync(dir).filter((f) => f.endsWith(".ts") && f !== "index.ts").map((f) => f.replace(/\.ts$/, ""));
const ids = process.argv.slice(2).length ? process.argv.slice(2) : all;

let failed = 0;
for (const id of ids) {
  let schema: unknown;
  try {
    schema = zodToJsonSchema((await import(new URL(`${id}.ts`, dir).href)).default);
  } catch (err) {
    console.log(`skip  ${id} (${(err as Error).message.split("\n")[0]})`);
    continue;
  }
  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent", {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": env.GOOGLE_GENAI_API_KEY },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "ok" }] }], generationConfig: { responseMimeType: "application/json", responseJsonSchema: schema, maxOutputTokens: 32 } }),
  });
  const ok = res.status !== 400;
  if (!ok) failed++;
  console.log(`${ok ? "ok   " : "FAIL "} ${id}${ok ? "" : ` — ${res.status} ${(await res.text()).slice(0, 120)}`}`);
}
process.exit(failed ? 1 : 0);
