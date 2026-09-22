"use client";

import { createContext, useContext, useSyncExternalStore } from "react";
import { dictionaries, type DictKey, type Locale } from "./dictionaries";

// ponytail: client-side preference (localStorage), no URL-based routing
// (/en/..., /ko/...) — matches how the theme toggle works, and this app
// has no SEO need for localized URLs yet. Upgrade path if that changes:
// a `[locale]` route segment + middleware redirect, reading this same
// dictionary. Content still renders server-side in Korean first, so a
// non-default locale flashes briefly on load — acceptable for now.
//
// useSyncExternalStore (not useState+useEffect) — the store is
// localStorage itself, so there's nothing to duplicate into React state
// and no setState-in-effect render cascade.

const LOCALE_CHANGE_EVENT = "haebot-locale-change";

function readLocale(): Locale {
  const stored = localStorage.getItem("locale");
  return stored === "en" ? "en" : "ko";
}

function subscribe(callback: () => void) {
  window.addEventListener(LOCALE_CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(LOCALE_CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getServerSnapshot(): Locale {
  return "ko";
}

function writeLocale(next: Locale) {
  localStorage.setItem("locale", next);
  window.dispatchEvent(new Event(LOCALE_CHANGE_EVENT));
}

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue>({ locale: "ko", setLocale: () => {} });

function LocaleProvider({ children }: { children: React.ReactNode }) {
  const locale = useSyncExternalStore(subscribe, readLocale, getServerSnapshot);
  return <LocaleContext.Provider value={{ locale, setLocale: writeLocale }}>{children}</LocaleContext.Provider>;
}

function useLocale() {
  return useContext(LocaleContext);
}

function useT() {
  const { locale } = useLocale();
  return (key: DictKey) => dictionaries[locale][key];
}

/** For page content authored inline as { ko, en } pairs (lib/site, tool content). */
function useBi() {
  const { locale } = useLocale();
  return (text: { ko: string; en: string }) => text[locale];
}

export { LocaleProvider, useLocale, useT, useBi };
