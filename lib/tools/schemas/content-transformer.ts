import { z } from "zod";

// 콘텐츠 변환기: one source piece rewritten for each platform — not the
// same text trimmed, but re-shaped for how that platform is read: a
// carousel as slides, a short video as a timed script, a thread as posts.

export const TRANSFORM_TARGETS = ["instagram_carousel", "instagram_caption", "threads", "linkedin", "shorts_script", "newsletter", "naver_blog", "kakao"] as const;

const outputSchema = z.object({
  core_message: z.string(),
  key_points: z.array(z.string()).min(2).max(6),
  versions: z
    .array(
      z.object({
        platform: z.enum(TRANSFORM_TARGETS),
        angle: z.string(),
        title: z.string(),
        body: z.string(),
        slides: z.array(z.object({ heading: z.string(), text: z.string() })),
        script: z.array(z.object({ time: z.string(), visual: z.string(), voice: z.string() })),
        posts: z.array(z.string()),
        hashtags: z.array(z.string()),
        cta: z.string(),
        note: z.string(),
      }),
    )
    .min(1)
    .max(8),
  dropped: z.array(z.string()),
});

export default outputSchema;
