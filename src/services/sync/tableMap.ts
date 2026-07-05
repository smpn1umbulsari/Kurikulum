/**
 * TableMap - SIKAD v4.0
 * Single source of truth untuk mapping nama tabel Dexie ↔ Supabase.
 * 
 * IMPORTANCE:
 * Semua file sync HARUS menggunakan mapping dari file ini.
 * Jangan mendefinisikan mapping tabel secara lokal di masing-masing file.
 */

// Dexie table name (PascalCase property name) → Supabase table name (snake_case)
export const DEXIE_TO_SUPABASE: Record<string, string> = {
  academicTerms: 'academic_terms',
  gurus: 'gurus',
  siswas: 'siswas',
  kelass: 'kelas',
  mataPelajarans: 'mata_pelajarans',
  pembagianMengajars: 'pembagian_mengajar',
  assessments: 'assessments',
  assessmentDetails: 'assessment_details',
  catatanWaliKelass: 'catatan_wali_kelas',
  raporSnapshots: 'rapor_snapshots',
  tugasTambahans: 'tugas_tambahan_assignments',
  calendarEvents: 'calendar_events',
  academicCalendarEvents: 'academic_calendar_events',
  examRooms: 'exam_rooms',
  examSeats: 'exam_seats',
  examSupervisors: 'exam_supervisors',
  rombelBayangans: 'rombel_bayangans',
  // Sync tables - NOT synced to cloud
  // syncQueue: 'sync_queue',
  // conflicts: 'conflict_queue',
} as const;

// Supabase table name → Dexie table name
export const SUPABASE_TO_DEXIE: Record<string, string> = Object.fromEntries(
  Object.entries(DEXIE_TO_SUPABASE).map(([k, v]) => [v, k])
) as Record<string, string>;

// Tables dengan updated_at trigger untuk delta sync
export const TABLES_WITH_DELTA_SYNC = new Set<string>([
  'academic_terms',
  'gurus',
  'siswas',
  'mata_pelajarans',
  'kelas',
  'pembagian_mengajar',
  'tugas_tambahan_assignments',
  'assessments',
  'assessment_details',
  'kehadiran',
  'exam_rooms',
  'exam_seats',
  'exam_supervisors',
] as const);

// Display names untuk UI
export const TABLE_DISPLAY_NAMES: Record<string, string> = {
  academicTerms: 'Tahun Ajaran',
  gurus: 'Guru',
  siswas: 'Siswa',
  kelass: 'Kelas/Rombel',
  mataPelajarans: 'Mata Pelajaran',
  pembagianMengajars: 'Pembagian Mengajar',
  assessments: 'Asesmen/Nilai',
  assessmentDetails: 'Detail Asesmen',
  catatanWaliKelass: 'Catatan Wali Kelas',
  raporSnapshots: 'Rapor',
  tugasTambahans: 'Tugas Tambahan',
  calendarEvents: 'Kalender',
  academicCalendarEvents: 'Kalender Akademik',
  examRooms: 'Ruang Ujian',
  examSeats: 'Kursi Ujian',
  examSupervisors: 'Pengawas Ujian',
  rombelBayangans: 'Rombel Bayangan',
} as const;

// Helper function untuk mendapatkan nama tabel Supabase dari Dexie
export function getSupabaseTableName(dexieTableName: string): string {
  return DEXIE_TO_SUPABASE[dexieTableName] ?? dexieTableName;
}

// Helper function untuk mendapatkan nama tabel Dexie dari Supabase
export function getDexieTableName(supabaseTableName: string): string {
  return SUPABASE_TO_DEXIE[supabaseTableName] ?? supabaseTableName;
}

// Check apakah tabel support delta sync
export function hasDeltaSync(supabaseTableName: string): boolean {
  return TABLES_WITH_DELTA_SYNC.has(supabaseTableName);
}

// Get display name untuk tabel
export function getTableDisplayName(dexieTableName: string): string {
  return TABLE_DISPLAY_NAMES[dexieTableName] ?? dexieTableName;
}

// List semua Dexie table names yang perlu disinkronkan
export const SYNC_TABLES = Object.keys(DEXIE_TO_SUPABASE) as string[];
