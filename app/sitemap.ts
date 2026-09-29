import type { MetadataRoute } from "next";
import { listTools } from "@/lib/tools/registry";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const PAGES = ["", "/tools", "/use-cases", "/status", "/help/shortcuts", "/help", "/help/faq", "/help/contact", "/help/api-guide", "/help/whats-new", "/legal/terms", "/legal/privacy", "/legal/refund"];

export default function sitemap(): MetadataRoute.Sitemap {
  const tools = listTools()
    .filter((tool) => !tool.comingSoon)
    .map((tool) => `/tools/${tool.id}`);
  return [...PAGES, ...tools].map((path) => ({ url: `${SITE_URL}${path}` }));
}
