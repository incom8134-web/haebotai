"use client";

import { useBi } from "@/lib/i18n/context";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Monitor, Smartphone } from "lucide-react";

// The generated site, live: scripts run (Three.js scenes, GSAP scroll
// animations) inside a sandbox without same-origin access, so the page
// can't touch the app's cookies or storage. A PC/phone toggle shows the
// responsive layout, and the design card says what the art director
// chose and why.

interface Design {
  concept?: string;
  mood?: string[];
  palette?: string[];
  display_font?: string;
  big_idea?: string;
  scene?: string;
  scroll?: string[];
}

const SCENE_LABEL: Record<string, { ko: string; en: string }> = {
  "liquid-image": { ko: "커서에 일렁이는 사진", en: "Liquid photo" },
  orb: { ko: "변형되는 3D 구체", en: "Morphing 3D orb" },
  "particles-text": { ko: "입자로 그린 상호", en: "Particle wordmark" },
  "photo-ring": { ko: "3D 사진 링", en: "3D photo ring" },
  waves: { ko: "흐르는 3D 지형", en: "Flowing 3D terrain" },
  floating: { ko: "떠다니는 3D 오브젝트", en: "Floating 3D objects" },
  aurora: { ko: "살아 있는 그라데이션", en: "Living gradient" },
};

export function SitePreview({ html, design }: { html: string; design?: Design }) {
  const L = useBi();
  const [device, setDevice] = useState<"pc" | "phone">("pc");
  const boxRef = useRef<HTMLDivElement>(null);
  const [boxWidth, setBoxWidth] = useState(0);

  // The PC view renders the site at a real desktop width and scales it
  // down to the column, so it shows the desktop layout, not the tablet one.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setBoxWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const DESKTOP = 1280;
  const VIEW_H = 620;
  const scale = device === "pc" && boxWidth ? Math.min(1, boxWidth / DESKTOP) : 1;

  // Not a blob URL: that would run the page's scripts with the app's own
  // origin (and its login cookies). The new tab hosts it in the same
  // sandboxed frame as the preview.
  function openFull() {
    const win = window.open("", "_blank");
    if (!win) return;
    win.opener = null;
    win.document.title = L({ ko: "홈페이지 미리보기 · 해봇 AI", en: "Website preview · Haebot AI" });
    win.document.body.style.margin = "0";
    const frame = win.document.createElement("iframe");
    frame.setAttribute("sandbox", "allow-scripts");
    frame.srcdoc = html;
    frame.style.cssText = "border:0;width:100vw;height:100vh;display:block";
    win.document.body.appendChild(frame);
  }

  const toggle = (d: "pc" | "phone", label: string, Icon: typeof Monitor) => (
    <button
      type="button"
      onClick={() => setDevice(d)}
      aria-pressed={device === d}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs transition-colors ${device === d ? "bg-surface-2 text-fg" : "text-fg-muted hover:text-fg"}`}
    >
      <Icon className="size-3.5" aria-hidden />
      {label}
    </button>
  );

  return (
    <div className="mt-3 flex flex-col gap-3">
      {design?.concept ? (
        <div className="rounded-2xl border border-hairline p-3">
          <p className="text-2xs text-fg-subtle">{L({ ko: "디자인 콘셉트", en: "Design concept" })}</p>
          {design.big_idea ? <p className="mt-1 text-sm font-medium leading-relaxed text-fg break-keep">{design.big_idea}</p> : null}
          <p className="mt-1 text-sm leading-relaxed text-fg-muted break-keep">{design.concept}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            {design.palette?.length ? (
              <span className="flex gap-1">
                {design.palette.map((hex) => (
                  <span key={hex} title={hex} className="size-5 rounded-full border border-hairline" style={{ background: hex }} />
                ))}
              </span>
            ) : null}
            {design.display_font ? <span className="text-xs text-fg-muted">{L({ ko: "제목 서체", en: "Heading font" })} {design.display_font}</span> : null}
            {design.scene && SCENE_LABEL[design.scene] ? (
              <span className="rounded-full bg-surface-2 px-2 py-0.5 text-2xs text-fg">3D · {L(SCENE_LABEL[design.scene])}</span>
            ) : null}
            {design.mood?.map((m) => (
              <span key={m} className="rounded-full border border-hairline px-2 py-0.5 text-2xs text-fg-muted">
                {m}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1 rounded-full border border-hairline p-0.5">
          {toggle("pc", "PC", Monitor)}
          {toggle("phone", L({ ko: "모바일", en: "Mobile" }), Smartphone)}
        </div>
        <button type="button" onClick={openFull} className="inline-flex items-center gap-1 text-xs text-fg-muted hover:text-fg">
          <ExternalLink className="size-3.5" aria-hidden />
          {L({ ko: "새 탭에서 크게 보기", en: "Open full size in a new tab" })}
        </button>
      </div>

      <div ref={boxRef} className="flex justify-center overflow-hidden rounded-2xl border border-hairline bg-surface-2/40" style={{ height: VIEW_H }}>
        {device === "pc" ? (
          <iframe
            title={L({ ko: "생성된 홈페이지 미리보기 (PC)", en: "Generated website preview (desktop)" })}
            srcDoc={html}
            sandbox="allow-scripts"
            className="shrink-0 origin-top-left bg-white"
            style={{ width: DESKTOP, height: VIEW_H / scale, transform: `scale(${scale})`, marginRight: -(DESKTOP * (1 - scale)) }}
          />
        ) : (
          <iframe
            title={L({ ko: "생성된 홈페이지 미리보기 (모바일)", en: "Generated website preview (mobile)" })}
            srcDoc={html}
            sandbox="allow-scripts"
            className="my-3 w-[390px] max-w-full rounded-[28px] border-4 border-fg/80 bg-white"
            style={{ height: VIEW_H - 24 }}
          />
        )}
      </div>
    </div>
  );
}
