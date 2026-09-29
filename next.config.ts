import type { NextConfig } from "next";

// Full policy, shipped as Report-Only: browsers report what it WOULD block
// to /api/csp-report without blocking anything. Once the reports are clean
// in production, rename the header to Content-Security-Policy to enforce.
// Generated-site previews (srcdoc iframes) inherit this policy, so the
// site kit's CDN and font hosts are listed too.
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host : "*.supabase.co";
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://js.tosspayments.com https://*.tosspayments.com https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
  `img-src 'self' data: blob: https://${supabase} https://*.tosspayments.com`,
  "font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net",
  `connect-src 'self' https://${supabase} wss://${supabase} https://*.tosspayments.com`,
  "frame-src 'self' blob: https://*.tosspayments.com https://www.google.com",
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://*.tosspayments.com",
  "report-uri /api/csp-report",
].join("; ");

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
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Content-Security-Policy-Report-Only", value: CSP },
        ],
      },
      {
        // Checkout return pages are left frameable in case Toss's payment
        // layer loads them inside its iframe.
        source: "/:path((?!account/membership/checkout).*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
        ],
      },
    ];
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
