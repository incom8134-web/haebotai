import { test } from "node:test";
import assert from "node:assert/strict";
import { extractHtml } from "./html-extract.ts";

const page = "<!doctype html><html lang=\"ko\"><head></head><body><h1>안녕</h1></body></html>";

test("takes a clean document as is", () => {
  assert.equal(extractHtml(page), page);
});

test("strips code fences and chatter around the page", () => {
  assert.equal(extractHtml("여기 완성된 페이지입니다:\n```html\n" + page + "\n```\n즐겨 보세요!"), page);
});

test("closes a page cut off before </html>", () => {
  const out = extractHtml("<!doctype html><html><body><p>끝나지 않은");
  assert.match(out ?? "", /<\/body>\n<\/html>$/);
});

test("rejects replies with no page", () => {
  assert.equal(extractHtml(""), null);
  assert.equal(extractHtml("죄송합니다, 만들 수 없습니다."), null);
});
