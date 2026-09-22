import assert from "node:assert";
import { test } from "node:test";
import {
  formatValue,
  parseDataUrl,
  collectInputImages,
  buildContext,
  buildSystemInstruction,
  buildImageSystemInstruction,
} from "./generate-prompt.ts";
import type { ToolManifest, BusinessProfile } from "./types.ts";

// This is what actually gets sent to the model — a silent bug here
// (wrong field dropped, guard text missing, image data leaking into the
// text prompt as raw base64) degrades every generation's quality or
// safety without ever throwing an error. Worth locking down directly
// rather than trusting manual spot-checks.

function fakeManifest(overrides: Partial<ToolManifest> = {}): ToolManifest {
  return {
    id: "test-tool",
    category: "ideas",
    name_ko: "테스트 도구",
    name_en: "Test Tool",
    summary: "테스트용 도구입니다.",
    icon: (() => null) as unknown as ToolManifest["icon"],
    inputs: [
      { kind: "text", id: "topic", label: "주제" },
      { kind: "number", id: "budget", label: "예산" },
    ],
    usesProfile: [],
    outputSchema: {} as ToolManifest["outputSchema"],
    outputRenderer: "document",
    grounding: { requireSources: false, webSearch: false, estimateBadge: false },
    model: "gemini-3.6-flash",
    estimatedCredits: 10,
    estimatedSeconds: 10,
    ...overrides,
  };
}

test("formatValue", () => {
  assert.equal(formatValue(["a", "b"]), "a, b");
  assert.equal(formatValue([]), "(없음)");
  assert.equal(formatValue(undefined), "(없음)");
  assert.equal(formatValue(null), "(없음)");
  assert.equal(formatValue(""), "(없음)");
  assert.equal(formatValue(42), "42");
  assert.equal(formatValue("hello"), "hello");
});

test("parseDataUrl extracts mime type and base64 payload", () => {
  const parsed = parseDataUrl("data:image/png;base64,aGVsbG8=");
  assert.deepEqual(parsed, { mimeType: "image/png", data: "aGVsbG8=" });
});

test("parseDataUrl returns null for a non-data-URL string", () => {
  assert.equal(parseDataUrl("https://example.com/photo.jpg"), null);
  assert.equal(parseDataUrl("not a url at all"), null);
});

test("collectInputImages only reads image-kind fields, ignoring non-array or non-string values", () => {
  const manifest = fakeManifest({
    inputs: [
      { kind: "image", id: "photo", label: "사진", maxFiles: 2 },
      { kind: "text", id: "name", label: "이름" },
    ],
  });
  const images = collectInputImages(manifest, {
    photo: ["data:image/png;base64,aGVsbG8=", "not-a-data-url", "data:image/jpeg;base64,d29ybGQ="],
    name: "data:image/png;base64,shouldnotbecollected=", // wrong field kind — must be ignored
  });
  assert.equal(images.length, 2, "the malformed entry must be skipped, the wrong-kind field ignored entirely");
  assert.equal(images[0].mimeType, "image/png");
  assert.equal(images[1].mimeType, "image/jpeg");
});

test("buildContext lists every input field by label, never dumps raw image data into the text prompt", () => {
  const manifest = fakeManifest({
    inputs: [
      { kind: "text", id: "topic", label: "주제" },
      { kind: "image", id: "photo", label: "제품 사진", maxFiles: 1 },
    ],
  });
  const context = buildContext(manifest, { topic: "카페", photo: ["data:image/png;base64,aGVsbG8="] }, null);
  assert.match(context, /- 주제: 카페/);
  assert.match(context, /- 제품 사진: \(첨부된 이미지 참고\)/);
  assert.doesNotMatch(context, /base64/, "raw base64 image data must never land in the text prompt");
});

test("buildContext shows '(없음)' for an image field with no uploads", () => {
  const manifest = fakeManifest({ inputs: [{ kind: "image", id: "photo", label: "사진", maxFiles: 1 }] });
  const context = buildContext(manifest, {}, null);
  assert.match(context, /- 사진: \(없음\)/);
});

test("buildContext only includes profile fields the manifest actually declares usesProfile for", () => {
  const manifest = fakeManifest({ usesProfile: ["industry"] });
  const profile: BusinessProfile = {
    brand_name: "카페 A",
    industry: "카페",
    business_stage: "under_1y",
    target_customer: "직장인",
    tone: [],
    voice_examples: [],
    brand_colors: [],
  };
  const context = buildContext(manifest, {}, profile);
  assert.match(context, /\[비즈니스 프로필\] 업종: 카페/);
  assert.doesNotMatch(context, /브랜드명/, "brand_name isn't in usesProfile, must not leak into the prompt");
});

test("buildContext omits the profile block entirely when profile is null", () => {
  const manifest = fakeManifest({ usesProfile: ["industry"] });
  const context = buildContext(manifest, {}, null);
  assert.doesNotMatch(context, /비즈니스 프로필/);
});

test("buildSystemInstruction always demands Korean and schema-only output", () => {
  const instruction = buildSystemInstruction(fakeManifest());
  assert.match(instruction, /반드시 한국어로/);
  assert.match(instruction, /오직 지정된 JSON 스키마/);
});

test("buildSystemInstruction includes the grounding instruction only when requireSources is true", () => {
  const withSources = buildSystemInstruction(
    fakeManifest({ grounding: { requireSources: true, webSearch: true, estimateBadge: true } }),
  );
  const withoutSources = buildSystemInstruction(fakeManifest());
  assert.match(withSources, /사실 주장/);
  assert.doesNotMatch(withoutSources, /사실 주장/);
});

test("buildSystemInstruction includes the tool's hard guard when one exists for its id", () => {
  const place = buildSystemInstruction(fakeManifest({ id: "place" }));
  assert.match(place, /가짜 리뷰/);
  const untouched = buildSystemInstruction(fakeManifest({ id: "money" }));
  assert.doesNotMatch(untouched, /가짜 리뷰/);
});

test("buildImageSystemInstruction demands exactly one real image, no grid/collage", () => {
  const instruction = buildImageSystemInstruction(fakeManifest({ id: "image" }));
  assert.match(instruction, /실제 이미지를 생성/);
  assert.match(instruction, /정확히 한 장/);
  assert.doesNotMatch(instruction, /JSON 스키마/, "the image instruction must not carry the JSON-only directive");
});

test("buildImageSystemInstruction still includes brand-model's real-person guard", () => {
  const instruction = buildImageSystemInstruction(fakeManifest({ id: "brand-model" }));
  assert.match(instruction, /식별 가능한 특정 인물/);
});
