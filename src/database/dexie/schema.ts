/**
 * Dexie Database Schema - SIKAD v4.0
 * Offline-first local database using IndexedDB aligned with postgres tables
 */

import Dexie, { type Table } from 'dexie';
import type {
  AcademicTerm,
  Guru,
  Siswa,
  Kelas,
  MataPelajaran,
  PembagianMengajar,
  Assessment,
  AssessmentDetail,
  CatatanWaliKelas,
  RaporSnapshot,
  SyncQueueItem,
  ConflictItem,
  TugasTambahan,
  CalendarEvent,
  AcademicCalendarEvent,
  ExamRoom,
  ExamSeat,
  ExamSupervisor,
} from '@/types';

// ============ DATABASE CLASS ============

export class SikadDatabase extends Dexie {
  // Entity tables
  academicTerms!: Table<AcademicTerm, string>;
  gurus!: Table<Guru, string>;
  siswas!: Table<Siswa, string>;
  kelass!: Table<Kelas, string>;
  mataPelajarans!: Table<MataPelajaran, string>;
  pembagianMengajars!: Table<PembagianMengajar, string>;
  assessments!: Table<Assessment, string>;
  assessmentDetails!: Table<AssessmentDetail, string>; // Renamed nilais
  catatanWaliKelass!: Table<CatatanWaliKelas, string>;
  raporSnapshots!: Table<RaporSnapshot, string>; // Renamed rapors
  tugasTambahans!: Table<TugasTambahan, string>; // Additional teacher assignments
  calendarEvents!: Table<CalendarEvent, string>;
  academicCalendarEvents!: Table<AcademicCalendarEvent, string>;
  examRooms!: Table<ExamRoom, string>;
  examSeats!: Table<ExamSeat, string>;
  examSupervisors!: Table<ExamSupervisor, string>;
  rombelBayangans!: Table<any, string>;
  
  // Sync tables
  syncQueue!: Table<SyncQueueItem, string>;
  conflicts!: Table<ConflictItem, string>;

  constructor() {
    super('SIKAD_v4');

    this.version(1).stores({
      // Indexing aligned with query requirements
      academicTerms: 'id, tahun_ajaran, semester, status',
      gurus: 'id, nip, nama, status_aktif',
      siswas: 'id, nisn, nipd, nama, status_aktif',
      kelass: 'id, nama_kelas, tingkat, academic_term_id, wali_kelas_id',
      // Extended mapel indexing from Data Kurikulum concept
      mataPelajarans: 'id, kode, nama, kelompok_mapel, mapping, induk_mapel, agama',
      pembagianMengajars: 'id, kelas_id, mapel_id, guru_id, academic_term_id',
      assessments: 'id, assessment_type_id, pembagian_mengajar_id, academic_term_id, tanggal, stage',
      assessmentDetails: 'id, assessment_id, siswa_id, [assessment_id+siswa_id]',
      catatanWaliKelass: 'id, siswa_id, kelas_id, academic_term_id',
      raporSnapshots: 'id, siswa_id, kelas_id, academic_term_id',
      tugasTambahans: 'id, guru_id, academic_term_id',
      calendarEvents: 'id, start_date, end_date, academic_term_id',
      academicCalendarEvents: '++id, academic_year_id, date, type, is_active',
      examRooms: 'id, academic_term_id, nama_ruang, lokasi, is_active',
      examSeats: 'id, room_id, siswa_id, exam_id, nomor_kursi, [room_id+nomor_kursi], [room_id+siswa_id]',
      examSupervisors: 'id, guru_id, room_id, exam_id, academic_term_id, slot_waktu, shift, [guru_id+slot_waktu]',
      rombelBayangans: 'id, sourceKelasId, targetTingkat, academicYearId, name, status',

      // Sync tables
      syncQueue: 'id, table_name, record_id, status, created_at',
      conflicts: 'id, table_name, record_id, created_at, resolved_at',
    });
  }
}

// ============ SINGLETON INSTANCE ============

export const db = new SikadDatabase();

