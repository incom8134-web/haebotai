import { test } from "node:test";
import assert from "node:assert/strict";
import { applyToAnthropicParams, applyToGeminiParams, currentOutputLanguage, ENGLISH_RULE, localizeText, parseOutputLanguage, PLAIN_KOREAN_RULE, runWithOutputLanguage } from "./output-language.ts";

test("only 'en' selects English; anything else is Korean", () => {
  assert.equal(parseOutputLanguage("en"), "en");
  assert.equal(parseOutputLanguage("ko"), "ko");
  assert.equal(parseOutputLanguage(undefined), "ko");
  assert.equal(parseOutputLanguage("fr"), "ko");
});

test("Korean runs keep their prompts and add only the plain-Korean rule", () => {
  const params = { model: "m", contents: "한국어로 요약하세요", config: { systemInstruction: "반드시 한국어로 작성하세요.", temperature: 1 } };
  const out = applyToGeminiParams(params, "ko");
  assert.equal(out.contents, "한국어로 요약하세요");
  assert.equal(out.config.systemInstruction, `반드시 한국어로 작성하세요.\n\n${PLAIN_KOREAN_RULE}`);
  assert.equal(out.config.temperature, 1);
  assert.equal(params.config.systemInstruction, "반드시 한국어로 작성하세요."); // the caller's object is not changed
});

test("Korean calls without instructions (e.g. image-only) are left as they are", () => {
  const params = { model: "m", contents: "x" };
  assert.equal(applyToGeminiParams(params, "ko"), params);
  const anthropic = { system: "요약하세요.", messages: [{ role: "user", content: "정리" }] };
  assert.equal(applyToAnthropicParams(anthropic, "ko").system, `요약하세요.\n\n${PLAIN_KOREAN_RULE}`);
});

test("English runs swap the Korean directives and add the English rule", () => {
  assert.equal(localizeText("반드시 한국어로 작성하세요. 출처와 함께 한국어로 정리", "en"), "Write everything in English. 출처와 함께 영어로 정리");
  const out = applyToGeminiParams({ model: "m", contents: [{ role: "user", parts: [{ text: "한국어로 요약" }, { inlineData: { data: "x" } }] }], config: { systemInstruction: "반드시 한국어로 작성하세요.", temperature: 1 } }, "en");
  assert.match(String(out.config.systemInstruction), /Write everything in English\./);
  assert.ok(String(out.config.systemInstruction).endsWith(ENGLISH_RULE));
  assert.equal(out.config.temperature, 1);
  assert.equal(out.contents[0].parts[0].text, "영어로 요약");
  assert.deepEqual(out.contents[0].parts[1], { inlineData: { data: "x" } });
});

test("a call with no system instruction still gets the rule", () => {
  const out = applyToGeminiParams({ model: "m", contents: "x" } as { model: string; contents: string; config?: { systemInstruction?: string } }, "en");
  assert.equal(out.config?.systemInstruction, ENGLISH_RULE);
});

test("Anthropic params get the same treatment", () => {
  const out = applyToAnthropicParams({ system: "한국어로 요약하세요.", messages: [{ role: "user", content: "한국어로 정리" }] }, "en");
  assert.match(out.system, /영어로 요약하세요\.\n\n\[OUTPUT LANGUAGE: ENGLISH\]/);
  assert.equal(out.messages[0].content, "영어로 정리");
});

test("the run's language follows async work inside runWithOutputLanguage", async () => {
  assert.equal(currentOutputLanguage(), "ko");
  const seen = await runWithOutputLanguage("en", async () => {
    await new Promise((r) => setTimeout(r, 1));
    return currentOutputLanguage();
  });
  assert.equal(seen, "en");
  assert.equal(currentOutputLanguage(), "ko");
});
