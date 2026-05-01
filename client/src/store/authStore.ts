import { create } from "zustand";
import type { User } from "../types";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  updateUser: (user: Partial<User>) => void;
  logout: () => void;
}

const storedUser         = localStorage.getItem("user");
const storedAccessToken  = localStorage.getItem("accessToken");

export const useAuthStore = create<AuthState>((set) => ({
  user:            storedUser ? JSON.parse(storedUser) : null,
  accessToken:     storedAccessToken,
  isAuthenticated: !!storedAccessToken,

  setAuth: (user, accessToken, refreshToken) => {
    localStorage.setItem("accessToken",  accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    localStorage.setItem("user", JSON.stringify(user));
    set({ user, accessToken, isAuthenticated: true });
  },

  updateUser: (partial) => {
    set((state) => {
      const updated = { ...state.user, ...partial } as User;
      localStorage.setItem("user", JSON.stringify(updated));
      return { user: updated };
    });
  },

  logout: () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    set({ user: null, accessToken: null, isAuthenticated: false });
  },
}));
