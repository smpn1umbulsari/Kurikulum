/**
 * Core Types - SIKAD v4.0
 * Shared type definitions aligned with PostgreSQL schema
 */

// ============ ENUMS ============

export const ENUMS = {
  jenis_kelamin: ['L', 'P'] as const,
  semester: ['GANJIL', 'GENAP'] as const, // UPPERCASE
  tingkat: [7, 8, 9] as const, // SMP: 7, 8, 9
  kelompok_mapel: ['A', 'B'] as const, // SMP Kurikulum Merdeka: A (Mata Pelajaran Wajib), B (Muatan Lokal)
  kelas_jenis: ['REAL', 'DAPO'] as const, // PRD Revision 4: REAL=Kelas Riil, DAPO=Kelas Administrasi Dapodik
  status_aktif: [true, false] as const,
  assessment_stage: ['DRAFT', 'PUBLISH', 'FINAL'] as const, // UPPERCASE
  status_rapor: ['DRAFT', 'PUBLISHED', 'FINALIZED'] as const, // UPPERCASE
  student_lifecycle_status: ['AKTIF', 'PINDAH', 'LULUS', 'DROPOUT', 'ARSIP'] as const, // UPPERCASE
  status_promotion: ['PENDING', 'APPROVED', 'REJECTED'] as const, // UPPERCASE
  status_graduation: ['BELUM', 'LULUS', 'TIDAK_LULUS'] as const, // UPPERCASE
  role: ['SUPER_ADMIN', 'ADMIN', 'KURIKULUM', 'GURU', 'WALI_KELAS', 'BK'] as const, // UPPERCASE
} as const;

export type JenisKelamin = typeof ENUMS.jenis_kelamin[number];
export type Semester = typeof ENUMS.semester[number];
export type Tingkat = typeof ENUMS.tingkat[number];
export type KelompokMapel = typeof ENUMS.kelompok_mapel[number];
export type KelasJenis = typeof ENUMS.kelas_jenis[number];
export type AssessmentStage = typeof ENUMS.assessment_stage[number];
export type StatusRapor = typeof ENUMS.status_rapor[number];
export type StudentLifecycleStatus = typeof ENUMS.student_lifecycle_status[number];
export type StatusPromotion = typeof ENUMS.status_promotion[number];
export type StatusGraduation = typeof ENUMS.status_graduation[number];
export type Role = typeof ENUMS.role[number];

// ============ CORE ENTITIES ============

export interface AcademicTerm {
  id: string;
  tahun_ajaran: string; // "2025/2026"
  semester: Semester;
  tanggal_mulai: string; // DATE (ISO string)
  tanggal_selesai: string; // DATE (ISO string)
  status: boolean; // BOOLEAN (aktif/tidak)
  created_at: string;
}

