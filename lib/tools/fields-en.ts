import type { ToolField } from "./types";

// English labels for every tool's form. The manifests in
// lib/tools/registry keep Korean labels (they also feed the model
// prompt); the run page and the tool pages swap in these when the UI
// is in English. Option *values* never change, only what's shown.

type FieldEn = { label: string; placeholder?: string; unit?: string; options?: Record<string, string> };

const COMMON: Record<string, FieldEn> = {
  free_request: { label: "Ask for anything, in your own words" },
};

const FIELDS_EN: Record<string, Record<string, FieldEn>> = {
  blog: {
    topic: { label: "Topic / keyword" },
    audience: { label: "Target readers" },
    platform: { label: "Platform", options: { naver: "Naver", tistory: "Tistory", brunch: "Brunch", wordpress: "WordPress" } },
    post_type: { label: "Post type", options: { info: "Info / guide", review: "Review", story: "Brand story", list: "Listicle" } },
    length: { label: "Length", options: { "1000": "1,000 chars", "1500": "1,500 chars", "2500": "2,500 chars", "4000": "4,000 chars" } },
    must_include_facts: { label: "Facts to include" },
  },
  "brand-model": {
    product_photo: { label: "Product photo" },
    model_profile: { label: "Model gender & age", options: { f20: "Woman, 20s", f30: "Woman, 30s", m20: "Man, 20s", m30: "Man, 30s", any: "Any" } },
    mood: { label: "Mood", options: { minimal: "Minimal", casual: "Casual", luxury: "Luxury", natural: "Natural" } },
    setting: { label: "Setting", options: { studio: "Studio", outdoor: "Outdoor", cafe: "Café", store: "Store" } },
    ratio: { label: "Aspect ratio" },
  },
  "business-plan": {
    item: { label: "Business idea" },
    purpose: { label: "Purpose", options: { investment: "Investment", government: "Government grant", internal: "Internal review", loan: "Loan" } },
    market: { label: "Market" },
    team: { label: "Team" },
    unit_price: { label: "Unit price", unit: "KRW" },
    monthly_sales_target: { label: "Monthly sales target", unit: "units" },
    fixed_cost: { label: "Fixed costs", unit: "KRW" },
    variable_cost_rate: { label: "Variable cost rate" },
  },
  calendar: {
    model: { label: "What you're executing" },
    start_date: { label: "Start date", placeholder: "YYYY-MM-DD" },
    milestones: { label: "Key milestones" },
    pace: { label: "Pace", options: { steady: "Steady (5–8 h/week)", sprint: "Sprint (15+ h/week)" } },
  },
  copy: {
    offer: { label: "What to promote" },
    audience: { label: "Target customers" },
    goal: { label: "Goal of the copy", options: { awareness: "Awareness", conversion: "Purchase / sign-up", retention: "Bring them back" } },
    channels: { label: "Channels", options: { instagram: "Instagram", paid_social: "Social ads", email: "Email", landing: "Landing page", sms: "SMS / KakaoTalk" } },
    variants: { label: "Variants per motivation" },
    must_include: { label: "Facts to include" },
  },
  grant: {
    years_in_business: { label: "Years in business", options: { pre: "Pre-startup", u1: "Under 1 year", "1_3": "1–3 years", "3_7": "3–7 years", "7+": "7+ years" } },
    region: { label: "Region", options: { seoul: "Seoul", gyeonggi_incheon: "Gyeonggi · Incheon", chungcheong: "Chungcheong", jeolla: "Jeolla", gyeongsang: "Gyeongsang", gangwon_jeju: "Gangwon · Jeju" } },
    revenue_band: { label: "Annual revenue", options: { u1: "Under ₩100M", "1_10": "₩100M–1B", "10_50": "₩1–5B", "50+": "₩5B+" } },
    employee_count: { label: "Employees" },
    tech_fields: { label: "Technology fields" },
    support_types: { label: "Support wanted", options: { rnd: "R&D", startup: "Startup", export: "Export", employment: "Hiring", facility: "Facilities" } },
  },
  homepage: {
    content: { label: "What the site should say" },
    facts: { label: "Contact · address · hours · prices" },
    purpose: { label: "Site purpose", options: { intro: "Introduction", booking: "Booking", sales: "Sales", portfolio: "Portfolio", landing: "Landing page" } },
    sections: { label: "Sections", options: { hero: "Hero", about: "About", services: "Services", portfolio: "Portfolio", pricing: "Pricing", testimonials: "Testimonials", contact: "Contact", faq: "FAQ" } },
    reference_site: { label: "Reference site" },
  },
  image: {
    description: { label: "Description" },
    preset: { label: "Use case", options: { studio: "Studio product shot", packaging: "Packaging", "3d_render": "3D render", landing_ui: "Landing UI", ad_banner: "Ad banner", background: "Background" } },
    ratio: { label: "Aspect ratio" },
    reference: { label: "Reference image" },
  },
  keyword: {
    primary_keyword: { label: "Main keyword" },
    region: { label: "Region" },
    intent: { label: "Searcher intent", options: { buy: "Ready to buy", learn: "Researching", local: "Looking nearby" } },
    platforms: { label: "Platforms", options: { naver: "Naver", google: "Google", youtube: "YouTube", instagram: "Instagram" } },
  },
  logo: {
    brand_name: { label: "Brand name" },
    keywords: { label: "Associations" },
    style: { label: "Style", options: { wordmark: "Wordmark", symbol_wordmark: "Symbol + wordmark", initial: "Initial", emblem: "Emblem" } },
    color_tendency: { label: "Color", options: { mono: "Monotone", vivid: "Vivid", pastel: "Pastel", brand: "Use brand colors" } },
  },
  money: {
    skills: { label: "Skills & experience" },
    weekly_hours: { label: "Hours per week", unit: "h" },
    capital: { label: "Starting capital", options: { "0": "₩0", "1m": "Up to ₩1M", "5m": "Up to ₩5M", "5m+": "₩5M+" } },
    risk: { label: "Risk appetite", options: { low: "Play it safe", mid: "Moderate", high: "Aggressive" } },
    interests: { label: "Interests" },
    avoid: { label: "Work to avoid" },
  },
  place: {
    business_name: { label: "Business name" },
    region: { label: "Region" },
    current_info: { label: "Current Naver Place listing" },
    competitors: { label: "Competitors" },
  },
  presentation: {
    brief: { label: "Topic and goal" },
    audience: { label: "Audience" },
    slide_count: { label: "Slides", options: { "6": "6 slides", "8": "8 slides", "10": "10 slides", "12": "12 slides", "15": "15 slides", "20": "20 slides" } },
    purpose: { label: "Purpose", options: { pitch: "Pitch / proposal", report: "Results report", launch: "Launch plan", education: "Teaching / explainer" } },
    design_tone: { label: "Design tone", options: { trust: "Clean and trustworthy", bold: "Bold and punchy" } },
    reference: { label: "Data and figures to include" },
  },
  prompt: {
    task: { label: "The repetitive task" },
    target_type: { label: "Kind of AI", options: { chat: "Chat AI", image: "Image AI", coding: "Coding agent", video: "Video AI" } },
    target_model: { label: "Target model", options: { gpt: "GPT", claude: "Claude", gemini: "Gemini", other: "Other" } },
    output_format: { label: "Output format", options: { text: "Text", json: "JSON", markdown: "Markdown", code: "Code" } },
    tone: { label: "Tone", options: { neutral: "Neutral", friendly: "Friendly", expert: "Expert", playful: "Playful" } },
    constraints: { label: "Constraints" },
    example_input: { label: "Example input" },
    style_example: { label: "A prompt you liked" },
  },
  proposal: {
    target: { label: "Who it's for" },
    content: { label: "What you're proposing" },
    budget: { label: "Budget range" },
    duration: { label: "Duration" },
    differentiators: { label: "What sets you apart" },
    attachments: { label: "Attachments" },
  },
  sangsepage: {
    product_name: { label: "Product name" },
    features: { label: "Key features" },
    price: { label: "Price", unit: "KRW" },
    target_customer: { label: "Target customer" },
    page_mood: { label: "Page mood", options: { clean: "Clean & informative", warm: "Warm & emotional", premium: "Premium" } },
    product_photos: { label: "Product photos" },
    competitor: { label: "Competing product" },
  },
  strategy: {
    context: { label: "Business / product" },
    competitors: { label: "Competing brands" },
    goal: { label: "Goal right now" },
    customer_voice: { label: "What customers actually said" },
  },
  trend: {
    ideas: { label: "Candidate ideas" },
    target_market: { label: "Target market" },
    budget: { label: "Budget", options: { "0": "₩0", "1m": "Up to ₩1M", "5m": "Up to ₩5M", "5m+": "₩5M+" } },
    entry_timing: { label: "When to start", options: { now: "Now", "3m": "Within 3 months", "1y": "Within a year" } },
  },
};

/** The field as it should read in the UI's language (labels and option labels only). */
export function localizeField(toolId: string, field: ToolField, locale: string): ToolField {
  if (locale !== "en") return field;
  const en = FIELDS_EN[toolId]?.[field.id] ?? COMMON[field.id];
  if (!en) return field;
  const out = { ...field, label: en.label } as ToolField & { placeholder?: string; unit?: string };
  if (en.placeholder && "placeholder" in field) out.placeholder = en.placeholder;
  if (en.unit && field.kind === "number") (out as { unit?: string }).unit = en.unit;
  if ("options" in field && en.options) {
    (out as { options: { value: string; label: string }[] }).options = field.options.map((o) => ({ ...o, label: en.options![o.value] ?? o.label }));
  }
  return out;
}

export function localizeFields(toolId: string, fields: ToolField[], locale: string): ToolField[] {
  return fields.map((f) => localizeField(toolId, f, locale));
}

/** Every Korean-labelled field has an English label (checked in tests). */
export function missingEnglish(toolId: string, fields: ToolField[]): string[] {
  return fields.filter((f) => !(FIELDS_EN[toolId]?.[f.id] ?? COMMON[f.id])).map((f) => f.id);
}