// ============ SCHEMA HELPERS ============

export function getTableName(table: keyof SikadDatabase): string {
  const tableMap: Record<string, string> = {
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
    calendarEvents: 'calendar_events',
    academicCalendarEvents: 'academic_calendar_events',
    examRooms: 'exam_rooms',
    examSeats: 'exam_seats',
    examSupervisors: 'exam_supervisors',
    rombelBayangans: 'rombel_bayangans',
    syncQueue: 'sync_queue',
    conflicts: 'conflict_queue',
  };
  return tableMap[table] || table;
}

export function mapToTableName(entity: string): keyof SikadDatabase {
  const map: Record<string, keyof SikadDatabase> = {
    academic_terms: 'academicTerms',
    gurus: 'gurus',
    siswas: 'siswas',
    kelas: 'kelass',
    mata_pelajarans: 'mataPelajarans',
    pembagian_mengajar: 'pembagianMengajars',
    assessments: 'assessments',
    assessment_details: 'assessmentDetails',
    catatan_wali_kelas: 'catatanWaliKelass',
    rapor_snapshots: 'raporSnapshots',
    calendar_events: 'calendarEvents',
    academic_calendar_events: 'academicCalendarEvents',
    exam_rooms: 'examRooms',
    exam_seats: 'examSeats',
    exam_supervisors: 'examSupervisors',
    rombel_bayangans: 'rombelBayangans',
  };
  return map[entity] || (entity as keyof SikadDatabase);
}

// ============ DATABASE OPERATIONS ============

export async function clearDatabase(): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.academicTerms,
      db.gurus,
      db.siswas,
      db.kelass,
      db.mataPelajarans,
      db.pembagianMengajars,
      db.assessments,
      db.assessmentDetails,
      db.catatanWaliKelass,
      db.raporSnapshots,
      db.calendarEvents,
      db.examRooms,
      db.examSeats,
      db.examSupervisors,
      db.rombelBayangans
    ],
    async () => {
      await db.academicTerms.clear();
      await db.gurus.clear();
      await db.siswas.clear();
      await db.kelass.clear();
      await db.mataPelajarans.clear();
      await db.pembagianMengajars.clear();
      await db.assessments.clear();
      await db.assessmentDetails.clear();
      await db.catatanWaliKelass.clear();
      await db.raporSnapshots.clear();
      await db.calendarEvents.clear();
      await db.academicCalendarEvents.clear();
      await db.examRooms.clear();
      await db.examSeats.clear();
      await db.examSupervisors.clear();
      await db.rombelBayangans.clear();
    }
  );
}

export async function getDatabaseStats(): Promise<{
  tables: Record<string, number>;
  pendingSync: number;
  conflicts: number;
}> {
  const [
    academicTerms,
    gurus,
    siswas,
    kelass,
    mataPelajarans,
    assessments,
    assessmentDetails,
    raporSnapshots,
    calendarEvents,
    academicCalendarEvents,
    examRooms,
    examSeats,
    examSupervisors,
    rombelBayangans,
    pendingSync,
    conflicts,
  ] = await Promise.all([
    db.academicTerms.count(),
    db.gurus.count(),
    db.siswas.count(),
    db.kelass.count(),
    db.mataPelajarans.count(),
    db.assessments.count(),
    db.assessmentDetails.count(),
    db.raporSnapshots.count(),
    db.calendarEvents.count(),
    db.academicCalendarEvents.count(),
    db.examRooms.count(),
    db.examSeats.count(),
    db.examSupervisors.count(),
    db.rombelBayangans.count(),
    db.syncQueue.where('status').equals('PENDING').count(),
    db.conflicts.count(),
  ]);

  return {
    tables: {
      academicTerms,
      gurus,
      siswas,
      kelass,
      mataPelajarans,
      assessments,
      assessmentDetails,
      raporSnapshots,
      calendarEvents,
      academicCalendarEvents,
      examRooms,
      examSeats,
      examSupervisors,
      rombelBayangans,
    },
    pendingSync,
    conflicts,
  };
}
