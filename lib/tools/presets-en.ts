import type { PresetsEn } from "./localize";

// English versions of the example presets' sample text (lib/tools/
// content.json keeps the Korean). Keyed by tool id, then preset index;
// only the text values are here — option values are the same in both
// languages. Used when the UI is in English.

const PRESET_VALUES_EN: Record<string, Record<number, Record<string, string | string[]>>> = {
  "market-desk": {
    0: { question: "Is there enough demand for home-visit care for senior dogs in Seoul, and what do owners pay now?", decision: "Whether to launch a pilot in two districts", market: "Pet care services", region: "Seoul" },
    1: { question: "How big is the market for adult hobby classes (pottery, baking) on weekday evenings?", decision: "Whether to open a second studio", market: "Adult hobby classes", region: "Busan" },
  },
  "competitor-lens": {
    0: { business: "A 1:4 small-group Pilates studio near Seongsu station, ₩180,000/month for 8 classes", criteria: ["Price per class", "Class size", "Booking flexibility", "Instructor experience"], region: "Seongsu-dong, Seoul" },
    1: { business: "A cold-pressed juice subscription delivered at dawn", competitors: ["Supermarket juice", "Big juice brands", "Café smoothies"], region: "Seoul metro area" },
  },
  "persona-mapper": {
    0: { business: "A neighbourhood pediatric clinic with evening hours", customer_hint: "Working parents with children under 10" },
    1: { business: "Online Korean cooking classes for foreigners living in Korea", customer_hint: "Expats in their 20s–30s" },
  },
  "insight-miner": {
    0: { data: "★★★★★ The strawberries are so fresh. Everyone loved the gift\n★★☆☆☆ It took 5 days after ordering. I needed it for a date ㅠ\n★★★★☆ Tastes great but the box arrived dented\n★★★★★ The cream isn't too sweet. Buying again\n★★☆☆☆ Delivery is too slow. The ice packs had melted\n★★★★★ Premium packaging, perfect as a gift\n★★★☆☆ Tasty but a bit pricey. Wish there was a small size\n★★★★★ Ordered as a birthday cake — the lettering service was lovely\n★☆☆☆☆ You can't choose a delivery date\n★★★★☆ Lots of strawberries. A single-serve size next time please", product: "Strawberry tart gift box" },
  },
  "sop-builder": {
    0: { process: "Smart Store order to shipping: check new orders at 9am, pack items, print labels on the courier site, enter tracking numbers in Smart Store, ship at 4pm pickup. Part-timer packs, owner handles CS.", standard: "Same-day shipping for orders before 2pm, zero wrong items", roles: ["Owner", "Part-timer"], tools: ["Smart Store", "Courier site", "KakaoTalk"], problems: "Wrong colour options sent, tracking numbers not entered so customers ask" },
    1: { process: "Café opening: unlock at 7:30, machine warm-up, calibrate espresso, check pastries delivery, stock the counter, open POS at 8.", roles: ["Morning barista"], tools: ["POS", "Espresso machine"], problems: "Espresso tastes sour on busy mornings because calibration is skipped" },
  },
  "meeting-action": {
    0: { notes: "Weekly meeting. Minji: spring menu photos not ready. Decided to shoot this Thursday at the store. Junho will book the photographer. Price of the strawberry set stays at 18,000 won. Open question: do we do delivery apps for the spring menu? Sora to check commission rates by next Tuesday. Instagram posting — Minji will try 3 reels this week.", participants: ["Minji", "Junho", "Sora"] },
    1: { notes: "Call with client (Hanbit Academy). They want the landing page by end of April. They'll send the logo files and course list. We send wireframes first. Budget not confirmed — they'll check internally. They asked if we can add a consultation booking form.", participants: ["Hanbit Academy (Director Kim)", "Us (Yuna)"] },
  },
  "hook-lab": {
    0: { topic: "Three things new dog owners get wrong on walks", product: "1:1 dog walking training", audience: "Owners in their 20s–30s with a dog under a year old", proof: ["Trainer with 8 years' experience"] },
    1: { topic: "Why our bakery's bread is sold out by 3pm", audience: "Office workers in their 20s–40s nearby", avoid: "'Delicious', 'the best'" },
    2: { topic: "What a first-year freelance designer should do in January for taxes", product: "Tax filing service for freelancers", audience: "Freelance designers in their first year" },
  },
  "content-transformer": {
    0: { source: "How to choose running shoes: most beginners pick shoes for looks, but cushioning, width and drop matter more. Walk for 10 minutes in the store, try them on in the evening when your feet are largest, and measure your stride with a phone. The first 3 months, run 20 minutes, 3 times a week.", audience: "People starting running in their 20s–40s", cta: "Book a free gait test in store" },
    1: { source: "Lecture notes: The 3 questions that decide a small business's pricing — 1) what does the customer compare you with? 2) what does the customer lose if they don't buy? 3) what is the smallest unit they'd buy first? Most owners price from cost, but customers price from alternatives.", audience: "Small business owners", cta: "Subscribe to the newsletter" },
  },
  "brand-dna": {
    0: { brand_name: "Onsaem Pediatric Clinic", offering: "A neighbourhood pediatric clinic with evening hours, for working parents of children under 10", target_customer: "Working parents in their 30s–40s", values: ["Explain clearly", "No rushing"], avoid: "Cold, hospital-like and intimidating" },
    1: { brand_name: "Rawpress", offering: "Cold-pressed juice subscription delivered at dawn to office workers", target_customer: "Health-conscious office workers in their late 20s–30s", values: ["Nothing added", "Honest labels"], competitors: ["Supermarket juice", "Big juice brands"], avoid: "Preachy wellness talk" },
    2: { brand_name: "Gyeol Woodwork", offering: "Made-to-order solid-wood furniture from a one-person workshop in Yangpyeong", target_customer: "Couples in their 30s–50s furnishing a new home", values: ["Slow craft", "Furniture that lasts decades"], existing_colors: ["#6B4F3A"], avoid: "Cheap, mass-produced feel" },
  },
  "idea-radar": {
    0: { skills: "Ward nurse at a university hospital for 8 years; frequent discharge education and caregiver counselling", interests: ["Health education", "Content"], avoid: "Extra night shifts" },
    1: { skills: "12 years in 3PL logistics sales; managed 200 accounts of small manufacturers and online sellers", interests: ["Logistics", "Automation"], target_customer: "Online sellers shipping 500–3,000 orders a month" },
    2: { skills: "Hand-knitting for 15 years, 2,300 Instagram followers, designs my own patterns", interests: ["Handmade", "Classes"], location: "Suseong-gu, Daegu" },
  },
  "revenue-mapper": {
    0: { idea: "Small-group Pilates studio with 4 reformers for working women in their 30s–40s", customers: "Office workers in their 30s–40s who exercise after work", assets: "Two instructor licences; about to lease a 66 m² space at ₩1.8M/month" },
    1: { idea: "Handmade dog treats from Korean ingredients, with a low-fat line for senior dogs", customers: "Owners in their 30s–50s with senior dogs", assets: "Food production space (pet-food licence in progress), 1,200 Instagram followers" },
    2: { idea: "An app where freelancers upload receipt photos, get expenses sorted and a checklist before filing income tax", customers: "Freelancers earning ₩20M–100M a year" },
  },
  "offer-architect": {
    0: { product: "4-week small-group (1:4) coaching so owners can run their own Instagram", target_customer: "Owners of neighbourhood shops with 5 or fewer staff", problem: "An agency is too expensive, and alone they don't know what to post", outcome: "Post 5 times a week in 15 minutes a day", proof: ["40 coaching students", "5 years running a café"] },
    1: { product: "Tasting kit with four mini bottles of makgeolli and yakju from local breweries, plus pairing cards", target_customer: "People in their 20s–30s choosing housewarming gifts", outcome: "Newcomers find their taste", differentiation: "Brewer interview cards and snack pairings" },
    2: { product: "12-week game-making coding class for grades 3–6", target_customer: "Dual-income parents", problem: "Academies are far away and kids lose interest quickly", outcome: "After 12 weeks, kids show friends a game they made" },
  },
  "market-gap": {
    0: { market: "Senior dog care", customer: "Single households and working couples with dogs over 10", known_problems: "Pet hotels are reluctant to handle medication and diapers", competitors: ["Pet hotels", "Pet-sitter apps", "Vet boarding"], region: "Seoul" },
    1: { market: "Small moves for studios and officetels", customer: "Single households in their 20s–30s", competitors: ["Truck movers", "Full-service movers", "Karrot odd jobs"], region: "Seoul metro area" },
    2: { market: "Overseas online sales for manufacturers with under 30 staff", customer: "Owners of small manufacturers with no export experience", known_problems: "Amazon onboarding agencies are expensive and results are uncertain", region: "Korea → US and Japan" },
  },
  "mvp-blueprint": {
    0: { idea: "PT booking, attendance and diet feedback for three trainers at a local gym", target_user: "PT members in their 30s–40s", must_have: "Rescheduling, KakaoTalk alerts" },
    1: { idea: "Monthly subscription of two handmade soaps matched to skin type", target_user: "People in their 20s–30s with sensitive skin" },
    2: { idea: "Weekend rental of tent, tarp and lighting sets for beginner campers", target_user: "Families going camping for the first time", must_have: "Inventory calendar, deposit payment" },
  },
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
    0: { business_name: "Moonlight Bakery", region: "Haeundae-gu, Busan", competitors: ["OO Bakery", "XX Bakehouse"] },
    1: { business_name: "Hair Salon Bom", region: "Mangwon-dong, Mapo-gu, Seoul" },
  },
  image: {
    0: { description: "Minimal ceramic serum bottle on white marble, soft direct sunlight and palm-leaf shadows" },
    1: { description: "Matte black kraft coffee pouch, minimal typography, roasted beans around it, warm morning light" },
    2: { description: "White smartwatch with a holographic workout widget above the screen, precise product-render studio backdrop" },
    3: { description: "Spring sale banner with cherry blossoms and pastel background, space left for the product" },
  },
  logo: {
    0: { brand_name: "Moonlight Bakery", keywords: ["Wheat", "Morning", "Handmade"] },
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

/** This tool's English preset text, for a client-side pack. */
export function presetsEnFor(toolId: string): PresetsEn {
  return PRESET_VALUES_EN[toolId] ?? {};
}
