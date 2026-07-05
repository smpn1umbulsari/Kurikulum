/**
 * Auth Store - SIKAD v4.0
 * Zustand store for authentication and permission state
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, Session } from '@/types';

// ============ STATE TYPE ============

export interface AuthState {
  // State
  user: User | null;
  session: Session | null;
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Custom Auth (username-based)
  customUser: {
    id: string;
    username: string;
    full_name: string;
    email: string | null;
    role: string;
    role_name: string;
  } | null;
  token: string | null;

  // Actions
  setSession: (session: Session | null) => void;
  setUser: (user: User | null) => void;
  setCustomUser: (user: AuthState['customUser'], token: string) => void;
  setPermissions: (permissions: string[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
  clearError: () => void;
}

// ============ STORE ============

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // Initial state
      user: null,
      session: null,
      permissions: [],
      isAuthenticated: false,
      isLoading: false,
      error: null,
      customUser: null,
      token: null,

      // Actions
      setSession: (session) =>
        set({
          session,
          user: session?.user ?? null,
          isAuthenticated: !!session?.access_token,
        }),

      setUser: (user) =>
        set((state) => ({
          user,
          isAuthenticated: !!state.session?.access_token && !!user,
        })),

      setCustomUser: (customUser, token) =>
        set({
          customUser,
          token,
          isAuthenticated: true,
          user: null,
          session: null,
        }),

      setPermissions: (permissions) => set({ permissions }),

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error }),

      logout: () =>
        set({
          user: null,
          session: null,
          permissions: [],
          isAuthenticated: false,
          error: null,
          customUser: null,
          token: null,
        }),

      clearError: () => set({ error: null }),
    }),
    {
      name: 'sikad-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        session: state.session,
        permissions: state.permissions,
        isAuthenticated: state.isAuthenticated,
        customUser: state.customUser,
        token: state.token,
      }),
    }
  )
);

// ============ SELECTORS ============

export const selectUser = (state: AuthState) => state.user;
export const selectCustomUser = (state: AuthState) => state.customUser;
export const selectIsAuthenticated = (state: AuthState) => state.isAuthenticated;
export const selectIsLoading = (state: AuthState) => state.isLoading;
export const selectError = (state: AuthState) => state.error;
export const selectUserRole = (state: AuthState) => state.customUser?.role ?? state.user?.role;
export const selectPermissions = (state: AuthState) => state.permissions;
export const selectAccessToken = (state: AuthState) => state.token ?? state.session?.access_token;

// ============ ROLE & PERMISSION CHECKS ============

export const useHasRole = (allowedRoles: string[]) => {
  const role = useAuthStore((state) => state.customUser?.role ?? state.user?.role);
  return allowedRoles.includes(role || '');
};

export const useHasPermission = (permission: string) => {
  const permissions = useAuthStore((state) => state.permissions);
  return permissions.includes(permission);
};

export const useIsAdmin = () => {
  return useHasRole(['SUPER_ADMIN', 'SUPERADMIN', 'ADMIN', 'KURIKULUM']);
};

export const useIsGuru = () => {
  return useHasRole(['SUPER_ADMIN', 'SUPERADMIN', 'ADMIN', 'KURIKULUM', 'GURU', 'WALI_KELAS', 'BK']);
};

export const useIsWaliKelas = () => {
  return useHasRole(['SUPER_ADMIN', 'SUPERADMIN', 'ADMIN', 'KURIKULUM', 'WALI_KELAS']);
};

export const useIsSuperAdmin = () => {
  return useHasRole(['SUPER_ADMIN', 'SUPERADMIN']);
};
