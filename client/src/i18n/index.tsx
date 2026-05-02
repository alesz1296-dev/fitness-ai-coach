/**
 * Lightweight i18n — zero external dependencies.
 *
 * API surface intentionally mirrors react-i18next so the migration is a
 * 1-file swap when the npm package becomes available:
 *   useTranslation()  → returns { t, i18n }
 *   t("nav.dashboard")
 *   i18n.changeLanguage("es")
 *   i18n.language      → "en" | "es"
 *
 * Language preference is persisted to localStorage under the key "lang".
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import en from "./locales/en";
import es from "./locales/es";
import type { Translation } from "./locales/en";
import { setDateFormatLang } from "../lib/dateFormat";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export type SupportedLang = "en" | "es";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type NestedKeyOf<T, Prefix extends string = ""> = {
  [K in keyof T]: T[K] extends Record<string, string>
    ? `${Prefix}${Prefix extends "" ? "" : "."}${string & K}.${string & keyof T[K]}`
    : never;
}[keyof T];

export type TKey = NestedKeyOf<Translation>;

// ─────────────────────────────────────────────────────────────────────────────
// Translation data
// ─────────────────────────────────────────────────────────────────────────────
const LOCALES: Record<SupportedLang, Translation> = { en, es };

export const LANG_LABELS: Record<SupportedLang, string> = {
  en: "English",
  es: "Español",
};

// ─────────────────────────────────────────────────────────────────────────────
// Module-level t() — usable anywhere without hooks.
// Automatically stays in sync with the React context via I18nProvider.
// New languages: add a locale file + entry to LOCALES and LANG_LABELS — done.
// ─────────────────────────────────────────────────────────────────────────────
let _activeLang: SupportedLang = "en"; // updated on first I18nProvider mount

function _resolve(key: string): string {
  const locale = LOCALES[_activeLang] as unknown as Record<string, unknown>;
  const parts = key.split(".");
  let cur: unknown = locale;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return key;
    cur = (cur as Record<string, unknown>)[p];
  }
  return typeof cur === "string" ? cur : key;
}

/** Call t("section.key") anywhere — React component, sub-component, or utility. */
export function t(key: TKey, vars?: Record<string, string | number>): string {
  let str = _resolve(key);
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(new RegExp(`\{\{${k}\}\}`, "g"), String(v));
    }
  }
  return str;
}

/** Lightweight hook — triggers re-render on language change. Use in components that display translated text. */
export function useT() {
  return useTranslation().t;
}

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────
interface I18nContextValue {
  language: SupportedLang;
  changeLanguage: (lang: SupportedLang) => void;
  t: (key: TKey, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────
function getInitialLang(): SupportedLang {
  try {
    const stored = localStorage.getItem("lang");
    if (stored === "en" || stored === "es") return stored;
    const browser = navigator.language.split("-")[0];
    if (browser === "es") return "es";
  } catch { /* ignore */ }
  return "en";
}

function resolve(obj: Record<string, unknown>, key: string): string {
  const parts = key.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return key;
    cur = (cur as Record<string, unknown>)[p];
  }
  return typeof cur === "string" ? cur : key;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<SupportedLang>(() => {
    const l = getInitialLang();
    _activeLang = l;            // sync module-level on mount
    setDateFormatLang(l);       // sync date formatter on mount
    return l;
  });

  const changeLanguage = useCallback((lang: SupportedLang) => {
    _activeLang = lang;                            // sync module-level cache
    setDateFormatLang(lang);                       // sync date formatter
    setLanguage(lang);
    try { localStorage.setItem("lang", lang); } catch { /* ignore */ }
    document.documentElement.lang = lang;
  }, []);

  const t = useCallback((key: TKey, vars?: Record<string, string | number>): string => {
    const locale = LOCALES[language] as unknown as Record<string, unknown>;
    let str = resolve(locale, key);
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), String(v));
      }
    }
    return str;
  }, [language]);

  const value = useMemo(() => ({ language, changeLanguage, t }), [language, changeLanguage, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook — mirrors react-i18next's useTranslation()
// ─────────────────────────────────────────────────────────────────────────────
export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useTranslation must be used inside <I18nProvider>");
  return { t: ctx.t, i18n: { language: ctx.language, changeLanguage: ctx.changeLanguage } };
}

// Re-export for convenience
export { I18nContext };
