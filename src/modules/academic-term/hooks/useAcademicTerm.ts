/**
 * useAcademicTerm - SIKAD v4.0
 * TanStack Query hooks for managing Academic Terms with offline fallback
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { academicTermRepository } from '../repositories/academicTermRepository';
import { academicTermService } from '../services/academicTermService';
import { useAppStore, type AppState } from '../../../store/appStore';
import { SyncManager } from '../../../services/sync/SyncManager';
import type { AcademicTerm } from '@/types';

export function useAcademicTerms() {
  return useQuery<AcademicTerm[]>({
    queryKey: ['academicTerms'],
    queryFn: async () => {
      // 1. Read from local DB
      let localTerms = await academicTermRepository.getAll();

      // 2. Background sync or initial load if local DB is empty
      if (localTerms.length === 0) {
        try {
          await academicTermService.syncAcademicTerms();
          localTerms = await academicTermRepository.getAll();
        } catch (error) {
          console.error('[useAcademicTerms] Sync error, falling back to empty local cache:', error);
        }
      }

      return localTerms;
    },
  });
}

export function useSetActiveTerm() {
  const queryClient = useQueryClient();
  const setCurrentAcademicTerm = useAppStore((state: AppState) => state.setCurrentAcademicTerm);

  return useMutation({
    mutationFn: async (termId: string) => {
      await academicTermService.setActiveTermLocal(termId);
      const active = await academicTermRepository.getActiveTerm();
      setCurrentAcademicTerm(active || null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academicTerms'] });
    },
  });
}

export function useSaveAcademicTerm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (term: AcademicTerm) => {
      await academicTermRepository.save(term);
      SyncManager.triggerSync();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academicTerms'] });
    },
  });
}
