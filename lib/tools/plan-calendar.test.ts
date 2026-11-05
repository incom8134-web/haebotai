import assert from "node:assert";
import { test } from "node:test";
import { addDays, datePlan, isIsoDate, monthGrid, planIcs, weekday } from "./plan-calendar.ts";

test("dates and weekdays", () => {
  assert.equal(weekday("2026-11-05"), 4); // Thursday
  assert.equal(weekday("2026-11-08"), 7); // Sunday
  assert.equal(addDays("2026-12-30", 3), "2027-01-02");
  assert.ok(isIsoDate("2026-02-28"));
  assert.ok(!isIsoDate("2026-02-30"));
  assert.ok(!isIsoDate("26-2-1"));
});

test("tasks land on their weekday of their week; none before the start", () => {
  const start = "2026-11-05"; // a Thursday
  const t = (week: number, day: number) => ({ week, day, title: "x", key: `${week}-${day}` });
  const [a, b, c, d] = datePlan([t(1, 4), t(1, 1), t(2, 1), t(13, 7)], start);
  assert.equal(a.date, "2026-11-05"); // Thu of week 1
  assert.equal(b.date, "2026-11-05"); // Mon of week 1 is before the start → the start
  assert.equal(c.date, "2026-11-09"); // Mon of week 2
  assert.equal(d.date, "2027-01-31"); // Sun of week 13 (Mon Nov 2 + 12 weeks + 6 days)
});

test("a month grid is whole Mon–Sun weeks covering the month", () => {
  const g = monthGrid(2026, 11);
  assert.equal(g[0][0], "2026-10-26");
  assert.ok(g.every((r) => r.length === 7));
  assert.ok(g.flat().includes("2026-11-30"));
  assert.equal(g.at(-1)!.at(-1), "2026-12-06");
});

test("the .ics file has one all-day event per task, escaped and folded", () => {
  const ics = planIcs([{ week: 1, day: 4, title: "첫 모집 공지, 인스타", date: "2026-11-05", key: "a", category: "콘텐츠·홍보", minutes: 30, done: "게시 완료" }], { name: "주말 클래스 13주", uid: "run1", stamp: new Date("2026-11-05T00:00:00Z") });
  assert.match(ics, /^BEGIN:VCALENDAR\r\n/);
  assert.match(ics, /DTSTART;VALUE=DATE:20261105\r\nDTEND;VALUE=DATE:20261106/);
  assert.match(ics, /SUMMARY:첫 모집 공지\\, 인스타/);
  assert.match(ics, /UID:run1-0@aihaeba.com/);
  assert.ok(ics.split("\r\n").every((l) => new TextEncoder().encode(l).length <= 75));
  assert.match(ics, /END:VCALENDAR\r\n$/);
});
