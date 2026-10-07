"use client";

import { useId } from "react";
import { GEM, LOGO } from "@/lib/brand/logo-data";
import { useLocale } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

// The AI 해바 logo: the 지니에듀테크 gem beside a heavy wordmark — "AI 해바"
// (main), "AI Haeba" on the English site. Inline SVG drawn from
// lib/brand/logo-data.ts (scripts/brand/render-brand.mjs), so the words
// take the theme's text colour and the gem its --gem-* blues: one logo
// that reads on light and dark.

function Gem({ id }: { id: string }) {
  return (
    <>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2={GEM.width} y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" style={{ stopColor: "var(--gem-1)" }} />
          <stop offset="0.5" style={{ stopColor: "var(--gem-2)" }} />
          <stop offset="1" style={{ stopColor: "var(--gem-3)" }} />
        </linearGradient>
      </defs>
      {GEM.facets.map((points) => (
        <polygon key={points} points={points} fill={`url(#${id})`} stroke={`url(#${id})`} strokeWidth={GEM.stroke} strokeLinejoin="round" />
      ))}
    </>
  );
}

const useGradientId = () => `gem${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

/** The gem alone — the app icon, for tight spots. Decorative unless `label` is given. */
export function BrandMark({ size = 32, className, label }: { size?: number; className?: string; label?: string }) {
  const id = useGradientId();
  return (
    <svg
      viewBox={`0 0 ${GEM.width} ${GEM.height}`}
      width={size}
      height={Math.round((size * GEM.height) / GEM.width)}
      className={cn("shrink-0", className)}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      <Gem id={id} />
    </svg>
  );
}

/** The full logo, `height` px tall; the wordmark follows the site language. */
export function BrandLogo({ height = 24, className }: { height?: number; className?: string }) {
  const { locale } = useLocale();
  const id = useGradientId();
  const en = locale === "en";
  const logo = LOGO[en ? "en" : "ko"];
  // Latin capitals fill the whole box where Hangul has air above and below, so English is set a little smaller to look the same size.
  const h = en ? Math.round(height * 0.84) : height;
  return (
    <svg
      viewBox={`0 0 ${logo.width} ${logo.height}`}
      height={h}
      width={Math.round((h * logo.width) / logo.height)}
      role="img"
      aria-label={en ? "AI Haeba" : "AI 해바"}
      className={cn("shrink-0 text-fg", className)}
    >
      <g transform={logo.gem}>
        <Gem id={id} />
      </g>
      {logo.words.map((w) => (
        <path key={w.transform} transform={w.transform} d={w.d} fill="currentColor" />
      ))}
    </svg>
  );
}
