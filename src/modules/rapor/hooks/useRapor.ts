/**
 * useRapor - SIKAD v4.0
 * TanStack Query hooks for managing homeroom teacher notes and report card finalisation
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { catatanWaliKelasRepository } from '../repositories/catatanWaliKelasRepository';
import { raporService } from '../services/raporService';
import { db } from '../../../database/dexie/schema';
import { SyncManager } from '../../../services/sync/SyncManager';
import type { CatatanWaliKelas, RaporSnapshot } from '@/types';

export function useCatatanWaliKelass() {
  return useQuery<CatatanWaliKelas[]>({
    queryKey: ['catatanWaliKelass'],
    queryFn: async () => {
      let local = await catatanWaliKelasRepository.getAll();

      if (local.length === 0) {
        try {
          await raporService.syncCatatanWaliKelas();
          local = await catatanWaliKelasRepository.getAll();
        } catch (error) {
          console.error('[useCatatanWaliKelass] Sync error, falling back to local database:', error);
        }
      }

      return local;
    },
  });
}

export function useRaporSnapshots() {
  return useQuery<RaporSnapshot[]>({
    queryKey: ['raporSnapshots'],
    queryFn: async () => {
      let local = await db.raporSnapshots.toArray();

      if (local.length === 0) {
        try {
          await raporService.syncRaporSnapshots();
          local = await db.raporSnapshots.toArray();
        } catch (error) {
          console.error('[useRaporSnapshots] Sync error, falling back to local database:', error);
        }
      }

      return local;
    },
  });
}

export function useSaveCatatanWaliKelas() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (note: CatatanWaliKelas) => {
      await catatanWaliKelasRepository.save(note);
      SyncManager.triggerSync();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catatanWaliKelass'] });
    },
  });
}

export function useFinalizeRapor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      siswaId,
      termId,
      kelasId,
      dataRapor,
    }: {
      siswaId: string;
      termId: string;
      kelasId: string;
      dataRapor: any;
    }) => {
      await raporService.finalizeStudentRapor(siswaId, termId, kelasId, dataRapor);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raporSnapshots'] });
    },
  });
}
