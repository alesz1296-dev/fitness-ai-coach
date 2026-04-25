/**
 * Mobile Axios instance.
 *
 * Key differences from the web version:
 * - baseURL points to the absolute server URL (env var), not a relative "/api"
 * - Tokens are stored in expo-secure-store (async), so we maintain an in-memory
 *   cache (_accessToken) that is populated once during app initialisation.
 * - clearSession() navigates via the navigation ref rather than window.location
 */
import axios, { type AxiosRequestConfig } from "axios";
import { storage } from "./storage";

// Set EXPO_PUBLIC_API_URL in mobile/.env  e.g. http://192.168.1.x:3000/api
// During dev use your PC's local IP so the phone can reach it over Wi-Fi.
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000/api";

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// ── In-memory token cache ─────────────────────────────────────────────────────
// SecureStore is async — we populate this once on app start from authStore.initialize()
let _accessToken: string | null = null;

export function setInMemoryToken(token: string | null) {
  _accessToken = token;
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
}

// ── Attach token to every request ─────────────────────────────────────────────
api.interceptors.request.use((config) => {
  if (_accessToken) config.headers.Authorization = `Bearer ${_accessToken}`;
  return config;
});

// ── Auto-refresh on 401 ───────────────────────────────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: unknown) => void; reject: (e: unknown) => void }> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else       resolve(token);
  });
  failedQueue = [];
}

// Navigation reset callback — set this in your root navigator
let _onSessionExpired: (() => void) | null = null;
export function setSessionExpiredHandler(cb: () => void) {
  _onSessionExpired = cb;
}

async function clearSession() {
  await Promise.all([
    storage.removeItemAsync("accessToken"),
    storage.removeItemAsync("refreshToken"),
    storage.removeItemAsync("user"),
  ]);
  setInMemoryToken(null);
  _onSessionExpired?.();
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = await storage.getItemAsync("refreshToken");

      if (!refreshToken) {
        await clearSession();
        return Promise.reject(error);
      }

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
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
        const { accessToken: newAccess, refreshToken: newRefresh } = data;

        await storage.setItemAsync("accessToken",  newAccess);
        await storage.setItemAsync("refreshToken", newRefresh);
        setInMemoryToken(newAccess);

        processQueue(null, newAccess);

        originalRequest.headers = {
          ...(originalRequest.headers as Record<string, string>),
          Authorization: `Bearer ${newAccess}`,
        };
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        await clearSession();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
