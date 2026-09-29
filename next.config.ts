import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @resvg/resvg-js ships a native .node binary addon, and satori's
  // harfbuzzjs dependency loads a .wasm file by relative path — bundling
  // either breaks that asset resolution, so both stay plain runtime
  // requires instead (lib/tools/render/sangsepage.ts).
  // pptxgenjs is bundled, not external: as an external, Vercel loaded its
  // ESM entry with require() and it failed to load.
  serverExternalPackages: ["@resvg/resvg-js", "satori", "pdfkit"],
  // Files read from disk at runtime that the tracer can't see: the
  // Pretendard fonts (sangsepage render + PDF export), pdfkit's built-in
  // font metrics, and the homepage site kit's source (lib/site-kit).
  outputFileTracingIncludes: {
    "/api/export/\\[runId\\]": ["./node_modules/pretendard/dist/public/static/Pretendard-{Regular,Bold}.otf", "./node_modules/pdfkit/js/data/**/*"],
    "/api/tools/\\[toolId\\]/run": ["./node_modules/pretendard/dist/public/static/Pretendard-{Regular,Bold,ExtraBold,Black}.otf", "./lib/site-kit/kit.ts"],
  },
  // Older URLs from the first shell pass, folded into Help / Account / Tools.
  async redirects() {
    return [
      { source: "/home", destination: "/studio", permanent: false },
      { source: "/support", destination: "/help/contact", permanent: false },
      { source: "/faq", destination: "/help/faq", permanent: false },
      { source: "/patch-notes", destination: "/help/whats-new", permanent: false },
      { source: "/membership", destination: "/account/membership", permanent: false },
      { source: "/settings", destination: "/account", permanent: false },
      { source: "/settings/api-keys", destination: "/account/api-key", permanent: false },
      { source: "/prompts", destination: "/tools", permanent: false },
      { source: "/quick-links", destination: "/links", permanent: false },
      { source: "/api-management", destination: "/account/api-key", permanent: false },
      { source: "/history", destination: "/library", permanent: false },
      { source: "/workflows", destination: "/tools#flows", permanent: false },
    ];
  },
};

export default nextConfig;
