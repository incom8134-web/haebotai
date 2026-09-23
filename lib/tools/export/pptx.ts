import PptxGenJS from "pptxgenjs";

// HAEBOT_A_TOOLS_SPEC.md §5.1 / §5.2 — a real, editable .pptx (open it in
// PowerPoint/Keynote/Google Slides and every text box is still text),
// not a PDF or an HTML-to-image conversion. Text-only: the model
// describes each slide's `visual` in words (no image-generation call
// happens for this tool), so the export renders that description as a
// visible caption instead of faking a picture that was never made.
//
// ponytail: no theme/master slides, no charts, no per-tone color
// palette from the `design_tone` input (the exporter only receives the
// tool's `output`, matching every other export here) — one clean,
// readable layout. Upgrade path if that's wanted: thread `input` through
// like buildBusinessPlanXlsx already does, and branch on design_tone.

const KO_FONT = "Malgun Gothic";
const INK = "1A1A1A";
const MUTED = "6B6459";
const ACCENT = "6D4AFF";

interface PresentationOutput {
  title: string;
  storyline: string;
  slides: { headline: string; points: string[]; visual: string; speaker_notes: string }[];
  closing_ask: string;
}

export async function buildPresentationPptx(output: PresentationOutput): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";
  pptx.author = "해봇 AI";
  pptx.title = output.title;

  const title = pptx.addSlide();
  title.background = { color: INK };
  title.addText(output.title, { x: 0.7, y: 2.3, w: 8.9, h: 1.5, fontSize: 36, bold: true, color: "FFFFFF", fontFace: KO_FONT, align: "left" });
  title.addText(output.storyline, { x: 0.7, y: 3.9, w: 8.9, h: 1.2, fontSize: 16, color: "D8D3C8", fontFace: KO_FONT, align: "left" });

  for (const slide of output.slides) {
    const s = pptx.addSlide();
    s.background = { color: "FFFFFF" };
    s.addText(slide.headline, { x: 0.6, y: 0.45, w: 8.9, h: 0.9, fontSize: 26, bold: true, color: INK, fontFace: KO_FONT });

    if (slide.points.length > 0) {
      s.addText(
        slide.points.map((p) => ({ text: p, options: { bullet: { indent: 18 }, breakLine: true } })),
        { x: 0.6, y: 1.5, w: 8.9, h: 4.4, fontSize: 16, color: INK, fontFace: KO_FONT, valign: "top", paraSpaceAfter: 10 },
      );
    }

    if (slide.visual) {
      s.addText(`\u{1F5BC} ${slide.visual}`, { x: 0.6, y: 6.15, w: 8.9, h: 0.9, fontSize: 11, italic: true, color: MUTED, fontFace: KO_FONT });
    }

    if (slide.speaker_notes) s.addNotes(slide.speaker_notes);
  }

  const closing = pptx.addSlide();
  closing.background = { color: ACCENT };
  closing.addText(output.closing_ask, { x: 0.7, y: 2.6, w: 8.9, h: 2, fontSize: 28, bold: true, color: "FFFFFF", fontFace: KO_FONT, align: "left", valign: "middle" });

  const result = await pptx.write({ outputType: "nodebuffer" });
  return Buffer.from(result as Uint8Array);
}
