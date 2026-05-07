import { create } from "zustand";
import type { User } from "../types";

interface AuthState {
  user: User | null;
  actorUser: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isHydrating: boolean;
  impersonationToken: string | null;
  impersonationTargetUserId: number | null;
  setHydrating: (value: boolean) => void;
  setAuth: (user: User, accessToken: string) => void;
  updateUser: (user: Partial<User>) => void;
  startImpersonation: (token: string, actorUser: User, targetUser: User) => void;
  stopImpersonation: () => void;
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
  actorUser: null,
  accessToken: null,
  isAuthenticated: false,
  isHydrating: true,
  impersonationToken: null,
  impersonationTargetUserId: null,

  setHydrating: (value) => {
    set({ isHydrating: value });
  },

  setAuth: (user, accessToken) => {
    purgeLegacyAuthStorage();
    set((state) => ({
      user,
      accessToken,
      isAuthenticated: true,
      isHydrating: false,
      actorUser: state.impersonationToken ? state.actorUser : null,
      impersonationToken: state.impersonationToken,
      impersonationTargetUserId: state.impersonationToken ? state.impersonationTargetUserId : null,
    }));
  },

  updateUser: (partial) => {
    set((state) => {
      const updated = { ...state.user, ...partial } as User;
      return { user: updated };
    });
  },

  startImpersonation: (token, actorUser, targetUser) => {
    set({
      actorUser,
      user: targetUser,
      impersonationToken: token,
      impersonationTargetUserId: targetUser.id,
      isAuthenticated: true,
    });
  },

  stopImpersonation: () => {
    set((state) => ({
      user: state.actorUser ?? state.user,
      actorUser: null,
      impersonationToken: null,
      impersonationTargetUserId: null,
    }));
  },

  clearAuth: () => {
    purgeLegacyAuthStorage();
    set({
      user: null,
      actorUser: null,
      accessToken: null,
      isAuthenticated: false,
      isHydrating: false,
      impersonationToken: null,
      impersonationTargetUserId: null,
    });
  },

  logout: () => {
    purgeLegacyAuthStorage();
    set({
      user: null,
      actorUser: null,
      accessToken: null,
      isAuthenticated: false,
      isHydrating: false,
      impersonationToken: null,
      impersonationTargetUserId: null,
    });
  },
}));
