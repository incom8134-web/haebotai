"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { MessageSquareText, Pause, Play, Sparkles, Wand2 } from "lucide-react";
import { useBi } from "@/lib/i18n/context";

// Right after the hero: a 10-second concept film of the one idea the
// product rests on — type what you want in a line, results come back as
// finished pieces. Silent, light (≈0.3–0.6 MB), loads only near the
// viewport, plays only while visible, and never autoplays for people who
// asked for reduced motion. Labelled as a concept film: it isn't the
// actual interface.

const POINTS = [
  { icon: MessageSquareText, text: { ko: "한 줄로 요청", en: "Ask in one line" } },
  { icon: Wand2, text: { ko: "맞는 도구가 이해하고 설계", en: "The right tool reads and plans it" } },
  { icon: Sparkles, text: { ko: "바로 쓰는 결과물로", en: "Back as finished work" } },
];

export function ConceptFilm() {
  const L = useBi();
  const reduce = useReducedMotion();
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [userPaused, setUserPaused] = useState(false);

  // Play while on screen, pause when scrolled away (unless the visitor paused it).
  useEffect(() => {
    const v = ref.current;
    if (!v || reduce) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !userPaused) v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.45 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, [reduce, userPaused]);

  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) {
      setUserPaused(false);
      v.play().catch(() => {});
    } else {
      setUserPaused(true);
      v.pause();
    }
  };

  return (
    <section id="film" aria-labelledby="film-title" className="mx-auto max-w-[1200px] scroll-mt-24 px-4 pt-4 pb-8 md:px-6">
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="grid items-center gap-6 overflow-hidden rounded-[32px] bg-[#0b0d10] p-4 text-white shadow-[0_40px_100px_-50px_rgba(0,0,0,0.7)] md:grid-cols-[1fr_1.55fr] md:gap-10 md:p-8"
      >
        <div className="order-2 px-2 pb-2 md:order-1 md:px-2">
          <p className="text-sm font-semibold text-[#7ab6ff]">{L({ ko: "10초로 보는 해바", en: "Haeba in 10 seconds" })}</p>
          <h2 id="film-title" className="mt-2 font-display text-[clamp(1.6rem,3vw,2.3rem)] leading-tight font-bold tracking-[-0.02em] break-keep">
            {L({ ko: "적으면, 완성된 결과로 돌아와요", en: "Write it down. Get finished work back." })}
          </h2>
          <ul className="mt-5 space-y-3">
            {POINTS.map((p, i) => (
              <li key={i} className="flex items-center gap-3 text-sm text-white/80">
                <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-white/10 text-[#7ab6ff]">
                  <p.icon size={15} aria-hidden />
                </span>
                {L(p.text)}
              </li>
            ))}
          </ul>
          <p className="mt-5 text-2xs text-white/45">{L({ ko: "콘셉트 영상이에요. 실제 화면은 위와 아래에서 볼 수 있어요.", en: "A concept film — the real screens are above and below." })}</p>
        </div>

        <div className="relative order-1 overflow-hidden rounded-[22px] ring-1 ring-white/10 md:order-2">
          <video
            ref={ref}
            className="aspect-video w-full bg-black object-cover"
            poster="/videos/concept-poster.jpg"
            muted
            loop
            playsInline
            preload="none"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            aria-label={L({ ko: "한 줄 요청이 이미지·카피·일정 결과로 바뀌는 콘셉트 영상 (소리 없음)", en: "Concept film: a one-line request turning into images, copy and a schedule (no sound)" })}
          >
            <source src="/videos/concept.webm" type="video/webm" />
            <source src="/videos/concept.mp4" type="video/mp4" />
          </video>
          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? L({ ko: "일시정지", en: "Pause" }) : L({ ko: "재생", en: "Play" })}
            className="absolute right-3 bottom-3 grid size-10 place-items-center rounded-full bg-black/55 text-white backdrop-blur transition-colors hover:bg-black/75"
          >
            {playing ? <Pause size={16} aria-hidden /> : <Play size={16} className="translate-x-px" aria-hidden />}
          </button>
        </div>
      </motion.div>
    </section>
  );
}
