import type { LucideIcon } from "lucide-react";
import { initials } from "@/lib/admin-filters";
import { TONE, toneFor, type Tone } from "@/components/site/tone";
import { cn } from "@/lib/utils";

// Building blocks for /admin, after the CoolAdmin dashboard (Colorlib, MIT):
// white cards on a light canvas, stat tiles with an icon chip and a
// sparkline, ranked bars, and initials avatars. Colours come from the app's
// tokens, so dark mode follows the rest of the service.

export function Card({ title, lead, action, className, children, bodyClassName }: { title?: React.ReactNode; lead?: React.ReactNode; action?: React.ReactNode; className?: string; bodyClassName?: string; children: React.ReactNode }) {
  return (
    <section className={cn("min-w-0 rounded-2xl border border-hairline bg-surface shadow-[0_1px_2px_rgba(16,24,40,.04),0_8px_24px_-12px_rgba(16,24,40,.08)]", className)}>
      {title ? (
        <header className="flex items-start justify-between gap-3 border-b border-hairline px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-fg">{title}</h2>
            {lead ? <p className="mt-0.5 text-sm text-fg-muted">{lead}</p> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </header>
      ) : null}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

/** A tiny line chart for stat tiles; values oldest → newest. */
export function Sparkline({ values, tone = "accent", className }: { values: number[]; tone?: Tone; className?: string }) {
  const w = 120;
  const h = 34;
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => [values.length > 1 ? (i / (values.length - 1)) * w : w / 2, h - 3 - (v / max) * (h - 8)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={cn("h-9 w-full", TONE[tone].text, className)} aria-hidden>
      <path d={area} fill="currentColor" opacity={0.12} />
      <path d={line} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function StatCard({ label, value, icon: Icon, tone, note, noteTone, spark, href, alert }: { label: string; value: string; icon: LucideIcon; tone: Tone; note?: string; noteTone?: "up" | "down" | "flat"; spark?: number[]; href?: string; alert?: boolean }) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <p className="text-sm font-medium text-fg-muted">{label}</p>
        <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", TONE[tone].tile)}>
          <Icon className="size-[18px]" aria-hidden />
        </span>
      </div>
      <p className={cn("px-5 font-display text-[30px] leading-tight font-bold tabular-nums", alert ? "text-danger" : "text-fg")}>{value}</p>
      {note ? <p className={cn("px-5 text-xs font-medium", noteTone === "up" ? "text-studio-success" : noteTone === "down" ? "text-danger" : "text-fg-subtle")}>{note}</p> : <div className="h-4" />}
      {spark ? <Sparkline values={spark} tone={alert ? "campaign" : tone} className="mt-2" /> : <div className="h-4" />}
    </>
  );
  const cls = "block overflow-hidden rounded-2xl border border-hairline bg-surface shadow-[0_1px_2px_rgba(16,24,40,.04)]";
  return href ? (
    <a href={href} className={cn(cls, "transition-shadow hover:shadow-[0_10px_30px_-12px_rgba(16,24,40,.25)]")}>
      {body}
    </a>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Ranked list with a bar under each row (Top tools, Top pages in CoolAdmin). */
export function BarList({ items, emptyText }: { items: { key: string; label: React.ReactNode; value: number; display?: string; tone?: Tone; href?: string; sub?: React.ReactNode }[]; emptyText: string }) {
  if (!items.length) return <p className="text-sm text-fg-muted">{emptyText}</p>;
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ol className="space-y-3.5">
      {items.map((it, i) => {
        const row = (
          <>
            <div className="flex items-center gap-3">
              <span className={cn("grid size-6 shrink-0 place-items-center rounded-md text-xs font-bold tabular-nums", i < 3 ? "bg-accent text-white" : "bg-surface-2 text-fg-muted")}>{i + 1}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg">{it.label}</span>
              <span className="shrink-0 font-mono text-sm tabular-nums text-fg">{it.display ?? it.value.toLocaleString("ko-KR")}</span>
            </div>
            {it.sub ? <div className="mt-0.5 pl-9 text-xs text-fg-subtle">{it.sub}</div> : null}
            <div className="mt-1.5 ml-9 h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div className={cn("h-full rounded-full", TONE[it.tone ?? "accent"].dot)} style={{ width: `${Math.max(3, (it.value / max) * 100)}%` }} />
            </div>
          </>
        );
        return <li key={it.key}>{it.href ? <a href={it.href} className="block rounded-lg hover:opacity-80">{row}</a> : row}</li>;
      })}
    </ol>
  );
}

/** Daily line chart, two series (e.g. runs and failures); days oldest → newest. */
export function TrendChart({ days, series, ariaLabel }: { days: string[]; series: { label: string; values: number[]; tone: Tone }[]; ariaLabel: string }) {
  const w = 640;
  const h = 220;
  const pad = { l: 34, r: 12, t: 12, b: 26 };
  const max = Math.max(4, ...series.flatMap((s) => s.values));
  const step = Math.ceil(max / 4);
  const top = step * 4;
  const x = (i: number) => pad.l + (days.length > 1 ? (i / (days.length - 1)) * (w - pad.l - pad.r) : 0);
  const y = (v: number) => pad.t + (1 - v / top) * (h - pad.t - pad.b);
  return (
    <figure>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img" aria-label={ariaLabel}>
        {[0, 1, 2, 3, 4].map((k) => (
          <g key={k}>
            <line x1={pad.l} x2={w - pad.r} y1={y(k * step)} y2={y(k * step)} className="stroke-hairline" strokeDasharray={k ? "3 4" : undefined} />
            <text x={pad.l - 8} y={y(k * step) + 4} textAnchor="end" className="fill-fg-subtle text-[10px]">
              {k * step}
            </text>
          </g>
        ))}
        {days.map((d, i) =>
          i % 2 === 0 || i === days.length - 1 ? (
            <text key={d} x={x(i)} y={h - 8} textAnchor="middle" className="fill-fg-subtle text-[10px]">
              {d}
            </text>
          ) : null,
        )}
        {series.map((s) => {
          const line = s.values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
          return (
            <g key={s.label} className={TONE[s.tone].text}>
              <path d={`${line} L${x(s.values.length - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill="currentColor" opacity={0.1} />
              <path d={line} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" />
              {s.values.map((v, i) => (v ? <circle key={i} cx={x(i)} cy={y(v)} r={2.6} fill="currentColor" /> : null))}
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-4 text-xs text-fg-muted">
        {series.map((s) => (
          <span key={s.label} className="inline-flex items-center gap-1.5">
            <span className={cn("size-2.5 rounded-full", TONE[s.tone].dot)} />
            {s.label}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

export function Avatar({ id, name, email, size = "md" }: { id: string; name: string | null; email: string; size?: "sm" | "md" | "xl" }) {
  const tone = toneFor(id);
  const box = size === "xl" ? "size-24 text-3xl rounded-[28px]" : size === "sm" ? "size-8 text-xs rounded-full" : "size-10 text-sm rounded-full";
  return (
    <span className={cn("grid shrink-0 place-items-center font-bold select-none", box, TONE[tone].tile)} aria-hidden>
      {initials(name, email)}
    </span>
  );
}

/** Sign-in provider: Kakao yellow, Google white, anything else plain. */
export function ProviderBadge({ provider }: { provider: string }) {
  if (provider === "kakao")
    return <span className="inline-flex items-center rounded-full bg-[#FEE500] px-2 py-0.5 text-xs font-semibold text-[#191919]">Kakao</span>;
  if (provider === "google")
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-hairline bg-surface px-2 py-0.5 text-xs font-semibold text-fg">
        <span className="font-bold text-[#4285F4]">G</span>Google
      </span>
    );
  return <span className="inline-flex items-center rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold text-fg-muted">{provider}</span>;
}

export function Pill({ tone, children }: { tone: "green" | "amber" | "red" | "blue" | "gray"; children: React.ReactNode }) {
  const cls = {
    green: "bg-studio-success/12 text-studio-success",
    amber: "bg-studio-warning/14 text-studio-warning",
    red: "bg-danger/10 text-danger",
    blue: "bg-accent/12 text-accent",
    gray: "bg-surface-2 text-fg-muted",
  }[tone];
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap", cls)}>{children}</span>;
}
