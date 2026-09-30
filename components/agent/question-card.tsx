"use client";

import { useState } from "react";
import { MessageCircleQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBi } from "@/lib/i18n/context";
import type { Question } from "@/lib/agents/types";

// Asked only when something critical is missing (lib/agents/intent.ts):
// at most three questions, each with options and a default, and
// "그냥 진행" always continues with the defaults.

export function QuestionCard({
  summary,
  questions,
  onSubmit,
  onCancel,
}: {
  summary: string;
  questions: Question[];
  onSubmit: (answers: { question: string; answer: string }[]) => void;
  onCancel: () => void;
}) {
  const L = useBi();
  const [picked, setPicked] = useState<Record<string, string>>(() => Object.fromEntries(questions.map((q) => [q.id, q.options[q.defaultIndex] ?? q.options[0]])));
  const [free, setFree] = useState<Record<string, string>>({});
  const answers = (useDefaults: boolean) =>
    questions.map((q) => ({ question: q.question, answer: useDefaults ? (q.options[q.defaultIndex] ?? q.options[0]) : (free[q.id]?.trim() || picked[q.id]) }));

  return (
    <section aria-label={L({ ko: "확인할 점", en: "A few questions" })} className="glass mt-6 rounded-[20px] p-4 md:p-5">
      <div className="flex items-start gap-2.5">
        <MessageCircleQuestion size={18} className="mt-0.5 shrink-0 text-studio-violet" aria-hidden />
        <div className="min-w-0">
          <p className="text-sm font-semibold break-keep">{L({ ko: "시작 전에 확인할게요", en: "Before I start" })}</p>
          {summary ? <p className="mt-0.5 text-xs break-keep text-fg-muted">{L({ ko: `이해한 요청: ${summary}`, en: `Understood: ${summary}` })}</p> : null}
        </div>
      </div>
      <div className="mt-4 space-y-4">
        {questions.map((q) => (
          <fieldset key={q.id}>
            <legend className="text-sm break-keep">{q.question}</legend>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {q.options.map((o, i) => (
                <label key={o} className={`cursor-pointer rounded-full border px-3 py-1 text-xs break-keep ${picked[q.id] === o && !free[q.id]?.trim() ? "border-studio-violet bg-studio-violet/10 text-fg" : "border-hairline text-fg-muted hover:text-fg"}`}>
                  <input type="radio" name={q.id} value={o} checked={picked[q.id] === o} onChange={() => setPicked((p) => ({ ...p, [q.id]: o }))} className="sr-only" />
                  {o}
                  {i === q.defaultIndex ? <span className="ml-1 text-fg-subtle">{L({ ko: "(기본)", en: "(default)" })}</span> : null}
                </label>
              ))}
            </div>
            {q.allowFreeText ? (
              <input
                type="text"
                maxLength={200}
                value={free[q.id] ?? ""}
                onChange={(e) => setFree((f) => ({ ...f, [q.id]: e.target.value }))}
                placeholder={L({ ko: "직접 입력 (선택)", en: "Or type your own (optional)" })}
                aria-label={`${q.question} — ${L({ ko: "직접 입력", en: "your own answer" })}`}
                className="mt-2 h-9 w-full rounded-xl border border-hairline bg-transparent px-3 text-sm"
              />
            ) : null}
          </fieldset>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Button onClick={() => onSubmit(answers(false))} className="studio-gradient-bg h-10 rounded-2xl px-4 text-white">
          {L({ ko: "이대로 만들기", en: "Make it" })}
        </Button>
        <Button variant="secondary" onClick={() => onSubmit(answers(true))} className="h-10 rounded-2xl px-4">
          {L({ ko: "그냥 진행 (기본값으로)", en: "Just go (use defaults)" })}
        </Button>
        <Button variant="ghost" onClick={onCancel} className="h-10 rounded-2xl px-3 text-fg-muted">
          {L({ ko: "입력 고치기", en: "Edit inputs" })}
        </Button>
      </div>
    </section>
  );
}
