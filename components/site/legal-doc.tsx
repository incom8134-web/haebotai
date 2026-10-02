import type { LegalBlock, LegalDoc } from "@/lib/site/legal";
import { BUSINESS } from "@/lib/site/business";
import { BusinessInfo } from "@/components/site/business-info";

// One legal document: title and lead, a clickable table of contents,
// then the articles (paragraphs, lists, tables). Korean is the binding
// text; English visitors see a one-line note saying so.

function Block({ block }: { block: LegalBlock }) {
  if (typeof block === "string") return <p className="text-[15px] leading-[1.85] text-fg-muted break-keep">{block}</p>;
  if ("list" in block) {
    return (
      <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-[15px] leading-[1.8] text-fg-muted marker:text-fg-subtle">
        {block.list.map((item, i) => (
          <li key={i} className="break-keep">{item}</li>
        ))}
      </ol>
    );
  }
  const { head, rows } = block.table;
  return (
    <>
      {/* Phones: one card per row, each value labeled with its column. */}
      <div className="flex flex-col gap-2 sm:hidden">
        {rows.map((row, i) => (
          <dl key={i} className="rounded-xl border border-hairline p-3">
            <dt className="sr-only">{head[0]}</dt>
            <dd className="text-sm font-semibold text-fg break-keep">{row[0]}</dd>
            {row.slice(1).map((cell, j) => (
              <div key={j} className="mt-1.5">
                <dt className="text-2xs text-fg-subtle">{head[j + 1]}</dt>
                <dd className="text-sm leading-relaxed text-fg-muted break-keep">{cell}</dd>
              </div>
            ))}
          </dl>
        ))}
      </div>
      <div className="hidden overflow-x-auto rounded-xl border border-hairline sm:block">
        <table className={`w-full border-collapse text-left text-sm ${head.length > 3 ? "min-w-[720px]" : ""}`}>
          <thead className="bg-surface-2/70">
            <tr>
              {head.map((h) => (
                <th key={h} scope="col" className="px-3 py-2.5 text-xs font-semibold whitespace-nowrap text-fg">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-t border-hairline align-top">
                {row.map((cell, j) => (
                  <td key={j} className={`px-3 py-2.5 leading-relaxed break-keep ${j === 0 ? "font-medium text-fg" : "text-fg-muted"}`}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function LegalDocView({ doc }: { doc: LegalDoc }) {
  return (
    <article className="glass rounded-[24px] p-5 md:p-8">
      <header className="border-b border-hairline pb-6">
        <h1 className="font-display text-[clamp(1.8rem,3.5vw,2.6rem)] leading-tight font-bold tracking-[-0.02em] text-fg">{doc.title}</h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-fg-muted break-keep">{doc.lead}</p>
        <p className="mt-3 font-mono text-2xs text-fg-subtle">시행일 {doc.effectiveDate ?? BUSINESS.effectiveDate} · This document is provided in Korean, which is the binding version.</p>
      </header>

      <nav aria-label="목차" className="mt-6 rounded-2xl bg-surface-2/50 p-4">
        <p className="text-2xs font-semibold text-fg-subtle">목차</p>
        <ol className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
          {doc.articles.map((a) => (
            <li key={a.id}>
              <a href={`#${a.id}`} className="text-sm text-fg-muted hover:text-fg">{a.title}</a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-8 flex flex-col gap-9">
        {doc.articles.map((a) => (
          <section key={a.id} id={a.id} className="scroll-mt-28">
            <h2 className="text-lg font-semibold text-fg break-keep">{a.title}</h2>
            <div className="mt-3 flex flex-col gap-3">
              {a.body.map((b, i) => (
                <Block key={i} block={b} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <footer className="mt-10 border-t border-hairline pt-6">
        <p className="text-2xs font-semibold text-fg-subtle">사업자 정보</p>
        <BusinessInfo className="mt-2" />
      </footer>
    </article>
  );
}
