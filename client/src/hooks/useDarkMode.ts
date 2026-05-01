import { useEffect, useState } from "react";

const PREF_KEY = "app_prefs_v1";

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

/** Adds or removes the `dark` class on <html>. */
export function applyDark(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
}

/**
 * Call once in the root Layout component.
 * Reads the stored preference on mount and applies the `dark` class so the
 * correct theme is shown before the first paint.
 */
export function useDarkModeInit() {
  useEffect(() => {
    applyDark(readDarkPref());
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
