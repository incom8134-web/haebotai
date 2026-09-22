// HAEBOT_A_TOOLS_SPEC.md §4.3 — .ics / .csv export. `day` is read as
// day-of-week (1-7) within its `week_no`; the manifest doesn't spell
// this out further, so this is the one reasonable reading given the
// week_no/day split — verified in calendar.test.ts that 13 weeks x 7
// days lands exactly on day 90, matching the tool's own "90일" name.
// No ICS line-folding (RFC 5545 §3.1) — our lines are short enough in
// practice; upgrade path if a title runs long is to fold at 75 octets.

export interface CalendarTask {
  day: number;
  title: string;
  est_minutes: number;
  done_criteria: string;
  depends_on?: string;
}

export interface CalendarWeek {
  week_no: number;
  milestone: string;
  tasks: CalendarTask[];
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function addDays(startIso: string, days: number): Date | null {
  const d = new Date(`${startIso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + days);
  return d;
}

export function toIcsDate(d: Date): string {
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`;
}

function escapeIcsText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
}

export function buildCalendarIcs(weeks: CalendarWeek[], startDate: string): string | null {
  if (Number.isNaN(new Date(`${startDate}T00:00:00`).getTime())) return null;

  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//해봇 AI//90일 실행 캘린더//KO", "CALSCALE:GREGORIAN"];
  const stamp = `${toIcsDate(new Date())}T000000Z`;
  let uid = 0;
  for (const week of weeks) {
    for (const task of week.tasks) {
      const date = addDays(startDate, (week.week_no - 1) * 7 + (task.day - 1));
      if (!date) continue;
      lines.push(
        "BEGIN:VEVENT",
        `UID:haebot-calendar-${uid++}@haebot.app`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${toIcsDate(date)}`,
        `SUMMARY:${escapeIcsText(`[W${week.week_no}] ${task.title}`)}`,
        `DESCRIPTION:${escapeIcsText(`${week.milestone}\n완료 기준: ${task.done_criteria}\n예상 소요: ${task.est_minutes}분`)}`,
        "END:VEVENT",
      );
    }
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function buildCalendarCsv(weeks: CalendarWeek[]): string {
  const rows = [["week_no", "milestone", "day", "title", "est_minutes", "done_criteria", "depends_on"]];
  for (const week of weeks) {
    for (const task of week.tasks) {
      rows.push([
        String(week.week_no),
        week.milestone,
        String(task.day),
        task.title,
        String(task.est_minutes),
        task.done_criteria,
        task.depends_on ?? "",
      ]);
    }
  }
  return rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
}
