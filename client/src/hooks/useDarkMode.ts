import { useEffect, useState } from "react";

const PREF_KEY = "app_prefs_v1";
export type ColorTheme = "default" | "black-gold" | "white-green";

/** Reads the stored dark-mode preference, falling back to the OS setting. */
export function readDarkPref(): boolean {
  try {
    const s = localStorage.getItem(PREF_KEY);
    if (s) {
      const parsed = JSON.parse(s);
      if (typeof parsed.darkMode === "boolean") return parsed.darkMode;
    }
  } catch { /* ignore */ }
  // Respect the OS colour-scheme if the user has never set a preference
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

export function readColorThemePref(): ColorTheme {
  try {
    const s = localStorage.getItem(PREF_KEY);
    if (s) {
      const parsed = JSON.parse(s);
      if (parsed.colorTheme === "black-gold" || parsed.colorTheme === "white-green") {
        return parsed.colorTheme;
      }
    }
  } catch { /* ignore */ }
  return "default";
}

/** Adds or removes the `dark` class on <html>. */
export function applyDark(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
}

export function applyColorTheme(theme: ColorTheme) {
  if (theme === "default") document.documentElement.removeAttribute("data-color-theme");
  else document.documentElement.setAttribute("data-color-theme", theme);
}

/**
 * Call once in the root Layout component.
 * Reads the stored preference on mount and applies the `dark` class so the
 * correct theme is shown before the first paint.
 */
export function useDarkModeInit() {
  useEffect(() => {
    applyDark(readDarkPref());
    applyColorTheme(readColorThemePref());
  }, []);
}

/**
 * Returns true when the dark class is currently on <html>.
 * Re-renders whenever the class list changes (e.g. user toggles dark mode in Settings).
 */
export function useIsDark(): boolean {
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains("dark")
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
