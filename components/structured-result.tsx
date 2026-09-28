import type { Source } from "@/lib/tools/registry/shared";
import { asCompactPair, formatPrimitive, humanize, isSourceArray, titleKeyOf } from "@/lib/tools/output-labels";

// HAEBOT_A_TOOLS_SPEC.md §3.1 — one generic renderer for the 8 tools
// with no dedicated preview (money, trend, keyword, place, proposal,
// business-plan, grant, prompt), replacing the raw JSON dump those
// tools used to fall through to. No per-tool component: walks the
// manifest's own zod-shaped output and renders it as a real document —
// labeled fields, 출처 chips wherever a `sources` array appears at any
// depth (not just top-level), 추정 badges wherever `data_source:
// "estimated"` appears.
//
// `insideCard` (not depth) decides whether an array of objects gets the
// full bordered/titled treatment: a repeated item only avoids it when
// it's already inside another item's card (money.models[].first_30_days,
// e.g.) — nested cards are always wrong. A plain wrapper object like
// `tiers: {mega, mid, micro}` does NOT put its children inside a card,
// so keyword's tiers.mega[] still gets full treatment despite being two
// levels deep. Tracking raw depth instead of this got it backwards.




function DifficultyBar({ value }: { value: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`난이도 ${value}/5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={`size-1.5 rounded-full ${i < value ? "bg-accent" : "bg-hairline-str"}`} />
      ))}
    </span>
  );
}

function EstimateBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-warn/25 bg-warn/10 px-1.5 py-0.5 text-2xs text-warn">
      추정
    </span>
  );
}

function SourceChips({ sources }: { sources: Source[] }) {
  if (sources.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {sources.map((s, i) => (
        <a
          key={i}
          href={s.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-full border border-grounded/25 bg-grounded-dim px-2 py-0.5 font-mono text-2xs text-grounded hover:underline"
        >
          출처 · {s.domain ?? s.title}
        </a>
      ))}
    </div>
  );
}



function StructuredField({
  fieldKey,
  value,
  insideCard,
}: {
  fieldKey: string;
  value: unknown;
  insideCard: boolean;
}) {
  if (value === null || value === undefined || value === "") return null;
  if (Array.isArray(value) && value.length === 0) return null;
  const label = humanize(fieldKey);

  if (typeof value === "string") {
    return (
      <div>
        <p className="font-mono text-2xs tracking-wide text-fg-subtle uppercase">{label}</p>
        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-fg">{value}</p>
      </div>
    );
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return (
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-2xs tracking-wide text-fg-subtle uppercase">{label}</p>
        {fieldKey === "difficulty" && typeof value === "number" ? (
          <DifficultyBar value={value} />
        ) : (
          <p className="text-sm font-medium text-fg">{formatPrimitive(fieldKey, value)}</p>
        )}
      </div>
    );
  }

  if (isSourceArray(value)) {
    return (
      <div>
        <p className="font-mono text-2xs tracking-wide text-fg-subtle uppercase">{label}</p>
        <SourceChips sources={value} />
      </div>
    );
  }

  if (Array.isArray(value) && value.every((v) => typeof v === "string")) {
    return (
      <div>
        <p className="font-mono text-2xs tracking-wide text-fg-subtle uppercase">{label}</p>
        <ul className="mt-1 flex flex-col gap-1">
          {(value as string[]).map((v, i) => (
            <li key={i} className="flex gap-1.5 text-sm text-fg">
              <span className="text-fg-subtle">·</span>
              {v}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (Array.isArray(value)) {
    const objects = value as Record<string, unknown>[];
    if (!insideCard) {
      return (
        <div>
          <p className="font-mono text-2xs tracking-wide text-fg-subtle uppercase">{label}</p>
          <div className="mt-2 flex flex-col gap-3">
            {objects.map((item, i) => (
              <StructuredItem key={i} obj={item} />
            ))}
          </div>
        </div>
      );
    }
    // Already inside a card: no nested card. Compact pairs render as one
    // line each; anything else falls back to plain stacked fields.
    const allPairs = objects.every((o) => asCompactPair(o));
    return (
      <div>
        <p className="font-mono text-2xs tracking-wide text-fg-subtle uppercase">{label}</p>
        {allPairs ? (
          <ul className="mt-1 flex flex-col gap-1">
            {objects.map((item, i) => {
              const pair = asCompactPair(item)!;
              return (
                <li key={i} className="flex gap-1.5 text-sm text-fg">
                  <span className="shrink-0 font-mono text-fg-subtle">{formatPrimitive("day", pair.order as number)}</span>
                  {pair.text}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="mt-1.5 flex flex-col gap-2.5 pl-3">
            {objects.map((item, i) => (
              <div key={i} className="flex flex-col gap-2 border-t border-hairline pt-2 first:border-t-0 first:pt-0">
                {Object.entries(item).map(([k, v]) => (
                  <StructuredField key={k} fieldKey={k} value={v} insideCard />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // nested object — a plain wrapper (like `tiers` or `price_gap`), not a
  // card, so insideCard passes through unchanged for its children.
  return (
    <div>
      <p className="font-mono text-2xs tracking-wide text-fg-subtle uppercase">{label}</p>
      <div className="mt-1.5 flex flex-col gap-2.5 pl-3">
        {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
          <StructuredField key={k} fieldKey={k} value={v} insideCard={insideCard} />
        ))}
      </div>
    </div>
  );
}

function StructuredItem({ obj }: { obj: Record<string, unknown> }) {
  const entries = Object.entries(obj);
  const sources = isSourceArray(obj.sources) ? obj.sources : null;
  const dataSource = typeof obj.data_source === "string" ? obj.data_source : null;

  const titleKey = titleKeyOf(obj);
  const title = titleKey ? (obj[titleKey] as string) : null;

  return (
    <div className="glass rounded-[20px]-2 p-3">
      {title ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-sm font-semibold text-fg">{title}</p>
          {dataSource === "estimated" ? <EstimateBadge /> : null}
        </div>
      ) : null}
      <div className={title ? "mt-2 flex flex-col gap-2.5" : "flex flex-col gap-2.5"}>
        {entries
          .filter(([k]) => k !== "sources" && k !== "data_source" && k !== titleKey)
          .map(([k, v]) => (
            <StructuredField key={k} fieldKey={k} value={v} insideCard />
          ))}
      </div>
      {sources ? <SourceChips sources={sources} /> : null}
    </div>
  );
}

function StructuredResult({ output }: { output: unknown }) {
  const entries = Object.entries(output as Record<string, unknown>);
  return (
    <div className="mt-2 flex flex-col gap-5">
      {entries.map(([k, v]) => (
        <StructuredField key={k} fieldKey={k} value={v} insideCard={false} />
      ))}
    </div>
  );
}

export { StructuredResult };
