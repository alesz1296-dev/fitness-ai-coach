import { create } from "zustand";
import type { User } from "../types";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isHydrating: boolean;
  setHydrating: (value: boolean) => void;
  setAuth: (user: User, accessToken: string) => void;
  updateUser: (user: Partial<User>) => void;
  clearAuth: () => void;
  logout: () => void;
}

function purgeLegacyAuthStorage(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
}

purgeLegacyAuthStorage();

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isHydrating: true,

  setHydrating: (value) => {
    set({ isHydrating: value });
  },

  setAuth: (user, accessToken) => {
    purgeLegacyAuthStorage();
    set({ user, accessToken, isAuthenticated: true, isHydrating: false });
  },

  updateUser: (partial) => {
    set((state) => {
      const updated = { ...state.user, ...partial } as User;
      return { user: updated };
    });
  },

  clearAuth: () => {
    purgeLegacyAuthStorage();
    set({ user: null, accessToken: null, isAuthenticated: false, isHydrating: false });
  },

  logout: () => {
    purgeLegacyAuthStorage();
    set({ user: null, accessToken: null, isAuthenticated: false, isHydrating: false });
  },
}));
