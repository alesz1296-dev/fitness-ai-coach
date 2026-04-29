import { useState, useEffect } from "react";

/**
 * Shows a one-time "Add to Home Screen" hint on iOS Safari.
 *
 * iOS doesn't support the `beforeinstallprompt` event — Safari users must
 * manually tap Share → Add to Home Screen. We detect iOS + standalone mode
 * and show a brief dismissible tip.
 *
 * On Android / Chrome, the native install prompt fires automatically via the
 * `beforeinstallprompt` event, so we capture and expose it as a button instead.
 */

const STORAGE_KEY = "fitai_install_dismissed";

function isIOS() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as any).MSStream
  );
}

function isInStandaloneMode() {
  return (
    ("standalone" in window.navigator && (window.navigator as any).standalone) ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

export function InstallPrompt() {
  const [showIOS,    setShowIOS]    = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Already dismissed or already installed
    if (localStorage.getItem(STORAGE_KEY) || isInStandaloneMode()) return;

    if (isIOS()) {
      // Small delay so it doesn't appear immediately on first load
      const t = setTimeout(() => setShowIOS(true), 3000);
      return () => clearTimeout(t);
    }

    // Android / Chrome — listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setShowIOS(false);
    setDeferredPrompt(null);
  };

  const androidInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    dismiss();
  };

  // iOS banner
  if (showIOS) {
    return (
      <div className="fixed bottom-20 sm:bottom-4 left-4 right-4 z-50 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 flex gap-3 items-start animate-slide-up">
        <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-lg">F</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900 dark:text-white">Install FitAI Coach</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Tap <strong>Share</strong> <span className="text-base">⎙</span> then <strong>Add to Home Screen</strong> for the app experience.
          </p>
        </div>
        <button
          onClick={dismiss}
          className="text-gray-400 hover:text-gray-600 shrink-0 text-lg leading-none"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    );
  }

  // Android / Chrome install button
  if (deferredPrompt) {
    return (
      <div className="fixed bottom-20 sm:bottom-4 left-4 right-4 z-50 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 flex gap-3 items-center animate-slide-up">
        <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-lg">F</span>
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm text-gray-900 dark:text-white">Install FitAI Coach</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Add to your home screen for instant access.</p>
        </div>
        <button
          onClick={androidInstall}
          className="shrink-0 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
        >
          Install
        </button>
        <button onClick={dismiss} className="text-gray-400 hover:text-gray-600 text-lg leading-none" aria-label="Dismiss">✕</button>
      </div>
    );
  }

  return null;
}
