/**
 * useMapel - SIKAD v4.0
 * TanStack Query hooks for managing Mata Pelajaran master data offline-first
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mapelRepository } from '../repositories/mapelRepository';
import { mapelService } from '../services/mapelService';
import { SyncManager } from '../../../services/sync/SyncManager';
import { useAuthStore } from '../../../store/authStore';
import { getIndukMapelOption } from '../../../utils/mapelHelpers';
import { swal } from '../../../utils/alert';
import type { MataPelajaran } from '@/types';

export function useMapels() {
  return useQuery<MataPelajaran[]>({
    queryKey: ['mapels'],
    queryFn: async () => {
      console.log('[useMapels] Fetching mapels from local repository...');
      let local = await mapelRepository.getAll();
      console.log('[useMapels] Local mapels count:', local.length, local);
      const hasSynced = localStorage.getItem('has-synced-mapels') === 'true';
      console.log('[useMapels] has-synced-mapels flag in localStorage:', hasSynced);

      if (!hasSynced && local.length === 0) {
        try {
          console.log('[useMapels] Local DB is empty and has not synced yet. Fetching from Supabase...');
          await mapelService.syncMapels();
          localStorage.setItem('has-synced-mapels', 'true');
          local = await mapelRepository.getAll();
          console.log('[useMapels] Post-sync local mapels count:', local.length);
        } catch (error) {
          console.error('[useMapels] Sync error, falling back to local database:', error);
        }
      }

      return local;
    },
  });
}

export function useCreateMapel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mapel: Omit<MataPelajaran, 'id' | 'created_at' | 'updated_at'>) => {
      console.log('[useCreateMapel] Mutation function called with:', mapel);
      const payload: MataPelajaran = {
        ...mapel,
        id: (mapel as any).id || crypto.randomUUID(),
        created_at: (mapel as any).created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        induk_nama: (mapel as any).induk_nama || getIndukMapelOption(mapel.induk_mapel)?.nama || '',
      };
      console.log('[useCreateMapel] Prepared payload:', payload);
      try {
        await mapelRepository.save(payload);
        console.log('[useCreateMapel] Saved locally successfully!');
        SyncManager.triggerSync();
        localStorage.setItem('has-synced-mapels', 'true');
        return payload;
      } catch (err) {
        console.error('[useCreateMapel] Local save error:', err);
        throw err;
      }
    },
    onSuccess: () => {
      console.log('[useCreateMapel] Mutation success! Invalidating mapels query...');
      queryClient.invalidateQueries({ queryKey: ['mapels'] });
    },
  });
}

export function useCreateBulkMapels() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mapels: Omit<MataPelajaran, 'id' | 'created_at' | 'updated_at'>[]) => {
      console.log('[useCreateBulkMapels] Mutation called with', mapels.length, 'items');
      const payloads: MataPelajaran[] = [];
      
      for (const mapel of mapels) {
        const payload: MataPelajaran = {
          ...mapel,
          id: (mapel as any).id || crypto.randomUUID(),
          created_at: (mapel as any).created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
          induk_nama: (mapel as any).induk_nama || getIndukMapelOption(mapel.induk_mapel)?.nama || '',
        };
        payloads.push(payload);
      }
      
      try {
        // Save all records locally
        for (const payload of payloads) {
          await mapelRepository.save(payload);
        }
        console.log('[useCreateBulkMapels] All items saved locally successfully!');
        SyncManager.triggerSync();
        localStorage.setItem('has-synced-mapels', 'true');
        return payloads;
      } catch (err) {
        console.error('[useCreateBulkMapels] Local save error:', err);
        throw err;
      }
    },
    onSuccess: (_data, variables) => {
      console.log('[useCreateBulkMapels] Mutation success! Invalidating mapels query...');
      queryClient.invalidateQueries({ queryKey: ['mapels'] });
      swal.success(`Berhasil menambahkan ${variables.length} mapel!`);
    },
    onError: (error) => {
      console.error('[useCreateBulkMapels] Mutation failed:', error);
      swal.error(`Gagal inject seed mapel: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });
}

export function useUpdateMapel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mapel: MataPelajaran) => {
      console.log('[useUpdateMapel] Mutation function called with:', mapel);
      const payload: MataPelajaran = {
        ...mapel,
        updated_at: new Date().toISOString(),
        induk_nama: mapel.induk_nama || getIndukMapelOption(mapel.induk_mapel)?.nama || '',
      };
      try {
        await mapelRepository.save(payload);
        console.log('[useUpdateMapel] Updated locally successfully!');
        SyncManager.triggerSync();
        return payload;
      } catch (err) {
        console.error('[useUpdateMapel] Local update error:', err);
        throw err;
      }
    },
    onSuccess: () => {
      console.log('[useUpdateMapel] Mutation success! Invalidating mapels query...');
      queryClient.invalidateQueries({ queryKey: ['mapels'] });
    },
  });
}

export function useSaveMapel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mapel: MataPelajaran) => {
      console.log('[useSaveMapel] Mutation function called with:', mapel);
      await mapelRepository.save(mapel);
      SyncManager.triggerSync();
    },
    onSuccess: () => {
      console.log('[useSaveMapel] Mutation success! Invalidating mapels query...');
      queryClient.invalidateQueries({ queryKey: ['mapels'] });
    },
  });
}

export function useDeleteMapel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      console.log('[useDeleteMapel] Mutation function called with ID:', id);
      if (!id) {
        throw new Error('ID mapel tidak valid');
      }
      try {
        const user = useAuthStore.getState().user;
        const userId = user?.id || 'system';
        await mapelRepository.softDelete(id, userId);
        console.log('[useDeleteMapel] Soft-deleted locally successfully!');
        SyncManager.triggerSync();
      } catch (err) {
        console.error('[useDeleteMapel] Local delete error:', err);
        throw err;
      }
    },
    onSuccess: () => {
      console.log('[useDeleteMapel] Mutation success! Invalidating mapels query...');
      queryClient.invalidateQueries({ queryKey: ['mapels'] });
      swal.success('Mapel berhasil dihapus!');
    },
    onError: (error) => {
      console.error('[useDeleteMapel] Mutation failed:', error);
      swal.error(`Gagal menghapus mapel: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });
}
