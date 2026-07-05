/**
 * Smart Excel Import Utility - SIKAD v4.0
 * Based on Data Kurikulum's Smart Import with preview and conflict detection
 */

import * as XLSX from 'xlsx';

// ============ TYPES ============
export interface ImportPreviewRow<T = Record<string, unknown>> {
  data: T;
  status: 'NEW' | 'UPDATE' | 'SAME' | 'CONFLICT' | 'ERROR';
  existingRecord?: T;
  errorMessage?: string;
}

export interface ImportResult {
  berhasil: number;
  gagal: number;
  baru: number;
  update: number;
  conflict: number;
  errors: string[];
}

export interface ImportConfig<T> {
  /** Unique identifier field name */
  uniqueField: keyof T;
  /** Fields to check for update comparison */
  compareFields: (keyof T)[];
  /** Transform row data before processing */
  transformRow?: (row: Record<string, unknown>) => Partial<T>;
  /** Validate single row */
  validateRow?: (row: Partial<T>) => { valid: boolean; error?: string };
  /** Custom conflict detection */
  detectConflict?: (row: Partial<T>, existing: T) => boolean;
}

// ============ HELPERS ============
export function normalizeHeader(text: string): string {
  return String(text || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');
}

export function getCellValue(
  row: Record<string, unknown>,
  aliases: string[]
): string {
  const normalizedRow = Object.fromEntries(
    Object.entries(row).map(([key, value]) => [normalizeHeader(key), value])
  );

  for (const alias of aliases) {
    const value = normalizedRow[normalizeHeader(alias)];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim();
    }
  }

  return '';
}

export function normalizeJK(value: string): 'L' | 'P' | '' {
  const text = String(value || '').trim().toUpperCase();

  if (!text) return '';
  if (['L', 'LK', 'LAKI-LAKI', 'LAKI LAKI', 'LAKILAKI'].includes(text)) return 'L';
  if (['P', 'PR', 'PEREMPUAN', 'WANITA'].includes(text)) return 'P';

  return text as 'L' | 'P';
}

export function normalizeNama(value: string): string {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^\s+|\s+$/g, '');
}

// ============ EXCEL PROCESSING ============
export async function readExcelFile(file: File): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
        resolve(json);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

