import type { ToolField } from "../tools/types.ts";

// Project memory (docs/redesign-plan.md §4.3): the facts a project keeps —
// one value per key — what each finished run contributes, and which form
// fields a fact can pre-fill. Pure functions; the reads and writes are in
// lib/projects/server.ts and the run route / runner.

export const FACT_KEYS = [
  "company_name",
  "product",
  "target_customer",
  "region",
  "value_proposition",
  "positioning",
  "key_message",
  "brand_voice",
  "palette",
  "fonts",
  "pricing",
  "competitors",
] as const;
export type FactKey = (typeof FACT_KEYS)[number];
export type Facts = Partial<Record<FactKey, string>>;

export const FACT_LABELS: Record<FactKey, { ko: string; en: string }> = {
  company_name: { ko: "브랜드·회사 이름", en: "Brand / company name" },
  product: { ko: "제품·서비스", en: "Product / service" },
  target_customer: { ko: "주요 고객", en: "Target customer" },
  region: { ko: "지역", en: "Region" },
  value_proposition: { ko: "핵심 가치·약속", en: "Value proposition" },
  positioning: { ko: "포지셔닝", en: "Positioning" },
  key_message: { ko: "핵심 메시지", en: "Key message" },
  brand_voice: { ko: "브랜드 말투", en: "Brand voice" },
  palette: { ko: "브랜드 색", en: "Brand colours" },
  fonts: { ko: "서체", en: "Fonts" },
  pricing: { ko: "가격 구성", en: "Pricing" },
  competitors: { ko: "경쟁사", en: "Competitors" },
};

type Obj = Record<string, unknown>;
const o = (v: unknown): Obj => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {});
const a = (v: unknown): Obj[] => (Array.isArray(v) ? v.map(o) : []);
const s = (v: unknown): string => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "");
const ss = (v: unknown): string[] => (Array.isArray(v) ? v.map(s).filter(Boolean) : []);
const won = (n: unknown) => (typeof n === "number" && n > 0 ? `${Math.round(n).toLocaleString("ko-KR")}원` : "");

/** What a finished run tells the project. Only non-empty values; the latest run wins per key. */
export function factsFromRun(toolId: string, input: Obj, output: Obj): Facts {
  const f: Facts = {};
  const put = (k: FactKey, v: string) => {
    const t = v.trim().slice(0, 2000);
    if (t) f[k] = t;
  };
  // From the form, for any tool that asked.
  put("company_name", s(input.brand_name));
  put("region", s(input.region) || s(input.location));
  put("target_customer", s(input.target_customer) || s(input.audience));

  switch (toolId) {
    case "brand-dna": {
      const pos = o(output.positioning);
      const voice = o(output.voice);
      const type = o(output.typography);
      put("product", s(input.offering));
      put("target_customer", s(pos.for_whom));
      put("positioning", s(pos.statement));
      put("value_proposition", s(o(output.essence).promise));
      put("key_message", ss(o(output.messaging).taglines)[0] ?? "");
      put("brand_voice", [ss(voice.tone_words).join(", "), ...ss(voice.do).slice(0, 2)].filter(Boolean).join(" / "));
      put("palette", a(output.palette).map((c) => `${s(c.name)} ${s(c.hex)}`.trim()).filter(Boolean).join(", "));
      put("fonts", [...new Set([s(o(type.heading).family), s(o(type.body).family)].filter(Boolean))].join(" / "));
      break;
    }
    case "offer-architect":
      put("product", s(output.offer_name));
      put("value_proposition", s(output.core_promise));
      put("target_customer", s(o(output.target).who));
      put("pricing", a(output.packages).map((p) => `${s(p.name)} ${won(p.price_krw)}`.trim()).filter(Boolean).join(" · "));
      break;
    case "revenue-mapper":
      put("pricing", a(output.ladder).map((l) => `${s(l.offer)} ${won(l.price_krw)}`.trim()).filter(Boolean).join(" → "));
      break;
    case "strategy":
      put("positioning", s(output.positioning_statement));
      put("key_message", s(output.promise));
      break;
    case "competitor-lens":
      put("competitors", a(output.competitors).map((c) => s(c.name)).filter(Boolean).join(", "));
      put("positioning", s(o(output.us).position));
      break;
    case "persona-mapper": {
      const p = a(output.personas)[0];
      if (p) put("target_customer", [s(p.name), s(p.age_range), s(p.situation)].filter(Boolean).join(" · "));
      break;
    }
    case "idea-radar":
      put("product", s(o(output.recommendation).pick));
      break;
    case "mvp-blueprint":
      put("product", s(output.product_one_liner));
      break;
    case "sangsepage":
      put("product", s(input.product_name));
      break;
  }
  return f;
}

// Which form fields each fact can fill (field ids across the manifests).
const FIELD_FACTS: Record<string, FactKey> = {
  brand_name: "company_name",
  product_name: "product",
  product: "product",
  offering: "product",
  idea: "product",
  business: "product",
  target_customer: "target_customer",
  audience: "target_customer",
  customers: "target_customer",
  customer: "target_customer",
  target_user: "target_customer",
  customer_hint: "target_customer",
  region: "region",
  location: "region",
  competitors: "competitors",
  differentiation: "positioning",
};

/**
 * Values to pre-fill from the project's facts: only fields the tool has,
 * only facts that exist. Chips fields get the comma-separated list split.
 * Returns which fields were filled, so the form can say so.
 */
export function prefillFromFacts(inputs: ToolField[], facts: Facts): { values: Record<string, string | string[]>; filled: string[] } {
  const values: Record<string, string | string[]> = {};
  for (const field of inputs) {
    const key = FIELD_FACTS[field.id];
    const v = key ? facts[key] : undefined;
    if (!v) continue;
    if (field.kind === "chips") values[field.id] = v.split(/\s*,\s*/).filter(Boolean).slice(0, field.max ?? 8);
    else if (field.kind === "text" || field.kind === "textarea") values[field.id] = field.max ? v.slice(0, field.max) : v;
  }
  return { values, filled: Object.keys(values) };
}

const isEmpty = (v: unknown) => v === undefined || v === null || (typeof v === "string" && !v.trim()) || (Array.isArray(v) && v.length === 0);

/**
 * Applies a project's prefill to a form without clobbering what the member
 * brought: a field is filled when it's empty or was filled by a project
 * before (so switching projects swaps those). Returns the new values and
 * the fields the project now owns.
 */
export function mergeProjectFill<T extends Record<string, unknown>>(prev: T, fill: Record<string, unknown>, projectOwned: ReadonlySet<string>): { values: T; owned: Set<string> } {
  const values: Record<string, unknown> = { ...prev };
  const owned = new Set<string>();
  for (const [k, v] of Object.entries(fill)) {
    if (isEmpty(prev[k]) || projectOwned.has(k)) {
      values[k] = v;
      owned.add(k);
    }
  }
  return { values: values as T, owned };
}
