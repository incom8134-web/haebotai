// Model replies that should be a web page: find the document in them.

/**
 * The HTML document inside a model reply: tolerates code fences or a
 * sentence around it, and closes a document cut off at the end.
 */
export function extractHtml(raw: string): string | null {
  const text = raw.replace(/```(?:html)?/gi, "");
  const start = text.search(/<!doctype html|<html[\s>]/i);
  if (start < 0) return null;
  let html = text.slice(start).trim();
  const end = html.toLowerCase().lastIndexOf("</html>");
  if (end >= 0) html = html.slice(0, end + "</html>".length);
  else html += `${/<\/body>/i.test(html) ? "" : "\n</body>"}\n</html>`;
  return /<body[\s>]/i.test(html) ? html : null;
}
