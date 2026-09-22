"use client";

import { useSyncExternalStore } from "react";

// A tiny string-list store in localStorage (favorites, dismissed notices),
// shared across components and tabs via useSyncExternalStore — same
// pattern as lib/i18n/context.tsx.

const EVENT = "haebot-local-list";
const EMPTY: string[] = [];
const cache = new Map<string, { raw: string | null; value: string[] }>();

function read(key: string): string[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    return EMPTY;
  }
  const hit = cache.get(key);
  if (hit && hit.raw === raw) return hit.value;
  let value = EMPTY;
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    value = Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : EMPTY;
  } catch {
    value = EMPTY;
  }
  cache.set(key, { raw, value });
  return value;
}

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function useLocalList(key: string) {
  const list = useSyncExternalStore(subscribe, () => read(key), () => EMPTY);

  function write(next: string[]) {
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* storage full or blocked — the UI just won't persist */
    }
    window.dispatchEvent(new Event(EVENT));
  }

  return {
    list,
    has: (id: string) => list.includes(id),
    toggle: (id: string) => write(list.includes(id) ? list.filter((v) => v !== id) : [...list, id]),
    set: write,
  };
}

export function useFavorites() {
  return useLocalList("haebot-favorites");
}
