// English versions of the example presets' sample text (lib/tools/
// content.json keeps the Korean). Keyed by tool id, then preset index;
// only the text values are here — option values are the same in both
// languages. Used when the UI is in English.

export const PRESET_VALUES_EN: Record<string, Record<number, Record<string, string | string[]>>> = {
  money: {
    0: { skills: "Pastry chef, 10 years; cakes and baked goods. Currently working in a shop.", interests: ["Classes", "Small-batch sales"], avoid: "Mass production" },
    1: { skills: "UI designer, 5 years; fluent in Figma and Illustrator", interests: ["Templates", "Online courses"] },
    2: { skills: "25 years in manufacturing quality control, lots of on-site training", interests: ["Training", "Consulting"] },
  },
  trend: {
    0: { ideas: ["Meal-kit subscription", "Side-dish delivery", "Lunchbox catering"], target_market: "Single-person households in their 20s–30s, Seoul area" },
    1: { ideas: ["Homemade dog treats", "Dog birthday cakes", "Senior-dog nutrition meals"], target_market: "Dog owners in their 30s–40s" },
    2: { ideas: ["Smartphone classes", "Kiosk training", "Online shopping course"], target_market: "People 60+ in smaller regional cities" },
  },
  calendar: {
    0: { model: "Weekend one-day baking class at a neighborhood bakery (6 seats, 3 hours)", milestones: ["First sign-up post", "First class", "10 reviews"] },
    1: { model: "Selling low-sugar homemade granola on Smart Store", milestones: ["Product page done", "First order", "₩3M monthly sales"] },
  },
  prompt: {
    0: { task: "Collect the week's customer reviews and summarize them into 3 improvements and the praise points", constraints: ["Under 300 characters", "No personal data"] },
    1: { task: "From a product name and features, write a Smart Store title, summary and tags", constraints: ["Title under 50 characters"] },
  },
  blog: {
    0: { topic: "New spring strawberry desserts", audience: "People in their 20s–30s who visit neighborhood cafés" },
    1: { topic: "Tax deadlines sole proprietors miss in their first year", audience: "Self-employed owners in their first year" },
    2: { topic: "How to choose a home bread maker", audience: "Home-baking beginners" },
  },
  keyword: {
    0: { primary_keyword: "custom cake order", region: "Haeundae, Busan" },
    1: { primary_keyword: "Figma course" },
  },
  place: {
    0: { business_name: "Haebot Bakery", region: "Haeundae-gu, Busan", competitors: ["OO Bakery", "XX Bakehouse"] },
    1: { business_name: "Hair Salon Bom", region: "Mangwon-dong, Mapo-gu, Seoul" },
  },
  image: {
    0: { description: "Minimal ceramic serum bottle on white marble, soft direct sunlight and palm-leaf shadows" },
    1: { description: "Matte black kraft coffee pouch, minimal typography, roasted beans around it, warm morning light" },
    2: { description: "White smartwatch with a holographic workout widget above the screen, precise product-render studio backdrop" },
    3: { description: "Spring sale banner with cherry blossoms and pastel background, space left for the product" },
  },
  logo: {
    0: { brand_name: "Haebot Bakery", keywords: ["Wheat", "Morning", "Handmade"] },
    1: { keywords: ["Trust", "Growth", "Speed"] },
    2: { keywords: ["Leaf", "Cycle", "Bio"] },
  },
  sangsepage: {
    0: { product_name: "Low-sugar homemade granola 500g", features: ["Under 5g sugar", "Korean oats", "Small-batch, handmade"], target_customer: "Health-minded office workers in their 30s" },
    1: { product_name: "Handmade ceramic mug 350ml", features: ["Dishwasher safe", "Made by a potter", "Matte glaze"] },
  },
  proposal: {
    0: { target: "Three cafés in Haeundae", content: "Homemade desserts delivered 3 times a week, seasonal menu developed together", budget: "₩1.5M per month", duration: "6 months", differentiators: ["Made the same day", "Small custom batches"] },
    1: { target: "HR team at a mid-sized manufacturer", content: "4 hands-on quality-control sessions for floor managers", duration: "1 month", differentiators: ["25 years on the floor", "Case-based"] },
  },
  "business-plan": {
    0: { item: "Vegan dessert subscription, 4 deliveries a month", market: "Korean vegan food market" },
    1: { item: "Inventory and ordering automation SaaS for small businesses", market: "Korean small-business POS integration market" },
  },
  grant: {
    1: { tech_fields: ["Smart factory"] },
  },
  strategy: {
    0: { context: "Natural-sourdough bakery in Haeundae. Opens 7 am, strong weekend brunch demand. Two big franchise bakeries nearby.", competitors: ["Paris Baguette", "Tous les Jours"], goal: "Grow weekday-morning sales" },
    1: { context: "New low-sugar homemade granola, sold online to office workers in their 30s.", goal: "Secure repeat purchases in the first month" },
  },
  copy: {
    0: { offer: "Spring strawberry tart launch, April only", audience: "People in their 20s–30s who visit neighborhood cafés", must_include: ["April only", "₩6,500 a slice"] },
    1: { offer: "Low-sugar granola subscription launch, 20% off the first month", must_include: ["20% off month one", "Under 5g sugar"] },
    2: { offer: "Online booking opens for a one-person hair salon", audience: "Office workers in their 30s in Mangwon-dong" },
  },
  presentation: {
    0: { brief: "Spring strawberry dessert launch — opportunity, target customers, offer, channels, timeline", audience: "Store staff and partner café owners" },
    1: { brief: "Q3 online sales results: what worked, what didn't, the Q4 plan", audience: "Co-founders" },
    2: { brief: "Seed investment for an inventory and ordering automation SaaS for small businesses", audience: "Early-stage investors" },
  },
};

/** A preset's values in the UI's language. */
export function presetValues<T extends Record<string, unknown>>(toolId: string, index: number, values: T, locale: string): T {
  if (locale !== "en") return values;
  const en = PRESET_VALUES_EN[toolId]?.[index];
  return en ? ({ ...values, ...en } as T) : values;
}
