import axios, { type AxiosRequestConfig } from "axios";
import { addPendingOp } from "../lib/idb";
import { useOfflineStore } from "../store/offlineStore";
import { useAuthStore } from "../store/authStore";

// Auth paths that should never be queued for offline replay
const AUTH_PATHS = ["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout"];
const QUEUEABLE_MUTATION_PATHS = [
  "/foods",
  "/workouts",
  "/weight",
  "/water",
  "/users",
  "/goals",
  "/templates",
  "/meal-plans",
  "/calendar",
  "/custom-foods",
  "/custom-exercises",
  "/weekly-plan",
  "/calorie-goals",
];
const NON_QUEUEABLE_MUTATION_PATHS = [
  "/calorie-goals/preview",
];

function isMutation(method?: string): boolean {
  const upper = (method ?? "").toUpperCase();
  return upper !== "" && upper !== "GET";
}

function isQueueableMutationPath(url: string): boolean {
  if (NON_QUEUEABLE_MUTATION_PATHS.some((p) => url.startsWith(p))) return false;
  return QUEUEABLE_MUTATION_PATHS.some((p) => url.startsWith(p));
}

function getHeaderValue(headers: unknown, name: string): string | undefined {
  if (!headers || typeof headers !== "object") return undefined;
  const obj = headers as Record<string, unknown> & { get?: (k: string) => unknown };
  if (typeof obj.get === "function") {
    const viaGet = obj.get(name);
    if (typeof viaGet === "string") return viaGet;
    if (viaGet != null) return String(viaGet);
  }
  const raw = obj[name] ?? obj[name.toLowerCase()] ?? obj[name.toUpperCase()];
  return typeof raw === "string" ? raw : raw != null ? String(raw) : undefined;
}

function setHeaderValue(headers: unknown, name: string, value: string): void {
  if (!headers || typeof headers !== "object") return;
  const obj = headers as Record<string, unknown>;
  obj[name] = value;
}

function createIdempotencyKey(): string {
  const cryptoObj = globalThis.crypto as Crypto | undefined;
  if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();
  return `fitai_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

// Attach access token + locale headers to every request
api.interceptors.request.use((config) => {
  config.headers = config.headers ?? {};
  const { accessToken: token, impersonationToken } = useAuthStore.getState();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (impersonationToken) config.headers["X-Impersonation-Session"] = impersonationToken;
  try {
    config.headers["X-Timezone"] = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch { /* ignore */ }
  try {
    const lang = localStorage.getItem("lang");
    if (lang) config.headers["X-Language"] = lang;
  } catch { /* ignore */ }

  const method = (config.method ?? "").toUpperCase();
  const url = config.url ?? "";
  const isAuthEndpoint = AUTH_PATHS.some((p) => url.includes(p));
  if (isMutation(method) && !isAuthEndpoint) {
    const existing = getHeaderValue(config.headers, "X-Idempotency-Key");
    if (!existing) {
      setHeaderValue(config.headers, "X-Idempotency-Key", createIdempotencyKey());
    }
  }
  return config;
});

// Auto-refresh on 401
let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: unknown) => void; reject: (e: unknown) => void }> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else       resolve(token);
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
    const url = originalRequest.url ?? "";
    const isAuthEndpoint = AUTH_PATHS.some((p) => url.includes(p));

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      const { setAuth, clearAuth } = useAuthStore.getState();

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers = {
            ...(originalRequest.headers as Record<string, string>),
            Authorization: `Bearer ${token}`,
          };
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post("/api/auth/refresh", {}, { withCredentials: true });
        const { accessToken: newAccess, user } = data;

        if (user) setAuth(user, newAccess);

        processQueue(null, newAccess);

        originalRequest.headers = {
          ...(originalRequest.headers as Record<string, string>),
          Authorization: `Bearer ${newAccess}`,
        };
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearAuth();
        window.location.href = "/login?sessionExpired=1";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Offline mutation queuing:
    // If there is no HTTP response (pure network error) and the request was a
    // non-GET mutation on a non-auth endpoint, serialize it to IndexedDB.
    if (!error.response && error.request && !originalRequest._retry) {
      const method = (originalRequest.method ?? "").toUpperCase();
      const isAuthEndpoint = AUTH_PATHS.some((p) => url.includes(p));
      const isMutation = method !== "GET" && method !== "";

      if (isMutation && !isAuthEndpoint && isQueueableMutationPath(url)) {
        const headers: Record<string, string> = {};
        const token = useAuthStore.getState().accessToken;
        if (token) headers.Authorization = `Bearer ${token}`;
        try {
          headers["X-Timezone"] = Intl.DateTimeFormat().resolvedOptions().timeZone;
        } catch { /* ignore */ }
        const lang = localStorage.getItem("lang");
        if (lang) headers["X-Language"] = lang;
        const idempotencyKey = getHeaderValue(originalRequest.headers, "X-Idempotency-Key") ?? createIdempotencyKey();
        headers["X-Idempotency-Key"] = idempotencyKey;

        const rawBody = originalRequest.data;
        let body: unknown;
        if (rawBody) {
          if (typeof rawBody === "string") {
            try { body = JSON.parse(rawBody); } catch { body = rawBody; }
          } else {
            body = rawBody;
          }
        }

        addPendingOp({ method, url, body, headers, idempotencyKey, timestamp: Date.now() })
          .then(() => useOfflineStore.getState().incrementPendingCount())
          .catch(() => { /* silently ignore IDB errors */ });
      }
    }

    return Promise.reject(error);
  }
);

function clearSession(expired = false) {
  useAuthStore.getState().clearAuth();
  window.location.href = expired ? "/login?sessionExpired=1" : "/login";
}

export default api;
