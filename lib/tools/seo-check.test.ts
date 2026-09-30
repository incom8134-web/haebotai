import { test } from "node:test";
import assert from "node:assert/strict";
import { charCount, seoChecks } from "./seo-check.ts";

const body = [
  "러닝화 고르는 법은 생각보다 간단합니다. 러닝화는 발에 맞아야 합니다.",
  "",
  "## 쿠션을 먼저 보세요",
  "러닝화의 쿠션은 무릎을 지킵니다.",
  "",
  "## 발볼을 확인하세요",
  "넓은 발은 넓은 러닝화가 필요합니다.",
  "",
  "## 저녁에 신어 보세요",
  "발이 부은 저녁에 신어 봐야 합니다.",
].join("\n");

test("checks read the draft, not a fixed score", () => {
  const checks = seoChecks({ markdown: body, keyword: "러닝화, 초보", titles: ["초보를 위한 러닝화 고르는 법"], meta: "a".repeat(100), targetChars: 120, imageSlots: 2 });
  const by = Object.fromEntries(checks.map((c) => [c.id, c.pass]));
  assert.equal(by.title, true);
  assert.equal(by.intro, true);
  assert.equal(by.headings, true);
  assert.equal(by.meta, true);
  assert.equal(by.images, true);
  const none = seoChecks({ markdown: body, keyword: "마라톤", titles: ["제목"], meta: "짧음", targetChars: 4000, imageSlots: 0 });
  const by2 = Object.fromEntries(none.map((c) => [c.id, c.pass]));
  assert.equal(by2.title, false);
  assert.equal(by2.length, false);
  assert.equal(by2.meta, false);
});

test("character count ignores markdown and spaces", () => {
  assert.equal(charCount("## 제목\n**굵게** [링크](https://a.b)"), "제목굵게링크".length);
});
