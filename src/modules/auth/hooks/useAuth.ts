/**
 * useAuth - SIKAD v4.0
 * TanStack Query hooks for authentication
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authService } from '../services/authService';
import { useAuthStore } from '../../../store/authStore';
import type { User } from '@/types';

export function useAuthSession() {
  return useQuery({
    queryKey: ['auth', 'session'],
    queryFn: async () => {
      const session = await authService.getSession();
      const user = session?.user;
      
      if (user) {
      useAuthStore.getState().setUser({
          id: user.id,
          email: user.email || '',
          name: user.user_metadata?.name || '',
          role: (user.user_metadata?.role as any) || 'GURU',
          permissions: [],
          created_at: user.created_at,
        } as unknown as User);
      }
      
      return session;
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      return await authService.login(email, password);
    },
    onSuccess: (data) => {
      const user = data.user;
      if (user) {
        setUser({
          id: user.id,
          email: user.email || '',
          name: user.user_metadata?.name || '',
          role: (user.user_metadata?.role as any) || 'GURU',
          permissions: [],
          created_at: user.created_at,
        } as unknown as User);
      }
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: async ({
      email,
      password,
      userData,
    }: {
      email: string;
      password: string;
      userData: Partial<User>;
    }) => {
      return await authService.register(email, password, userData);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const logout = useAuthStore((state) => state.logout);

  return useMutation({
    mutationFn: async () => {
      await authService.logout();
    },
    onSuccess: () => {
      logout();
      queryClient.clear();
    },
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async (email: string) => {
      await authService.resetPassword(email);
    },
  });
}
