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

// A single string value in localStorage (e.g. "last engine picked for this
// tool") — same subscribe/event plumbing as useLocalList, minus the array.
// No cache needed: string primitives compare fine with Object.is, unlike
// the array case above which needs one to keep JSON.parse results stable.
function readValue(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function useLocalValue(key: string) {
  const value = useSyncExternalStore(subscribe, () => readValue(key), () => null);

  function set(next: string) {
    try {
      localStorage.setItem(key, next);
    } catch {
      /* storage full or blocked — the UI just won't persist */
    }
    window.dispatchEvent(new Event(EVENT));
  }

  return [value, set] as const;
}
