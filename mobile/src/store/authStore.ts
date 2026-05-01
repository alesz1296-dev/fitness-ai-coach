/**
 * Mobile auth store — mirrors the web version but uses expo-secure-store.
 *
 * Because SecureStore is async (no synchronous reads), the store initialises
 * with empty values and exposes an initialize() function that must be called
 * once at app startup (in App.tsx) before rendering any protected screens.
 */
import { create } from "zustand";
import { storage } from "../lib/storage";
import { setInMemoryToken } from "../lib/axios";
import type { User } from "@shared/types";

interface AuthState {
  user:            User | null;
  accessToken:     string | null;
  isAuthenticated: boolean;
  initialized:     boolean;

  /** Call once on app mount — loads persisted tokens into memory. */
  initialize: () => Promise<void>;
  setAuth:    (user: User, accessToken: string, refreshToken: string) => Promise<void>;
  updateUser: (partial: Partial<User>) => Promise<void>;
  logout:     () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user:            null,
  accessToken:     null,
  isAuthenticated: false,
  initialized:     false,

  initialize: async () => {
    const [accessToken, userStr] = await Promise.all([
      storage.getItemAsync("accessToken"),
      storage.getItemAsync("user"),
    ]);
    const user = userStr ? (JSON.parse(userStr) as User) : null;
    setInMemoryToken(accessToken);
    set({ accessToken, user, isAuthenticated: !!accessToken, initialized: true });
  },

  setAuth: async (user, accessToken, refreshToken) => {
    await Promise.all([
      storage.setItemAsync("accessToken",  accessToken),
      storage.setItemAsync("refreshToken", refreshToken),
      storage.setItemAsync("user",         JSON.stringify(user)),
    ]);
    setInMemoryToken(accessToken);
    set({ user, accessToken, isAuthenticated: true });
  },

  updateUser: async (partial) => {
    const updated = { ...get().user, ...partial } as User;
    await storage.setItemAsync("user", JSON.stringify(updated));
    set({ user: updated });
  },

  logout: async () => {
    await Promise.all([
      storage.removeItemAsync("accessToken"),
      storage.removeItemAsync("refreshToken"),
      storage.removeItemAsync("user"),
    ]);
    setInMemoryToken(null);
    set({ user: null, accessToken: null, isAuthenticated: false });
  },
}));
