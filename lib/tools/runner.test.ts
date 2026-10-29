import assert from "node:assert";
import { test } from "node:test";
import { buildInputSchema, inputErrorMessage } from "./runner.ts";
import type { ToolField } from "./types.ts";

// Regression test: "image" fields used to fall through to the bare
// z.string() branch, which would reject the real base64-data-URL arrays
// tool-runner.tsx sends for an uploaded photo (brand-model/sangsepage/
// proposal all have image inputs). Fixed to z.array(z.string()) — this
// locks it down so it can't quietly regress.

test("text/textarea/select/url fields are strings, required by default off unless set", () => {
  const fields: ToolField[] = [
    { kind: "text", id: "a", label: "A" },
    { kind: "text", id: "b", label: "B", required: true },
  ];
  const schema = buildInputSchema(fields);
  assert.deepEqual(schema.safeParse({ b: "x" }).success, true, "optional field 'a' can be omitted");
  assert.deepEqual(schema.safeParse({}).success, false, "required field 'b' must fail when missing");
  assert.deepEqual(schema.safeParse({ a: "x", b: "y" }).success, true);
});

test("number fields coerce and enforce min/max", () => {
  const fields: ToolField[] = [{ kind: "number", id: "n", label: "N", min: 1, max: 5 }];
  const schema = buildInputSchema(fields);
  assert.equal(schema.safeParse({ n: "3" }).success, true, "numeric strings from form inputs must coerce");
  assert.equal(schema.safeParse({ n: 0 }).success, false, "below min must fail");
  assert.equal(schema.safeParse({ n: 6 }).success, false, "above max must fail");
});

test("multiselect and chips fields are string arrays", () => {
  const fields: ToolField[] = [
    { kind: "multiselect", id: "m", label: "M", options: [] },
    { kind: "chips", id: "c", label: "C" },
  ];
  const schema = buildInputSchema(fields);
  assert.equal(schema.safeParse({ m: ["a", "b"], c: ["x"] }).success, true);
  assert.equal(schema.safeParse({ m: "not-an-array", c: [] }).success, false);
});

test("image fields accept an array of base64 data URLs, not a bare string", () => {
  const fields: ToolField[] = [{ kind: "image", id: "photo", label: "Photo", maxFiles: 1 }];
  const schema = buildInputSchema(fields);
  const dataUrl = "data:image/png;base64,aGVsbG8=";
  assert.equal(
    schema.safeParse({ photo: [dataUrl] }).success,
    true,
    "an array of data URLs (what tool-runner.tsx actually sends) must validate",
  );
  assert.equal(
    schema.safeParse({ photo: dataUrl }).success,
    false,
    "a bare string must be rejected — this was the actual bug: image fell through to z.string()",
  );
  assert.equal(schema.safeParse({}).success, true, "image fields have no `required` flag in the type — always optional");
});

test("a required text field must not be blank, and errors name the field", () => {
  const fields = [
    { kind: "textarea", id: "product", label: "제품·서비스", required: true },
    { kind: "number", id: "price", label: "가격", min: 0 },
  ] as never;
  const blank = buildInputSchema(fields).safeParse({ product: "   " });
  assert.equal(blank.success, false);
  assert.equal(inputErrorMessage(fields, blank.error!.issues), "'제품·서비스' 칸을 채워 주세요");
  const missing = buildInputSchema(fields).safeParse({ price: -1 });
  assert.equal(inputErrorMessage(fields, missing.error!.issues), "'제품·서비스' 칸을 채워 주세요 · '가격' 값이 너무 작아요");
  assert.equal(buildInputSchema(fields).safeParse({ product: "그래놀라" }).success, true);
});

test("a required upload needs at least one file", () => {
  const fields = [{ kind: "image" as const, id: "product_photo", label: "제품 사진", required: true }];
  const schema = buildInputSchema(fields);
  const r = schema.safeParse({ product_photo: [] });
  assert.equal(r.success, false);
  if (!r.success) assert.equal(inputErrorMessage(fields, r.error.issues), "'제품 사진' 칸을 채워 주세요");
  assert.equal(schema.safeParse({ product_photo: ["data:image/png;base64,AA"] }).success, true);
  assert.equal(buildInputSchema([{ kind: "image", id: "x", label: "x" }]).safeParse({}).success, true);
});

test("list fields always get a list, text fields a string", async () => {
  const { coerceFormValues } = await import("./runner.ts");
  const fields: ToolField[] = [
    { kind: "chips", id: "ideas", label: "a" },
    { kind: "multiselect", id: "channels", label: "b", options: [] },
    { kind: "text", id: "topic", label: "c" },
    { kind: "image", id: "photo", label: "d" },
  ];
  assert.deepEqual(coerceFormValues(fields, { ideas: "밤 디저트 / 세트, 선물\n상자", channels: 3, topic: ["a", "b"], photo: "x" }), { ideas: ["밤 디저트 / 세트", "선물", "상자"], channels: [], topic: "a, b", photo: [] });
  assert.deepEqual(coerceFormValues(fields, { ideas: ["a", "", 1] }), { ideas: ["a"] });
});
