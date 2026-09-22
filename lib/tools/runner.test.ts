import assert from "node:assert";
import { test } from "node:test";
import { buildInputSchema } from "./runner.ts";
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
