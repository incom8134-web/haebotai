import { test } from "node:test";
import assert from "node:assert/strict";
import { guardDeckNumbers, numbersIn } from "./deck-guard.ts";

test("reads numbers with Korean units", () => {
  const n = numbersIn("3분기 매출 2,480만 원, 재방문율 63%, 하루 30개");
  assert.ok(n.has(2480) && n.has(24_800_000) && n.has(63) && n.has(30));
});

test("an invented big number becomes a normal slide; a real one stays", () => {
  const deck = {
    slides: [
      { layout: "big_number", headline: "a", points: [], stat: { value: "1분", label: "픽업 시간", context: "" } },
      { layout: "big_number", headline: "b", points: [], stat: { value: "2,480만 원", label: "3분기 매출", context: "" } },
      { layout: "big_number", headline: "c", points: [], stat: { value: "절반", label: "평일 비중", context: "" } },
    ],
  };
  const out = guardDeckNumbers(deck, "3분기 매출 2,480만 원");
  assert.equal(out.slides[0].layout, "points");
  assert.equal("stat" in out.slides[0], false);
  assert.equal(out.slides[1].layout, "big_number");
  assert.equal(out.slides[2].layout, "big_number");
});

test("a chart claiming input data it doesn't have is relabeled as an estimate", () => {
  const deck = {
    slides: [
      { layout: "chart", chart: { source: "input", series: [{ name: "만족도", values: [3.2, 7.8, 8.5] }] } },
      { layout: "chart", chart: { source: "input", series: [{ name: "매출", values: [740, 810, 930] }] } },
    ],
  };
  const out = guardDeckNumbers(deck, "7월 740만 원, 8월 810만 원, 9월 930만 원");
  assert.equal((out.slides[0].chart as { source: string }).source, "estimate");
  assert.equal((out.slides[1].chart as { source: string }).source, "input");
});

test("prices the user never gave become a fill-in marker, given ones stay", () => {
  const deck = {
    slides: [
      { layout: "table", headline: "1인당 7천 원부터", points: ["한 달 3만 6천 원 절약", "조각 6,500원 그대로"], table: { header: ["팩", "단가"], rows: [["베이직", "7,000원"], ["홀", "42,000원"]] }, image_url: "https://x/1,000원.png" },
    ],
    closing_ask: "첫 주문 5만 원",
  };
  const out = guardDeckNumbers(deck, "조각 6,500원, 홀케이크 42,000원");
  const s = out.slides[0] as { headline: string; points: string[]; table: { rows: string[][] }; image_url: string };
  assert.equal(s.headline, "1인당 [확인 필요: 금액]부터");
  assert.deepEqual(s.points, ["한 달 [확인 필요: 금액] 절약", "조각 6,500원 그대로"]);
  assert.deepEqual(s.table.rows, [["베이직", "[확인 필요: 금액]"], ["홀", "42,000원"]]);
  assert.equal(s.image_url, "https://x/1,000원.png");
  assert.equal(out.closing_ask, "첫 주문 [확인 필요: 금액]");
});
