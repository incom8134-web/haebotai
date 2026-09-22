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

// HAEBOT_A_TOOLS_SPEC.md §5.1 / §5.2 — proposal -> .docx, business-plan
// -> .docx + .xlsx. Generated server-side (lib/tools/export/*.ts via
// app/api/export/[runId]) since docx/exceljs are Node-oriented libraries
// that don't belong in the client bundle — a plain link to that route is
// enough, Content-Disposition handles the actual download.
const SERVER_EXPORTS: Partial<Record<string, { format: "docx" | "xlsx"; label: string }[]>> = {
  proposal: [{ format: "docx", label: "DOCX 다운로드" }],
  "business-plan": [
    { format: "docx", label: "DOCX 다운로드" },
    { format: "xlsx", label: "재무 XLSX 다운로드" },
  ],
};

// HAEBOT_A_TOOLS_SPEC.md §3.1 — "no per-tool bespoke code except the
// renderer for unusual output types." Dumping a multi-KB base64 image or
// a full HTML document into a JSON <pre> block is unreadable, so this
// renders the few output shapes that need it specially — and gives each
// a real download, not just an on-screen preview. Everything else still
// falls through to the plain JSON dump below it.
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
    const urls = imageList
      .map((item) => (typeof item === "string" ? item : (item as { url?: string })?.url))
      .filter((u): u is string => typeof u === "string");
    if (urls.length > 0) {
      return (
        <div className="mt-2 grid grid-cols-2 gap-2">
          {urls.map((url, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="w-full rounded-xl border border-hairline" />
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

      <OutputPreview output={output} input={input} />

      {SERVER_EXPORTS[manifest.id] ? (
        <div className="mt-2 flex flex-wrap gap-3">
          {SERVER_EXPORTS[manifest.id]!.map((e) => (
            <a
              key={e.format}
              href={`/api/export/${runId}?format=${e.format}`}
              className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
            >
              <Download className="size-3" aria-hidden />
              {e.label}
            </a>
          ))}
        </div>
      ) : null}

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
