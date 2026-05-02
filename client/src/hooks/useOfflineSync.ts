import { useEffect } from "react";
import api from "../api/axios";
import { getPendingOps, deletePendingOp, getPendingCount } from "../lib/idb";
import { useOfflineStore } from "../store/offlineStore";

/**
 * Replay all queued mutations from IndexedDB in order.
 * Successfully replayed ops are removed; failures remain for the next attempt.
 * Exported as a standalone async function so OfflineBanner can call it too.
 */
export async function flushQueue(): Promise<void> {
  const { setSyncing, setPendingCount, setLastSyncAt } = useOfflineStore.getState();

  const ops = await getPendingOps();
  if (ops.length === 0) return;

  setSyncing(true);
  let succeeded = 0;

  for (const op of ops) {
    try {
      await api.request({
        method: op.method,
        url: op.url,
        data: op.body,
        headers: op.headers,
      });
      if (op.id != null) await deletePendingOp(op.id);
      succeeded++;
    } catch {
      // Leave failed ops in the queue — they will retry on the next flush
    }
  }

  const remaining = await getPendingCount();
  setPendingCount(remaining);
  setSyncing(false);
  if (succeeded > 0) setLastSyncAt(Date.now());
}

/**
 * Mount once at the app root.
 * Wires up online / offline listeners, loads the initial pending count,
 * and listens for the SW → app "SW_SYNC_REPLAY" message.
 */
export function useOfflineSync(): void {
  const { setOffline, setPendingCount } = useOfflineStore();

  // Hydrate the pending count from IndexedDB on first mount
  useEffect(() => {
    getPendingCount().then(setPendingCount).catch(() => {});
  }, [setPendingCount]);

  useEffect(() => {
    const handleOnline = () => {
      setOffline(false);
      flushQueue();
    };
    const handleOffline = () => setOffline(true);

    window.addEventListener("online",  handleOnline);
    window.addEventListener("offline", handleOffline);

    // Service Worker broadcasts this when Background Sync fires
    const handleSwMessage = (e: MessageEvent) => {
      if (e.data?.type === "SW_SYNC_REPLAY") flushQueue();
    };
    navigator.serviceWorker?.addEventListener("message", handleSwMessage);

    return () => {
      window.removeEventListener("online",  handleOnline);
      window.removeEventListener("offline", handleOffline);
      navigator.serviceWorker?.removeEventListener("message", handleSwMessage);
    };
  }, [setOffline]);
}
