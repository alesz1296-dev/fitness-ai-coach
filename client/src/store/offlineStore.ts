import { create } from "zustand";

interface OfflineState {
  /** True when the browser has no network connectivity. */
  isOffline: boolean;
  /** Number of mutations sitting in the IndexedDB sync queue. */
  pendingCount: number;
  /** True while actively replaying the sync queue. */
  syncing: boolean;
  /** Timestamp (Date.now()) of the last successful queue flush, or null. */
  lastSyncAt: number | null;

  // ── Actions ───────────────────────────────────────────────────────────────
  setOffline: (v: boolean) => void;
  setPendingCount: (n: number) => void;
  incrementPendingCount: () => void;
  decrementPendingCount: () => void;
  setSyncing: (v: boolean) => void;
  setLastSyncAt: (ts: number) => void;
}

export const useOfflineStore = create<OfflineState>((set) => ({
  isOffline:    typeof navigator !== "undefined" ? !navigator.onLine : false,
  pendingCount: 0,
  syncing:      false,
  lastSyncAt:   null,

  setOffline:            (v) => set({ isOffline: v }),
  setPendingCount:       (n) => set({ pendingCount: n }),
  incrementPendingCount: ()  => set((s) => ({ pendingCount: s.pendingCount + 1 })),
  decrementPendingCount: ()  => set((s) => ({ pendingCount: Math.max(0, s.pendingCount - 1) })),
  setSyncing:            (v) => set({ syncing: v }),
  setLastSyncAt:         (ts) => set({ lastSyncAt: ts }),
}));
