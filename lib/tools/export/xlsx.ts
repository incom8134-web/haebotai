import ExcelJS from "exceljs";
import { computeFinancials, type FinancialAssumptions, type FinancialModel } from "../financial-model.ts";

// "재무 시트 with live formulas," not static numbers pasted in. Plans
// with financial assumptions get the same model the document's charts
// were computed with (lib/tools/financial-model.ts): 가정 → 1년 차 월별 →
// 3개년 손익, every number a formula off the 가정 sheet, so changing a
// cell recalculates the plan. Older plans without assumptions get the P&L
// rebuilt from the form's own figures (단가, 월 판매량, 고정비, 변동비율)
// plus one editable growth rate.

interface BusinessPlanInput {
  unit_price?: number;
  monthly_sales_target?: number;
  fixed_cost?: number;
  variable_cost_rate?: number;
}

interface BusinessPlanOutput {
  financial_assumptions?: Partial<FinancialAssumptions>;
  financials?: {
    breakeven_month?: number;
    yearly?: { year: string; revenue_krw: number; cost_krw: number; customers?: number }[];
    monthly_revenue_krw?: number[];
  };
}

export async function buildBusinessPlanXlsx(
  output: BusinessPlanOutput,
  input: BusinessPlanInput,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  // Plans with assumptions: the same model the document's charts were
  // computed with (lib/tools/financial-model.ts), as live formulas.
  const model = computeFinancials(output.financial_assumptions, input);
  if (model) {
    buildModelSheets(workbook, model);
  } else {
    buildInputSheets(workbook, output, input);
  }
  // The plan's own projection (the numbers its charts show), with the
  // profit and margin rows as formulas so edits recalculate.
  const yearly = model ? [] : (output.financials?.yearly ?? []);
  if (yearly.length) {
    const ai = workbook.addWorksheet("사업계획서 추정");
    const cols = ["B", "C", "D", "E", "F"].slice(0, yearly.length);
    ai.columns = [{ header: "구분", key: "label", width: 22 }, ...yearly.map((y, i) => ({ header: y.year || `${i + 1}년 차`, key: `y${i}`, width: 16 }))];
    ai.getRow(1).font = { bold: true };
    ai.addRow({ label: "매출 (원)", ...Object.fromEntries(yearly.map((y, i) => [`y${i}`, y.revenue_krw])) });
    ai.addRow({ label: "비용 (원)", ...Object.fromEntries(yearly.map((y, i) => [`y${i}`, y.cost_krw])) });
    ai.addRow({ label: "영업이익 (원)" });
    ai.addRow({ label: "영업이익률" });
    ai.addRow({ label: "고객 수", ...Object.fromEntries(yearly.map((y, i) => [`y${i}`, y.customers ?? 0])) });
    for (const col of cols) {
      ai.getCell(`${col}4`).value = { formula: `${col}2-${col}3` };
      ai.getCell(`${col}5`).value = { formula: `IF(${col}2=0,0,${col}4/${col}2)` };
      for (const row of [2, 3, 4, 6]) ai.getCell(`${col}${row}`).numFmt = "#,##0";
      ai.getCell(`${col}5`).numFmt = "0.0%";
    }
    const monthly = output.financials?.monthly_revenue_krw ?? [];
    if (monthly.length) {
      ai.addRow({});
      ai.addRow({ label: "첫해 월별 매출 (원)" }).font = { bold: true };
      monthly.forEach((v, i) => {
        const r = ai.addRow({ label: `${i + 1}월`, y0: v });
        r.getCell("y0").numFmt = "#,##0";
      });
    }
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

/** 가정 → 월별(1년 차) → 3개년 손익, every number a formula off the 가정 sheet. */
function buildModelSheets(workbook: ExcelJS.Workbook, model: FinancialModel) {
  const a = model.assumptions;
  const sheet = workbook.addWorksheet("가정");
  sheet.columns = [
    { header: "항목", key: "label", width: 30 },
    { header: "값", key: "value", width: 18 },
    { header: "출처", key: "source", width: 10 },
  ];
  sheet.getRow(1).font = { bold: true };
  const src = (k: keyof typeof a.source) => (a.source[k] === "member" ? "입력값" : "가정");
  sheet.addRow({ label: "객단가 (원)", value: a.unit_price_krw, source: src("unit_price_krw") }); // B2
  sheet.addRow({ label: "첫 달 판매량 (개)", value: a.monthly_volume_start, source: src("monthly_volume_start") }); // B3
  sheet.addRow({ label: "1년 차 월 성장률", value: a.monthly_growth_pct / 100, source: src("monthly_growth_pct") }); // B4
  sheet.addRow({ label: "변동비율", value: a.variable_cost_pct / 100, source: src("variable_cost_pct") }); // B5
  sheet.addRow({ label: "월 고정비 (원)", value: a.fixed_cost_monthly_krw, source: src("fixed_cost_monthly_krw") }); // B6
  sheet.addRow({ label: "2·3년 차 연 성장률", value: a.yearly_growth_pct / 100, source: src("yearly_growth_pct") }); // B7
  sheet.addRow({ label: "초기 투자 (원)", value: a.initial_investment_krw, source: src("initial_investment_krw") }); // B8
  for (const r of [2, 3, 6, 8]) sheet.getCell(`B${r}`).numFmt = "#,##0";
  for (const r of [4, 5, 7]) sheet.getCell(`B${r}`).numFmt = "0.0%";
  if (a.notes.length) {
    sheet.addRow({});
    sheet.addRow({ label: "가정의 근거" }).font = { bold: true };
    for (const n of a.notes) sheet.addRow({ label: n });
  }
  const A = { price: "가정!$B$2", start: "가정!$B$3", growth: "가정!$B$4", varRate: "가정!$B$5", fixed: "가정!$B$6", yearly: "가정!$B$7", invest: "가정!$B$8" };

  // ExcelJS formula strings must NOT include the leading "=".
  const months = workbook.addWorksheet("1년 차 월별");
  months.columns = [
    { header: "월", key: "m", width: 8 },
    { header: "판매량", key: "v", width: 14 },
    { header: "매출", key: "r", width: 16 },
    { header: "변동비", key: "c", width: 16 },
    { header: "고정비", key: "f", width: 16 },
    { header: "영업이익", key: "p", width: 16 },
    { header: "누적(초기 투자 포함)", key: "cum", width: 20 },
  ];
  months.getRow(1).font = { bold: true };
  for (let m = 1; m <= 12; m++) {
    const row = m + 1;
    months.addRow({ m: `${m}월` });
    months.getCell(`B${row}`).value = { formula: `${A.start}*(1+${A.growth})^${m - 1}` };
    months.getCell(`C${row}`).value = { formula: `B${row}*${A.price}` };
    months.getCell(`D${row}`).value = { formula: `C${row}*${A.varRate}` };
    months.getCell(`E${row}`).value = { formula: A.fixed };
    months.getCell(`F${row}`).value = { formula: `C${row}-D${row}-E${row}` };
    months.getCell(`G${row}`).value = { formula: m === 1 ? `F${row}-${A.invest}` : `G${row - 1}+F${row}` };
    for (const col of ["B", "C", "D", "E", "F", "G"]) months.getCell(`${col}${row}`).numFmt = "#,##0";
  }

  const pl = workbook.addWorksheet("3개년 손익");
  pl.columns = [
    { header: "구분", key: "label", width: 22 },
    { header: "1년 차", key: "y1", width: 18 },
    { header: "2년 차", key: "y2", width: 18 },
    { header: "3년 차", key: "y3", width: 18 },
  ];
  pl.getRow(1).font = { bold: true };
  for (const label of ["월 판매량(연평균)", "매출 (원)", "변동비 (원)", "고정비 (원)", "영업이익 (원)", "영업이익률"]) pl.addRow({ label });
  const w = "'1년 차 월별'";
  pl.getCell("B2").value = { formula: `AVERAGE(${w}!B2:B13)` };
  pl.getCell("C2").value = { formula: `${w}!B13*(1+${A.yearly})` };
  pl.getCell("D2").value = { formula: `C2*(1+${A.yearly})` };
  pl.getCell("B3").value = { formula: `SUM(${w}!C2:C13)` };
  pl.getCell("C3").value = { formula: `C2*12*${A.price}` };
  pl.getCell("D3").value = { formula: `D2*12*${A.price}` };
  for (const col of ["B", "C", "D"]) {
    pl.getCell(`${col}4`).value = { formula: `${col}3*${A.varRate}` };
    pl.getCell(`${col}5`).value = { formula: `${A.fixed}*12` };
    pl.getCell(`${col}6`).value = { formula: `${col}3-${col}4-${col}5` };
    pl.getCell(`${col}7`).value = { formula: `IF(${col}3=0,0,${col}6/${col}3)` };
    for (const r of [2, 3, 4, 5, 6]) pl.getCell(`${col}${r}`).numFmt = "#,##0";
    pl.getCell(`${col}7`).numFmt = "0.0%";
  }
  pl.addRow({});
  pl.addRow({ label: "손익분기(월 이익 ≥ 0)", y1: model.breakeven_month ? `${model.breakeven_month}개월 차` : "3년 안에 도달하지 않음" });
  if (a.initial_investment_krw) pl.addRow({ label: "투자 회수", y1: model.payback_month ? `${model.payback_month}개월 차` : "3년 안에 회수되지 않음" });
}

/** Plans without assumptions (older runs): the P&L rebuilt from the form's own figures. */
function buildInputSheets(workbook: ExcelJS.Workbook, output: BusinessPlanOutput, input: BusinessPlanInput) {
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
  const breakevenRow = pl.addRow({ label: "모델 추정 손익분기(개월차)", y1: output.financials?.breakeven_month ?? 0 });

  breakevenRow.getCell("label").font = { italic: true };

}
