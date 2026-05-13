/**
 * FitAI — IndexedDB sync-queue helpers
 *
 * Stores mutation operations that failed due to network loss so they can be
 * replayed when connectivity is restored.  Zero dependencies.
 */

export interface PendingOp {
  id?: number;
  mutationId: string;                 // client-stable mutation UUID used to dedupe local replay
  idempotencyKey: string;             // replay-safe mutation key shared with the server
  method: string;                     // POST | PUT | PATCH | DELETE
  url: string;                        // relative path, e.g. "/workouts"
  body: unknown;                      // JSON-serialisable request payload
  headers: Record<string, string>;    // auth + locale headers at queue time
  timestamp: number;                  // Date.now() when first queued
}

function normalizePendingOp(raw: PendingOp): PendingOp {
  const idempotencyKey =
    raw.idempotencyKey ||
    raw.mutationId ||
    `fitai_legacy_${raw.id ?? "queued"}_${raw.timestamp}`;
  return {
    ...raw,
    mutationId: raw.mutationId || idempotencyKey,
    idempotencyKey,
    headers: raw.headers ?? {},
  };
}

const DB_NAME    = "fitai-offline";
const DB_VERSION = 2;
const STORE      = "syncQueue";
const MUTATION_INDEX = "byMutationId";
const IDEMPOTENCY_INDEX = "byIdempotencyKey";

// ── Open (or create) the database ─────────────────────────────────────────────
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      let store: IDBObjectStore;
      if (!db.objectStoreNames.contains(STORE)) {
        store = db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      } else {
        store = req.transaction!.objectStore(STORE);
      }

      if (!store.indexNames.contains(MUTATION_INDEX)) {
        store.createIndex(MUTATION_INDEX, "mutationId", { unique: true });
      }
      if (!store.indexNames.contains(IDEMPOTENCY_INDEX)) {
        store.createIndex(IDEMPOTENCY_INDEX, "idempotencyKey", { unique: true });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

// ── Public helpers ─────────────────────────────────────────────────────────────

export interface AddPendingOpResult {
  id: number;
  created: boolean;
}

/**
 * Add one operation to the queue, merging by mutation identity so the same
 * offline write is not enqueued twice before replay succeeds.
 */
export async function addPendingOp(op: Omit<PendingOp, "id">): Promise<AddPendingOpResult> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const mutationReq = store.index(MUTATION_INDEX).get(op.mutationId);

    const mergeIntoExisting = (existing: PendingOp) => {
      const merged: PendingOp = {
        ...existing,
        ...op,
        id: existing.id,
        timestamp: Math.min(existing.timestamp, op.timestamp),
      };
      const updateReq = store.put(merged);
      updateReq.onsuccess = () =>
        resolve({ id: (existing.id as number), created: false });
      updateReq.onerror = () => reject(updateReq.error);
    };

    mutationReq.onsuccess = () => {
      const existing = mutationReq.result as PendingOp | undefined;
      if (existing?.id != null) {
        mergeIntoExisting(existing);
        return;
      }

      const fallbackReq = store.index(IDEMPOTENCY_INDEX).get(op.idempotencyKey);
      fallbackReq.onsuccess = () => {
        const fallbackExisting = fallbackReq.result as PendingOp | undefined;
        if (fallbackExisting?.id != null) {
          mergeIntoExisting(fallbackExisting);
          return;
        }

        const addReq = store.add(op);
        addReq.onsuccess = () =>
          resolve({ id: addReq.result as number, created: true });
        addReq.onerror = () => reject(addReq.error);
      };
      fallbackReq.onerror = () => reject(fallbackReq.error);
    };

    mutationReq.onerror = () => reject(mutationReq.error);
  });
}

/** Return all queued operations in insertion order. */
export async function getPendingOps(): Promise<PendingOp[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result as PendingOp[]).map(normalizePendingOp));
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
