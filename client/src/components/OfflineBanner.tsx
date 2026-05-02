import { useState, useEffect, useRef } from "react";
import { useOfflineStore } from "../store/offlineStore";
import { flushQueue } from "../hooks/useOfflineSync";

/**
 * Top-of-screen banner that reflects network state and the sync queue.
 *
 * - Green flash for 3 s when connectivity is restored
 * - Shows pending mutation count when offline
 * - "Sync now" button for manual queue replay
 */
export function OfflineBanner() {
  const { isOffline, pendingCount, syncing } = useOfflineStore();
  const [dismissed,  setDismissed]  = useState(false);
  const [backOnline, setBackOnline] = useState(false);
  const prevOfflineRef = useRef(isOffline);

  useEffect(() => {
    const wasOffline = prevOfflineRef.current;

    if (wasOffline && !isOffline) {
      setBackOnline(true);
      setDismissed(false);
      const timer = setTimeout(() => setBackOnline(false), 3000);
      prevOfflineRef.current = false;
      return () => clearTimeout(timer);
    }

    if (!wasOffline && isOffline) {
      setDismissed(false);
      setBackOnline(false);
      prevOfflineRef.current = true;
    }
  }, [isOffline]);

  if (backOnline) {
    const msg = pendingCount > 0
      ? "Back online — syncing " + pendingCount + " change" + (pendingCount === 1 ? "" : "s") + "..."
      : "Back online — all changes synced";
    return (
      <div className="fixed top-0 inset-x-0 z-50 flex items-center justify-center px-4 py-2 bg-green-600 text-white text-sm font-medium shadow animate-fade-in">
        {msg}
      </div>
    );
  }

  if (!isOffline || dismissed) return null;

  const hasPending = pendingCount > 0;
  const statusMsg = hasPending
    ? "You are offline — " + pendingCount + " change" + (pendingCount === 1 ? "" : "s") + " waiting to sync"
    : "You are offline — some features may not be available";

  return (
    <div className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-4 py-2.5 bg-gray-900 text-white text-sm shadow">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-lg shrink-0" role="img" aria-label="no signal">📡</span>
        <span className="truncate">{statusMsg}</span>
      </div>

      <div className="flex items-center gap-2 ml-4 shrink-0">
        {hasPending && (
          <button
            onClick={flushQueue}
            disabled={syncing}
            className="text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-2.5 py-1 rounded transition-colors"
          >
            {syncing ? "Syncing..." : "Sync now"}
          </button>
        )}
        <button
          onClick={() => setDismissed(true)}
          className="text-gray-400 hover:text-white transition-colors"
          aria-label="Dismiss offline banner"
        >
          x
        </button>
      </div>
    </div>
  );
}
