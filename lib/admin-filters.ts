// Member list filters for /admin/members — pure, so they're tested
// without a database (lib/admin-filters.test.ts). lib/admin.ts builds the
// rows; the page reads the filters from the URL, so a filtered view can
// be bookmarked or shared with the team.

export type ProviderFilter = "" | "google" | "kakao";
export type KeyFilter = "" | "yes" | "no";
export type ActivityFilter = "" | "active7" | "dormant30" | "never";
export type StatusFilter = "" | "suspended" | "no_name";
export type MemberSort = "new" | "old" | "runs" | "recent" | "name";

export interface MemberFilters {
  q: string;
  provider: ProviderFilter;
  key: KeyFilter;
  activity: ActivityFilter;
  status: StatusFilter;
  sort: MemberSort;
  page: number;
}

export interface MemberFacts {
  id: string;
  email: string;
  name: string | null;
  providers: string[];
  kakaoId: string | null;
  phone: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  suspended: boolean;
  keys: string[];
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
    activity: pick(one("activity"), ["", "active7", "dormant30", "never"], ""),
    status: pick(one("status"), ["", "suspended", "no_name"], ""),
    sort: pick(one("sort"), ["new", "old", "runs", "recent", "name"], "new"),
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

function matches(m: MemberFacts, f: MemberFilters, now: number): boolean {
  if (f.q) {
    const needle = f.q.toLowerCase();
    const hay = [m.email, m.name ?? "", m.kakaoId ?? "", m.phone ?? "", m.id].join(" ").toLowerCase();
    if (!hay.includes(needle)) return false;
  }
  if (f.provider && !m.providers.includes(f.provider)) return false;
  if (f.key === "yes" && m.keys.length === 0) return false;
  if (f.key === "no" && m.keys.length > 0) return false;
  const last = m.lastRunAt ? new Date(m.lastRunAt).getTime() : null;
  if (f.activity === "active7" && !(last !== null && now - last <= 7 * DAY)) return false;
  if (f.activity === "dormant30" && !(last !== null && now - last > 30 * DAY)) return false;
  if (f.activity === "never" && m.runs > 0) return false;
  if (f.status === "suspended" && !m.suspended) return false;
  if (f.status === "no_name" && m.name) return false;
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
