import assert from "node:assert";
import { test } from "node:test";
import { addDays, toIcsDate, buildCalendarIcs, buildCalendarCsv, type CalendarWeek } from "./calendar.ts";

// Adversarial check for the exact bug class caught during manual
// verification: `day` is day-of-week (1-7) within its week_no, and the
// week/day -> absolute-date math must land a 13-week x 7-day plan
// exactly on day 90 — matching the tool's own name (90일 실행 캘린더).

const START = "2026-01-05"; // a Monday

test("week/day offset math lands 13 weeks x 7 days on day 90", () => {
  const week1day1 = addDays(START, (1 - 1) * 7 + (1 - 1));
  assert.equal(toIcsDate(week1day1!), "20260105", "week 1 day 1 must be the start date itself");

  const week2day1 = addDays(START, (2 - 1) * 7 + (1 - 1));
  assert.equal(toIcsDate(week2day1!), "20260112", "week 2 day 1 must be exactly 7 days after week 1 day 1");

  const week13day7 = addDays(START, (13 - 1) * 7 + (7 - 1));
  const totalOffsetDays = (13 - 1) * 7 + (7 - 1);
  assert.equal(totalOffsetDays, 90, "a 13-week plan must span exactly 90 days");
  assert.equal(toIcsDate(week13day7!), "20260405");
});

test("addDays rejects an invalid start date instead of silently returning garbage", () => {
  assert.equal(addDays("not-a-date", 5), null);
});

const SAMPLE_WEEKS: CalendarWeek[] = [
  {
    week_no: 1,
    milestone: "포지셔닝 정리",
    tasks: [
      { day: 1, title: "시장 조사", est_minutes: 60, done_criteria: "경쟁사 3곳 정리" },
      { day: 3, title: "고객, 인터뷰", est_minutes: 90, done_criteria: '5명과 통화, "완료"' },
    ],
  },
];

test("buildCalendarIcs produces one VEVENT per task with the correct DTSTART", () => {
  const ics = buildCalendarIcs(SAMPLE_WEEKS, START);
  assert.ok(ics, "must not be null for a valid start date");
  assert.equal((ics!.match(/BEGIN:VEVENT/g) ?? []).length, 2);
  assert.match(ics!, /DTSTART;VALUE=DATE:20260105/);
  assert.match(ics!, /DTSTART;VALUE=DATE:20260107/);
  // commas and quotes in free text must be escaped so the .ics doesn't
  // corrupt at the first comma
  assert.match(ics!, /시장 조사/);
  assert.doesNotMatch(ics!, /5명과 통화, "완료"/, "unescaped comma/quote would break RFC 5545 parsing");
});

test("buildCalendarIcs returns null for an invalid start date rather than emitting a broken file", () => {
  assert.equal(buildCalendarIcs(SAMPLE_WEEKS, "not-a-date"), null);
});

test("buildCalendarCsv quotes cells containing commas or quotes", () => {
  const csv = buildCalendarCsv(SAMPLE_WEEKS);
  const lines = csv.split("\r\n");
  assert.equal(lines.length, 1 + SAMPLE_WEEKS[0].tasks.length, "header + one row per task");
  assert.match(csv, /"5명과 통화, ""완료"""/, 'a comma+quote value must be wrapped and its quotes doubled');
});
