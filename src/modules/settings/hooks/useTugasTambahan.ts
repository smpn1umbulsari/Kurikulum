/**
 * useTugasTambahan - SIKAD v4.0
 * TanStack Query hooks for managing Additional Teacher Assignments
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tugasTambahanRepository } from '../repositories/tugasTambahanRepository';
import { tugasTambahanService } from '../services/tugasTambahanService';
import { SyncManager } from '../../../services/sync/SyncManager';
import { useAuthStore } from '../../../store/authStore';
import type { TugasTambahan } from '@/types';

export function useTugasTambahans() {
  return useQuery<TugasTambahan[]>({
    queryKey: ['tugasTambahans'],
    queryFn: async () => {
      let local = await tugasTambahanRepository.getAll();

      if (local.length === 0) {
        try {
          await tugasTambahanService.syncTugasTambahans();
          local = await tugasTambahanRepository.getAll();
        } catch (error) {
          console.error('[useTugasTambahans] Sync error:', error);
        }
      }

      return local;
    },
  });
}

export function useSaveTugasTambahan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tugas: TugasTambahan) => {
      await tugasTambahanRepository.save(tugas);
      SyncManager.triggerSync();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tugasTambahans'] });
    },
  });
}

export function useDeleteTugasTambahan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const user = useAuthStore.getState().user;
      const userId = user?.id || 'system';
      await tugasTambahanRepository.softDelete(id, userId);
      SyncManager.triggerSync();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tugasTambahans'] });
    },
  });
}
