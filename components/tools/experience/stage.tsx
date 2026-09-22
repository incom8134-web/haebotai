"use client";

import { motion, AnimatePresence } from "motion/react";
import { useBi, useLocale } from "@/lib/i18n/context";
import type { Experience } from "@/lib/tools/experience";
import type { ToolFormValues } from "@/components/tool-form";
import { cn } from "@/lib/utils";
import { xIcon } from "./icons";

// The right-hand (or top) "stage": what this tool will hand back, drawn as
// a small live mock that reacts to the form — slide count adds slides,
// homepage sections stack up, break-even recalculates, dates move.

type V = ToolFormValues;
const str = (v: unknown) => (typeof v === "string" ? v : "");
const num = (v: unknown) => (typeof v === "number" && !Number.isNaN(v) ? v : undefined);
const arr = (v: unknown) => (Array.isArray(v) ? (v as string[]) : []);
const bar = "rounded-full bg-fg/10";

function Frame({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("relative overflow-hidden rounded-2xl border border-hairline bg-bg/40 p-4", className)}>{children}</div>;
}

function Deck({ v }: { v: V }) {
  const n = Number(str(v.slide_count) || 8);
  const bold = v.design_tone === "bold";
  return (
    <Frame>
      <div className="grid grid-cols-4 gap-1.5">
        <AnimatePresence initial={false}>
          {Array.from({ length: n }).map((_, i) => (
            <motion.div
              key={i}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3 }}
              className={cn("flex aspect-video flex-col justify-end gap-0.5 rounded-md p-1.5", i === 0 ? (bold ? "studio-gradient-bg" : "bg-studio-cyan/25") : bold ? "bg-studio-violet/15" : "bg-fg/5")}
            >
              <span className={cn("h-1 w-3/4", bar, i === 0 && "bg-white/70")} />
              <span className={cn("h-1 w-1/2", bar)} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <p className="mt-3 font-mono text-2xs text-fg-subtle">{n} slides · {bold ? "bold" : "trust"}</p>
    </Frame>
  );
}

function Site({ v }: { v: V }) {
  const L = useBi();
  const sections = arr(v.sections);
  const labels: Record<string, string> = { hero: "Hero", about: "About", services: "Services", portfolio: "Portfolio", pricing: "Pricing", testimonials: "Reviews", contact: "Contact", faq: "FAQ" };
  return (
    <Frame className="p-0">
      <div className="flex items-center gap-1.5 border-b border-hairline px-3 py-2">
        {["#ef4444", "#f59e0b", "#22c55e"].map((c) => <span key={c} className="size-2 rounded-full" style={{ background: c }} />)}
        <span className="ml-2 h-4 flex-1 rounded-md bg-fg/5" />
      </div>
      <div className="space-y-1.5 p-3">
        {sections.length === 0 ? (
          <p className="py-6 text-center text-xs break-keep text-fg-subtle">{L({ ko: "섹션을 고르면 여기에 쌓여요", en: "Pick sections to stack them here" })}</p>
        ) : (
          <AnimatePresence initial={false}>
            {sections.map((s) => (
              <motion.div key={s} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className={cn("flex items-center justify-between rounded-lg px-3", s === "hero" ? "studio-gradient-bg py-4 text-white" : "bg-fg/5 py-2.5")}>
                <span className="text-2xs font-medium">{labels[s] ?? s}</span>
                <span className="flex gap-1">{[0, 1].map((i) => <span key={i} className={cn("h-1 w-6", bar, s === "hero" && "bg-white/60")} />)}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </Frame>
  );
}

function Plan({ v }: { v: V }) {
  const L = useBi();
  const price = num(v.unit_price);
  const fixed = num(v.fixed_cost);
  const rate = num(v.variable_cost_rate);
  const margin = price !== undefined && rate !== undefined ? price * (1 - rate / 100) : undefined;
  const be = fixed !== undefined && margin && margin > 0 ? Math.ceil(fixed / margin) : undefined;
  const target = num(v.monthly_sales_target);
  const pct = be && target ? Math.min(100, Math.round((target / be) * 100)) : 0;
  return (
    <Frame>
      <p className="text-2xs text-fg-subtle">{L({ ko: "월 손익분기 판매량", en: "Monthly break-even units" })}</p>
      <p className="mt-1 font-display text-4xl font-bold tracking-[-0.02em]">{be !== undefined ? be.toLocaleString() : "—"}</p>
      {be !== undefined && target !== undefined ? (
        <>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-fg/10"><motion.div className={cn("h-full rounded-full", target >= be ? "bg-studio-success" : "bg-studio-warning")} animate={{ width: `${pct}%` }} /></div>
          <p className="mt-1.5 text-2xs break-keep text-fg-muted">
            {target >= be ? L({ ko: `목표 ${target.toLocaleString()}개면 흑자예요`, en: `At ${target.toLocaleString()} a month you're profitable` }) : L({ ko: `목표 ${target.toLocaleString()}개는 손익분기의 ${pct}%예요`, en: `Your target is ${pct}% of break-even` })}
          </p>
        </>
      ) : (
        <p className="mt-2 text-2xs break-keep text-fg-subtle">{L({ ko: "단가·고정비·변동비율을 넣으면 계산돼요", en: "Enter price, fixed cost and variable rate" })}</p>
      )}
    </Frame>
  );
}

function Calendar({ v }: { v: V }) {
  const { locale } = useLocale();
  const start = str(v.start_date) ? new Date(str(v.start_date)) : null;
  const valid = start && !Number.isNaN(start.getTime());
  const end = valid ? new Date(start.getTime() + 13 * 7 * 86_400_000 - 86_400_000) : null;
  const fmt = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" });
  const ms = arr(v.milestones);
  return (
    <Frame>
      <div className="grid grid-cols-13 gap-1">
        {Array.from({ length: 13 }).map((_, i) => (
          <div key={i} className={cn("h-10 rounded-md", i < 4 ? "bg-studio-cyan/25" : i < 9 ? "bg-studio-violet/20" : "bg-studio-success/20", ms.length && [3, 7, 12].slice(0, ms.length).includes(i) && "ring-2 ring-studio-warning")} />
        ))}
      </div>
      <div className="mt-2 flex justify-between font-mono text-2xs text-fg-subtle">
        <span>{valid ? fmt.format(start) : "W1"}</span>
        <span>{end ? fmt.format(end) : "W13"}</span>
      </div>
      {v.pace ? <p className="mt-2 text-2xs text-fg-muted">{v.pace === "sprint" ? "Sprint" : "Steady"}</p> : null}
    </Frame>
  );
}

function Gallery({ v, portrait }: { v: V; portrait?: boolean }) {
  const ratio = str(v.ratio) || (portrait ? "4:5" : "1:1");
  const [w, h] = ratio.split(":").map(Number);
  return (
    <Frame>
      <div className="grid grid-cols-2 gap-2">
        {[0, 1, 2, 3].map((i) => (
          <motion.div key={`${ratio}-${i}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.06 }} className="relative overflow-hidden rounded-xl bg-[linear-gradient(135deg,color-mix(in_oklch,var(--studio-cyan)_22%,transparent),color-mix(in_oklch,var(--studio-violet)_22%,transparent))]" style={{ aspectRatio: `${w} / ${h}` }}>
            {portrait ? <span className="absolute bottom-0 left-1/2 h-3/4 w-1/3 -translate-x-1/2 rounded-t-full bg-fg/15" /> : <span className="absolute inset-x-1/4 bottom-1/4 top-1/3 rounded-lg bg-fg/15" />}
            <span className="absolute top-1.5 left-1.5 font-mono text-[9px] text-fg-muted">#{i + 1}</span>
          </motion.div>
        ))}
      </div>
      <p className="mt-2 font-mono text-2xs text-fg-subtle">{ratio}{v.preset ? ` · ${str(v.preset)}` : ""}</p>
    </Frame>
  );
}

function Logo({ v }: { v: V }) {
  const shapes = ["rounded-full", "rounded-xl", "rounded-none rotate-45", "rounded-t-full", "rounded-full ring-4 ring-inset ring-bg/40", "rounded-lg skew-x-6"];
  const palette: Record<string, string[]> = { mono: ["#111827", "#6b7280"], vivid: ["#ef4444", "#3b82f6"], pastel: ["#fbcfe8", "#bfdbfe"], brand: ["var(--studio-cyan)", "var(--studio-violet)"] };
  const [a, b] = palette[str(v.color_tendency)] ?? palette.brand;
  const name = str(v.brand_name);
  return (
    <Frame>
      <div className="grid grid-cols-3 gap-2">
        {shapes.map((s, i) => (
          <div key={i} className="grid aspect-square place-items-center rounded-xl bg-fg/5">
            {v.style === "wordmark" ? <span className="font-display text-sm font-bold" style={{ color: i % 2 ? b : a }}>{name.slice(0, 4) || "Aa"}</span> : <span className={cn("size-8", s)} style={{ background: `linear-gradient(135deg, ${a}, ${b})` }} />}
          </div>
        ))}
      </div>
    </Frame>
  );
}

function Prompt({ v }: { v: V }) {
  const t = str(v.target_type) || "chat";
  const skeleton: Record<string, string[]> = {
    chat: ["# Role", "# Context  {{input}}", "# Steps", "# Output format"],
    image: ["subject, setting", "lighting, lens", "style, palette", "--ar 4:5  --no text"],
    coding: ["## Goal", "## Constraints", "## Files to touch", "## Done when…"],
    video: ["[Shot 1] 0–3s", "camera: dolly-in", "[Shot 2] 3–6s", "audio / mood"],
  };
  return (
    <Frame className="font-mono text-xs">
      {skeleton[t].map((line, i) => (
        <motion.p key={`${t}-${i}`} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className={cn("py-0.5", line.startsWith("#") || line.startsWith("[") ? "text-studio-cyan" : "text-fg-muted")}>{line}</motion.p>
      ))}
    </Frame>
  );
}

function Copy({ v }: { v: V }) {
  const ch = arr(v.channels);
  const list = ch.length ? ch : ["instagram", "email"];
  return (
    <Frame className="space-y-2">
      {list.slice(0, 4).map((c, i) => (
        <motion.div key={c} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className={cn("max-w-[85%] rounded-2xl px-3 py-2", i % 2 ? "ml-auto bg-studio-violet/15" : "bg-studio-cyan/15")}>
          <p className="font-mono text-[9px] text-fg-subtle uppercase">{c}</p>
          <span className={cn("mt-1 block h-1.5 w-40 max-w-full", bar)} />
          <span className={cn("mt-1 block h-1.5 w-24", bar)} />
        </motion.div>
      ))}
    </Frame>
  );
}

function Simple({ kind, v }: { kind: string; v: V }) {
  const L = useBi();
  if (kind === "routes")
    return (
      <Frame className="space-y-2">
        {["A", "B", "C"].map((k, i) => (
          <div key={k} className="flex items-center gap-3 rounded-xl bg-fg/5 p-2.5">
            <span className="studio-gradient-bg grid size-7 place-items-center rounded-lg text-xs font-bold text-white">{k}</span>
            <span className="flex-1 space-y-1"><span className={cn("block h-1.5 w-3/4", bar)} /><span className={cn("block h-1.5 w-1/2", bar)} /></span>
            <span className="font-mono text-[10px] text-fg-subtle">{["Low", "Mid", "High"][(i + (v.risk === "high" ? 2 : v.risk === "mid" ? 1 : 0)) % 3]}</span>
          </div>
        ))}
      </Frame>
    );
  if (kind === "score") {
    const ideas = arr(v.ideas).slice(0, 4);
    const list = ideas.length ? ideas : ["A", "B", "C"];
    return (
      <Frame className="space-y-2.5">
        {list.map((idea, i) => (
          <div key={idea}>
            <div className="flex justify-between text-2xs"><span className="truncate break-keep">{idea}</span><span className="font-mono text-fg-subtle">{(8.2 - i * 1.1).toFixed(1)}</span></div>
            <div className="mt-1 h-1.5 rounded-full bg-fg/10"><motion.div className="h-full rounded-full studio-gradient-bg" initial={{ width: 0 }} animate={{ width: `${82 - i * 11}%` }} /></div>
          </div>
        ))}
      </Frame>
    );
  }
  if (kind === "compass")
    return (
      <Frame className="aspect-[4/3]">
        <span className="absolute inset-x-4 top-1/2 h-px bg-hairline" /><span className="absolute inset-y-4 left-1/2 w-px bg-hairline" />
        {[["30%", "35%", "bg-fg/20"], ["65%", "60%", "bg-fg/20"], ["70%", "25%", "studio-gradient-bg size-5"]].map(([x, y, c], i) => <span key={i} className={cn("absolute size-3.5 -translate-1/2 rounded-full", c)} style={{ left: x, top: y }} />)}
        <span className="absolute right-4 bottom-3 text-[10px] text-fg-subtle">{L({ ko: "우리 자리", en: "Our spot" })}</span>
      </Frame>
    );
  if (kind === "tiers")
    return (
      <Frame className="flex flex-col items-center gap-1.5">
        {[["w-1/3", "Mega"], ["w-2/3", "Mid"], ["w-full", "Micro"]].map(([w, l], i) => (
          <div key={l} className={cn("rounded-lg py-2 text-center text-2xs font-medium", w, i === 2 ? "studio-gradient-bg text-white" : "bg-fg/10")}>{l}{i === 2 && str(v.primary_keyword) ? ` · ${str(v.primary_keyword)}` : ""}</div>
        ))}
      </Frame>
    );
  if (kind === "map")
    return (
      <Frame className="aspect-[4/3] bg-[linear-gradient(var(--studio-grid)_1px,transparent_1px),linear-gradient(90deg,var(--studio-grid)_1px,transparent_1px)] bg-[size:20px_20px]">
        <span className="absolute top-[38%] left-[46%] grid size-9 place-items-center rounded-full studio-gradient-bg text-white shadow-[0_0_30px_var(--studio-cyan)]">★</span>
        <div className="glass-strong absolute right-3 bottom-3 left-3 rounded-xl p-2.5">
          <p className="truncate text-xs font-semibold">{str(v.business_name) || L({ ko: "우리 가게", en: "Your shop" })}</p>
          <p className="text-[10px] text-fg-muted">★★★★★ · {str(v.region) || "…"}</p>
        </div>
      </Frame>
    );
  if (kind === "page")
    return (
      <Frame className="mx-auto w-40 space-y-1.5 p-2">
        <div className={cn("h-16 rounded-md", v.page_mood === "premium" ? "bg-fg/80" : v.page_mood === "warm" ? "bg-studio-warning/30" : "studio-gradient-bg")} />
        {[0, 1, 2, 3, 4].map((i) => <div key={i} className="flex gap-1.5 rounded-md bg-fg/5 p-1.5"><span className="size-5 rounded bg-fg/10" /><span className="flex-1 space-y-1"><span className={cn("block h-1 w-3/4", bar)} /><span className={cn("block h-1 w-1/2", bar)} /></span></div>)}
        <p className="truncate text-center text-[9px] text-fg-subtle">{str(v.product_name) || "860px"}</p>
      </Frame>
    );
  if (kind === "article")
    return (
      <Frame className="space-y-2">
        <span className={cn("block h-2.5 w-4/5", "rounded-full studio-gradient-bg")} />
        {[0, 1].map((k) => <div key={k} className="space-y-1"><span className={cn("block h-1.5 w-full", bar)} /><span className={cn("block h-1.5 w-11/12", bar)} /><span className={cn("block h-1.5 w-2/3", bar)} /></div>)}
        <div className="aspect-[3/1] rounded-lg border border-dashed border-hairline-str" />
        <p className="font-mono text-2xs text-fg-subtle">{str(v.platform) || "naver"} · {str(v.length) || "1500"}{L({ ko: "자", en: " chars" })} · ~{Math.max(1, Math.round(Number(str(v.length) || 1500) / 500))}{L({ ko: "분 읽기", en: " min read" })}</p>
      </Frame>
    );
  if (kind === "checklist") {
    const types = arr(v.support_types);
    return (
      <Frame className="space-y-2">
        {(types.length ? types : ["startup", "rnd", "export"]).slice(0, 4).map((t, i) => (
          <div key={t} className="flex items-center gap-2.5 rounded-xl bg-fg/5 p-2.5">
            <span className={cn("grid size-4 place-items-center rounded-[4px] border text-[9px]", i === 0 ? "border-studio-success bg-studio-success text-bg" : "border-fg-subtle")}>{i === 0 ? "✓" : ""}</span>
            <span className="text-2xs font-medium uppercase">{t}</span>
            <span className={cn("ml-auto h-1.5 w-16", bar)} />
          </div>
        ))}
      </Frame>
    );
  }
  // doc
  return (
    <Frame className="mx-auto w-44 space-y-1.5">
      <span className="block h-2 w-2/3 rounded-full studio-gradient-bg" />
      <p className="truncate text-[10px] text-fg-muted">{str(v.target)}</p>
      {[0, 1, 2, 3].map((i) => <span key={i} className={cn("block h-1.5", bar, i % 2 ? "w-5/6" : "w-full")} />)}
      <div className="grid grid-cols-3 gap-1 pt-1">{[0, 1, 2].map((i) => <span key={i} className="h-6 rounded bg-fg/10" />)}</div>
    </Frame>
  );
}

export function Stage({ exp, values, compact }: { exp: Experience; values: V; compact?: boolean }) {
  const L = useBi();
  const visual = (() => {
    switch (exp.visual) {
      case "deck": return <Deck v={values} />;
      case "site": return <Site v={values} />;
      case "plan": return <Plan v={values} />;
      case "calendar": return <Calendar v={values} />;
      case "gallery": return <Gallery v={values} />;
      case "model": return <Gallery v={values} portrait />;
      case "logo": return <Logo v={values} />;
      case "prompt": return <Prompt v={values} />;
      case "copy": return <Copy v={values} />;
      default: return <Simple kind={exp.visual} v={values} />;
    }
  })();
  return (
    <section className={cn("glass rounded-[28px] border-dashed p-5 md:p-6", compact && "md:grid md:grid-cols-[1fr_1.1fr] md:items-center md:gap-6")} aria-label={L(exp.stage.headline)}>
      <div className={cn(!compact && "mb-5")}>
        <h2 className="text-lg leading-snug font-semibold [text-wrap:balance] break-keep">{L(exp.stage.headline)}</h2>
        <p className="mt-2 text-sm leading-relaxed [text-wrap:pretty] break-keep text-fg-muted">{L(exp.stage.story)}</p>
        <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
          {exp.stage.promises.map((p) => {
            const Icon = xIcon(p.icon);
            return (
              <li key={p.text.en} className="flex items-center gap-1.5 text-xs break-keep text-studio-cyan">
                <Icon size={13} aria-hidden /> {L(p.text)}
              </li>
            );
          })}
        </ul>
      </div>
      <div className={cn(compact && "mt-5 md:mt-0")}>{visual}</div>
    </section>
  );
}
