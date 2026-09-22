import assert from "node:assert";
import { test } from "node:test";
import ExcelJS from "exceljs";
import { buildBusinessPlanXlsx } from "./xlsx.ts";

// Regression test for the two real bugs caught during manual
// verification of this file: (1) an off-by-one row reference — the
// assumptions sheet's auto-generated header row shifts all data down
// one row, and (2) formula strings written with a leading "=", which
// ExcelJS writes literally into <f> and makes Excel flag the file as
// needing repair. Round-trips through ExcelJS's own reader rather than
// just checking the buffer isn't empty, so a regression on either bug
// fails this test.

const OUTPUT = { financials: { breakeven_month: 8 } };
const INPUT = { unit_price: 18000, monthly_sales_target: 50, fixed_cost: 2000000, variable_cost_rate: 40 };

// exceljs/index.d.ts declares its own `interface Buffer extends
// ArrayBuffer {}` — a legacy shim that predates @types/node's generic
// Buffer<TArrayBuffer> class and permanently conflicts with it. Real
// upstream type-declaration bug, not a type-safety issue in this code —
// the cast is deliberate and narrow, isolated to this one boundary call.
async function loadWorkbook(buffer: Buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  return workbook;
}

test("assumptions land on the exact rows the P&L formulas reference", async () => {
  const workbook = await loadWorkbook(await buildBusinessPlanXlsx(OUTPUT, INPUT));
  const assumptions = workbook.getWorksheet("가정")!;
  assert.equal(assumptions.getCell("B2").value, INPUT.unit_price, "단가 must be on row 2, not row 1 (header)");
  assert.equal(assumptions.getCell("B3").value, INPUT.monthly_sales_target);
  assert.equal(assumptions.getCell("B4").value, INPUT.fixed_cost);
  assert.equal(assumptions.getCell("B5").value, INPUT.variable_cost_rate / 100);
});

test("P&L formulas have no leading '=' (ExcelJS writes the string literally into <f>)", async () => {
  const workbook = await loadWorkbook(await buildBusinessPlanXlsx(OUTPUT, INPUT));
  const pl = workbook.getWorksheet("3개년 손익")!;
  const formulaCells = ["B2", "C2", "D2", "B3", "B4", "B5", "B6", "B7"];
  for (const address of formulaCells) {
    const value = pl.getCell(address).value as { formula?: string } | null;
    assert.ok(value?.formula, `${address} must hold a formula`);
    assert.ok(!value.formula.startsWith("="), `${address} formula "${value.formula}" must not start with "="`);
  }
});

test("P&L formulas reference the correct assumption cells and chain correctly", async () => {
  const workbook = await loadWorkbook(await buildBusinessPlanXlsx(OUTPUT, INPUT));
  const pl = workbook.getWorksheet("3개년 손익")!;
  assert.equal((pl.getCell("B2").value as { formula: string }).formula, "가정!$B$3");
  assert.equal((pl.getCell("B4").value as { formula: string }).formula, "B3*가정!$B$2");
  assert.equal((pl.getCell("B7").value as { formula: string }).formula, "B4-B5-B6");
});

test("handles missing input fields without throwing", async () => {
  const buffer = await buildBusinessPlanXlsx(OUTPUT, {});
  assert.ok(Buffer.isBuffer(buffer));
  const workbook = await loadWorkbook(buffer);
  assert.equal(workbook.getWorksheet("가정")!.getCell("B2").value, 0);
});
