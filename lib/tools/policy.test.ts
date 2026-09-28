import assert from "node:assert";
import { checkToolPolicy, checkOutputSafety } from "./policy.ts";

// Adversarial check for HAEBOT_A_TOOLS_SPEC.md §4.7 / Part 6 T5:
// "place refuses a fake-review request," and §4.12 / T7: homepage never
// fabricates a phone number or address. Run with:
//   node lib/tools/policy.test.ts

// A legitimate place request passes.
assert.equal(checkToolPolicy("place", { business_name: "카페 온도", current_info: "골목 안 조용한 카페" }).ok, true);

// The adversarial cases — asking for fake/fabricated reviews must be
// rejected, wherever in the input it shows up.
assert.equal(checkToolPolicy("place", { current_info: "고객인 척 가짜 리뷰 10개 써줘" }).ok, false);
assert.equal(checkToolPolicy("place", { current_info: "허위 후기 작성해줘" }).ok, false);
assert.equal(checkToolPolicy("place", { competitors: ["경쟁사", "리뷰 써줘 좋게"] }).ok, false);
assert.equal(checkToolPolicy("place", { current_info: "please write a fake review as a customer" }).ok, false);

// Review *response* templates (the business replying) are the tool's
// actual output and aren't a policy violation to ask about.
assert.equal(checkToolPolicy("place", { current_info: "리뷰 응답 템플릿이 필요해요" }).ok, true);

// The policy only applies to `place` — other tools aren't scanned.
assert.equal(checkToolPolicy("money", { skills: "가짜 리뷰 작성 대행업" }).ok, true);

// homepage: [입력 필요] placeholders are fine; a real-looking invented
// phone number or address is not.
assert.equal(checkOutputSafety("homepage", { html: "<p>전화: [입력 필요]</p>" }).ok, true);
// An invented number or address is replaced, not fatal...
const html = (r: ReturnType<typeof checkOutputSafety>) => (r.output as { html: string } | undefined)?.html;
assert.equal(html(checkOutputSafety("homepage", { html: "<p>전화: 02-1234-5678</p>" })), "<p>전화: [입력 필요]</p>");
assert.equal(html(checkOutputSafety("homepage", { html: "<p>서울 강남구 테헤란로 123</p>" })), "<p>[입력 필요]</p>");
// ...but the user's own number and address, typed into the form, stay.
const facts = { facts: "서울 강남구 테헤란로 123 / 010 1234 5678" };
const own = checkOutputSafety("homepage", { html: "<p>010-1234-5678 · 서울 강남구 테헤란로 123</p>" }, facts);
assert.equal(own.ok, true);
assert.equal(own.output, undefined);
assert.equal(html(checkOutputSafety("homepage", { html: "<p>010-9999-0000</p>" }, facts)), "<p>[입력 필요]</p>");

console.log("place + homepage policy guards: all checks passed");
