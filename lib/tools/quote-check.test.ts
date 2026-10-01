import { test } from "node:test";
import assert from "node:assert/strict";
import { quoteFound } from "./quote-check.ts";

const source = "★★☆☆☆ 주문하고 5일 걸렸어요. 선물이라 날짜 맞추려고 했는데ㅠ\n★★★★★ 포장이 고급스러워서 선물용으로 딱이에요";

test("verbatim quotes are found despite spacing, punctuation and stars", () => {
  assert.equal(quoteFound("주문하고 5일 걸렸어요", source), true);
  assert.equal(quoteFound("\"포장이 고급스러워서  선물용으로 딱이에요!\"", source), true);
});

test("reworded or invented quotes are not", () => {
  assert.equal(quoteFound("배송이 5일이나 걸렸어요", source), false);
  assert.equal(quoteFound("가격이 너무 비싸요", source), false);
  assert.equal(quoteFound("ㅠ", source), false);
});
