import axios, { type AxiosRequestConfig } from "axios";
import { addPendingOp } from "../lib/idb";
import { useOfflineStore } from "../store/offlineStore";
import { useAuthStore } from "../store/authStore";

// Auth paths that should never be queued for offline replay
const AUTH_PATHS = ["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout"];

const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

// Attach access token + locale headers to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  try {
    config.headers["X-Timezone"] = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch { /* ignore */ }
  try {
    const lang = localStorage.getItem("lang");
    if (lang) config.headers["X-Language"] = lang;
  } catch { /* ignore */ }
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

      if (isMutation && !isAuthEndpoint) {
        const headers: Record<string, string> = {};
        const token = useAuthStore.getState().accessToken;
        if (token) headers.Authorization = `Bearer ${token}`;
        try {
          headers["X-Timezone"] = Intl.DateTimeFormat().resolvedOptions().timeZone;
        } catch { /* ignore */ }
        const lang = localStorage.getItem("lang");
        if (lang) headers["X-Language"] = lang;

        const rawBody = originalRequest.data;
        let body: unknown;
        if (rawBody) {
          if (typeof rawBody === "string") {
            try { body = JSON.parse(rawBody); } catch { body = rawBody; }
          } else {
            body = rawBody;
          }
        }

        addPendingOp({ method, url, body, headers, timestamp: Date.now() })
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
