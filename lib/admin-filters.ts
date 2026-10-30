// Member list filters for /admin/members — pure, so they're tested
// without a database (lib/admin-filters.test.ts). lib/admin.ts builds the
// rows; the page reads the filters from the URL, so a filtered view can
// be bookmarked or shared with the team.

export type ProviderFilter = "" | "google" | "kakao";
export type KeyFilter = "" | "yes" | "no";
export type ActivityFilter = "" | "active7" | "dormant30" | "never";
export type StatusFilter = "" | "suspended" | "no_name";
/** Plan filter: "paid" = Plus or Pro with days left; "host" = runs free on the platform key. */
export type PlanFilter = "" | "free" | "paid" | "plus" | "pro" | "host";
export type MemberSort = "new" | "old" | "runs" | "recent" | "name";

export interface MemberFilters {
  q: string;
  provider: ProviderFilter;
  key: KeyFilter;
  plan: PlanFilter;
  activity: ActivityFilter;
  status: StatusFilter;
  sort: MemberSort;
  /** Joined on or after / on or before these Korea-time days (YYYY-MM-DD), or "". */
  from: string;
  to: string;
  page: number;
}

export interface MemberFacts {
  id: string;
  email: string;
  /** The name the member typed on the sign-up step (lib/member-name.ts), or null. */
  name: string | null;
  /** The name Google or Kakao sent — shown only where the member hasn't typed one. */
  providerName?: string | null;
  providers: string[];
  kakaoId: string | null;
  phone: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  suspended: boolean;
  keys: string[];
  /** Active paid plan ("plus" | "pro"), or null on Free (an expired or student row counts as Free). */
  plan?: string | null;
  planExpiresAt?: string | null;
  credits?: number | null;
  /** Runs free on the platform key (lib/platform-access.ts). */
  host?: boolean;
  runs: number;
  failedRuns: number;
  lastRunAt: string | null;
}

const pick = <T extends string>(raw: unknown, allowed: readonly T[], fallback: T): T =>
  typeof raw === "string" && (allowed as readonly string[]).includes(raw) ? (raw as T) : fallback;

/** Filters from the URL's search params; anything unknown falls back to "all". */
export function parseMemberFilters(sp: Record<string, string | string[] | undefined>): MemberFilters {
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : sp[k]);
  const page = Number(one("page"));
  return {
    q: (one("q") ?? "").toString().trim().slice(0, 100),
    provider: pick(one("provider"), ["", "google", "kakao"], ""),
    key: pick(one("key"), ["", "yes", "no"], ""),
    plan: pick(one("plan"), ["", "free", "paid", "plus", "pro", "host"], ""),
    activity: pick(one("activity"), ["", "active7", "dormant30", "never"], ""),
    status: pick(one("status"), ["", "suspended", "no_name"], ""),
    sort: pick(one("sort"), ["new", "old", "runs", "recent", "name"], "new"),
    from: parseDay(one("from")),
    to: parseDay(one("to")),
    page: Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1,
  };
}

/** The filters as a query string (defaults left out), for links. */
export function filtersToQuery(f: Partial<MemberFilters>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) {
    if (v === undefined || v === "" || (k === "sort" && v === "new") || (k === "page" && v === 1)) continue;
    p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

const DAY = 24 * 60 * 60 * 1000;

/** A YYYY-MM-DD day from a date input, or "" if it isn't a real date. */
export function parseDay(raw: unknown): string {
  if (typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return "";
  const d = new Date(`${raw}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== raw ? "" : raw;
}

/** The Korea-time calendar day (YYYY-MM-DD) of an instant. */
export function kstDayOf(iso: string): string {
  return new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** UTC instants bounding Korea-time days: [from 00:00 KST, to+1 00:00 KST). */
export function kstRange(from: string, to: string): { since: string | null; until: string | null } {
  const at = (day: string, plusDays = 0) => new Date(Date.parse(`${day}T00:00:00+09:00`) + plusDays * DAY).toISOString();
  return { since: from ? at(from) : null, until: to ? at(to, 1) : null };
}

function matches(m: MemberFacts, f: MemberFilters, now: number): boolean {
  if (f.q) {
    const needle = f.q.toLowerCase();
    const hay = [m.email, m.name ?? "", m.providerName ?? "", m.kakaoId ?? "", m.phone ?? "", m.id].join(" ").toLowerCase();
    if (!hay.includes(needle)) return false;
  }
  if (f.provider && !m.providers.includes(f.provider)) return false;
  if (f.key === "yes" && m.keys.length === 0) return false;
  if (f.key === "no" && m.keys.length > 0) return false;
  if (f.plan === "free" && (m.plan || m.host)) return false;
  if (f.plan === "paid" && !m.plan) return false;
  if ((f.plan === "plus" || f.plan === "pro") && m.plan !== f.plan) return false;
  if (f.plan === "host" && !m.host) return false;
  const last = m.lastRunAt ? new Date(m.lastRunAt).getTime() : null;
  if (f.activity === "active7" && !(last !== null && now - last <= 7 * DAY)) return false;
  if (f.activity === "dormant30" && !(last !== null && now - last > 30 * DAY)) return false;
  if (f.activity === "never" && m.runs > 0) return false;
  if (f.status === "suspended" && !m.suspended) return false;
  if (f.status === "no_name" && m.name) return false;
  if (f.from || f.to) {
    const day = kstDayOf(m.createdAt);
    if (f.from && day < f.from) return false;
    if (f.to && day > f.to) return false;
  }
  return true;
}

const time = (iso: string | null) => (iso ? new Date(iso).getTime() : 0);

function compare(sort: MemberSort): (a: MemberFacts, b: MemberFacts) => number {
  switch (sort) {
    case "old":
      return (a, b) => time(a.createdAt) - time(b.createdAt);
    case "runs":
      return (a, b) => b.runs - a.runs || time(b.createdAt) - time(a.createdAt);
    case "recent":
      return (a, b) => time(b.lastRunAt) - time(a.lastRunAt) || time(b.lastSignInAt) - time(a.lastSignInAt);
    case "name":
      // Code-point order, not localeCompare: Node and browsers disagree on
      // locale collation, and the list renders on both.
      return (a, b) => ((a.name ?? "\uffff") < (b.name ?? "\uffff") ? -1 : (a.name ?? "\uffff") > (b.name ?? "\uffff") ? 1 : 0);
    default:
      return (a, b) => time(b.createdAt) - time(a.createdAt);
  }
}

/** Filtered, sorted and paged members. */
export function applyMemberFilters<T extends MemberFacts>(all: T[], f: MemberFilters, now: number, perPage = 50): { rows: T[]; total: number; page: number; pages: number } {
  const hit = all.filter((m) => matches(m, f, now)).sort(compare(f.sort));
  const pages = Math.max(1, Math.ceil(hit.length / perPage));
  const page = Math.min(f.page, pages);
  return { rows: hit.slice((page - 1) * perPage, page * perPage), total: hit.length, page, pages };
}

/** Initials for the avatar circle: first letters of the name, else of the email. */
export function initials(name: string | null, email: string): string {
  const src = (name ?? "").trim() || email.split("@")[0] || "?";
  const words = src.split(/\s+/).filter(Boolean);
  // Hangul names read best as their first two syllables.
  if (/^[\uac00-\ud7a3]/.test(src)) return [...src.replace(/\s+/g, "")].slice(0, 2).join("");
  return (words.length > 1 ? words[0][0] + words[1][0] : [...words[0]].slice(0, 2).join("")).toUpperCase();
}
