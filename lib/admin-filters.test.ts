import { test } from "node:test";
import assert from "node:assert/strict";
import { applyMemberFilters, filtersToQuery, initials, kstDayOf, kstRange, parseDay, parseMemberFilters, type MemberFacts } from "./admin-filters.ts";

const NOW = Date.parse("2026-10-19T00:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
const iso = (daysAgo: number) => new Date(NOW - daysAgo * DAY).toISOString();

const base: MemberFacts = { id: "u0", email: "a@x.com", name: null, providers: ["google"], kakaoId: null, phone: null, createdAt: iso(10), lastSignInAt: iso(1), suspended: false, keys: [], runs: 0, failedRuns: 0, lastRunAt: null };
const members: MemberFacts[] = [
  { ...base, id: "u1", email: "minji@cafe.kr", name: "김민지", providers: ["kakao"], kakaoId: "3021987", phone: "010-1234-5678", createdAt: iso(1), keys: ["google"], runs: 12, lastRunAt: iso(2), plan: "pro" },
  { ...base, id: "u2", email: "jun@bakery.kr", name: "Jun Park", createdAt: iso(40), keys: [], runs: 3, lastRunAt: iso(45), plan: "plus" },
  { ...base, id: "u3", email: "new@x.com", createdAt: iso(5), host: true },
  { ...base, id: "u4", email: "bad@x.com", name: "Spam", createdAt: iso(20), suspended: true, runs: 1, lastRunAt: iso(20), keys: ["google"] },
];
const f = (sp: Record<string, string>) => parseMemberFilters(sp);
const ids = (sp: Record<string, string>) => applyMemberFilters(members, f(sp), NOW).rows.map((m) => m.id);

test("parseMemberFilters keeps known values and drops the rest", () => {
  assert.deepEqual(f({ provider: "kakao", key: "yes", sort: "runs", page: "2" }), { q: "", provider: "kakao", key: "yes", plan: "", activity: "", status: "", sort: "runs", from: "", to: "", page: 2 });
  const junk = f({ provider: "naver", key: "maybe", sort: "x", page: "-3" });
  assert.equal(junk.provider, "");
  assert.equal(junk.key, "");
  assert.equal(junk.sort, "new");
  assert.equal(junk.page, 1);
});

test("search matches name, email, Kakao ID and phone", () => {
  assert.deepEqual(ids({ q: "민지" }), ["u1"]);
  assert.deepEqual(ids({ q: "BAKERY" }), ["u2"]);
  assert.deepEqual(ids({ q: "3021987" }), ["u1"]);
  assert.deepEqual(ids({ q: "1234-5678" }), ["u1"]);
});

test("provider, key, activity and status filters", () => {
  assert.deepEqual(ids({ provider: "kakao" }), ["u1"]);
  assert.deepEqual(ids({ key: "no" }).sort(), ["u2", "u3"]);
  assert.deepEqual(ids({ activity: "active7" }), ["u1"]);
  assert.deepEqual(ids({ activity: "dormant30" }), ["u2"]);
  assert.deepEqual(ids({ activity: "never" }), ["u3"]);
  assert.deepEqual(ids({ status: "suspended" }), ["u4"]);
  assert.deepEqual(ids({ status: "no_name" }), ["u3"]);
});

test("sorting", () => {
  assert.deepEqual(ids({}), ["u1", "u3", "u4", "u2"]);
  assert.deepEqual(ids({ sort: "old" }), ["u2", "u4", "u3", "u1"]);
  assert.deepEqual(ids({ sort: "runs" })[0], "u1");
  assert.deepEqual(ids({ sort: "recent" })[0], "u1");
});

test("paging clamps to the last page", () => {
  const r = applyMemberFilters(members, f({ page: "9" }), NOW, 3);
  assert.equal(r.pages, 2);
  assert.equal(r.page, 2);
  assert.equal(r.rows.length, 1);
});

test("filtersToQuery leaves defaults out", () => {
  assert.equal(filtersToQuery({ q: "", provider: "kakao", sort: "new", page: 1 }), "?provider=kakao");
  assert.equal(filtersToQuery({ sort: "new" }), "");
});

test("initials", () => {
  assert.equal(initials("김민지", "m@x.com"), "김민");
  assert.equal(initials("Jun Park", "j@x.com"), "JP");
  assert.equal(initials(null, "hello@x.com"), "HE");
});

test("calendar filter: joined between two Korea-time days", () => {
  assert.equal(parseDay("2026-10-05"), "2026-10-05");
  assert.equal(parseDay("2026-02-30"), "");
  assert.equal(parseDay("10/05/2026"), "");
  // 23:30 UTC on the 4th is already the 5th in Korea.
  assert.equal(kstDayOf("2026-10-04T23:30:00Z"), "2026-10-05");
  assert.deepEqual(ids({ from: iso(6).slice(0, 10) }).sort(), ["u1", "u3"]);
  assert.deepEqual(ids({ to: iso(15).slice(0, 10) }).sort(), ["u2", "u4"]);
  assert.deepEqual(ids({ from: iso(25).slice(0, 10), to: iso(15).slice(0, 10) }), ["u4"]);
});

test("kstRange turns Korea days into UTC bounds", () => {
  assert.deepEqual(kstRange("2026-10-05", "2026-10-06"), { since: "2026-10-04T15:00:00.000Z", until: "2026-10-06T15:00:00.000Z" });
  assert.deepEqual(kstRange("", ""), { since: null, until: null });
});

test("the Google/Kakao name is searchable but doesn't count as an entered name", () => {
  const withProvider = [{ ...base, id: "u9", email: "g@x.com", name: null, providerName: "Google Name" }];
  assert.deepEqual(applyMemberFilters(withProvider, f({ q: "google name" }), NOW).rows.map((m) => m.id), ["u9"]);
  assert.deepEqual(applyMemberFilters(withProvider, f({ status: "no_name" }), NOW).rows.map((m) => m.id), ["u9"]);
});

test("plan filter: free, paid, each plan, hosts", () => {
  assert.deepEqual(ids({ plan: "paid" }).sort(), ["u1", "u2"]);
  assert.deepEqual(ids({ plan: "pro" }), ["u1"]);
  assert.deepEqual(ids({ plan: "plus" }), ["u2"]);
  assert.deepEqual(ids({ plan: "host" }), ["u3"]);
  assert.deepEqual(ids({ plan: "free" }), ["u4"]);
});
