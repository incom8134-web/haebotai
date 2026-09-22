// HAEBOT_A_TOOLS_SPEC.md §4.9 / Part 6 T6 — "logo returns valid,
// sanitized, renderable SVG." The model returns SVG as text; this is the
// server-side validation gate before it's ever put in front of a browser
// (SVG can carry <script>, event-handler attributes, javascript: URIs,
// and SMIL-based script gadgets same as HTML — it's real attack
// surface, not a formality).
//
// Allow-list, not block-list. A block-list regex is exactly the shape of
// sanitizer security research keeps finding bypasses for — e.g.
// <animate>/<set> retargeting an href to a javascript: URI at runtime,
// which never contains the literal string a "href=...javascript:" regex
// would catch. This walks real tags and attributes with a small
// tokenizer (tracking quotes, so a `>` inside an attribute value can't
// end a tag early).
//
// Two tiers, not one: an attribute we simply don't recognize (some valid
// SVG attribute the allow-list hasn't caught up to — real logos use a lot
// of them) is silently stripped, not a reason to fail the whole SVG. A
// disallowed ELEMENT, or one of the specific dangerous categories below
// (event handlers, a style/url() external load, a non-fragment href) —
// still rejects the entire SVG; those are exactly the shapes that let
// untrusted markup run script or exfiltrate, so there's no safe partial
// form of them to keep.

export interface SvgSanitizeResult {
  ok: boolean;
  svg?: string;
  reason?: string;
}

// Shape-only elements a generated logo can plausibly need. Deliberately
// excludes <image> (raster/external embedding a vector logo shouldn't
// need), <a> (no hyperlinks in a logo), <script>, <foreignObject>,
// <style>, and every SMIL animation element (<animate>, <animateMotion>,
// <animateTransform>, <set>, <animateColor>) — the last group is exactly
// the well-known bypass class for regex-based sanitizers. An element not
// on this list fails the whole SVG (hard reject) — there's no safe
// partial form of an unrecognized element the way there is for an
// unrecognized attribute.
const ALLOWED_ELEMENTS = new Set([
  "svg", "g", "path", "rect", "circle", "ellipse", "line", "polyline", "polygon",
  "text", "tspan", "defs", "clippath", "mask", "lineargradient", "radialgradient",
  "stop", "pattern", "symbol", "use", "title", "desc", "marker",
]);

// Recognized presentation/geometry attributes. Anything NOT on this list
// (and not href/style/on*, handled separately below) is stripped from
// the rebuilt output rather than failing the whole SVG — real logo SVGs
// routinely use attributes this list hasn't been extended to yet
// (dx/dy on tspan, rotate, textLength, spreadMethod, ...), and none of
// those are a way to run script or exfiltrate on their own.
const ALLOWED_ATTRIBUTES = new Set([
  "id", "class", "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin",
  "stroke-dasharray", "stroke-dashoffset", "stroke-miterlimit", "opacity", "fill-opacity",
  "stroke-opacity", "fill-rule", "clip-rule", "transform", "viewbox", "width", "height",
  "x", "y", "x1", "y1", "x2", "y2", "cx", "cy", "r", "rx", "ry", "dx", "dy", "points", "d",
  "offset", "stop-color", "stop-opacity", "gradientunits", "gradienttransform",
  "patterntransform", "patternunits", "patterncontentunits", "xmlns", "xmlns:xlink",
  "version", "preserveaspectratio", "font-family", "font-size", "font-weight", "font-style",
  "text-anchor", "dominant-baseline", "letter-spacing", "clip-path", "mask", "style",
  "spreadmethod", "rotate", "textlength", "lengthadjust", "visibility", "overflow",
  "shape-rendering", "vector-effect", "paint-order",
]);

