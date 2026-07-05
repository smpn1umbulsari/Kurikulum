/**
 * useGuru - SIKAD v4.0
 * TanStack Query hooks for managing Guru master data offline-first
 * Based on Guru Spenturi patterns with Excel import support
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { guruRepository } from '../repositories/guruRepository';
import { guruService } from '../services/guruService';
import { SyncManager } from '../../../services/sync/SyncManager';
import { useAuthStore } from '../../../store/authStore';
import type { Guru } from '@/types';
import * as XLSX from 'xlsx';

// ============ QUERY ============
export function useGurus() {
  return useQuery<Guru[]>({
    queryKey: ['gurus'],
    queryFn: async () => {
      console.log('[useGurus] Fetching gurus from local repository...');
      let local = await guruRepository.getAll();

      if (local.length === 0) {
        try {
          console.log('[useGurus] Local DB empty, syncing from cloud...');
          await guruService.syncGurus();
          local = await guruRepository.getAll();
        } catch (error) {
          console.error('[useGurus] Sync error, falling back to local database:', error);
        }
      }

      console.log('[useGurus] Returning', local.length, 'gurus');
      return local;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ============ MUTATIONS ============
export function useSaveGuru() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (guru: Guru) => {
      console.log('[useSaveGuru] Saving guru:', guru.nama);
      await guruRepository.save(guru);
      SyncManager.triggerSync();
      return guru;
    },
    onSuccess: () => {
      console.log('[useSaveGuru] Success, invalidating queries...');
      queryClient.invalidateQueries({ queryKey: ['gurus'] });
    },
    onError: (error) => {
      console.error('[useSaveGuru] Error:', error);
      throw error;
    },
  });
}

export function useDeleteGuru() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      console.log('[useDeleteGuru] Deleting guru with id:', id);
      if (!id) {
        throw new Error('ID guru tidak valid');
      }
      try {
        const user = useAuthStore.getState().user;
        const userId = user?.id || 'system';
        await guruRepository.softDelete(id, userId);
        SyncManager.triggerSync();
      } catch (error) {
        console.error('[useDeleteGuru] Delete error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      console.log('[useDeleteGuru] Success, invalidating queries...');
      queryClient.invalidateQueries({ queryKey: ['gurus'] });
    },
    onError: (error) => {
      console.error('[useDeleteGuru] Error:', error);
      throw error;
    },
  });
}

// ============ EXCEL IMPORT TYPES ============
export interface ImportPreviewRow {
  data: Partial<Guru>;
  status: 'NEW' | 'UPDATE' | 'SAME' | 'CONFLICT' | 'ERROR';
  existingRecord?: Guru;
  errorMessage?: string;
}

// ============ EXCEL IMPORT HELPERS ============
function normalizeJK(value: string): 'L' | 'P' | '' {
  const text = String(value || '').trim().toUpperCase();
  if (['L', 'LK', 'LAKI-LAKI', 'LAKI LAKI'].includes(text)) return 'L';
  if (['P', 'PR', 'PEREMPUAN'].includes(text)) return 'P';
  return text as 'L' | 'P';
}

function normalizeNama(value: string): string {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function getCellValue(row: Record<string, unknown>, aliases: string[]): string {
  const normalizedRow: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    normalizedRow[key.trim().toUpperCase().replace(/\s+/g, '_')] = value;
  }
  for (const alias of aliases) {
    const key = alias.trim().toUpperCase().replace(/\s+/g, '_');
    const value = normalizedRow[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim();
    }
  }
  return '';
}

// ============ PREVIEW IMPORT (ASYNC) ============
export async function previewGuruImport(file: File): Promise<ImportPreviewRow[]> {
  console.log('[previewGuruImport] Reading file:', file.name);

  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

  const existingGurus = await guruRepository.getAll();
  const existingByKode = new Map(
    existingGurus.map(g => [(g as any).kode_guru?.toLowerCase() || '', g])
  );
  const existingByNip = new Map(
    existingGurus.filter(g => g.nip).map(g => [g.nip!.toLowerCase(), g])
  );

  const previewRows: ImportPreviewRow[] = [];

  for (const row of jsonData) {
    const kode_guru = getCellValue(row, ['KODE_GURU', 'KODE', 'KODAGURU']);
    const nip = getCellValue(row, ['NIP']);
    const nama = normalizeNama(getCellValue(row, ['NAMA', 'NAMA_LENGKAP', 'NAMA_GURU']));
    const jk = normalizeJK(getCellValue(row, ['JK', 'JENIS_KELAMIN']));
    const status = getCellValue(row, ['STATUS', 'STATUS_GURU']).toUpperCase() || 'PNS';

    if (!kode_guru || !nama) {
      previewRows.push({
        data: { nama, nip: nip || undefined, jk: jk || 'L' } as Partial<Guru>,
        status: 'ERROR',
        errorMessage: 'Kode guru dan nama wajib diisi',
      });
      continue;
    }

    const existingByKodeVal = existingByKode.get(kode_guru.toLowerCase());
    const existingByNipVal = nip ? existingByNip.get(nip.toLowerCase()) : undefined;

    if (existingByNipVal && existingByNipVal.id !== existingByKodeVal?.id) {
      previewRows.push({
        data: { nama, nip: nip || undefined } as Partial<Guru>,
        status: 'CONFLICT',
        existingRecord: existingByNipVal,
        errorMessage: `NIP ${nip} sudah digunakan oleh ${existingByNipVal.nama}`,
      });
      continue;
    }

    if (existingByKodeVal) {
      const isSame =
        existingByKodeVal.nama.toLowerCase() === nama.toLowerCase() &&
        (existingByKodeVal.nip || '') === (nip || '') &&
        ((existingByKodeVal as any).status || 'PNS') === status;

      previewRows.push({
        data: {
          ...existingByKodeVal,
          nama,
          nip: nip || existingByKodeVal.nip,
          jk: jk || existingByKodeVal.jk,
          status_aktif: existingByKodeVal.status_aktif,
        } as any,
        status: isSame ? 'SAME' : 'UPDATE',
        existingRecord: existingByKodeVal,
      });
    } else {
      previewRows.push({
        data: {
          id: crypto.randomUUID(),
          nama,
          nip: nip || undefined,
          jk: jk || 'L',
          status_aktif: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any,
        status: 'NEW',
      });
    }
  }

  console.log('[previewGuruImport] Preview complete:', previewRows.length, 'rows');
  return previewRows;
}

// ============ IMPORT MUTATION ============
export interface ImportResult {
  berhasil: number;
  gagal: number;
  errors: string[];
}

export function useImportGurus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { preview: ImportPreviewRow[]; mode: 'update' | 'skip' | 'overwrite' }) => {
      const { preview, mode } = params;
      console.log('[useImportGurus] Saving', preview.length, 'rows with mode:', mode);

      const errors: string[] = [];
      let berhasil = 0;

      // Filter rows based on mode
      const rowsToSave = preview.filter(row => {
        if (row.status === 'ERROR' || row.status === 'CONFLICT') return false;
        if (mode === 'skip' && (row.status === 'UPDATE' || row.status === 'SAME')) return false;
        if (mode === 'update' && row.status === 'SAME') return false;
        return true;
      });

      for (const row of rowsToSave) {
        try {
          const { id, nip, nama, gelar_depan, gelar_belakang, jk, tempat_lahir, tanggal_lahir, no_hp, status_aktif, created_at, deleted_at } = row.data as any;
          const guru = {
            id, nip, nama, gelar_depan, gelar_belakang, jk, tempat_lahir, tanggal_lahir, no_hp, status_aktif, created_at, deleted_at,
            updated_at: new Date().toISOString(),
          } as Guru;
          Object.keys(guru).forEach(key => (guru as any)[key] === undefined && delete (guru as any)[key]);

          await guruRepository.save(guru);
          berhasil++;
        } catch (err) {
          errors.push(`Gagal menyimpan ${row.data.nama}: ${err}`);
        }
      }

      if (rowsToSave.length > 0) {
        SyncManager.triggerSync();
      }

      console.log('[useImportGurus] Import complete:', { berhasil, errors });

      return {
        berhasil,
        gagal: rowsToSave.length - berhasil,
        errors,
      };
    },
    onSuccess: () => {
      console.log('[useImportGurus] Success, invalidating queries...');
      queryClient.invalidateQueries({ queryKey: ['gurus'] });
    },
    onError: (error) => {
      console.error('[useImportGurus] Error:', error);
      throw error;
    },
  });
}

// ============ TEMPLATE DOWNLOAD ============
export async function downloadGuruTemplate(): Promise<void> {
  const headers = ['KODE_GURU', 'NIP', 'NAMA', 'JK', 'STATUS', 'MATA_PELAJARAN'];
  const sampleData = [
    ['GR-001', '198501012010011001', 'Budi Santoso', 'L', 'PNS', 'Matematika'],
    ['GR-002', '199002152015012001', 'Siti Aminah', 'P', 'PNS', 'Bahasa Indonesia'],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Guru');
  XLSX.writeFile(workbook, 'template-import-guru.xlsx');
}
