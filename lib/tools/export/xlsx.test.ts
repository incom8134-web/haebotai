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

// Plans with a price and volume: the computed model (lib/tools/financial-model.ts).
test("model sheets: assumptions land on the rows the formulas reference", async () => {
  const workbook = await loadWorkbook(await buildBusinessPlanXlsx(OUTPUT, INPUT));
  const a = workbook.getWorksheet("가정")!;
  assert.equal(a.getCell("B2").value, INPUT.unit_price, "객단가 must be on row 2, not row 1 (header)");
  assert.equal(a.getCell("B3").value, 25, "month 1 ramps from half of the month-12 target");
  assert.equal(a.getCell("B5").value, INPUT.variable_cost_rate / 100);
  assert.equal(a.getCell("B6").value, INPUT.fixed_cost);
  assert.equal(a.getCell("C2").value, "입력값");
});

test("model sheets: formulas have no leading '=' and chain month → year", async () => {
  const workbook = await loadWorkbook(await buildBusinessPlanXlsx(OUTPUT, INPUT));
  const months = workbook.getWorksheet("1년 차 월별")!;
  const pl = workbook.getWorksheet("3개년 손익")!;
  for (const [sheet, cells] of [[months, ["B2", "C2", "D2", "E2", "F2", "G2", "B13", "G13"]], [pl, ["B2", "C2", "D2", "B3", "C3", "B6", "D7"]]] as const) {
    for (const address of cells) {
      const value = sheet.getCell(address).value as { formula?: string } | null;
      assert.ok(value?.formula, `${address} must hold a formula`);
      assert.ok(!value.formula.startsWith("="), `${address} formula "${value.formula}" must not start with "="`);
    }
  }
  assert.equal((months.getCell("C2").value as { formula: string }).formula, "B2*가정!$B$2");
  assert.equal((months.getCell("F2").value as { formula: string }).formula, "C2-D2-E2");
  assert.equal((pl.getCell("B3").value as { formula: string }).formula, "SUM('1년 차 월별'!C2:C13)");
  assert.equal((pl.getCell("B6").value as { formula: string }).formula, "B3-B4-B5");
});

// Older runs without a price: the P&L rebuilt from the form's figures.
const NO_PRICE = { monthly_sales_target: 50, fixed_cost: 2000000, variable_cost_rate: 40 };

test("input sheets: assumptions land on the exact rows the P&L formulas reference", async () => {
  const workbook = await loadWorkbook(await buildBusinessPlanXlsx(OUTPUT, NO_PRICE));
  const assumptions = workbook.getWorksheet("가정")!;
  assert.equal(assumptions.getCell("B2").value, 0, "단가 must be on row 2, not row 1 (header)");
  assert.equal(assumptions.getCell("B3").value, NO_PRICE.monthly_sales_target);
  assert.equal(assumptions.getCell("B4").value, NO_PRICE.fixed_cost);
  assert.equal(assumptions.getCell("B5").value, NO_PRICE.variable_cost_rate / 100);
});

test("input sheets: P&L formulas have no leading '=' and reference the right cells", async () => {
  const workbook = await loadWorkbook(await buildBusinessPlanXlsx(OUTPUT, NO_PRICE));
  const pl = workbook.getWorksheet("3개년 손익")!;
  for (const address of ["B2", "C2", "D2", "B3", "B4", "B5", "B6", "B7"]) {
    const value = pl.getCell(address).value as { formula?: string } | null;
    assert.ok(value?.formula, `${address} must hold a formula`);
    assert.ok(!value.formula.startsWith("="), `${address} formula "${value.formula}" must not start with "="`);
  }
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
