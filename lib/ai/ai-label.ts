// Machine-readable "made by generative AI" label for the images we store
// (AI 기본법 §31: results of generative AI must be marked as such). The
// result and share screens already say it in words; this puts it in the
// file itself, so it travels with a download. It is the IPTC
// DigitalSourceType in an XMP packet — the field Google, Adobe and the
// C2PA tools read — written into the PNG (iTXt chunk) or JPEG (APP1
// segment) without re-encoding a single pixel. Other formats pass
// through unchanged. Pure Buffer work, no dependencies.

type AiSource = "trainedAlgorithmicMedia" | "compositeWithTrainedAlgorithmicMedia";

const MARK = "Iptc4xmpExt:DigitalSourceType";

function aiXmp(source: AiSource = "trainedAlgorithmicMedia"): string {
  const what = source === "trainedAlgorithmicMedia" ? "AI-generated image (생성형 AI로 만든 이미지)" : "Image containing AI-generated content (생성형 AI 결과물을 포함한 이미지)";
  return (
    `<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>` +
    `<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">` +
    `<rdf:Description rdf:about="" xmlns:Iptc4xmpExt="http://iptc.org/std/Iptc4xmpExt/2008-02-29/" xmlns:xmp="http://ns.adobe.com/xap/1.0/" xmlns:dc="http://purl.org/dc/elements/1.1/"` +
    ` ${MARK}="http://cv.iptc.org/newscodes/digitalsourcetype/${source}" xmp:CreatorTool="AI 해바 (AI Haeba)">` +
    `<dc:description><rdf:Alt><rdf:li xml:lang="x-default">${what}</rdf:li></rdf:Alt></dc:description>` +
    `</rdf:Description></rdf:RDF></x:xmpmeta><?xpacket end="r"?>`
  );
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const isPng = (b: Buffer) => b.length > 33 && b.readUInt32BE(0) === 0x89504e47 && b.readUInt32BE(4) === 0x0d0a1a0a && b.toString("latin1", 12, 16) === "IHDR";
const isJpeg = (b: Buffer) => b.length > 4 && b[0] === 0xff && b[1] === 0xd8;

function pngWithXmp(png: Buffer, xmp: string): Buffer {
  // iTXt: keyword, NUL, compression flag 0, method 0, empty language, NUL, empty translated keyword, NUL, text.
  const data = Buffer.concat([Buffer.from("XML:com.adobe.xmp\0\0\0\0\0", "latin1"), Buffer.from(xmp, "utf8")]);
  const typeAndData = Buffer.concat([Buffer.from("iTXt", "latin1"), data]);
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  typeAndData.copy(chunk, 4);
  chunk.writeUInt32BE(crc32(typeAndData), 8 + data.length);
  const afterIhdr = 8 + 12 + png.readUInt32BE(8); // signature + IHDR chunk
  return Buffer.concat([png.subarray(0, afterIhdr), chunk, png.subarray(afterIhdr)]);
}

function jpegWithXmp(jpg: Buffer, xmp: string): Buffer | null {
  const body = Buffer.concat([Buffer.from("http://ns.adobe.com/xap/1.0/\0", "latin1"), Buffer.from(xmp, "utf8")]);
  if (body.length + 2 > 0xffff) return null;
  const seg = Buffer.alloc(4 + body.length);
  seg[0] = 0xff;
  seg[1] = 0xe1;
  seg.writeUInt16BE(body.length + 2, 2);
  body.copy(seg, 4);
  // JFIF wants its APP0 right after SOI, so the XMP goes after it when present.
  let at = 2;
  if (jpg[2] === 0xff && jpg[3] === 0xe0 && jpg.length > 6) at = 4 + jpg.readUInt16BE(4);
  if (at > jpg.length) return null;
  return Buffer.concat([jpg.subarray(0, at), seg, jpg.subarray(at)]);
}

/** The image with the AI-generated label added; unchanged when it is not PNG/JPEG or already labelled. */
export function labelAiImage(bytes: Buffer, source: AiSource = "trainedAlgorithmicMedia"): Buffer {
  try {
    if (bytes.includes(MARK, 0, "latin1")) return bytes;
    if (isPng(bytes)) return pngWithXmp(bytes, aiXmp(source));
    if (isJpeg(bytes)) return jpegWithXmp(bytes, aiXmp(source)) ?? bytes;
  } catch {
    // A malformed file is stored as it came; the on-screen notice still applies.
  }
  return bytes;
}
