/**
 * Mapel Helpers - SIKAD v4.0
 * Utility functions for MataPelajaran aligned with PRD Revision 4
 * Note: JP (Jam Pelajaran) diatur di pembagian_mengajar, BUKAN di mata_pelajarans
 */

import type { MataPelajaran } from '@/types';
import { INDUK_MAPEL_OPTIONS } from '@/types';

/**
 * Normalize induk mapel code
 */
export function normalizeIndukMapel(value: string): string {
  const text = String(value || '').trim().toUpperCase();
  const found = INDUK_MAPEL_OPTIONS.find(
    (item) => item.kode === text || item.nama.toUpperCase() === text
  );
  return found?.kode || text;
}

/**
 * Get induk mapel option by kode
 */
export function getIndukMapelOption(kode: string) {
  const normalized = normalizeIndukMapel(kode);
  return INDUK_MAPEL_OPTIONS.find((item) => item.kode === normalized) || null;
}

/**
 * Get induk kode from mapel item
 */
export function getMapelIndukKode(item: Partial<MataPelajaran>): string {
  const explicit = normalizeIndukMapel(item.induk_mapel || '');
  if (explicit) return explicit;
  return normalizeIndukMapel(item.kode || '');
}

/**
 * Get induk label from mapel item
 */
export function getMapelIndukLabel(item: Partial<MataPelajaran>): string {
  const kode = getMapelIndukKode(item);
  const option = getIndukMapelOption(kode);
  return option ? option.kode : kode || '-';
}

/**
 * Infer induk mapel from kode/nama
 */
export function inferIndukMapelFromMapel(kode = '', nama = ''): string {
  const text = `${kode} ${nama}`.toUpperCase();
  if (/AGAMA|PABP|PA ISLAM|PA KRISTEN|PA KATOLIK|PA HINDU|PA BUDDHA|KONGHUCU/.test(text))
    return 'PABP';
  if (/PANCASILA|PPKN|PP\b/.test(text)) return 'PP';
  if (/BAHASA INDONESIA|\bBIN\b/.test(text)) return 'BIN';
  if (/MATEMATIKA|\bMTK\b/.test(text)) return 'MTK';
  if (/IPA|ILMU PENGETAHUAN ALAM/.test(text)) return 'IPA';
  if (/IPS|ILMU PENGETAHUAN SOSIAL/.test(text)) return 'IPS';
  if (/BAHASA INGGRIS|\bBIG\b/.test(text)) return 'BIG';
  if (/PJOK|JASMANI|OLAHRAGA/.test(text)) return 'PJOK';
  if (/INFORMATIKA|\bINF\b/.test(text)) return 'INF';
  if (/SENI|PRAKARYA/.test(text)) return 'SENPRA';
  if (/MUATAN LOKAL|DAERAH|MLD/.test(text)) return 'MLD';
  return '';
}

/**
 * Check if mapel requires agama field
 */
export function isMapelAgama(item: Partial<MataPelajaran>): boolean {
  return getMapelIndukKode(item) === 'PABP';
}

/**
 * Sort mapels by mapping (aligned with Data Kurikulum)
 */
export function sortMapelsByMapping(
  data: MataPelajaran[],
  direction: 'asc' | 'desc' = 'asc'
): MataPelajaran[] {
  return [...data].sort((a, b) => {
    const mappingA = Number(a.mapping ?? Number.MAX_SAFE_INTEGER);
    const mappingB = Number(b.mapping ?? Number.MAX_SAFE_INTEGER);
    const result = mappingA - mappingB;
    if (result !== 0) {
      return direction === 'asc' ? result : -result;
    }
    return a.kode.localeCompare(b.kode);
  });
}

/**
 * Group mapels by induk_mapel
 */
export function groupMapelsByInduk(data: MataPelajaran[]): Record<string, MataPelajaran[]> {
  return data.reduce((acc, item) => {
    const induk = getMapelIndukKode(item) || 'LAINNYA';
    if (!acc[induk]) acc[induk] = [];
    acc[induk].push(item);
    return acc;
  }, {} as Record<string, MataPelajaran[]>);
}

/**
 * Get JP (Jam Pelajaran) total from mapel list by type
 * PRD Revision 4: JP berbeda berdasarkan jenis kelas (REAL/DAPO)
 */
export function getTotalJP(data: MataPelajaran[], type: 'real' | 'dapo' | 'all' = 'all'): number {
  if (type === 'real') {
    return data.reduce((sum, item) => sum + (item.jp_real || 0), 0);
  }
  if (type === 'dapo') {
    return data.reduce((sum, item) => sum + (item.jp_dapo || 0), 0);
  }
  return data.reduce((sum, item) => sum + (item.jp_real || 0) + (item.jp_dapo || 0), 0);
}

/**
 * Validate mapel values (aligned with PRD Revision 4)
 */
export function validateMapelValues(
  mapel: Partial<MataPelajaran>,
  existingMapels: MataPelajaran[] = [],
  excludeId?: string
): string {
  const { mapping, induk_mapel, kode, nama, agama, jp_real, jp_dapo } = mapel;

  if (!mapping && mapping !== 0) {
    return 'Mapping wajib diisi';
  }

  if (!/^[0-9]+$/.test(String(mapping))) {
    return 'Mapping harus berupa angka';
  }

  if (!induk_mapel) {
    return 'Induk mapel wajib dipilih';
  }

  if (induk_mapel === 'PABP' && !agama) {
    return 'Agama wajib dipilih untuk induk PABP';
  }

  if (!kode?.trim()) {
    return 'Kode mapel wajib diisi';
  }

  if (!/^[a-zA-Z0-9._-]+$/.test(kode)) {
    return 'Gunakan huruf, angka, titik, strip, atau underscore untuk kode mapel';
  }

  const duplicateKode = existingMapels.some(
    (d) => d.kode.toLowerCase() === kode.toLowerCase() && d.id !== excludeId
  );
  if (duplicateKode) {
    return 'Kode mapel sudah digunakan';
  }

  if (!nama?.trim()) {
    return 'Nama mapel wajib diisi';
  }

  if (nama.length < 3) {
    return 'Nama mapel minimal 3 karakter';
  }

  if (jp_real !== undefined && jp_real !== null && Number(jp_real) < 0) {
    return 'JP REAL minimal 0';
  }
  if (jp_dapo !== undefined && jp_dapo !== null && Number(jp_dapo) < 0) {
    return 'JP DAPO minimal 0';
  }

  return '';
}
