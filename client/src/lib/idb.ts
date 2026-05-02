/**
 * FitAI — IndexedDB sync-queue helpers
 *
 * Stores mutation operations that failed due to network loss so they can be
 * replayed when connectivity is restored.  Zero dependencies.
 */

export interface PendingOp {
  id?: number;
  method: string;                      // POST | PUT | PATCH | DELETE
  url: string;                         // relative path, e.g. "/workouts"
  body: unknown;                       // JSON-serialisable request payload
  headers: Record<string, string>;     // auth + locale headers at queue time
  timestamp: number;                   // Date.now() when queued
}

const DB_NAME    = "fitai-offline";
const DB_VERSION = 1;
const STORE      = "syncQueue";

// ── Open (or create) the database ─────────────────────────────────────────────
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

// ── Public helpers ─────────────────────────────────────────────────────────────

/** Add one operation to the queue. Returns the auto-assigned numeric id. */
export async function addPendingOp(op: Omit<PendingOp, "id">): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, "readwrite");
    const req = tx.objectStore(STORE).add(op);
    req.onsuccess = () => resolve(req.result as number);
    req.onerror   = () => reject(req.error);
  });
}

/** Return all queued operations in insertion order. */
export async function getPendingOps(): Promise<PendingOp[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as PendingOp[]);
    req.onerror   = () => reject(req.error);
  });
}

/** Remove a single operation by its id (call after successful replay). */
export async function deletePendingOp(id: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, "readwrite");
    const req = tx.objectStore(STORE).delete(id);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

/** How many operations are currently queued. */
export async function getPendingCount(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

/** Wipe the entire queue (e.g. after a full data reset). */
export async function clearPendingOps(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, "readwrite");
    const req = tx.objectStore(STORE).clear();
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}