// href only as a same-document fragment reference (<use href="#id">,
// gradient/pattern targets) — never an external URL, javascript:, or
// data: URI. Checked on the attribute VALUE, not pattern-matched against
// a "javascript:" blocklist, so there's nothing else to bypass. A
// non-fragment href is a hard reject (whole SVG), same tier as an event
// handler — not something to just strip and move on from.
const HREF_ATTRIBUTES = new Set(["href", "xlink:href"]);
const SAFE_FRAGMENT_REF = /^#[\w.:-]+$/;
const DANGEROUS_STYLE_VALUE = /url\s*\(|expression\s*\(|javascript:|@import/i;

interface Tag {
  type: "open" | "close" | "selfclose";
  name: string;
  attrs: Record<string, string>;
}
type Token = Tag | { type: "text"; text: string } | { type: "skip" };

// Scans for the tag-ending '>' while tracking quotes, so a literal '>'
// inside a quoted attribute value doesn't end the tag early.
function findTagEnd(svg: string, start: number): number {
  let quote: string | null = null;
  for (let i = start; i < svg.length; i++) {
    const c = svg[i];
    if (quote) {
      if (c === quote) quote = null;
    } else if (c === '"' || c === "'") {
      quote = c;
    } else if (c === ">") {
      return i;
    }
  }
  return -1;
}

function parseAttrs(body: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    attrs[m[1].toLowerCase()] = m[2] !== undefined ? m[2] : (m[3] ?? "");
  }
  return attrs;
}

function tokenize(svg: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < svg.length) {
    if (svg[i] !== "<") {
      const next = svg.indexOf("<", i);
      const end = next === -1 ? svg.length : next;
      tokens.push({ type: "text", text: svg.slice(i, end) });
      i = end;
      continue;
    }
    if (svg.startsWith("<!--", i)) {
      const end = svg.indexOf("-->", i + 4);
      tokens.push({ type: "skip" });
      i = end === -1 ? svg.length : end + 3;
      continue;
    }
    if (svg.startsWith("<![CDATA[", i)) {
      const end = svg.indexOf("]]>", i + 9);
      tokens.push({ type: "skip" });
      i = end === -1 ? svg.length : end + 3;
      continue;
    }
    if (svg[i + 1] === "!" || svg[i + 1] === "?") {
      // doctype / processing instruction — no attributes worth checking
      const end = findTagEnd(svg, i);
      tokens.push({ type: "skip" });
      i = end === -1 ? svg.length : end + 1;
      continue;
    }
    const isClose = svg[i + 1] === "/";
    const tagStart = isClose ? i + 2 : i + 1;
    const end = findTagEnd(svg, i);
    if (end === -1) {
      // Unterminated tag — fail closed rather than guess at intent.
      tokens.push({ type: "open", name: "\0malformed", attrs: {} });
      i = svg.length;
      continue;
    }
    const inner = svg.slice(tagStart, end).trim();
    i = end + 1;
    if (isClose) {
      tokens.push({ type: "close", name: inner.toLowerCase(), attrs: {} });
      continue;
    }
    const selfClosing = inner.endsWith("/");
    const body = selfClosing ? inner.slice(0, -1).trim() : inner;
    const nameMatch = /^([^\s/>]+)/.exec(body);
    const name = (nameMatch?.[1] ?? "").toLowerCase();
    tokens.push({
      type: selfClosing ? "selfclose" : "open",
      name,
      attrs: parseAttrs(body.slice(nameMatch?.[0]?.length ?? 0)),
    });
  }
  return tokens;
}

function escapeAttrValue(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

/** Rebuilds the attribute string for one tag, stripping unrecognized-but-harmless attributes; returns a hard-reject reason for the dangerous categories. */
function sanitizeAttrs(attrs: Record<string, string>): { out: string } | { reject: string } {
  let out = "";
  for (const [name, value] of Object.entries(attrs)) {
    if (name.startsWith("on")) return { reject: "이벤트 핸들러 속성은 허용되지 않습니다" };
    if (HREF_ATTRIBUTES.has(name)) {
      if (!SAFE_FRAGMENT_REF.test(value.trim())) return { reject: "href는 문서 내부 참조(#id)만 허용됩니다" };
      out += ` ${name}="${escapeAttrValue(value)}"`;
      continue;
    }
    if (name === "style") {
      if (DANGEROUS_STYLE_VALUE.test(value)) return { reject: "style 속성에 외부 참조가 포함되어 있습니다" };
      out += ` style="${escapeAttrValue(value)}"`;
      continue;
    }
    if (!ALLOWED_ATTRIBUTES.has(name)) continue; // unrecognized but not dangerous — drop silently, don't fail the SVG
    out += ` ${name}="${escapeAttrValue(value)}"`;
  }
  return { out };
}

export function sanitizeSvg(svg: string): SvgSanitizeResult {
  const trimmed = svg.trim();
  if (!/^<svg[\s>]/i.test(trimmed)) {
    return { ok: false, reason: "유효한 SVG가 아닙니다" };
  }

  let out = "";
  for (const token of tokenize(trimmed)) {
    if (token.type === "skip") continue;
    if (token.type === "text") {
      out += token.text;
      continue;
    }
    if (token.type === "close") {
      // Reachable only for an element whose matching open already passed
      // (any rejection above returns immediately), so this always closes
      // something already emitted.
      out += `</${token.name}>`;
      continue;
    }
    if (!ALLOWED_ELEMENTS.has(token.name)) {
      return { ok: false, reason: `허용되지 않는 태그가 포함되어 있습니다: <${token.name}>` };
    }
    const attrs = sanitizeAttrs(token.attrs);
    if ("reject" in attrs) {
      return { ok: false, reason: `${attrs.reject} (<${token.name}>)` };
    }
    out += `<${token.name}${attrs.out}${token.type === "selfclose" ? " />" : ">"}`;
  }

  return { ok: true, svg: out };
}
