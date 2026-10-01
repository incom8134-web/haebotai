"use client";

import { createContext, useContext } from "react";
import { splitCitations } from "@/lib/tools/citations";
import type { Source } from "@/lib/tools/registry/shared";

// "[n]" marks in a grounded result become small links to the numbered
// source (components/run-result.tsx lists them with ids src-1, src-2…).
// Outside a provider — or with no sources — marks are shown as they are.

const SourcesContext = createContext<Source[] | null>(null);

export function CitationsProvider({ sources, children }: { sources: Source[]; children: React.ReactNode }) {
  return <SourcesContext.Provider value={sources}>{children}</SourcesContext.Provider>;
}

export function Cited({ text }: { text: string }) {
  const sources = useContext(SourcesContext);
  if (!sources || !text || !text.includes("[")) return <>{text}</>;
  return (
    <>
      {splitCitations(text, sources.length).map((p, i) =>
        "text" in p ? (
          <span key={i}>{p.text}</span>
        ) : (
          <sup key={i} className="ml-0.5">
            <a
              href={sources[p.cite - 1].url}
              target="_blank"
              rel="noreferrer"
              title={sources[p.cite - 1].title}
              className="rounded px-0.5 font-mono text-[0.7em] text-accent no-underline hover:bg-accent-dim"
            >
              [{p.cite}]
            </a>
          </sup>
        ),
      )}
    </>
  );
}