export async function downloadExcelTemplate(
  filename: string,
  headers: string[]
): Promise<void> {
  const worksheet = XLSX.utils.aoa_to_sheet([headers]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
  XLSX.writeFile(workbook, filename);
}

// ============ SMART IMPORT ENGINE ============
export class SmartExcelImporter<T extends Record<string, unknown>> {
  private config: ImportConfig<T>;
  private existingData: Map<string, T>;
  private previewRows: ImportPreviewRow<T>[] = [];
  private importMode: 'update' | 'skip' | 'overwrite' = 'update';

  constructor(config: ImportConfig<T>, existingRecords: T[]) {
    this.config = config;
    this.existingData = new Map();

    // Build lookup map by unique field
    for (const record of existingRecords) {
      const key = String(record[config.uniqueField] || '').trim().toLowerCase();
      if (key) {
        this.existingData.set(key, record);
      }
    }
  }

  /**
   * Process uploaded Excel file and generate preview
   */
  async processFile(file: File): Promise<ImportPreviewRow<T>[]> {
    const rows = await readExcelFile(file);
    this.previewRows = [];

    for (const row of rows) {
      const previewRow = this.processRow(row);
      this.previewRows.push(previewRow);
    }

    return this.previewRows;
  }

  /**
   * Process single row
   */
  private processRow(row: Record<string, unknown>): ImportPreviewRow<T> {
    const uniqueValue = getCellValue(row, [String(this.config.uniqueField).toUpperCase()]);
    const existing = this.existingData.get(uniqueValue.toLowerCase());

    // Apply row transformation if configured
    let transformedData: Partial<T> = {};
    if (this.config.transformRow) {
      transformedData = this.config.transformRow(row) as Partial<T>;
    } else {
      transformedData = row as Partial<T>;
    }

    // Validate if configured
    if (this.config.validateRow) {
      const validation = this.config.validateRow(transformedData);
      if (!validation.valid) {
        return {
          data: transformedData as T,
          status: 'ERROR',
          errorMessage: validation.error,
        };
      }
    }

    // Check if required fields are present
    if (!uniqueValue) {
      return {
        data: transformedData as T,
        status: 'ERROR',
        errorMessage: 'Field unik tidak boleh kosong',
      };
    }

    // If existing record found
    if (existing) {
      // Check for conflict (e.g., NISN used by different record)
      if (this.config.detectConflict && this.config.detectConflict(transformedData, existing)) {
        return {
          data: transformedData as T,
          status: 'CONFLICT',
          existingRecord: existing,
        };
      }

      // Check if data is the same
      const isSame = this.config.compareFields.every((field) => {
        const newVal = String(transformedData[field] || '').trim().toLowerCase();
        const existingVal = String(existing[field] || '').trim().toLowerCase();
        return newVal === existingVal;
      });

      if (isSame) {
        return {
          data: transformedData as T,
          status: 'SAME',
          existingRecord: existing,
        };
      }

      return {
        data: transformedData as T,
        status: 'UPDATE',
        existingRecord: existing,
      };
    }

    // New record
    return {
      data: transformedData as T,
      status: 'NEW',
    };
  }

  /**
   * Get preview data grouped by status
   */
  getSummary(): Record<string, number> {
    return {
      baru: this.previewRows.filter((r) => r.status === 'NEW').length,
      update: this.previewRows.filter((r) => r.status === 'UPDATE').length,
      same: this.previewRows.filter((r) => r.status === 'SAME').length,
      conflict: this.previewRows.filter((r) => r.status === 'CONFLICT').length,
      error: this.previewRows.filter((r) => r.status === 'ERROR').length,
      total: this.previewRows.length,
    };
  }

  /**
   * Set import mode
   */
  setImportMode(mode: 'update' | 'skip' | 'overwrite'): void {
    this.importMode = mode;
  }

  /**
   * Get data ready for upload based on current mode
   */
  getDataForUpload(): { baru: T[]; update: T[] } {
    const baru: T[] = [];
    const update: T[] = [];

    for (const row of this.previewRows) {
      // Skip error and conflict rows
      if (row.status === 'ERROR' || row.status === 'CONFLICT') continue;

      const exists = !!row.existingRecord;

      if (row.status === 'NEW') {
        baru.push(row.data);
      } else if (row.status === 'UPDATE' || row.status === 'SAME') {
        // Apply mode logic
        if (this.importMode === 'skip' && exists) continue;
        if (this.importMode === 'update' && row.status === 'SAME') continue;
        update.push(row.data);
      }
    }

    return { baru, update };
  }

  /**
   * Get all preview rows
   */
  getPreviewRows(): ImportPreviewRow<T>[] {
    return this.previewRows;
  }

  /**
   * Paginate preview rows
   */
  getPaginatedRows(page: number, perPage: number): ImportPreviewRow<T>[] {
    const start = (page - 1) * perPage;
    return this.previewRows.slice(start, start + perPage);
  }
}

// ============ PRESET CONFIGS ============

// Siswa Import Config
export const siswaImportConfig: ImportConfig<{
  nipd: string;
  nisn: string;
  nama: string;
  jk: string;
  agama: string;
  kelas: string;
}> = {
  uniqueField: 'nipd',
  compareFields: ['nisn', 'nama', 'jk', 'agama', 'kelas'],
  transformRow: (row) => ({
    nipd: getCellValue(row, ['NIPD', 'NO_INDUK', 'ID_SISWA']),
    nisn: getCellValue(row, ['NISN']),
    nama: normalizeNama(getCellValue(row, ['NAMA', 'NAMA_SISWA', 'NAMA_LENGKAP'])),
    jk: normalizeJK(getCellValue(row, ['JK', 'JENIS_KELAMIN', 'J_KELAMIN'])),
    agama: getCellValue(row, ['AGAMA']),
    kelas: getCellValue(row, ['KELAS', 'KELAS_ROMBEL', 'ROMBEL']).toUpperCase().replace(/\s+/g, ''),
  }),
  validateRow: (row) => {
    if (!row.nipd) return { valid: false, error: 'NIPD wajib diisi' };
    if (!row.nisn) return { valid: false, error: 'NISN wajib diisi' };
    if (!row.nama || row.nama.length < 3) return { valid: false, error: 'Nama minimal 3 karakter' };
    return { valid: true };
  },
};

// Guru Import Config
export const guruImportConfig: ImportConfig<{
  kode_guru: string;
  nip: string;
  nama: string;
  jk: string;
  status: string;
  mata_pelajaran: string;
}> = {
  uniqueField: 'kode_guru',
  compareFields: ['nip', 'nama', 'jk', 'status', 'mata_pelajaran'],
  transformRow: (row) => ({
    kode_guru: getCellValue(row, ['KODE_GURU', 'KODE', 'KODAGURU']),
    nip: getCellValue(row, ['NIP']),
    nama: normalizeNama(getCellValue(row, ['NAMA', 'NAMA_LENGKAP', 'NAMA_GURU'])),
    jk: normalizeJK(getCellValue(row, ['JK', 'JENIS_KELAMIN'])),
    status: getCellValue(row, ['STATUS', 'STATUS_GURU']).toUpperCase() || 'PNS',
    mata_pelajaran: getCellValue(row, ['MAPEL', 'MATA_PELAJARAN', 'MATA_PELAJARAN_YG_DIAJAR']),
  }),
  validateRow: (row) => {
    if (!row.kode_guru) return { valid: false, error: 'Kode guru wajib diisi' };
    if (!row.nama) return { valid: false, error: 'Nama wajib diisi' };
    return { valid: true };
  },
};