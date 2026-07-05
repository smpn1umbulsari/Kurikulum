# Task List: SIKAD v4.0 Hybrid Integration

## Prioritas Tinggi

### Sprint 1: Integrasi Smart Excel Importer ✅
- [x] Pasang SheetJS (`xlsx`) library di SIKAD v4.0
- [x] Modifikasi GuruPage.tsx untuk preview konflik 5-status (BARU/PERBARUI/IDENTIK/BENTROK/TIDAK VALID)
- [x] Modifikasi SiswaPage.tsx untuk preview konflik 5-status
- [x] Implementasikan pagination dan pilihan mode import (Update/Skip/Overwrite)
- [x] Test import dengan sample data Excel

### Sprint 2: Kalender Pendidikan & RPE ✅
- [x] Buat tabel `academic_calendar_events` di Dexie schema.ts
- [x] Buat tabel `academic_calendar_events` di Supabase migration
- [x] Porting komponen CalendarView.tsx ke src/modules/calendar/pages/CalendarPage.tsx
- [x] Implementasikan algoritma auto-RPE berdasarkan event kalender
- [x] Ganti AcademicTermPage.tsx dengan CalendarPage.tsx yang interaktif

### Sprint 3: Modul Administrasi Asesmen & Ujian ✅
- [x] Buat tabel `assessment_rooms` di schema database
- [x] Buat tabel `assessment_seats` di schema database
- [x] Buat tabel `assessment_supervisors` di schema database
- [x] Implementasikan UI pembagian ruang ujian interaktif (RoomManagementPage.tsx)
- [x] Implementasikan penjadwalan pengawas bebas bentrok (SupervisorSchedulePage.tsx)
- [x] Terapkan layout cetak kartu ujian (format kartu peserta)
- [x] Terapkan layout cetak label meja (format 121)

### Sprint 4: Integrasi Cloud (Apps Script) ✅
- [x] Hubungkan fungsi ekspor ke Google Drive melalui HTTP API (googleDriveService.ts)
- [x] Implementasikan integrasi Google Apps Script untuk dokumen kepengawasan
- [x] Test koneksi dan validasi autentikasi

### Sprint 5: Mutasi Siswa & Kelulusan ✅
- [x] Implementasikan halaman Naik Kelas massal (MutasiSiswaPage.tsx)
- [x] Implementasikan halaman Kelulusan massal
- [x] Porting logika rombel bayangan dari Guru Spenturi (rombelService.ts)
- [x] Implementasikan alur mutasi siswa (Pindah, Drop Out)

## PRD Compliance Check (AETHER)

### Setiap Selesai Task -> Cek PRD Alignment
- [ ] Verifikasi implementasi sesuai dengan spesifikasi PRD
- [ ] Check semua acceptance criteria terpenuhi
- [ ] Verifikasi requirement security sudah diimplementasi
- [ ] Update `docs/CHANGELOG/PRD-Alignment-Report.md` dengan deviasi
- [ ] Document architectural decisions di ADR

### Gap yang Belum Ditutup

| Gap ID | Priority | Description | Action |
|--------|----------|-------------|--------|
| GAP-002 | HIGH | tugas-tambahan Module | Create dedicated page |
| GAP-003 | HIGH | kehadiran Module | Create dedicated page |
| GAP-004 | CRITICAL | Conflict Center UI | Create `src/modules/conflict/` |
| GAP-006 | HIGH | Monitoring Center | Enhance existing UI |
| GAP-009 | CRITICAL | Sync Queue Encryption | Integrate LocalEncryptor |
| GAP-010 | HIGH | Sync Checksum | Add hash verification |
| GAP-011 | CRITICAL | Export Logging | Create audit table |

## Ringkasan Implementasi

### Files Dibuat/Dimodifikasi:

| Modul | Files |
|-------|-------|
| **Sprint 1** | useGuru.ts (preview 5-status), GuruPage.tsx (modal import) |
| **Sprint 2** | CalendarPage.tsx, rpeCalculator.ts, useCalendar.ts, schema.ts |
| **Sprint 3** | RoomManagementPage.tsx, SupervisorSchedulePage.tsx, ExamPrintPage.tsx |
| **Sprint 4** | googleDriveService.ts |
| **Sprint 5** | MutasiSiswaPage.tsx, mutationService.ts, rombelService.ts, mutationTypes.ts |

## Catatan Teknis
- Fondasi utama: SIKAD v4.0 (TypeScript strict, Dexie, Supabase)
- UI/UX: Aplikasi Kurikulum (CalendarView, Smart Importer, Print Templates)
- Logika Bisnis: Guru Spenturi (Algoritma Ruang, Pengawas, Mutasi)