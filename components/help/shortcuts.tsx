"use client";

import { useBi } from "@/lib/i18n/context";

// Only shortcuts the app actually implements (command-palette.tsx,
// studio-workspace.tsx, tool-form.tsx chips, dialogs).
const GROUPS: { title: { ko: string; en: string }; items: { keys: string[]; label: { ko: string; en: string } }[] }[] = [
  {
    title: { ko: "어디서나", en: "Anywhere" },
    items: [
      { keys: ["⌘", "K"], label: { ko: "도구 찾기 열기 (Windows: Ctrl + K)", en: "Open tool search (Windows: Ctrl + K)" } },
      { keys: ["Esc"], label: { ko: "열린 창·메뉴 닫기", en: "Close the open dialog or menu" } },
      { keys: ["↑", "↓", "Enter"], label: { ko: "도구 찾기에서 고르고 열기", en: "Move and open in tool search" } },
    ],
  },
  {
    title: { ko: "스튜디오", en: "Studio" },
    items: [{ keys: ["⌘", "Enter"], label: { ko: "브리프로 생성하기 (Windows: Ctrl + Enter)", en: "Generate from the brief (Windows: Ctrl + Enter)" } }],
  },
  {
    title: { ko: "도구 입력", en: "Tool forms" },
    items: [
      { keys: ["Enter"], label: { ko: "키워드 칩 추가", en: "Add a keyword chip" } },
      { keys: ["Backspace"], label: { ko: "빈 칸에서 마지막 칩 지우기", en: "Remove the last chip from an empty field" } },
    ],
  },
];

export function ShortcutsView() {
  const L = useBi();
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {GROUPS.map((g) => (
        <section key={g.title.en} className="glass rounded-[24px] p-6">
          <h2 className="font-semibold">{L(g.title)}</h2>
          <ul className="mt-4 space-y-3">
            {g.items.map((item) => (
              <li key={item.label.en} className="flex items-center justify-between gap-4 text-sm">
                <span className="break-keep text-fg-muted">{L(item.label)}</span>
                <span className="flex shrink-0 gap-1">
                  {item.keys.map((k) => (
                    <kbd key={k} className="rounded-md border border-hairline bg-surface-2/60 px-2 py-0.5 font-mono text-xs">{k}</kbd>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
