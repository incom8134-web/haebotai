"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Play } from "lucide-react";
import { useBi } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

// The three landing-page videos (public/videos). Two are quiet background
// scenes — a paper-and-light build-up that plays once when it scrolls into
// view and then holds its last frame (they are builds, not loops, and a
// held frame costs no CPU). The third is a short story you start yourself.
//
// Rules for all of them: the poster shows first (it is the page's image
// while nothing plays); nothing plays for people who prefer reduced
// motion or have Data Saver on; phones get a smaller file; background
// scenes are decorative (aria-hidden) and carry no text of their own.

type SceneName = "hero" | "how";

const subscribeStill = (notify: () => void) => {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", notify);
  return () => mq.removeEventListener("change", notify);
};

/** True when motion should not start by itself (reduced motion, or Data Saver). */
function useStill(): boolean {
  return useSyncExternalStore(
    subscribeStill,
    () => {
      const saver = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches || saver;
    },
    () => false,
  );
}

const noop = () => () => {};

/** A decorative scene that plays once when visible, then holds its last frame. */
export function SceneVideo({ name, className, priority = false }: { name: SceneName; className?: string; priority?: boolean }) {
  const still = useStill();
  // The server renders no <source>: the browser must not start downloading
  // before we know whether motion is wanted.
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const ref = useRef<HTMLVideoElement>(null);
  const visible = useRef(false);
  // Off-screen scenes load nothing until they are near the viewport.
  const [near, setNear] = useState(priority);
  const armed = mounted && !still && near;

  useEffect(() => {
    const el = ref.current;
    if (!el || still) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          visible.current = e.isIntersecting;
          if (e.isIntersecting) {
            setNear(true);
            if (!el.ended) el.play().catch(() => {});
          } else {
            el.pause();
          }
        }
      },
      { threshold: 0.25, rootMargin: "200px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [still]);

  // Sources arrive after the first intersection: start then, too.
  useEffect(() => {
    const el = ref.current;
    if (armed && visible.current && el && !el.ended) el.play().catch(() => {});
  }, [armed]);

  const src = `/videos/${name}`;
  return (
    <video
      ref={ref}
      muted
      playsInline
      preload={armed ? "auto" : "none"}
      poster={`${src}-poster.jpg`}
      aria-hidden
      tabIndex={-1}
      disablePictureInPicture
      className={cn("size-full object-cover", className)}
    >
      {armed ? (
        <>
          <source src={`${src}-sm.mp4`} media="(max-width: 767px)" type="video/mp4" />
          <source src={`${src}.mp4`} type="video/mp4" />
        </>
      ) : null}
    </video>
  );
}

/** The short story video: a poster with a play button; sound is on once you start it. */
export function StoryVideo({ className }: { className?: string }) {
  const L = useBi();
  const [playing, setPlaying] = useState(false);
  const label = L({ ko: "빵집 사장님이 노트북으로 문서를 정리하는 하루", en: "A shop owner sorting out documents on a laptop" });
  return (
    <div className={cn("relative aspect-video overflow-hidden rounded-[24px] border border-hairline bg-surface-2", className)}>
      {playing ? (
        <video autoPlay controls playsInline preload="auto" poster="/videos/story-poster.jpg" aria-label={label} className="size-full object-cover">
          <source src="/videos/story.mp4" type="video/mp4" />
          <track kind="captions" src="/videos/story.ko.vtt" srcLang="ko" label="한국어" default />
        </video>
      ) : (
        <button type="button" onClick={() => setPlaying(true)} className="group relative block size-full" aria-label={L({ ko: `영상 재생: ${label} (10초)`, en: `Play video: ${label} (10 s)` })}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/videos/story-poster.jpg" alt="" loading="lazy" decoding="async" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
          <span className="absolute inset-0 grid place-items-center bg-black/10 transition-colors group-hover:bg-black/20">
            <span className="grid size-16 place-items-center rounded-full bg-white/90 text-[#9a3412] shadow-lg ring-1 ring-black/5 transition-transform group-hover:scale-105">
              <Play size={26} className="translate-x-0.5 fill-current" aria-hidden />
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
