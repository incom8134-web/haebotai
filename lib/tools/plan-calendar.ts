// Dates for the 13-week plan (할 일 계획 세우기): week 1 is the week the plan
// starts, `day` is the weekday (1 = Mon … 7 = Sun). A task that would fall
// before the start date moves to the start date. Pure, so it can be tested;
// all dates are plain YYYY-MM-DD strings (no time zones involved).

export interface PlanTask { week: number; day: number; title: string; category?: string; minutes?: number; done?: string; key: string }
export interface DatedTask extends PlanTask { date: string }

const toUtc = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return Date.UTC(y, (m || 1) - 1, d || 1); };
const fmt = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const DAY = 86_400_000;

/** True for a real calendar date in YYYY-MM-DD form. */
export function isIsoDate(s: unknown): s is string {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  return fmt(toUtc(s)) === s;
}

export function addDays(iso: string, n: number): string { return fmt(toUtc(iso) + n * DAY); }

/** Monday = 1 … Sunday = 7. */
export function weekday(iso: string): number { const d = new Date(toUtc(iso)).getUTCDay(); return d === 0 ? 7 : d; }

export function datePlan(tasks: PlanTask[], start: string): DatedTask[] {
  const monday = addDays(start, 1 - weekday(start));
  return tasks.map((t) => {
    const day = Math.min(7, Math.max(1, Math.round(t.day) || 1));
    let date = addDays(monday, (Math.max(1, Math.round(t.week) || 1) - 1) * 7 + (day - 1));
    if (date < start) date = start;
    return { ...t, date };
  });
}

/** The weeks (Mon–Sun rows) that cover a month, for a calendar grid. */
export function monthGrid(year: number, month: number): string[][] {
  const first = fmt(Date.UTC(year, month - 1, 1));
  const last = fmt(Date.UTC(year, month, 0));
  let cur = addDays(first, 1 - weekday(first));
  const rows: string[][] = [];
  while (cur <= last) { rows.push(Array.from({ length: 7 }, (_, i) => addDays(cur, i))); cur = addDays(cur, 7); }
  return rows;
}

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
/** Lines longer than 75 octets are folded (RFC 5545 §3.1). */
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out: string[] = []; let cur = ""; let n = 0;
  for (const ch of line) { const b = new TextEncoder().encode(ch).length; if (n + b > (out.length ? 74 : 75)) { out.push(cur); cur = ""; n = 0; } cur += ch; n += b; }
  out.push(cur);
  return out.join("\r\n ");
}

/** An iCalendar file with one all-day event per task (importable into Google, Apple and Outlook calendars). */
export function planIcs(tasks: DatedTask[], opts: { name: string; uid: string; stamp?: Date }): string {
  const stamp = (opts.stamp ?? new Date()).toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//AI Haeba//Plan//KO", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", `X-WR-CALNAME:${esc(opts.name)}`];
  tasks.forEach((t, i) => {
    const d = t.date.replace(/-/g, "");
    const desc = [t.category, t.minutes ? `${t.minutes}분` : "", t.done ? `완료 기준: ${t.done}` : ""].filter(Boolean).join(" · ");
    lines.push("BEGIN:VEVENT", `UID:${opts.uid}-${i}@aihaeba.com`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${addDays(t.date, 1).replace(/-/g, "")}`, `SUMMARY:${esc(t.title)}`);
    if (desc) lines.push(`DESCRIPTION:${esc(desc)}`);
    lines.push("END:VEVENT");
  });
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
