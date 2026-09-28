"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  Code2,
  Download,
  FileCode,
  FileSpreadsheet,
  FileText,
  FileType,
  Loader2,
  Presentation,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { listTools } from "@/lib/tools/registry";
import { buildCalendarIcs, buildCalendarCsv, type CalendarWeek } from "@/lib/tools/export/calendar";
import { StructuredResult } from "@/components/structured-result";
import { useLocale, useT } from "@/lib/i18n/context";
import type { Source } from "@/lib/tools/registry/shared";
import type { ToolManifest } from "@/lib/tools/types";
import { PROVIDER_LABEL, type ProviderId } from "@/lib/ai/types";

// Shared between the live "done" state in tool-runner.tsx and the
// library run-detail page — a stored run and a just-finished run render
// identically, since both are just { manifest, output, sources, credits }.

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Safari starts the download asynchronously; revoking at once can cancel it.
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function downloadText(filename: string, text: string, mimeType: string) {
  downloadBlob(filename, new Blob([text], { type: mimeType }));
}

// Works for both signed Storage URLs and data: URIs — fetch() handles
// both, so this is the one path for "save whatever's behind this src".
async function downloadFromUrl(filename: string, url: string) {
  const res = await fetch(url);
  downloadBlob(filename, await res.blob());
}

function guessImageExt(url: string): string {
  const dataMatch = /^data:image\/([a-z0-9]+);/i.exec(url);
  if (dataMatch) return dataMatch[1] === "jpeg" ? "jpg" : dataMatch[1];
  const pathMatch = /\.([a-z0-9]+)(?:\?|$)/i.exec(url.split("?")[0] ?? "");
  return pathMatch?.[1] ?? "png";
}

function DownloadLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-full border border-hairline px-2.5 py-1 text-xs text-fg-muted transition-colors hover:border-accent/50 hover:text-fg"
    >
      <Download className="size-3" aria-hidden />
      {label}
    </button>
  );
}

// Every finished run downloads as PDF / Word / PowerPoint / Markdown,
// generated server-side from the stored run (app/api/export/[runId],
// lib/tools/export/*); business-plan adds its financial spreadsheet.
// Each tool leads with the format its result is most used in, and adds
// its own files (homepage HTML, calendar .ics) to the same panel.
type ExportFormat = "pdf" | "docx" | "pptx" | "md" | "xlsx";

const FORMATS: Record<ExportFormat, { label: string; hint: string; hintEn: string; icon: LucideIcon }> = {
  pdf: { label: "PDF", hint: "인쇄·공유", hintEn: "Print & share", icon: FileText },
  docx: { label: "Word", hint: "편집용 문서", hintEn: "Editable doc", icon: FileType },
  pptx: { label: "PowerPoint", hint: "발표 슬라이드", hintEn: "Slides", icon: Presentation },
  md: { label: "Markdown", hint: "노션·블로그", hintEn: "Notion & blogs", icon: FileCode },
  xlsx: { label: "Excel", hint: "재무 계산표", hintEn: "Financials", icon: FileSpreadsheet },
};

const PRIMARY_FORMAT: Record<string, ExportFormat> = {
  presentation: "pptx",
  proposal: "docx",
  "business-plan": "docx",
  blog: "md",
};

function formatsFor(toolId: string): ExportFormat[] {
  const primary = PRIMARY_FORMAT[toolId] ?? "pdf";
  const all: ExportFormat[] = ["pdf", "pptx", "docx", "md", ...(toolId === "business-plan" ? (["xlsx"] as const) : [])];
  return [primary, ...all.filter((f) => f !== primary)];
}

interface ExtraDownload {
  key: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  run: () => void;
}

