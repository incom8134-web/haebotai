import ExcelJS from "exceljs";

// HAEBOT_A_TOOLS_SPEC.md §5.2 — "재무 시트 with live formulas," not the
// model's static numbers pasted in. The model's own pl_3yr estimate
// isn't reproducible as a spreadsheet formula (we don't know its
// reasoning step by step), so this sheet instead rebuilds a real,
// re-calculating 3-year P&L from the run's actual inputs (단가, 월
// 판매량 목표, 고정비, 변동비율) plus one explicit, editable growth
// assumption. Change any cell in the 가정 sheet and the P&L recalculates.
// ponytail: linear YoY growth off one rate cell — upgrade path is a
// separate growth-rate-per-year row if a flat rate stops being enough.

interface BusinessPlanInput {
  unit_price?: number;
  monthly_sales_target?: number;
  fixed_cost?: number;
  variable_cost_rate?: number;
}

interface BusinessPlanOutput {
  financials: { breakeven_month: number };
}

export async function buildBusinessPlanXlsx(
  output: BusinessPlanOutput,
  input: BusinessPlanInput,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "해봇 AI";

  const assumptions = workbook.addWorksheet("가정");
  assumptions.columns = [
    { header: "항목", key: "label", width: 28 },
    { header: "값", key: "value", width: 16 },
  ];
  assumptions.addRow({ label: "단가 (원)", value: input.unit_price ?? 0 });
  assumptions.addRow({ label: "월 판매량 목표 (개)", value: input.monthly_sales_target ?? 0 });
  assumptions.addRow({ label: "고정비 (원/월)", value: input.fixed_cost ?? 0 });
  assumptions.addRow({ label: "변동비율 (%)", value: (input.variable_cost_rate ?? 0) / 100 });
  assumptions.addRow({ label: "연간 판매량 성장률 (%)", value: 0.2 });
  assumptions.getColumn("value").numFmt = "#,##0.00";
  assumptions.getRow(1).font = { bold: true };

  // Row 1 is the header (auto-added by the `columns` definition above),
  // so the data rows added below start at row 2: 단가=B2, 월판매량=B3,
  // 고정비=B4, 변동비율=B5, 성장률=B6.
  const A = { price: "가정!$B$2", monthly: "가정!$B$3", fixed: "가정!$B$4", varRate: "가정!$B$5", growth: "가정!$B$6" };

  const pl = workbook.addWorksheet("3개년 손익");
  pl.columns = [
    { header: "구분", key: "label", width: 22 },
    { header: "연도 1", key: "y1", width: 16 },
    { header: "연도 2", key: "y2", width: 16 },
    { header: "연도 3", key: "y3", width: 16 },
  ];
  pl.getRow(1).font = { bold: true };

  const rows = [
    { label: "월 판매량 (개)" },
    { label: "연 판매량 (개)" },
    { label: "매출 (원)" },
    { label: "변동비 (원)" },
    { label: "고정비 (원)" },
    { label: "영업이익 (원)" },
  ] as const;
  for (const r of rows) pl.addRow({ label: r.label });

  // Row numbers: header=1, so 월판매량=2, 연판매량=3, 매출=4, 변동비=5, 고정비=6, 영업이익=7
  // ExcelJS formula strings must NOT include the leading "=" — it writes
  // the text as-is into <f>, and a stored "=..." makes Excel flag the
  // file as needing repair on open.
  pl.getCell("B2").value = { formula: A.monthly };
  pl.getCell("C2").value = { formula: `B2*(1+${A.growth})` };
  pl.getCell("D2").value = { formula: `C2*(1+${A.growth})` };

  for (const col of ["B", "C", "D"]) {
    pl.getCell(`${col}3`).value = { formula: `${col}2*12` };
    pl.getCell(`${col}4`).value = { formula: `${col}3*${A.price}` };
    pl.getCell(`${col}5`).value = { formula: `${col}4*${A.varRate}` };
    pl.getCell(`${col}6`).value = { formula: `${A.fixed}*12` };
    pl.getCell(`${col}7`).value = { formula: `${col}4-${col}5-${col}6` };
  }
  for (const row of [2, 3, 4, 5, 6, 7]) {
    for (const col of ["B", "C", "D"]) pl.getCell(`${col}${row}`).numFmt = "#,##0";
  }

  pl.addRow({});
  const breakevenRow = pl.addRow({ label: "모델 추정 손익분기(개월차)", y1: output.financials.breakeven_month });

  breakevenRow.getCell("label").font = { italic: true };

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
