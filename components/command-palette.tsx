"use client";

import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";

export interface CommandPaletteItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  shortcut?: string;
  onSelect: () => void;
}

export interface CommandPaletteGroup {
  heading: string;
  items: CommandPaletteItem[];
}

export interface CommandPaletteProps {
  groups: CommandPaletteGroup[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function CommandPalette({ groups, open, onOpenChange }: CommandPaletteProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setOpen = isControlled ? onOpenChange! : setInternalOpen;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!isOpen);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  return (
    <CommandDialog
      open={isOpen}
      onOpenChange={setOpen}
      title="명령어 팔레트"
      description="도구 이름이나 하는 일로 검색하세요"
    >
      <CommandInput placeholder="도구 검색... (예: 로고, 브랜드 심볼)" />
      <CommandList>
        <CommandEmpty className="text-fg-muted">결과가 없습니다.</CommandEmpty>
        {groups.map((group) => (
          <CommandGroup key={group.heading} heading={group.heading}>
            {group.items.map((item) => (
              <CommandItem
                key={item.id}
                onSelect={() => {
                  item.onSelect();
                  setOpen(false);
                }}
              >
                {item.icon ? <item.icon className="size-4" /> : null}
                <span>{item.label}</span>
                {item.shortcut ? (
                  <CommandShortcut className="font-mono">{item.shortcut}</CommandShortcut>
                ) : null}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}

export { CommandPalette };
