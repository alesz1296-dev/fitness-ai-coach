import { useState, useEffect } from "react";

/**
 * Shows a dismissible top banner when the browser goes offline.
 * Uses navigator.onLine + window events — no deps needed.
 */
export function OfflineBanner() {
  const [offline,    setOffline]    = useState(!navigator.onLine);
  const [dismissed,  setDismissed]  = useState(false);
  const [backOnline, setBackOnline] = useState(false);

  useEffect(() => {
    const handleOffline = () => { setOffline(true); setDismissed(false); setBackOnline(false); };
    const handleOnline  = () => {
      setOffline(false);
      setBackOnline(true);
      // Auto-hide "back online" message after 3 s
      setTimeout(() => setBackOnline(false), 3000);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online",  handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online",  handleOnline);
    };
  }, []);

  if (backOnline) {
    return (
      <div className="fixed top-0 inset-x-0 z-50 flex items-center justify-center px-4 py-2 bg-green-600 text-white text-sm font-medium shadow animate-fade-in">
        ✅ Back online
      </div>
    );
  }

  if (!offline || dismissed) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-4 py-2.5 bg-gray-900 text-white text-sm shadow">
      <div className="flex items-center gap-2">
        <span className="text-lg">📡</span>
        <span>You're offline — some features may not be available.</span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="ml-4 shrink-0 text-gray-400 hover:text-white transition-colors"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
