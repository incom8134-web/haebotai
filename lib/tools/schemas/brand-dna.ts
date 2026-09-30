import { z } from "zod";

// 브랜드 DNA 스튜디오: the brand's rules as a board every later output can
// follow — essence, personality (as scored dimensions and as traits with
// "this, not that"), positioning, voice with sample lines, a palette with
// roles, a type pairing from fonts the page can actually load, visual
// direction, taglines and how it shows up at each touchpoint.

// Google Fonts families with Korean glyphs, so the board can render the
// specimen for real and every later tool can use the same fonts.
export const BRAND_FONTS = [
  "Noto Sans KR",
  "Noto Serif KR",
  "IBM Plex Sans KR",
  "Gothic A1",
  "Nanum Gothic",
  "Nanum Myeongjo",
  "Gowun Dodum",
  "Gowun Batang",
  "Hahmlet",
  "Song Myung",
  "Black Han Sans",
  "Do Hyeon",
  "Jua",
  "Sunflower",
  "Gaegu",
  "Nanum Pen Script",
] as const;

const font = z.object({ family: z.enum(BRAND_FONTS), weight: z.string(), why: z.string() });
const score = z.number().min(1).max(10);

const outputSchema = z.object({
  summary: z.string(),
  essence: z.object({ one_line: z.string(), purpose: z.string(), promise: z.string() }),
  archetype: z.object({ name: z.string(), why: z.string() }),
  dimensions: z.object({ warmth: score, expertise: score, boldness: score, playfulness: score, premium: score }),
  traits: z.array(z.object({ trait: z.string(), means: z.string(), not: z.string() })).min(3).max(5),
  values: z.array(z.object({ value: z.string(), in_practice: z.string() })).min(2).max(4),
  positioning: z.object({ statement: z.string(), for_whom: z.string(), category: z.string(), difference: z.string(), reasons_to_believe: z.array(z.string()) }),
  voice: z.object({
    tone_words: z.array(z.string()).min(3).max(5),
    do: z.array(z.string()),
    dont: z.array(z.string()),
    samples: z.array(z.object({ context: z.string(), line: z.string() })).min(3).max(6),
  }),
  palette: z
    .array(z.object({ name: z.string(), hex: z.string(), role: z.enum(["primary", "secondary", "accent", "neutral", "background"]), usage: z.string() }))
    .min(4)
    .max(6),
  typography: z.object({ heading: font, body: font }),
  visual: z.object({ mood_words: z.array(z.string()), imagery: z.string(), shapes: z.string(), avoid: z.array(z.string()) }),
  messaging: z.object({ taglines: z.array(z.string()).min(3).max(3), elevator_pitch: z.string(), key_messages: z.array(z.string()).min(2).max(4) }),
  touchpoints: z.array(z.object({ touchpoint: z.string(), apply: z.string() })).min(3).max(6),
});

export default outputSchema;
