import { test } from "node:test";
import assert from "node:assert/strict";
import { factsFromRun, mergeProjectFill, prefillFromFacts } from "./facts.ts";
import type { ToolField } from "../tools/types.ts";

test("a brand board fills the project's brand facts", () => {
  const f = factsFromRun(
    "brand-dna",
    { brand_name: "온샘소아과", offering: "저녁 진료 소아과" },
    {
      essence: { promise: "서두르지 않는 설명" },
      positioning: { statement: "저녁에도 설명하는 소아과", for_whom: "맞벌이 부모" },
      voice: { tone_words: ["다정한", "차분한"], do: ["쉬운 말"] },
      palette: [{ name: "새벽 하늘", hex: "#3B6E8F" }],
      typography: { heading: { family: "Gowun Dodum" }, body: { family: "Noto Sans KR" } },
      messaging: { taglines: ["저녁에도, 천천히"] },
    },
  );
  assert.equal(f.company_name, "온샘소아과");
  assert.equal(f.target_customer, "맞벌이 부모");
  assert.equal(f.palette, "새벽 하늘 #3B6E8F");
  assert.equal(f.fonts, "Gowun Dodum / Noto Sans KR");
  assert.equal(f.key_message, "저녁에도, 천천히");
});

test("empty values never overwrite, and unknown tools only give form facts", () => {
  assert.deepEqual(factsFromRun("hook-lab", { audience: "  " }, {}), {});
  assert.deepEqual(factsFromRun("hook-lab", { audience: "1살 강아지 보호자" }, {}), { target_customer: "1살 강아지 보호자" });
});

test("prefill fills only the fields a tool has, splitting chips", () => {
  const inputs: ToolField[] = [
    { kind: "textarea", id: "business", label: "" },
    { kind: "chips", id: "competitors", label: "", max: 2 },
    { kind: "select", id: "region", label: "", options: [] },
  ];
  const { values, filled } = prefillFromFacts(inputs, { product: "필라테스", competitors: "A짐, B스튜디오, C센터", region: "서울" });
  assert.deepEqual(values, { business: "필라테스", competitors: ["A짐", "B스튜디오"] });
  assert.deepEqual(filled, ["business", "competitors"]);
});

test("one font for heading and body is stored once", () => {
  const f = factsFromRun("brand-dna", {}, { typography: { heading: { family: "IBM Plex Sans KR" }, body: { family: "IBM Plex Sans KR" } } });
  assert.equal(f.fonts, "IBM Plex Sans KR");
});

test("a project's prefill never overwrites what the member brought", () => {
  const prev = { product: "봄 한정 벚꽃 막걸리 출시", target_customer: "", channel: "smartstore" };
  const fill = { product: "전통주 시음 키트", target_customer: "20~30대" };
  const { values, owned } = mergeProjectFill(prev, fill, new Set());
  assert.equal(values.product, "봄 한정 벚꽃 막걸리 출시");
  assert.equal(values.target_customer, "20~30대");
  assert.deepEqual([...owned], ["target_customer"]);
  // Switching projects replaces only what the first project filled.
  const next = mergeProjectFill(values, { product: "다른 제품", target_customer: "40대" }, owned);
  assert.equal(next.values.product, "봄 한정 벚꽃 막걸리 출시");
  assert.equal(next.values.target_customer, "40대");
});
