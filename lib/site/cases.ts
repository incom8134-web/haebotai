import type { Bilingual } from "@/lib/tools/content";

// Real customer stories for /use-cases. Add only stories from real,
// consenting customers (with their permission to publish name and
// results) — invented testimonials break our own Terms (제10조) and the
// 표시광고법. The section stays hidden while this list is empty.
interface CustomerStory {
  id: string;
  business: Bilingual;
  quote: Bilingual;
  result: Bilingual;
  tools: string[];
}

export const CUSTOMER_STORIES: CustomerStory[] = [];