export interface Guru {
  id: string;
  nip?: string;
  nama: string;
  gelar_depan?: string;
  gelar_belakang?: string;
  jk?: JenisKelamin;
  tempat_lahir?: string;
  tanggal_lahir?: string; // DATE
  no_hp?: string;
  status_aktif: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface Siswa {
  id: string;
  nisn?: string;
  nipd?: string;
  nama: string;
  jk?: JenisKelamin;
  agama?: string;
  tempat_lahir?: string;
  tanggal_lahir?: string; // DATE
  status_aktif: boolean;
  kelas_id?: string;
  kelas_dapo_id?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface RiwayatKelas {
  id: string;
  siswa_id: string;
  kelas_id: string;
  academic_term_id: string;
  tanggal_mulai?: string; // DATE
  tanggal_selesai?: string; // DATE
  status_keluar?: 'AKTIF' | 'NAIK_KELAS' | 'PINDAH' | 'LULUS' | 'DROP_OUT';
  created_at: string;
}

export interface Kelas {
  id: string;
  academic_term_id: string;
  nama_kelas: string; // "VII A"
  tingkat: Tingkat;
  jenis: KelasJenis;
  wali_kelas_id?: string;
  status_aktif: boolean;
  created_at: string;
}

export interface MataPelajaran {
  id: string;
  kode: string;
  nama: string;
  kelompok_mapel: KelompokMapel;
  aktif: boolean;
  // Extended fields from Kurikulum Merdeka
  mapping: number; // Urutan/penomoran
  induk_mapel: string; // Kode induk mapel
  induk_nama?: string; // Nama lengkap induk mapel
  agama?: string; // Untuk PABP: Islam, Kristen, Katolik, Hindu, Buddha, Konghucu
  jp_real?: number; // Jam Pelajaran untuk kelas REAL
  jp_dapo?: number; // Jam Pelajaran untuk kelas DAPO
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  deleted_by?: string | null;
}

// Induk Mata Pelajaran SMP Kurikulum Merdeka (9 Mapel)
// https://pusatinformasi.guru/pembelajaran/struktur-kurikulum-smp-mts-kurikulum-merdeka
export const INDUK_MAPEL_OPTIONS = [
  { kode: 'PABP', nama: 'Pendidikan Agama dan Budi Pekerti' },
  { kode: 'PP', nama: 'Pendidikan Pancasila' },
  { kode: 'BIN', nama: 'Bahasa Indonesia' },
  { kode: 'MTK', nama: 'Matematika' },
  { kode: 'IPA', nama: 'Ilmu Pengetahuan Alam' },
  { kode: 'IPS', nama: 'Ilmu Pengetahuan Sosial' },
  { kode: 'BIG', nama: 'Bahasa Inggris' },
  { kode: 'PJOK', nama: 'Pendidikan Jasmani, Olahraga, dan Kesehatan' },
  { kode: 'SENI', nama: 'Seni Budaya' },
  { kode: 'INF', nama: 'Informatika' },
  { kode: 'PRAK', nama: 'Prakarya' },
  { kode: 'MLD', nama: 'Muatan Lokal' },
] as const;

export const MAPEL_AGAMA_OPTIONS = [
  'Islam',
  'Kristen',
  'Katolik',
  'Hindu',
  'Buddha',
  'Konghucu',
] as const;

export type IndukMapel = typeof INDUK_MAPEL_OPTIONS[number]['kode'];
export type MapelAgama = typeof MAPEL_AGAMA_OPTIONS[number];

// Seed data mapel SMP Kurikulum Merdeka
// JP default per jenis kelas (dapat di-override di pembagian_mengajar)
export const SEED_MAPEL_SMP: Omit<MataPelajaran, 'id' | 'created_at' | 'updated_at'>[] = [
  // Mata Pelajaran Wajib
  { kode: 'PABP', nama: 'Pendidikan Agama dan Budi Pekerti', kelompok_mapel: 'A', aktif: true, mapping: 1, induk_mapel: 'PABP', induk_nama: 'Pendidikan Agama dan Budi Pekerti', jp_real: 3, jp_dapo: 3 },
  { kode: 'PP', nama: 'Pendidikan Pancasila', kelompok_mapel: 'A', aktif: true, mapping: 2, induk_mapel: 'PP', induk_nama: 'Pendidikan Pancasila', jp_real: 2, jp_dapo: 2 },
  { kode: 'BIN', nama: 'Bahasa Indonesia', kelompok_mapel: 'A', aktif: true, mapping: 3, induk_mapel: 'BIN', induk_nama: 'Bahasa Indonesia', jp_real: 4, jp_dapo: 4 },
  { kode: 'MTK', nama: 'Matematika', kelompok_mapel: 'A', aktif: true, mapping: 4, induk_mapel: 'MTK', induk_nama: 'Matematika', jp_real: 4, jp_dapo: 5 },
  { kode: 'IPA', nama: 'Ilmu Pengetahuan Alam', kelompok_mapel: 'A', aktif: true, mapping: 5, induk_mapel: 'IPA', induk_nama: 'Ilmu Pengetahuan Alam', jp_real: 4, jp_dapo: 5 },
  { kode: 'IPS', nama: 'Ilmu Pengetahuan Sosial', kelompok_mapel: 'A', aktif: true, mapping: 6, induk_mapel: 'IPS', induk_nama: 'Ilmu Pengetahuan Sosial', jp_real: 3, jp_dapo: 4 },
  { kode: 'BIG', nama: 'Bahasa Inggris', kelompok_mapel: 'A', aktif: true, mapping: 7, induk_mapel: 'BIG', induk_nama: 'Bahasa Inggris', jp_real: 2, jp_dapo: 3 },
  { kode: 'PJOK', nama: 'Pendidikan Jasmani, Olahraga, dan Kesehatan', kelompok_mapel: 'A', aktif: true, mapping: 8, induk_mapel: 'PJOK', induk_nama: 'Pendidikan Jasmani, Olahraga, dan Kesehatan', jp_real: 3, jp_dapo: 3 },
  { kode: 'SENI', nama: 'Seni Budaya', kelompok_mapel: 'A', aktif: true, mapping: 9, induk_mapel: 'SENI', induk_nama: 'Seni Budaya', jp_real: 2, jp_dapo: 2 },
  { kode: 'INF', nama: 'Informatika', kelompok_mapel: 'A', aktif: true, mapping: 10, induk_mapel: 'INF', induk_nama: 'Informatika', jp_real: 2, jp_dapo: 3 },
  { kode: 'PRAK', nama: 'Prakarya', kelompok_mapel: 'A', aktif: true, mapping: 11, induk_mapel: 'PRAK', induk_nama: 'Prakarya', jp_real: 2, jp_dapo: 2 },
  // Muatan Lokal
  { kode: 'MLD', nama: 'Muatan Lokal', kelompok_mapel: 'B', aktif: true, mapping: 12, induk_mapel: 'MLD', induk_nama: 'Muatan Lokal', jp_real: 2, jp_dapo: 2 },
];

export interface PembagianMengajar {
  id: string;
  academic_term_id: string;
  guru_id: string;
  mapel_id: string;
  kelas_id: string;
  jenis: KelasJenis;
  jp: number;
  created_at: string;
}

export interface AssessmentType {
  id: string;
  kode: string;
  nama: string;
  kategori: string;
  bobot_default: number;
  urutan: number;
  aktif: boolean;
}

export interface Assessment {
  id: string;
  assessment_type_id: string;
  pembagian_mengajar_id: string;
  academic_term_id: string;
  judul: string;
  deskripsi?: string;
  tanggal: string; // DATE
  bobot: number;
  stage: AssessmentStage;
  created_by: string;
  created_at: string;
}

export interface AssessmentDetail {
  id: string;
  assessment_id: string;
  siswa_id: string;
  nilai: number;
  catatan?: string;
  updated_at: string;
}

export interface CatatanWaliKelas {
  id: string;
  academic_term_id: string;
  siswa_id: string;
  kelas_id: string;
  catatan: string;
  created_by: string;
  created_at: string;
}

export interface RaporSnapshot {
  id: string;
  academic_term_id: string;
  siswa_id: string;
  kelas_id: string;
  data_rapor: {
    semester: string;
    kelas: string;
    nilai: Array<Record<string, unknown>>;
    kehadiran: Record<string, unknown>;
    catatan_wali: string;
  };
  finalized_by: string;
  finalized_at: string;
  created_at: string;
}

export interface PromotionJob {
  id: string;
  source_term_id: string;
  target_term_id: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'ROLLBACK';
  total_siswa: number;
  processed_siswa: number;
  log?: Record<string, unknown>;
  created_by: string;
  created_at: string;
  finished_at?: string;
}

export interface GraduationJob {
  id: string;
  academic_term_id: string;
  total_siswa: number;
  processed_siswa: number;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'ROLLBACK';
  created_by: string;
  created_at: string;
  finished_at?: string;
}

export interface TugasTambahan {
  id: string;
  academic_term_id: string;
  guru_id: string;
  nama_tugas: string;
  deskripsi?: string;
  jam_per_minggu: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

// ============ ACADEMIC CALENDAR & EXAM ADMIN ============

export interface CalendarEvent {
  id: string;
  academic_term_id: string;
  title: string;
  start_date: string; // DATE (ISO string)
  end_date: string; // DATE (ISO string)
  category: 'LIBUR' | 'UJIAN' | 'KEGIATAN' | 'UMUM';
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface ExamRoom {
  id: string;
  academic_term_id?: string;
  nama_ruang: string;
  kapasitas: number;
  lokasi?: string; // Lokasi gedung/lantai
  is_active: boolean;
  rows?: number;
  seats_per_row?: number;
  created_at: string;
  updated_at?: string;
}

export interface ExamSeat {
  id: string;
  room_id: string;
  siswa_id: string;
  exam_id?: string; // Assessment/ujian ID
  nomor_kursi: number;
  created_at: string;
}

export interface ExamSupervisor {
  id: string;
  academic_term_id?: string;
  guru_id: string;
  room_id?: string;
  exam_id?: string; // Assessment/ujian ID
  slot_waktu: string; // e.g. "SENIN-SESI1"
  shift?: 'SESI1' | 'SESI2' | 'SESI3' | 'SESI4'; // Shift/jadwal ujian
  is_active?: boolean;
  created_at: string;
}

export interface AcademicCalendarEvent {
  id: string;
  academic_year_id: string;
  date: string; // DATE (ISO string)
  type: 'national_holiday' | 'school_event' | 'exam' | 'break';
  title: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============ SYNC TYPES ============

export type SyncStatus = 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED' | 'CONFLICT';

export interface SyncQueueItem {
  id: string;
  table_name: string;
  record_id: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  payload: Record<string, unknown>;
  status: SyncStatus;
  retry_count: number;
  last_error?: string;
  next_retry_at?: string;
  created_at: string;
}

export interface ConflictItem {
  id: string;
  table_name: string;
  record_id: string;
  local_data: Record<string, unknown>;
  cloud_data: Record<string, unknown>;
  resolved: boolean;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
}

export interface UserDevice {
  id: string;
  user_id: string;
  device_info: string;
  last_sync_at?: string;
  created_at: string;
}

// ============ USER & AUTH ============

export interface User {
  id: string;
  email: string;
  role: Role;
  name?: string;
  avatar_url?: string;
  created_at: string;
}

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: User;
}

// ============ API RESPONSE ============

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// ============ DATABASE MAPPING ============

export interface Database {
  public: {
    Tables: {
      academic_terms: {
        Row: AcademicTerm;
        Insert: Omit<AcademicTerm, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<AcademicTerm>;
      };
      gurus: {
        Row: Guru;
        Insert: Omit<Guru, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Guru>;
      };
      siswas: {
        Row: Siswa;
        Insert: Omit<Siswa, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Siswa>;
      };
      kelas: {
        Row: Kelas;
        Insert: Omit<Kelas, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Kelas>;
      };
      mata_pelajarans: {
        Row: MataPelajaran;
        Insert: Omit<MataPelajaran, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<MataPelajaran>;
      };
      pembagian_mengajars: {
        Row: PembagianMengajar;
        Insert: Omit<PembagianMengajar, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<PembagianMengajar>;
      };
      assessments: {
        Row: Assessment;
        Insert: Omit<Assessment, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Assessment>;
      };
      assessment_details: {
        Row: AssessmentDetail;
        Insert: Omit<AssessmentDetail, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<AssessmentDetail>;
      };
    };
  };
}

