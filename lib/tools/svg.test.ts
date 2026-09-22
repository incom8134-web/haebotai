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

console.log("svg sanitizer: all checks passed");
