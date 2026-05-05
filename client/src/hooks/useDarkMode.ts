import { useEffect, useState } from "react";

const PREF_KEY = "app_prefs_v2";
const LEGACY_PREF_KEY = "app_prefs_v1";

export type ThemePreset =
  | "system-classic"
  | "light-classic"
  | "dark-classic"
  | "dark-charcoal"
  | "black-gold"
  | "white-green"
  | "midnight-cyan"
  | "soft-sand"
  | "editorial-rose"
  | "industrial-slate"
  | "paper-ivory"
  | "aurora-ink"
  | "sunrise-amber";

export interface AppPrefs {
  trackWater: boolean;
  appearancePreset: ThemePreset;
}

type ThemeMode = "system" | "light" | "dark";
type ThemePalette =
  | "classic"
  | "black-gold"
  | "white-green"
  | "midnight-cyan"
  | "soft-sand"
  | "editorial-rose"
  | "industrial-slate"
  | "paper-ivory"
  | "aurora-ink"
  | "sunrise-amber";

type ThemePresetConfig = {
  mode: ThemeMode;
  palette: ThemePalette;
};

const DEFAULT_PREFS: AppPrefs = {
  trackWater: true,
  appearancePreset: "system-classic",
};

const THEME_PRESETS: Record<ThemePreset, ThemePresetConfig> = {
  "system-classic": { mode: "system", palette: "classic" },
  "light-classic": { mode: "light", palette: "classic" },
  "dark-classic": { mode: "dark", palette: "classic" },
  "dark-charcoal": { mode: "dark", palette: "classic" },
  "black-gold": { mode: "dark", palette: "black-gold" },
  "white-green": { mode: "light", palette: "white-green" },
  "midnight-cyan": { mode: "dark", palette: "midnight-cyan" },
  "soft-sand": { mode: "light", palette: "soft-sand" },
  "editorial-rose": { mode: "light", palette: "editorial-rose" },
  "industrial-slate": { mode: "dark", palette: "industrial-slate" },
  "paper-ivory": { mode: "light", palette: "paper-ivory" },
  "aurora-ink": { mode: "dark", palette: "aurora-ink" },
  "sunrise-amber": { mode: "light", palette: "sunrise-amber" },
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function readJson(key: string): any | null {
  if (!canUseStorage()) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function normalizePreset(value: unknown): ThemePreset | null {
  if (
    value === "system-classic" ||
    value === "light-classic" ||
    value === "dark-classic" ||
    value === "dark-charcoal" ||
    value === "black-gold" ||
    value === "white-green" ||
    value === "midnight-cyan" ||
    value === "soft-sand" ||
    value === "editorial-rose" ||
    value === "industrial-slate" ||
    value === "paper-ivory" ||
    value === "aurora-ink" ||
    value === "sunrise-amber"
  ) {
    return value === "dark-classic" ? "dark-charcoal" : value;
  }
  return null;
}

function mapLegacyPrefs(parsed: any): AppPrefs {
  const trackWater = parsed?.trackWater !== false;
  const legacyDark = typeof parsed?.darkMode === "boolean" ? parsed.darkMode : null;
  const legacyTheme = typeof parsed?.colorTheme === "string" ? parsed.colorTheme : "";

  let appearancePreset: ThemePreset = "system-classic";
  if (legacyTheme === "black-gold") appearancePreset = "black-gold";
  else if (legacyTheme === "white-green") appearancePreset = "white-green";
  else if (legacyDark === true) appearancePreset = "dark-charcoal";
  else if (legacyDark === false) appearancePreset = "light-classic";

  const normalized = normalizePreset(parsed?.appearancePreset);
  return {
    trackWater,
    appearancePreset: normalized ?? appearancePreset,
  };
}

export function readAppPrefs(): AppPrefs {
  const current = readJson(PREF_KEY);
  if (current) {
    return {
      ...DEFAULT_PREFS,
      trackWater: current.trackWater !== false,
      appearancePreset: normalizePreset(current.appearancePreset) ?? DEFAULT_PREFS.appearancePreset,
    };
  }

  const legacy = readJson(LEGACY_PREF_KEY);
  if (legacy) return { ...DEFAULT_PREFS, ...mapLegacyPrefs(legacy) };
  return DEFAULT_PREFS;
}

export function writeAppPrefs(next: AppPrefs) {
  if (!canUseStorage()) return;
  const payload = JSON.stringify(next);
  localStorage.setItem(PREF_KEY, payload);
  localStorage.setItem(LEGACY_PREF_KEY, payload);
}

export function applyAppearancePreset(preset: ThemePreset) {
  const resolved = THEME_PRESETS[preset] ?? THEME_PRESETS["system-classic"];
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  const dark = resolved.mode === "dark" || (resolved.mode === "system" && prefersDark);

  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.dataset.themePreset = preset;
  document.documentElement.dataset.themeMode = dark ? "dark" : "light";
  document.documentElement.dataset.colorTheme = resolved.palette;
}

function applyStoredAppearance() {
  const prefs = readAppPrefs();
  applyAppearancePreset(prefs.appearancePreset);
}

/**
 * Call once in the root Layout component.
 * Reads the stored preference on mount and applies the selected appearance preset
 * before the first paint.
 */
export function useDarkModeInit() {
  useEffect(() => {
    applyStoredAppearance();
  }, []);
}

/**
 * Returns true when the dark class is currently on <html>.
 * Re-renders whenever the class list changes (e.g. user changes appearance in Settings).
 */
export function useIsDark(): boolean {
  const [dark, setDark] = useState(() =>
    typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  );
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setDark(document.documentElement.classList.contains("dark"))
    );
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

// Legacy compatibility exports during the migration window.
export type ColorTheme = "default" | "black-gold" | "white-green";

export function readDarkPref(): boolean {
  return (() => {
    const preset = readAppPrefs().appearancePreset;
    const cfg = THEME_PRESETS[preset] ?? THEME_PRESETS["system-classic"];
    if (cfg.mode === "dark") return true;
    if (cfg.mode === "light") return false;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  })();
}

export function readColorThemePref(): ColorTheme {
  const preset = readAppPrefs().appearancePreset;
  const palette = THEME_PRESETS[preset]?.palette ?? "classic";
  if (palette === "black-gold") return "black-gold";
  if (palette === "white-green") return "white-green";
  return "default";
}

export function applyDark(dark: boolean) {
  applyAppearancePreset(dark ? "dark-charcoal" : "system-classic");
}

export function applyColorTheme(theme: ColorTheme) {
  if (theme === "black-gold") applyAppearancePreset("black-gold");
  else if (theme === "white-green") applyAppearancePreset("white-green");
  else applyAppearancePreset("system-classic");
}
