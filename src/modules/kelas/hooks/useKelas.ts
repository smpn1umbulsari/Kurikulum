/**
 * useKelas - SIKAD v4.0
 * TanStack Query hooks for managing Kelas data offline-first
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { kelasRepository } from '../repositories/kelasRepository';
import { kelasService } from '../services/kelasService';
import { SyncManager } from '../../../services/sync/SyncManager';
import type { Kelas } from '@/types';

export function useKelass() {
  return useQuery<Kelas[]>({
    queryKey: ['kelass'],
    queryFn: async () => {
      console.log('[useKelass] Starting query...');
      let local = await kelasRepository.getAll();
      console.log(`[useKelass] Local kelas count: ${local.length}`);

      // Always try to sync from cloud if local is empty
      if (local.length === 0) {
        try {
          console.log('[useKelass] Local empty, attempting cloud sync...');
          await kelasService.syncKelas();
          local = await kelasRepository.getAll();
          console.log(`[useKelass] After sync, local count: ${local.length}`);
        } catch (error) {
          console.error('[useKelass] Sync error (app will use local/empty data):', error);
          // Don't throw - let app work with empty local data
        }
      }

      return local;
    },
  });
}

export function useSaveKelas() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (kelas: Kelas) => {
      await kelasRepository.save(kelas);
      SyncManager.triggerSync();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kelass'] });
    },
  });
}

export function useDeleteKelas() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await kelasRepository.delete(id);
      SyncManager.triggerSync();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kelass'] });
    },
  });
}
