import { useState, useEffect } from "react";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";
import { useTranslation } from "../../i18n";

/**
 * Shows a sticky banner at the top when the user loses internet connection.
 * Fades in when going offline, shows a brief "back online" confirmation, then hides.
 */
export function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const { t } = useTranslation();

  // Track whether we were ever offline so we can show the "back online" flash
  const [wasOffline, setWasOffline] = useState(false);
  const [showOnlineToast, setShowOnlineToast] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setShowOnlineToast(false);
    } else if (wasOffline) {
      // Just came back online — show toast briefly
      setShowOnlineToast(true);
      const timer = setTimeout(() => {
        setShowOnlineToast(false);
        setWasOffline(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  if (isOnline && !showOnlineToast) return null;

  // "Back online" toast
  if (isOnline && showOnlineToast) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2
                   bg-green-500 text-white text-sm font-medium px-4 py-2.5 shadow-md
                   animate-in fade-in slide-in-from-top duration-300"
      >
        <span className="text-base">✅</span>
        <span>{t("offline.backOnline")}</span>
      </div>
    );
  }

  // Offline banner
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-between gap-3
                 bg-gray-900 dark:bg-gray-950 text-white text-sm px-4 py-3 shadow-lg
                 animate-in fade-in slide-in-from-top duration-300"
    >
      <div className="flex items-center gap-2.5">
        <span className="text-base shrink-0">📡</span>
        <div>
          <p className="font-semibold leading-tight">{t("offline.noConnection")}</p>
          <p className="text-xs text-gray-400 mt-0.5">{t("offline.readOnlyMode")}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="inline-flex items-center gap-1 bg-red-500/20 text-red-300 text-xs font-medium px-2 py-0.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse inline-block" />
          {t("offline.offline")}
        </span>
      </div>
    </div>
  );
}
