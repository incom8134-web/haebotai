"use client";

import Link from "next/link";
import { ChevronDown, Download } from "lucide-react";
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
import { orderLike } from "@/lib/tools/output-order";
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
  a.click();
  URL.revokeObjectURL(url);
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
      className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
    >
      <Download className="size-3" aria-hidden />
      {label}
    </button>
  );
}

// Every finished run downloads as PDF / Word / PowerPoint / Markdown,
// generated server-side from the stored run (app/api/export/[runId],
// lib/tools/export/*) — plain links, Content-Disposition does the rest.
// business-plan adds its financial spreadsheet.
const EXPORTS: { format: "pdf" | "docx" | "pptx" | "md" | "xlsx"; label: string; only?: string }[] = [
  { format: "pdf", label: "PDF" },
  { format: "docx", label: "Word" },
  { format: "pptx", label: "PowerPoint" },
  { format: "md", label: "Markdown" },
  { format: "xlsx", label: "재무 Excel", only: "business-plan" },
];

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

function OutputPreview({ output, input }: { output: unknown; input?: Record<string, unknown> }) {
  const o = output as Record<string, unknown>;

  if (typeof o.html === "string") {
    return (
      <>
        <iframe
          srcDoc={o.html}
          sandbox=""
          className="mt-2 h-96 w-full rounded-xl border border-hairline bg-white"
        />
        <div className="mt-2">
          <DownloadLink
            label="HTML 다운로드"
            onClick={() => downloadText("homepage.html", o.html as string, "text/html")}
          />
        </div>
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

  if (typeof o.body_markdown === "string") {
    return (
      <div className="mt-2">
        <DownloadLink
          label="마크다운 다운로드"
          onClick={() => downloadText("blog-post.md", o.body_markdown as string, "text/markdown")}
        />
      </div>
    );
  }

  if (Array.isArray(o.weeks)) {
    const weeks = o.weeks as CalendarWeek[];
    const startDate = typeof input?.start_date === "string" ? input.start_date : null;
    const ics = startDate ? buildCalendarIcs(weeks, startDate) : null;
    return (
      <div className="mt-2 flex flex-wrap gap-3">
        {ics ? (
          <DownloadLink
            label=".ics 다운로드"
            onClick={() => downloadText("90일-실행-캘린더.ics", ics, "text/calendar")}
          />
        ) : null}
        <DownloadLink
          label=".csv 다운로드"
          onClick={() => downloadText("90일-실행-캘린더.csv", buildCalendarCsv(weeks), "text/csv")}
        />
      </div>
    );
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

      <OutputPreview output={orderLike(manifest.outputSchema, output)} input={input} />

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-hairline pt-3">
        <span className="text-2xs text-fg-subtle">{locale === "en" ? "Download" : "다운로드"}</span>
        {EXPORTS.filter((e) => !e.only || e.only === manifest.id).map((e) => (
          <a
            key={e.format}
            href={`/api/export/${runId}?format=${e.format}`}
            className="inline-flex items-center gap-1 rounded-full border border-hairline px-2.5 py-1 text-xs text-fg-muted transition-colors hover:border-studio-cyan/50 hover:text-fg"
          >
            <Download className="size-3" aria-hidden />
            {e.label}
          </a>
        ))}
      </div>

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
