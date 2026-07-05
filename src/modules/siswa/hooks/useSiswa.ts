/**
 * useSiswa - SIKAD v4.0
 * TanStack Query hooks for managing Siswa master data offline-first
 * Based on Guru Spenturi patterns with Excel import support
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { siswaRepository } from '../repositories/siswaRepository';
import { siswaService } from '../services/siswaService';
import { SyncManager } from '../../../services/sync/SyncManager';
import { useAuthStore } from '../../../store/authStore';
import type { Siswa } from '@/types';
import * as XLSX from 'xlsx';

// ============ QUERY ============
export function useSiswas() {
  return useQuery<Siswa[]>({
    queryKey: ['siswas'],
    queryFn: async () => {
      console.log('[useSiswas] Fetching siswas from local repository...');
      let local = await siswaRepository.getAll();

      if (local.length === 0) {
        try {
          console.log('[useSiswas] Local DB empty, syncing from cloud...');
          await siswaService.syncSiswas();
          local = await siswaRepository.getAll();
        } catch (error) {
          console.error('[useSiswas] Sync error, falling back to local database:', error);
        }
      }

      console.log('[useSiswas] Returning', local.length, 'siswas');
      return local;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ============ MUTATIONS ============
export function useSaveSiswa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (siswa: Siswa) => {
      console.log('[useSaveSiswa] Saving siswa:', siswa.nama);
      await siswaRepository.save(siswa);
      SyncManager.triggerSync();
      return siswa;
    },
    onSuccess: () => {
      console.log('[useSaveSiswa] Success, invalidating queries...');
      queryClient.invalidateQueries({ queryKey: ['siswas'] });
    },
    onError: (error) => {
      console.error('[useSaveSiswa] Error:', error);
      throw error;
    },
  });
}

export function useDeleteSiswa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      console.log('[useDeleteSiswa] Deleting siswa with id:', id);
      if (!id) {
        throw new Error('ID siswa tidak valid');
      }
      try {
        const user = useAuthStore.getState().user;
        const userId = user?.id || 'system';
        await siswaRepository.softDelete(id, userId);
        SyncManager.triggerSync();
      } catch (error) {
        console.error('[useDeleteSiswa] Delete error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      console.log('[useDeleteSiswa] Success, invalidating queries...');
      queryClient.invalidateQueries({ queryKey: ['siswas'] });
    },
    onError: (error) => {
      console.error('[useDeleteSiswa] Error:', error);
      throw error;
    },
  });
}

// ============ EXCEL IMPORT TYPES ============
export interface SiswaImportPreviewRow {
  data: Partial<Siswa>;
  status: 'NEW' | 'UPDATE' | 'SAME' | 'CONFLICT' | 'ERROR';
  existingRecord?: Siswa;
  errorMessage?: string;
}

// ============ EXCEL IMPORT HELPERS ============
function normalizeJK(value: string): 'L' | 'P' | '' {
  const text = String(value || '').trim().toUpperCase();
  if (['L', 'LK', 'LAKI-LAKI', 'LAKI LAKI'].includes(text)) return 'L';
  if (['P', 'PR', 'PEREMPUAN', 'WANITA'].includes(text)) return 'P';
  return text as 'L' | 'P';
}

function normalizeNama(value: string): string {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function normalizeKelas(value: string): string {
  const raw = String(value || '').trim().toUpperCase();
  if (!raw) return '';
  return raw.replace(/\s+/g, '');
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
export async function previewSiswaImport(file: File): Promise<SiswaImportPreviewRow[]> {
  console.log('[previewSiswaImport] Reading file:', file.name);

  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

  const existingSiswas = await siswaRepository.getAll();
  const existingByNipd = new Map(
    existingSiswas.map(s => [(s as any).nipd?.toLowerCase() || s.nipd?.toLowerCase() || '', s])
  );
  const existingByNisn = new Map(
    existingSiswas.filter(s => s.nisn).map(s => [s.nisn!.toLowerCase(), s])
  );

  const previewRows: SiswaImportPreviewRow[] = [];

  for (const row of jsonData) {
    const nipd = getCellValue(row, ['NIPD', 'NO_INDUK', 'ID_SISWA']);
    const nisn = getCellValue(row, ['NISN']);
    const nama = normalizeNama(getCellValue(row, ['NAMA', 'NAMA_SISWA', 'NAMA_LENGKAP']));
    const jk = normalizeJK(getCellValue(row, ['JK', 'JENIS_KELAMIN', 'J_KELAMIN']));
    const agama = getCellValue(row, ['AGAMA']);
    const kelas = normalizeKelas(getCellValue(row, ['KELAS', 'KELAS_ROMBEL', 'ROMBEL']));

    // Validate required fields
    if (!nipd || !nama) {
      previewRows.push({
        data: { nama, nipd: nipd || undefined, nisn: nisn || undefined, jk: jk || 'L' } as Partial<Siswa>,
        status: 'ERROR',
        errorMessage: 'NIPD dan Nama wajib diisi',
      });
      continue;
    }

    // Check for NISN conflict
    const nisnOwner = nisn ? existingByNisn.get(nisn.toLowerCase()) : undefined;
    const existingByNipdVal = existingByNipd.get(nipd.toLowerCase());

    // Conflict: NISN used by different student
    if (nisnOwner && nisnOwner.id !== existingByNipdVal?.id) {
      previewRows.push({
        data: { nama, nipd: nipd || undefined, nisn: nisn || undefined } as Partial<Siswa>,
        status: 'CONFLICT',
        existingRecord: nisnOwner,
        errorMessage: `NISN ${nisn} sudah digunakan oleh ${nisnOwner.nama}`,
      });
      continue;
    }

    if (existingByNipdVal) {
      // Check if same data
      const isSame =
        existingByNipdVal.nama.toLowerCase() === nama.toLowerCase() &&
        (existingByNipdVal.nisn || '') === (nisn || '') &&
        (existingByNipdVal.jk || '') === (jk || '') &&
        (existingByNipdVal.agama || '') === (agama || '');

      previewRows.push({
        data: {
          ...existingByNipdVal,
          nama,
          nisn: nisn || existingByNipdVal.nisn,
          nipd: nipd || existingByNipdVal.nipd,
          jk: jk || existingByNipdVal.jk,
          agama: agama || existingByNipdVal.agama,
          status_aktif: existingByNipdVal.status_aktif,
          ['kelas']: kelas,
        } as any,
        status: isSame ? 'SAME' : 'UPDATE',
        existingRecord: existingByNipdVal,
      });
    } else {
      previewRows.push({
        data: {
          id: crypto.randomUUID(),
          nipd: nipd || undefined,
          nisn: nisn || undefined,
          nama,
          jk: jk || 'L',
          agama: agama || undefined,
          status_aktif: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ['kelas']: kelas,
        } as any,
        status: 'NEW',
      });
    }
  }

  console.log('[previewSiswaImport] Preview complete:', previewRows.length, 'rows');
  return previewRows;
}

// ============ IMPORT MUTATION ============
export interface SiswaImportResult {
  berhasil: number;
  gagal: number;
  errors: string[];
}

export function useImportSiswas() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { preview: SiswaImportPreviewRow[]; mode: 'update' | 'skip' | 'overwrite' }) => {
      const { preview, mode } = params;
      console.log('[useImportSiswas] Saving', preview.length, 'rows with mode:', mode);

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
          const siswa = {
            ...row.data,
            updated_at: new Date().toISOString(),
          } as Siswa;
          await siswaRepository.save(siswa);
          berhasil++;
        } catch (err) {
          errors.push(`Gagal menyimpan ${row.data.nama}: ${err}`);
        }
      }

      if (rowsToSave.length > 0) {
        SyncManager.triggerSync();
      }

      console.log('[useImportSiswas] Import complete:', { berhasil, errors });

      return {
        berhasil,
        gagal: rowsToSave.length - berhasil,
        errors,
      };
    },
    onSuccess: () => {
      console.log('[useImportSiswas] Success, invalidating queries...');
      queryClient.invalidateQueries({ queryKey: ['siswas'] });
    },
    onError: (error) => {
      console.error('[useImportSiswas] Error:', error);
      throw error;
    },
  });
}

// ============ TEMPLATE DOWNLOAD ============
export async function downloadSiswaTemplate(): Promise<void> {
  const headers = ['NIPD', 'NISN', 'NAMA', 'JK', 'AGAMA', 'KELAS'];
  const sampleData = [
    ['1001', '0123456789', 'Ahmad Rizki Pratama', 'L', 'Islam', 'VII A'],
    ['1002', '0123456790', 'Siti Nurhaliza', 'P', 'Islam', 'VII B'],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Siswa');
  XLSX.writeFile(workbook, 'template-import-siswa.xlsx');
}