/** Files a tool produces besides the document exports. */
function extraDownloads(output: unknown, input?: Record<string, unknown>): ExtraDownload[] {
  const o = (output ?? {}) as Record<string, unknown>;
  const extras: ExtraDownload[] = [];
  if (typeof o.html === "string") {
    const html = o.html;
    extras.push({ key: "html", label: "HTML", hint: "홈페이지 파일", icon: Code2, run: () => downloadText("homepage.html", html, "text/html") });
  }
  if (typeof o.body_markdown === "string") {
    const md = o.body_markdown;
    extras.push({ key: "post", label: "블로그 본문", hint: "본문만 .md", icon: FileCode, run: () => downloadText("blog-post.md", md, "text/markdown") });
  }
  if (Array.isArray(o.weeks)) {
    const weeks = o.weeks as CalendarWeek[];
    const ics = typeof input?.start_date === "string" ? buildCalendarIcs(weeks, input.start_date) : null;
    if (ics) {
      extras.push({ key: "ics", label: "캘린더", hint: "구글·애플 캘린더", icon: CalendarDays, run: () => downloadText("90일-실행-캘린더.ics", ics, "text/calendar") });
    }
    extras.push({ key: "csv", label: "CSV", hint: "엑셀·시트", icon: FileSpreadsheet, run: () => downloadText("90일-실행-캘린더.csv", buildCalendarCsv(weeks), "text/csv") });
  }
  return extras;
}

function FormatIcon({ format, busy, className }: { format: ExportFormat; busy: boolean; className: string }) {
  const Icon = FORMATS[format].icon;
  return busy ? <Loader2 className={`${className} animate-spin`} aria-hidden /> : <Icon className={className} aria-hidden />;
}

const chip =
  "inline-flex items-center gap-1 rounded-full border border-hairline px-2.5 py-1 text-xs text-fg-muted transition-colors hover:border-accent/50 hover:text-fg";
const tile =
  "flex min-h-14 items-center gap-2.5 rounded-xl border border-hairline bg-surface-2/40 px-3 py-2 text-left transition-colors hover:border-accent/50 hover:bg-surface-2";

/**
 * The full panel sits above the result; a compact row repeats it below,
 * so a long result never needs scrolling back up to download.
 *
 * Each format is a plain link to the export route, which answers with
 * the file as an attachment: the browser downloads it itself, so it
 * works before scripts load and in phone in-app browsers (KakaoTalk,
 * Instagram) where script-made blob downloads fail. The spinner is a
 * hint only — the server takes a few seconds to build a deck.
 */
