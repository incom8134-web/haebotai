import { test } from "node:test";
import assert from "node:assert/strict";
import { buildActionsIcs, isIsoDate } from "./actions-ics.ts";

test("only actions with a real date become events", () => {
  const out = buildActionsIcs(
    [
      { task: "수수료 조사", owner: "소라", due: "2026-10-13", done_when: "표 공유" },
      { task: "사진작가 섭외", owner: "준호", due: "" },
      { task: "잘못된 날짜", owner: "민지", due: "다음 주" },
    ],
    "주간 회의",
  )!;
  assert.equal(out.count, 1);
  assert.match(out.ics, /DTSTART;VALUE=DATE:20261013/);
  assert.match(out.ics, /DTEND;VALUE=DATE:20261014/);
  assert.match(out.ics, /SUMMARY:\[소라\] 수수료 조사/);
  assert.equal(buildActionsIcs([{ task: "a", owner: "b", due: "" }], "t"), null);
  assert.equal(isIsoDate("2026-02-30"), false);
  assert.equal(isIsoDate("2028-02-29"), true);
});
