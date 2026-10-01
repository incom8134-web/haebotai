// Date + time for a saved result, in Korea time. Built from numeric parts
// rather than the locale's own pattern: Node's ICU and the browser's
// disagree on Korean day periods ("AM" vs "오전"), which broke hydration.

export function formatDateTime(iso: string, locale: string): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(new Date(iso))
      .map((p) => [p.type, p.value]),
  );
  const time = `${parts.hour}:${parts.minute}`;
  if (locale === "en") {
    const month = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", month: "short" }).format(new Date(iso));
    return `${month} ${parts.day}, ${parts.year}, ${time}`;
  }
  return `${parts.year}. ${parts.month}. ${parts.day}. ${time}`;
}