function DownloadPanel({
  runId,
  toolId,
  extras,
  compact = false,
}: {
  runId: string;
  toolId: string;
  extras: ExtraDownload[];
  compact?: boolean;
}) {
  const { locale } = useLocale();
  const en = locale === "en";
  const [busy, setBusy] = useState<ExportFormat | null>(null);
  const formats = formatsFor(toolId);
  const href = (f: ExportFormat) => `/api/export/${runId}?format=${f}`;
  const start = (f: ExportFormat) => {
    setBusy(f);
    setTimeout(() => setBusy((b) => (b === f ? null : b)), 6000);
  };

  if (compact) {
    return (
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-hairline pt-3">
        <span className="text-2xs text-fg-subtle">{en ? "Download" : "다운로드"}</span>
        {formats.map((f) => (
          <a key={f} href={href(f)} onClick={() => start(f)} className={chip}>
            <FormatIcon format={f} busy={busy === f} className="size-3" />
            {FORMATS[f].label}
          </a>
        ))}
        {extras.map((x) => (
          <button key={x.key} type="button" onClick={x.run} className={chip}>
            <x.icon className="size-3" aria-hidden />
            {x.label}
          </button>
        ))}
      </div>
    );
  }

  const [primary, ...rest] = formats;
  return (
    <section className="mt-3 rounded-2xl border border-hairline p-3" aria-label={en ? "Download" : "다운로드"}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-fg">
          <Download className="size-4 text-accent" aria-hidden />
          {en ? "Download your result" : "결과 파일 받기"}
        </p>
        <p className="text-2xs text-fg-subtle">{en ? "Ready to edit, present or share" : "편집·발표·공유에 바로 쓰는 파일"}</p>
      </div>
      <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-[repeat(auto-fit,minmax(150px,1fr))]">
        <a
          href={href(primary)}
          onClick={() => start(primary)}
          className="col-span-full flex min-h-14 items-center gap-3 rounded-xl bg-primary px-4 py-2.5 text-left text-primary-foreground transition-colors hover:bg-accent-hover"
        >
          <FormatIcon format={primary} busy={busy === primary} className="size-5 shrink-0" />
          <span className="flex min-w-0 flex-col">
            <span className="text-sm font-semibold">
              {FORMATS[primary].label} {en ? "download" : "다운로드"}
            </span>
            <span className="text-2xs opacity-85">
              {busy === primary
                ? en ? "Preparing your file…" : "파일 만드는 중… 잠시만 기다려 주세요"
                : `${en ? "Recommended" : "추천"} · ${en ? FORMATS[primary].hintEn : FORMATS[primary].hint}`}
            </span>
          </span>
        </a>
        {rest.map((f) => (
          <a key={f} href={href(f)} onClick={() => start(f)} className={tile}>
            <FormatIcon format={f} busy={busy === f} className="size-4 shrink-0 text-accent" />
            <span className="flex min-w-0 flex-col">
              <span className="text-sm font-medium text-fg">{FORMATS[f].label}</span>
              <span className="truncate text-2xs text-fg-subtle">
                {busy === f ? (en ? "Preparing…" : "만드는 중…") : en ? FORMATS[f].hintEn : FORMATS[f].hint}
              </span>
            </span>
          </a>
        ))}
        {extras.map((x) => (
          <button key={x.key} type="button" onClick={x.run} className={tile}>
            <x.icon className="size-4 shrink-0 text-accent" aria-hidden />
            <span className="flex min-w-0 flex-col">
              <span className="text-sm font-medium text-fg">{x.label}</span>
              <span className="truncate text-2xs text-fg-subtle">{x.hint}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

// HAEBOT_A_TOOLS_SPEC.md §3.1 — "no per-tool bespoke code except the
// renderer for unusual output types." Dumping a multi-KB base64 image or
// a full HTML document into a JSON <pre> block is unreadable, so this
// renders the few output shapes that need it specially — and gives each
// a real download, not just an on-screen preview. Everything else still
// falls through to the plain JSON dump below it.
interface LogoConcept {
  name: string;
  concept_rationale: string;
  usage_notes?: string;
  color_spec?: { hex: string[] };
  type_spec?: { family: string; weight: string };
  image: { url: string };
  symbol_image?: { url: string };
}

function OutputPreview({ output }: { output: unknown }) {
  const o = output as Record<string, unknown>;

  if (typeof o.html === "string") {
    return (
      <>
        <iframe
          srcDoc={o.html}
          sandbox=""
          className="mt-2 h-96 w-full rounded-xl border border-hairline bg-white"
        />
        <StructuredResult output={output} />
      </>
    );
  }

  const imageList = (o.rendered_images ?? o.images ?? o.shots) as unknown;
  if (Array.isArray(imageList) && imageList.length > 0) {
    const items = imageList
      .map((item) => (typeof item === "string" ? { url: item } : (item as { url?: string; name?: string; purpose?: string })))
      .filter((it): it is { url: string; name?: string; purpose?: string } => typeof it?.url === "string");
    const urls = items.map((it) => it.url);
    if (urls.length > 0) {
      return (
        <div className="mt-2 grid grid-cols-2 gap-2">
          {urls.map((url, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={items[i].name ?? ""} className="w-full rounded-xl border border-hairline" />
              {items[i].name ? (
                <p className="text-xs">
                  <span className="font-medium">{items[i].name}</span>
                  {items[i].purpose ? <span className="text-fg-muted"> — {items[i].purpose}</span> : null}
                </p>
              ) : null}
              <DownloadLink
                label="다운로드"
                onClick={() => downloadFromUrl(`image-${i + 1}.${guessImageExt(url)}`, url)}
              />
            </div>
          ))}
        </div>
      );
    }
  }

  // Image-model logo concepts: lockup (symbol + typeset name) and the
  // bare symbol, with the reasoning and specs a designer would hand over.
  if (Array.isArray(o.concepts) && (o.concepts as { image?: { url?: string } }[])[0]?.image?.url) {
    const concepts = o.concepts as LogoConcept[];
    return (
      <div className="mt-2 grid gap-3 md:grid-cols-2">
        {concepts.map((c, i) => (
          <article key={i} className="flex flex-col gap-2 rounded-2xl border border-hairline p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c.image.url} alt={c.name} className="w-full rounded-xl border border-hairline bg-white" />
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">{c.name}</p>
              <span className="flex gap-1">
                {(c.color_spec?.hex ?? []).map((hex) => (
                  <span key={hex} title={hex} className="size-4 rounded-full border border-hairline" style={{ backgroundColor: hex }} />
                ))}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-fg-muted">{c.concept_rationale}</p>
            {c.usage_notes ? <p className="text-xs leading-relaxed text-fg-subtle">{c.usage_notes}</p> : null}
            <p className="font-mono text-2xs text-fg-subtle">
              {(c.color_spec?.hex ?? []).join(" · ")} · {c.type_spec?.family} {c.type_spec?.weight}
            </p>
            <div className="flex flex-wrap gap-3">
              <DownloadLink label="로고 PNG" onClick={() => downloadFromUrl(`logo-${i + 1}.png`, c.image.url)} />
              {c.symbol_image?.url ? (
                <DownloadLink label="심볼만" onClick={() => downloadFromUrl(`logo-${i + 1}-symbol.${guessImageExt(c.symbol_image!.url)}`, c.symbol_image!.url)} />
              ) : null}
            </div>
          </article>
        ))}
      </div>
    );
  }

  if (Array.isArray(o.concepts)) {
    const svgs = (o.concepts as { svg?: string }[]).map((c) => c.svg).filter((s): s is string => Boolean(s));
    if (svgs.length > 0) {
      return (
        <div className="mt-2 grid grid-cols-2 gap-2">
          {svgs.map((svg, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`}
                alt=""
                className="w-full rounded-xl border border-hairline bg-white"
              />
              <DownloadLink
                label="SVG 다운로드"
                onClick={() => downloadText(`logo-concept-${i + 1}.svg`, svg, "image/svg+xml")}
              />
            </div>
          ))}
        </div>
      );
    }
  }

  return <StructuredResult output={output} />;
}

function RunResult({
  manifest,
  input,
  output,
  sources,
  creditsUsed,
  provider,
  runId,
}: {
  manifest: ToolManifest;
  input?: Record<string, unknown>;
  output: unknown;
  sources: Source[];
  creditsUsed: number | null;
  provider?: ProviderId | null;
  runId: string;
}) {
  const { locale } = useLocale();
  const t = useT();
  const extras = extraDownloads(output, input);
  const chainTargets = listTools().filter((tool) => tool.acceptsChainFrom?.includes(manifest.id));

  return (
    <div className="glass rounded-[20px] p-4 ">
      <div className="flex items-center gap-2">
        <p className="font-mono text-2xs text-grounded">
          {t("credits_used")} {creditsUsed ?? "—"} {t("credits")}
        </p>
        {provider ? (
          <Badge variant="outline" className="font-mono text-2xs">
            {PROVIDER_LABEL[provider]}
          </Badge>
        ) : null}
        {manifest.grounding.estimateBadge ? (
          <Badge variant="outline" className="text-warn">
            {t("estimate_badge")}
          </Badge>
        ) : null}
      </div>

      <DownloadPanel runId={runId} toolId={manifest.id} extras={extras} />

      <OutputPreview output={output} />

      <DownloadPanel runId={runId} toolId={manifest.id} extras={extras} compact />

      <Collapsible className="mt-4 border-t border-hairline pt-3">
        <CollapsibleTrigger className="group/collapsible flex cursor-pointer items-center gap-1 font-mono text-2xs text-fg-subtle select-none">
          원본 데이터 보기
          <ChevronDown className="size-3 transition-transform data-panel-open:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <pre className="mt-2 overflow-x-auto font-mono text-xs text-fg-muted">
            {JSON.stringify(output, null, 2)}
          </pre>
        </CollapsibleContent>
      </Collapsible>

      {sources.length > 0 ? (
        <div className="mt-4 border-t border-hairline pt-3">
          <p className="font-mono text-2xs text-fg-subtle">
            {t("sources")} ({sources.length})
          </p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {sources.map((s, i) => (
              <li key={i} className="text-xs">
                <a href={s.url} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                  {s.title}
                </a>
                {s.domain ? <span className="ml-1.5 text-fg-subtle">{s.domain}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {chainTargets.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-hairline pt-3">
          {chainTargets.map((target) => (
            <Link key={target.id} href={`/tools/${target.id}/run?fromRun=${runId}`}>
              <Button variant="secondary" size="sm">
                {t("chain_prefix")} {locale === "en" ? target.name_en : target.name_ko}
              </Button>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export { OutputPreview, RunResult };
