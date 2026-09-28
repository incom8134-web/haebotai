import { z } from "zod";

// `hero_image_prompt` feeds a real hero photo from the image model,
// embedded into the HTML in place of {{HERO_IMAGE_URL}} (generate.ts),
// so the downloaded file is self-contained. preview_url/zip_asset_id are
// kept for older runs; the model leaves them empty.
const outputSchema = z.object({
  html: z.string(),
  sections: z.array(z.string()),
  hero_image_prompt: z.string(),
  preview_url: z.string(),
  zip_asset_id: z.string(),
});

export default outputSchema;
