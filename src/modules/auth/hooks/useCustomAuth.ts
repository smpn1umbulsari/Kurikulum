/**
 * useCustomAuth - SIKAD v4.0
 * TanStack Query hooks for custom authentication
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { customAuthService, type CustomLoginResponse } from '../services/customAuthService';

export function useLogin() {
  return useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      return await customAuthService.login(username, password);
    },
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      customAuthService.logout();
    },
  });
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: async (): Promise<CustomLoginResponse['user'] | null> => {
      if (!customAuthService.isAuthenticated()) {
        return null;
      }
      return customAuthService.getStoredUser();
    },
    staleTime: Infinity,
  });
}

export function useIsAuthenticated() {
  return useQuery({
    queryKey: ['isAuthenticated'],
    queryFn: () => customAuthService.isAuthenticated(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useHasRole(role: string) {
  return useQuery({
    queryKey: ['hasRole', role],
    queryFn: () => customAuthService.hasRole(role),
    staleTime: 1000 * 60, // 1 minute
  });
}
