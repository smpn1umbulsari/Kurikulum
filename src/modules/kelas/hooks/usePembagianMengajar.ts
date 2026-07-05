/**
 * usePembagianMengajar - SIKAD v4.0
 * TanStack Query hooks for managing Pembagian Mengajar (Teacher Workload) data offline-first
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pembagianMengajarRepository } from '../repositories/pembagianMengajarRepository';
import { pembagianMengajarService } from '../services/pembagianMengajarService';
import { SyncManager } from '../../../services/sync/SyncManager';
import type { PembagianMengajar } from '@/types';

export function usePembagianMengajars() {
  return useQuery<PembagianMengajar[]>({
    queryKey: ['pembagianMengajars'],
    queryFn: async () => {
      let local = await pembagianMengajarRepository.getAll();

      if (local.length === 0) {
        try {
          await pembagianMengajarService.syncPembagianMengajar();
          local = await pembagianMengajarRepository.getAll();
        } catch (error) {
          console.error('[usePembagianMengajars] Sync error, falling back to local database:', error);
        }
      }

      return local;
    },
  });
}

export function useSavePembagianMengajar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (allocation: PembagianMengajar) => {
      await pembagianMengajarRepository.save(allocation);
      SyncManager.triggerSync();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pembagianMengajars'] });
    },
  });
}

export function useDeletePembagianMengajar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await pembagianMengajarRepository.delete(id);
      SyncManager.triggerSync();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pembagianMengajars'] });
    },
  });
}
