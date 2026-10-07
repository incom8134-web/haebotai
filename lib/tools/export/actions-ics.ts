import { addDays, toIcsDate } from "./calendar.ts";

// 회의→실행 보드: actions that have a real YYYY-MM-DD due date as all-day
// calendar events. Actions without a date are left out (the board says
// how many), never placed on a guessed day.

interface DatedAction {
  task: string;
  owner: string;
  due: string;
  done_when?: string;
}

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\;").replace(/\n/g, "\\n");
/** A real calendar date: JS Date would roll 2026-02-30 over to March 2. */
export function isIsoDate(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.getFullYear() === Number(m[1]) && d.getMonth() === Number(m[2]) - 1 && d.getDate() === Number(m[3]);
}

export function buildActionsIcs(actions: DatedAction[], title: string): { ics: string; count: number } | null {
  const dated = actions.filter((a) => isIsoDate(a.due));
  if (!dated.length) return null;
  const stamp = `${toIcsDate(new Date())}T000000Z`;
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//meeting actions//회의 실행 보드//KO", "CALSCALE:GREGORIAN"];
  dated.forEach((a, i) => {
    const day = addDays(a.due, 0)!;
    const next = addDays(a.due, 1)!;
    lines.push(
      "BEGIN:VEVENT",
      `UID:haebot-action-${i}-${toIcsDate(day)}@haebot.app`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${toIcsDate(day)}`,
      `DTEND;VALUE=DATE:${toIcsDate(next)}`,
      `SUMMARY:${esc(`[${a.owner}] ${a.task}`)}`,
      `DESCRIPTION:${esc([title, a.done_when && `완료 기준: ${a.done_when}`].filter(Boolean).join("\n"))}`,
      "END:VEVENT",
    );
  });
  lines.push("END:VCALENDAR");
  return { ics: lines.join("\r\n"), count: dated.length };
}
