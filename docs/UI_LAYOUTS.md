# SIKAD v4.0 - UI Page Layouts

> **Generated:** July 2, 2026  
> **Version:** 1.0  
> **Source:** PRD-Alignment-Specification.md + Engineering Handbook

---

## Table of Contents

1. [Module Structure Overview](#1-module-structure-overview)
2. [Page Layouts by Module](#2-page-layouts-by-module)
3. [Page Implementation Status](#3-page-implementation-status)
4. [Design System Reference](#4-design-system-reference)

---

## 1. Module Structure Overview

```
src/modules/
├── auth/                          # Authentication
│   ├── pages/
│   │   └── LoginPage.tsx
│   ├── components/
│   ├── services/
│   └── types/
│
├── academic-term/                  # Academic Term (Core Domain)
│   ├── pages/
│   │   └── AcademicTermPage.tsx
│   ├── components/
│   │   ├── TermCard.tsx
│   │   ├── TermForm.tsx
│   │   └── TermStats.tsx
│   ├── hooks/
│   │   └── useAcademicTerm.ts
│   ├── services/
│   │   └── academicTermService.ts
│   └── types/
│       └── index.ts
│
├── guru/                          # Teacher Management
│   ├── pages/
│   │   ├── GuruPage.tsx           (1,083 LOC - CRUD + Import)
│   │   └── GuruDetailPage.tsx
│   ├── components/
│   │   ├── GuruTable.tsx
│   │   ├── GuruForm.tsx
│   │   ├── GuruImportModal.tsx    (SmartExcelImporter integration)
│   │   └── GuruStats.tsx
│   ├── hooks/
│   │   └── useGuru.ts
│   ├── services/
│   │   └── guruService.ts
│   └── types/
│       └── index.ts
│
├── siswa/                         # Student Management
│   ├── pages/
│   │   ├── SiswaPage.tsx          (450+ LOC - CRUD + Import)
│   │   ├── SiswaDetailPage.tsx
│   │   └── MutasiSiswaPage.tsx   (Naik Kelas, Pindah, Lulus, Drop Out)
│   ├── components/
│   │   ├── SiswaTable.tsx
│   │   ├── SiswaForm.tsx
│   │   ├── SiswaImportModal.tsx
│   │   ├── MutasiPanel.tsx
│   │   └── SiswaStats.tsx
│   ├── hooks/
│   │   └── useSiswa.ts
│   ├── services/
│   │   ├── siswaService.ts
│   │   └── mutationService.ts
│   └── types/
│       └── index.ts
│
├── kelas/                         # Class Management
│   ├── pages/
│   │   ├── KelasPage.tsx          (Class CRUD with REAL/DAPO toggle)
│   │   ├── PembagianMengajarPage.tsx  (Teaching allocation)
│   │   ├── PromotionPage.tsx      (Naik Kelas massal)
│   │   └── GraduationPage.tsx     (Kelulusan massal)
│   ├── components/
│   │   ├── KelasTable.tsx
│   │   ├── KelasForm.tsx
│   │   ├── PembagianCard.tsx
│   │   ├── WorkloadBadge.tsx
│   │   └── RombelSelector.tsx
│   ├── hooks/
│   │   ├── useKelas.ts
│   │   └── usePembagianMengajar.ts
│   ├── services/
│   │   ├── kelasService.ts
│   │   ├── pembagianService.ts
│   │   └── rombelService.ts
│   └── types/
│       └── index.ts
│
├── mapel/                         # Subject Management
│   ├── pages/
│   │   └── MataPelajaranPage.tsx
│   ├── components/
│   │   ├── MapelTable.tsx
│   │   ├── MapelForm.tsx
│   │   └── IndukMapelSelector.tsx
│   ├── hooks/
│   │   └── useMataPelajaran.ts
│   ├── services/
│   │   └── mapelService.ts
│   └── types/
│       └── index.ts
│
├── assessment/                    # Assessment Engine
│   ├── pages/
│   │   ├── AssessmentPage.tsx     (Input Nilai - spreadsheet-like)
│   │   ├── JadwalUjianPage.tsx    (Exam Schedule)
│   │   ├── PembagianRuangPage.tsx (Room Allocation + Denah)
│   │   ├── SupervisorSchedulePage.tsx (Pengawas + Bentrok detection)
│   │   └── ExamPrintPage.tsx     (Kartu Peserta, Label Meja 121)
│   ├── components/
│   │   ├── AssessmentTable.tsx    (Arrow navigation, lock indicator)
│   │   ├── AssessmentForm.tsx
│   │   ├── RoomCard.tsx
│   │   ├── RoomLayoutEditor.tsx  (Visual seat allocation)
│   │   ├── SeatingAlgorithm.tsx
│   │   ├── SupervisorBadge.tsx
│   │   └── ConflictIndicator.tsx
│   ├── hooks/
│   │   ├── useAssessment.ts
│   │   └── useAssessmentDetails.ts
│   ├── services/
│   │   └── assessmentService.ts
│   ├── utils/
│   │   └── seatingAlgorithm.ts
│   └── types/
│       └── index.ts
│
├── rapor/                         # Report Card Engine
│   ├── pages/
│   │   └── RaporPage.tsx          (Wali Kelas panel, offline GPA)
│   ├── components/
│   │   ├── RaporTable.tsx
│   │   ├── RaporPreview.tsx
│   │   ├── CatatanWaliForm.tsx
│   │   └── Descriptors.tsx
│   ├── hooks/
│   │   └── useRapor.ts
│   ├── services/
│   │   └── raporService.ts
│   └── types/
│       └── index.ts
│
├── calendar/                      # Academic Calendar
│   ├── pages/
│   │   └── CalendarPage.tsx       (Interaktif + Auto RPE)
│   ├── components/
│   │   ├── CalendarView.tsx       (Full calendar grid)
│   │   ├── EventModal.tsx
│   │   ├── RPESummaryPanel.tsx   (Pekan Efektif counter)
│   │   └── HolidayBadge.tsx
│   ├── hooks/
│   │   └── useCalendar.ts
│   ├── services/
│   │   └── calendarService.ts
│   ├── utils/
│   │   └── rpeCalculator.ts
│   └── types/
│       └── index.ts
│
├── kehadiran/                     # Attendance (MISSING - GAP-003)
│   ├── pages/
│   │   └── KehadiranPage.tsx     (Bulk status toggles)
│   ├── components/
│   │   ├── KehadiranTable.tsx
│   │   ├── KehadiranForm.tsx
│   │   └── StatusToggle.tsx      (H/I/S/A buttons)
│   ├── hooks/
│   │   └── useKehadiran.ts
│   ├── services/
│   │   └── kehadiranService.ts
│   └── types/
│       └── index.ts
│
├── tugas-tambahan/                # Additional Duties (MISSING - GAP-002)
│   ├── pages/
│   │   └── TugasTambahanPage.tsx
│   ├── components/
│   │   ├── TugasTable.tsx
│   │   ├── TugasForm.tsx
│   │   └── WorkloadDisplay.tsx
│   ├── hooks/
│   │   └── useTugasTambahan.ts
│   ├── services/
│   │   └── tugasTambahanService.ts
│   └── types/
│       └── index.ts
│
├── conflict/                      # Conflict Resolution (MISSING - GAP-004)
│   ├── pages/
│   │   └── ConflictCenterPage.tsx
│   ├── components/
│   │   ├── ConflictCard.tsx
│   │   ├── ConflictModal.tsx
│   │   ├── LocalDataPanel.tsx
│   │   └── CloudDataPanel.tsx
│   ├── hooks/
│   │   └── useConflicts.ts
│   ├── services/
│   │   └── conflictService.ts
│   └── types/
│       └── index.ts
│
├── dashboard-kurikulum/           # Kurikulum Dashboard
│   ├── pages/
│   │   └── DashboardPage.tsx     (Recharts analytics)
│   ├── components/
│   │   ├── StatCards.tsx
│   │   ├── AssessmentChart.tsx
│   │   ├── AttendanceChart.tsx
│   │   └── ClassDistribution.tsx
│   └── services/
│       └── dashboardService.ts
│
├── dashboard-kepsek/              # Kepala Sekolah Dashboard
│   ├── pages/
│   │   └── KepsekDashboardPage.tsx
│   ├── components/
│   │   ├── PerformanceMetrics.tsx
│   │   ├── TeacherWorkload.tsx
│   │   └── StudentProgress.tsx
│   └── services/
│       └── kepsekService.ts
│
├── reporting/                     # Reporting & Analytics
│   ├── pages/
│   │   └── ReportingPage.tsx
│   ├── components/
│   │   ├── ReportSelector.tsx
│   │   ├── ExportModal.tsx
│   │   └── ReportPreview.tsx
│   ├── hooks/
│   │   └── useReporting.ts
│   └── services/
│       └── reportingService.ts
│
├── archive/                        # Archive Module
│   ├── pages/
│   │   └── ArchivePage.tsx
│   ├── components/
│   │   ├── ArchiveTable.tsx
│   │   └── ArchiveForm.tsx
│   ├── hooks/
│   │   └── useArchive.ts
│   └── services/
│       └── archiveService.ts
│
└── settings/                      # Settings & Configuration
    ├── pages/
    │   ├── SettingsPage.tsx
    │   ├── MonitoringCenterPage.tsx  (Sync status + conflicts)
    │   ├── UserManagementPage.tsx
    │   ├── BackupPage.tsx
    │   └── MataPelajaranPage.tsx
    ├── components/
    │   ├── SettingsSection.tsx
    │   ├── SyncStatusCard.tsx
    │   ├── DeviceList.tsx
    │   └── EncryptionSettings.tsx
    ├── hooks/
    │   └── useSettings.ts
    ├── services/
    │   └── settingsService.ts
    └── types/
        └── index.ts
```

---

## 2. Page Layouts by Module

### 2.1 Authentication Module

#### LoginPage.tsx

```
┌─────────────────────────────────────────────┐
│                                             │
│            ┌─────────────────┐              │
│            │   🏫 SIKAD     │              │
│            │   v4.0         │              │
│            └─────────────────┘              │
│                                             │
│     ┌─────────────────────────────┐         │
│     │  📧 Email                  │         │
│     └─────────────────────────────┘         │
│     ┌─────────────────────────────┐         │
│     │  🔒 Password                │         │
│     └─────────────────────────────┘         │
│                                             │
│     [        MASUK (Login)        ]         │
│                                             │
│     ─────────────────────────────────────  │
│     🔄 Offline Mode: Ready                  │
└─────────────────────────────────────────────┘
```

### 2.2 Academic Term Module

#### AcademicTermPage.tsx

```
┌─────────────────────────────────────────────────────────────────┐
│  🗓️ Academic Terms                              [+ Term Baru]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ 2024/2025    │  │ 2025/2026    │  │ + Tambah     │       │
│  │ GANJIL       │  │ GANJIL ★     │  │   Tahun      │       │
│  │ ✓ Aktif      │  │   Baru       │  │   Ajaran     │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  📊 Statistik 2025/2026 GANJIL                          │   │
│  ├─────────────┬─────────────┬─────────────┬─────────────┤   │
│  │ Guru        │ Siswa       │ Kelas        │ Mapel       │   │
│  │ 45          │ 720         │ 24           │ 18          │   │
│  └─────────────┴─────────────┴─────────────┴─────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### CalendarPage.tsx

```
┌─────────────────────────────────────────────────────────────────┐
│  📅 Kalender Akademik        Tahun: [2025/2026 ▼] [ GANJIL ▼] │
├────────────────────────────────────┬────────────────────────────┤
│                                    │  📊 RINGKASAN RPE          │
│  ┌─────────────────────────────┐   │  ━━━━━━━━━━━━━━━━━━━━━━━  │
│  │  Juni 2026                  │   │  Total Minggu: 52         │
│  │ ┌─────────────────────────┐ │   │  Minggu Efektif: 17      │
│  │ │ Mn  Se  Ra  Ka  Ju  Sa  │ │   │  Minggu Libur: 35         │
│  │ │  1   2   3   4   5   6  │ │   │                           │
│  │ │  7   8   9  10  11  12  │ │   │  📋 Event Aktif: 12      │
│  │ │ [14][15][16][17][18][19]│ │   │                           │
│  │ │ 21  22  23  24  25  26  │ │   │  ┌─────────────────────┐  │
│  │ │ [28][29][30]            │ │   │  │ 🟢 Libur Semester    │  │
│  │ └─────────────────────────┘ │   │  │ 🔴 UTS              │  │
│  │                             │   │  │ 🟡 Kegiatan Sekolah │  │
│  │  Legend:                    │   │  └─────────────────────┘  │
│  │  🟢 Libur  🔴 Ujian  🟡 Event   │                           │
│  └─────────────────────────────┘   │  [+ Tambah Event]         │
│                                    │                            │
├────────────────────────────────────┴────────────────────────────┤
│  📝 Daftar Event Selected Date: 15 Juni 2026                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🔴 UTS Semester Ganjil - Kelas VII, VIII               │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 Guru Module

#### GuruPage.tsx

```
┌─────────────────────────────────────────────────────────────────┐
│  👨‍🏫 Manajemen Guru              [+ Tambah] [📥 Import Excel] │
├─────────────────────────────────────────────────────────────────┤
│  🔍 Search: [________________]  Status: [Semua ▼]  [🔄]       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Nama Guru          │ NIP         │ Status │ Aksi        │  │
│  ├─────────────────────┼─────────────┼────────┼────────────┤  │
│  │ 👤 Dr. Ahmad Fauzi  │ 198501152010 │ Aktif  │ 👁️ ✏️ 🗑️   │  │
│  │ 👤 Dra. Siti Aminah│ 197801202005 │ Aktif  │ 👁️ ✏️ 🗑️   │  │
│  │ 👤 Drs. Budi Santoso│ 198203102008 │ Cuti   │ 👁️ ✏️ 🗑️   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Showing 1-10 of 45         [< Prev] [1] [2] [3] [Next >]      │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 📊 Statistik Guru                                          │  │
│  │ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐             │  │
│  │ │Aktif   │ │Cuti    │ │Mutation│ │Pensiun │             │  │
│  │ │  38    │ │   3    │ │   2    │ │   2    │             │  │
│  │ └────────┘ └────────┘ └────────┘ └────────┘             │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.4 Siswa Module

#### SiswaPage.tsx

```
┌─────────────────────────────────────────────────────────────────┐
│  👨‍🎓 Manajemen Siswa         [+ Tambah] [📥 Import] [🔄 Sync]  │
├─────────────────────────────────────────────────────────────────┤
│  🔍 NISN/Nama: [____________] Tingkat: [Semua ▼] Status:[Aktif▼]│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ NISN       │ Nama              │ Kelas │ Status │ Aksi  │  │
│  ├────────────┼───────────────────┼───────┼────────┼───────┤  │
│  │ 0012345678 │ Muhammad Rizki    │ VII A │ Aktif  │ 👁️✏️🗑️ │  │
│  │ 0012345679 │ Siti Nurhaliza   │ VII A │ Aktif  │ 👁️✏️🗑️ │  │
│  │ 0012345680 │ Ahmad Wijaya      │ VIII B│ Naik   │ 👁️✏️🗑️ │  │
│  │ 0012345681 │ Dewi Lestari      │ IX C  │ Lulus  │ 👁️✏️🗑️ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Showing 1-20 of 720       [<] [1] [2]...[36] [>]              │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 📊 Distribusi Siswa                                       │  │
│  │ VII: ████████████ 280    VIII: ██████████ 240             │  │
│  │ IX:  ██████████   200                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

#### MutasiSiswaPage.tsx

```
┌─────────────────────────────────────────────────────────────────┐
│  🔄 Mutasi Siswa                         [2025/2026 GANJIL ▼] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [🏫 Naik Kelas] [🚪 Pindah] [🎓 Lulus] [❌ Drop Out]          │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  🎓 GRADUASI MASSAL - Pilih Siswa Kelas IX               │  │
│  │  ──────────────────────────────────────────────────────── │  │
│  │  [✓] Pilih Semua (200 siswa)                              │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │ [✓] 0012345681 - Dewi Lestari - IX C              │  │  │
│  │  │ [✓] 0012345682 - Fajar Ramadhan - IX C             │  │  │
│  │  │ [✓] 0012345683 - Putri Ayu - IX C                  │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  │                                                           │  │
│  │  Tahun Lulus: [2026 ▼]                                   │  │
│  │                                                           │  │
│  │  [═══════════════════════════════════════════════] 200    │  │
│  │                                                           │  │
│  │  [        🗂️ PROSES GRADUASI MASSAL        ]              │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.5 Kelas Module

#### KelasPage.tsx

```
┌─────────────────────────────────────────────────────────────────┐
│  🏫 Manajemen Kelas                        [+ Kelas Baru]       │
│                                              [REAL ▼] [DAPO]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Kelas      │ Wali         │ Siswa │ JP Total │ Aksi    │  │
│  ├────────────┼──────────────┼───────┼──────────┼─────────┤  │
│  │ VII A REAL │ Dra. Siti    │  32   │  38 JP   │ 👁️✏️🗑️ │  │
│  │ VII A DAPO │ Dra. Siti    │  32   │  38 JP   │ 👁️✏️🗑️ │  │
│  │ VII B REAL │ Drs. Ahmad   │  30   │  36 JP   │ 👁️✏️🗑️ │  │
│  │ VIII A REAL│ -            │   0   │   0 JP   │ 👁️✏️🗑️ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ ⚠️ Peringatan Beban Mengajar                             │  │
│  │ Dra. Siti - Total JP: 38 (Beban Normal: 24-40 JP) ✅     │  │
│  │ Drs. Ahmad - Total JP: 42 (LEBIH! ⚠️)                   │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

#### PembagianMengajarPage.tsx

```
┌─────────────────────────────────────────────────────────────────┐
│  📋 Pembagian Mengajar Guru            [2025/2026 GANJIL ▼]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Pilih Guru: [Dr. Ahmad Fauzi ▼]                               │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 📋 Pembagian Mengajar Dr. Ahmad Fauzi                    │  │
│  │ Total JP: 42 / Beban Normal: 24-40 JP ⚠️                 │  │
│  │ ────────────────────────────────────────────────────────  │  │
│  │ ┌────────────────────────────────────────────────────┐    │  │
│  │ │ 🔵 Matematika │ VII A, VII B │ 12 JP │ [✏️] [🗑️]  │    │  │
│  │ │ 🔵 Matematika │ VIII A       │  4 JP │ [✏️] [🗑️]  │    │  │
│  │ │ 🟢 IPA         │ VII A        │  3 JP │ [✏️] [🗑️]  │    │  │
│  │ │ 🟢 IPA         │ VIII B       │  3 JP │ [✏️] [🗑️]  │    │  │
│  │ └────────────────────────────────────────────────────┘    │  │
│  │                                                           │  │
│  │ [+ Tambah Pembagian]                                     │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.6 Assessment Module

#### AssessmentPage.tsx

```
┌─────────────────────────────────────────────────────────────────┐
│  📝 Input Penilaian           [2025/2026 GANJIL ▼] [VII A ▼]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📚 Mapel: [Matematika ▼]   UH: [1 ▼]   📅 Tanggal: [2026-07-01]│
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ No │ NISN   │ Nama Siswa       │ Nilai │ Catatan │ ▲   │  │
│  ├────┼────────┼──────────────────┼───────┼─────────┼─────┤  │
│  │  1 │ 0012345│ Muhammad Rizki   │ [85 ] │ [____]  │ ▲▼  │  │
│  │  2 │ 0012346│ Siti Nurhaliza   │ [92 ] │ [____]  │ ▲▼  │  │
│  │  3 │ 0012347│ Ahmad Wijaya     │ [78 ] │ [___]   │ 🔒  │  │
│  │  4 │ 0012348│ Dewi Lestari     │ [95 ] │ [____]  │ ▲▼  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Stage: [DRAFT ▼]   [💾 Simpan Draft] [📤 Publish] [🔒 Final]  │
└─────────────────────────────────────────────────────────────────┘
```

#### PembagianRuangPage.tsx

```
┌─────────────────────────────────────────────────────────────────┐
│  🏢 Pembagian Ruang Ujian          [2025/2026 GANJIL ▼]        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────┐  ┌──────────────────────────┐  │
│  │ 📋 Daftar Ruang              │  │ 🪑 Denah: Ruang 01      │  │
│  │ ──────────────────────────  │  │ ┌────────────────────┐  │  │
│  │ 🔵 Ruang 01 (32 kursi)     │  │ │ □ □ □ □ □ □ □ □  │  │  │
│  │ 🟢 Ruang 02 (30 kursi)     │  │ │ □ □ □ □ □ □ □ □  │  │  │
│  │ 🟡 Ruang 03 (30 kursi)     │  │ │ □ □ □ □ □ □ □ □  │  │  │
│  │ [+ Tambah Ruang]            │  │ │ □ □ □ □ □ □ □ □  │  │  │
│  │                              │  │ └────────────────────┘  │  │
│  │ [📊 Auto Distribute 120 → 4]│  │                          │  │
│  └──────────────────────────────┘  └──────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 📝 Pembagian Siswa Ruang 01                              │  │
│  │ ┌─────┬───────────┬────────────┬───────┐                 │  │
│  │ │ No  │ No Peserta│ Nama       │ Meja  │                 │  │
│  │ ├─────┼───────────┼────────────┼───────┤                 │  │
│  │ │  1  │ 12001     │ M. Rizki   │  1    │                 │  │
│  │ │  2  │ 12002     │ Siti N.    │  2    │                 │  │
│  │ └─────┴───────────┴────────────┴───────┘                 │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.7 Rapor Module

#### RaporPage.tsx

```
┌─────────────────────────────────────────────────────────────────┐
│  📊 Raport Siswa                  [2025/2026 GANJIL ▼] [VII A▼] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────┐  ┌──────────────────────────┐ │
│  │ 👤 Pilih Siswa               │  │ 📄 Preview Raport        │ │
│  │ ───────────────────────────  │  │ ┌──────────────────────┐ │ │
│  │ 🔍 [Cari siswa____]          │  │ │ 📋 RAPORT SISWA      │ │ │
│  │                              │  │ │ Tahun: 2025/2026     │ │ │
│  │ ┌────────────────────────┐  │  │ │ ━━━━━━━━━━━━━━━━━━━━ │ │ │
│  │ │ 👤 Muhammad Rizki      │  │  │ │ Matematika  : A     │ │ │
│  │ │    NISN: 0012345678    │  │  │ │ Bahasa Indo : A-     │ │ │
│  │ │    Kelas: VII A        │  │  │ │ IPA          : B+    │ │ │
│  │ └────────────────────────┘  │  │ │ Bahasa Ing   : A     │ │ │
│  │ ┌────────────────────────┐  │  │ │ ━━━━━━━━━━━━━━━━━━━━ │ │ │
│  │ │ 👤 Siti Nurhaliza      │  │  │ │ Nilai Akhir: 87.5    │ │ │
│  │ └────────────────────────┘  │  │ │ Predikat: BAIK       │ │ │
│  └──────────────────────────────┘  │ └──────────────────────┘ │ │
│                                     └──────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 📝 Catatan Wali Kelas                                     │  │
│  │ ┌────────────────────────────────────────────────────┐   │  │
│  │ │ Ananda Muhammad Rizki...                           │   │  │
│  │ └────────────────────────────────────────────────────┘   │  │
│  │ [💾 Simpan]  [📤 Finalisasi]                              │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.8 Conflict Resolution Module (MISSING)

#### ConflictCenterPage.tsx

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚠️ Conflict Resolution Center            [🔄 Sync Status: 3/5] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ⚠️ Ditemukan 3 konflik data yang memerlukan resolusi manual   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ ⚡ CONFLICT #001 - siswa:0012345678 (Muhammad Rizki)      │  │
│  │ ──────────────────────────────────────────────────────── │  │
│  │                                                          │  │
│  │  📱 VERSI LOKAL          │  ☁️ VERSI CLOUD               │  │
│  │  ─────────────────────── │  ────────────────────────    │  │
│  │  status_aktif: "NAIK"    │  status_aktif: "AKTIF"       │  │
│  │  updated_at: 2026-07-01  │  updated_at: 2026-07-01       │  │
│  │  by: HP-iPhone-User      │  by: laptop-admin             │  │
│  │                          │                               │  │
│  │  [✅ Gunakan Lokal]      │  [☁️ Gunakan Cloud]          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ ⚡ CONFLICT #002 - rapor_snapshots:abc123                │  │
│  │ ...                                                      │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.9 Kehadiran Module (MISSING)

#### KehadiranPage.tsx

```
┌─────────────────────────────────────────────────────────────────┐
│  📅 Kehadiran Siswa           [2025/2026 GANJIL ▼] [VII A ▼]   │
├─────────────────────────────────────────────────────────────────┤
│  📅 Tanggal: [2026-07-02]   Filter: [Semua ▼]                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ No │ NISN   │ Nama           │ H  │ I  │ S  │ A  │        │  │
│  ├────┼────────┼────────────────┼────┼────┼────┼────┼────────┤  │
│  │  1 │ 0012345│ Muhammad Rizki │ [●]│ [ ]│ [ ]│ [ ]│        │  │
│  │  2 │ 0012346│ Siti Nurhaliza │ [ ]│ [●]│ [ ]│ [ ]│  I    │  │
│  │  3 │ 0012347│ Ahmad Wijaya    │ [●]│ [ ]│ [ ]│ [ ]│        │  │
│  │  4 │ 0012348│ Dewi Lestari    │ [ ]│ [ ]│ [●]│ [ ]│  S    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  H: Hadir  I: Izin  S: Sakit  A: Alpha                         │
│  [💾 Simpan Batch]                              Total: 30 Siswa │
└─────────────────────────────────────────────────────────────────┘
```

### 2.10 Monitoring Center

#### MonitoringCenterPage.tsx

```
┌─────────────────────────────────────────────────────────────────┐
│  🔧 Monitoring Center                      [🔄 Force Sync]      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 📡 Status Koneksi                                        │  │
│  │ ──────────────────────────────────────────────────────── │  │
│  │ ● Online ☑️        Last Sync: 2 menit yang lalu         │  │
│  │ ████████████████████░░░░░░░░ 78% synced                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 📋 Sync Queue (Pending)                                  │  │
│  │ ──────────────────────────────────────────────────────── │  │
│  │ 12 items waiting                                         │  │
│  │ • siswa:create (5)                                       │  │
│  │ • penilaian:update (7)                                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ ⚠️ Conflicts (3)                                         │  │
│  │ ──────────────────────────────────────────────────────── │  │
│  │ • Conflict #001 - siswa:0012345678                       │  │
│  │ • Conflict #002 - rapor:abc123                           │  │
│  │ [🔓 Resolve Conflicts]                                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 🖥️ Devices (2 connected)                                  │  │
│  │ ──────────────────────────────────────────────────────── │  │
│  │ • HP-iPhone-User - Last seen: now                        │  │
│  │ • laptop-admin - Last seen: 5 min ago                    │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.11 Dashboard Modules

#### DashboardPage.tsx (Kurikulum)

```
┌─────────────────────────────────────────────────────────────────┐
│  📊 Dashboard Kurikulum          [2025/2026 GANJIL ▼]          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │ 👨‍🏫 Guru │ │ 👨‍🎓 Siswa│ │ 🏫 Kelas│ │ 📝 Asesmt│ │ 📊 RPE  │  │
│  │   45    │ │   720   │ │   24    │ │   156   │ │   17    │  │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘  │
│                                                                 │
│  ┌─────────────────────────────┐  ┌─────────────────────────┐  │
│  │ 📈 Distribusi Nilai        │  │ 📊 Kehadiran Mingguan   │  │
│  │ ┌───────────────────────┐ │  │ ┌─────────────────────┐ │  │
│  │ │     📊                 │ │  │ │     ████            │ │  │
│  │ │   ████  ████          │ │  │ │  ████████  ████    │ │  │
│  │ │  ███████████████      │ │  │ │ ██████████████████ │ │  │
│  │ │ A    B    C    D      │ │  │ │ Mn  Se  Ra  Ka  Ju  │ │  │
│  │ └───────────────────────┘ │  │ └─────────────────────┘ │  │
│  └─────────────────────────────┘  └─────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 📋 Top 5 Kelas dengan Nilai Tertinggi                    │  │
│  │ 1. VII A - Rata-rata: 87.5                              │  │
│  │ 2. VIII B - Rata-rata: 85.2                             │  │
│  │ 3. IX C  - Rata-rata: 84.8                              │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Page Implementation Status

| Module              | Page                   | File                               | LOC   | Status         |
| ------------------- | ---------------------- | ---------------------------------- | ----- | -------------- |
| auth                | LoginPage              | `pages/LoginPage.tsx`              | ~150  | ✅ Complete    |
| academic-term       | AcademicTermPage       | `pages/AcademicTermPage.tsx`       | ~295  | ✅ Complete    |
| academic-term       | CalendarPage           | `pages/CalendarPage.tsx`           | ~400  | ✅ Complete    |
| guru                | GuruPage               | `pages/GuruPage.tsx`               | ~1083 | ✅ Complete    |
| guru                | GuruDetailPage         | `pages/GuruDetailPage.tsx`         | ~200  | ✅ Complete    |
| siswa               | SiswaPage              | `pages/SiswaPage.tsx`              | ~450  | ✅ Complete    |
| siswa               | MutasiSiswaPage        | `pages/MutasiSiswaPage.tsx`        | ~350  | ✅ Complete    |
| kelas               | KelasPage              | `pages/KelasPage.tsx`              | ~500  | ✅ Complete    |
| kelas               | PembagianMengajarPage  | `pages/PembagianMengajarPage.tsx`  | ~400  | ✅ Complete    |
| kelas               | PromotionPage          | `pages/PromotionPage.tsx`          | ~300  | ✅ Complete    |
| kelas               | GraduationPage         | `pages/GraduationPage.tsx`         | ~300  | ✅ Complete    |
| assessment          | AssessmentPage         | `pages/AssessmentPage.tsx`         | ~427  | ✅ Complete    |
| assessment          | JadwalUjianPage        | `pages/JadwalUjianPage.tsx`        | ~200  | ✅ Complete    |
| assessment          | PembagianRuangPage     | `pages/PembagianRuangPage.tsx`     | ~300  | ✅ Complete    |
| assessment          | SupervisorSchedulePage | `pages/SupervisorSchedulePage.tsx` | ~250  | ✅ Complete    |
| assessment          | ExamPrintPage          | `pages/ExamPrintPage.tsx`          | ~150  | ✅ Complete    |
| rapor               | RaporPage              | `pages/RaporPage.tsx`              | ~500  | ✅ Complete    |
| calendar            | CalendarPage           | `pages/CalendarPage.tsx`           | ~400  | ✅ Complete    |
| **kehadiran**       | KehadiranPage          | `pages/KehadiranPage.tsx`          | -     | ❌ **MISSING** |
| **tugas-tambahan**  | TugasTambahanPage      | `pages/TugasTambahanPage.tsx`      | -     | ❌ **MISSING** |
| **conflict**        | ConflictCenterPage     | `pages/ConflictCenterPage.tsx`     | -     | ❌ **MISSING** |
| dashboard-kurikulum | DashboardPage          | `pages/DashboardPage.tsx`          | ~600  | ✅ Complete    |
| dashboard-kepsek    | KepsekDashboardPage    | `pages/KepsekDashboardPage.tsx`    | ~500  | ✅ Complete    |
| reporting           | ReportingPage          | `pages/ReportingPage.tsx`          | ~300  | ⚠️ Partial     |
| settings            | SettingsPage           | `pages/SettingsPage.tsx`           | ~200  | ✅ Complete    |
| settings            | MonitoringCenterPage   | `pages/MonitoringCenterPage.tsx`   | ~350  | ✅ Complete    |
| settings            | ArchivePage            | `pages/ArchivePage.tsx`            | ~250  | ✅ Complete    |
| settings            | UserManagementPage     | `pages/UserManagementPage.tsx`     | ~150  | ✅ Complete    |
| settings            | MataPelajaranPage      | `pages/MataPelajaranPage.tsx`      | ~474  | ✅ Complete    |

---

## 4. Design System Reference

### 4.1 Design Tokens

From `docs/14-UI-Design-System.md`:

| Token            | Value               | Usage                  |
| ---------------- | ------------------- | ---------------------- |
| `primary`        | Blue-600 `#2563EB`  | Primary actions, links |
| `secondary`      | Gray-600 `#4B5563`  | Secondary elements     |
| `success`        | Green-600 `#16A34A` | Success states, active |
| `warning`        | Amber-500 `#F59E0B` | Warnings               |
| `danger`         | Red-600 `#DC2626`   | Errors, delete actions |
| `background`     | Gray-50 `#F9FAFB`   | Page background        |
| `card-bg`        | White `#FFFFFF`     | Card backgrounds       |
| `text-primary`   | Gray-900 `#111827`  | Main text              |
| `text-secondary` | Gray-500 `#6B7280`  | Secondary text         |
| `border`         | Gray-200 `#E5E7EB`  | Borders                |
| `rounded`        | 8px                 | Card corners           |
| `shadow-card`    | shadow-md           | Card shadows           |

### 4.2 Layout Components

| Component        | Classes                                                         | Usage           |
| ---------------- | --------------------------------------------------------------- | --------------- |
| Page Container   | `max-w-7xl mx-auto px-4 py-6`                                   | All pages       |
| Card             | `rounded-lg border border-neutral-200 shadow-card bg-white`     | Data containers |
| Table            | `w-full text-sm` + `thead bg-gray-50`                           | Data tables     |
| Form Input       | `w-full px-3 py-2 border rounded-md`                            | Form fields     |
| Primary Button   | `px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700` | Main actions    |
| Secondary Button | `px-4 py-2 bg-gray-100 text-gray-700 rounded-md`                | Cancel/back     |
| Danger Button    | `px-4 py-2 bg-red-600 text-white rounded-md`                    | Delete actions  |

### 4.3 Responsive Breakpoints

| Breakpoint | Min-width | Usage         |
| ---------- | --------- | ------------- |
| `sm`       | 640px     | Large phones  |
| `md`       | 768px     | Tablets       |
| `lg`       | 1024px    | Small laptops |
| `xl`       | 1280px    | Desktops      |

### 4.4 Accessibility Features

- **Font Scaling**: Dynamic `text-sm` / `text-lg` based on user preference
- **High Contrast Mode**: Toggle between normal and high contrast themes
- **Focus States**: `ring-2 ring-blue-500` on interactive elements
- **ARIA Labels**: Screen reader support on icons and buttons

---

## 5. Missing Modules Summary

### GAP-002: tugas-tambahan Module (MISSING)

**Impact:** Teachers cannot manage additional duties (Tugas Tambahan)

**Files to create:**

```
src/modules/tugas-tambahan/
├── pages/
│   └── TugasTambahanPage.tsx
├── components/
│   ├── TugasTable.tsx
│   ├── TugasForm.tsx
│   └── WorkloadDisplay.tsx
├── hooks/
│   └── useTugasTambahan.ts
├── services/
│   └── tugasTambahanService.ts
└── types/
    └── index.ts
```

### GAP-003: kehadiran Module (MISSING)

**Impact:** Attendance must be done via other modules (no dedicated UI)

**Files to create:**

```
src/modules/kehadiran/
├── pages/
│   └── KehadiranPage.tsx
├── components/
│   ├── KehadiranTable.tsx
│   ├── KehadiranForm.tsx
│   └── StatusToggle.tsx
├── hooks/
│   └── useKehadiran.ts
├── services/
│   └── kehadiranService.ts
└── types/
    └── index.ts
```

### GAP-004: conflict Module (MISSING)

**Impact:** Conflicts detected but cannot be resolved manually

**Files to create:**

```
src/modules/conflict/
├── pages/
│   └── ConflictCenterPage.tsx
├── components/
│   ├── ConflictCard.tsx
│   ├── ConflictModal.tsx
│   ├── LocalDataPanel.tsx
│   └── CloudDataPanel.tsx
├── hooks/
│   └── useConflicts.ts
├── services/
│   └── conflictService.ts
└── types/
    └── index.ts
```

---

_Last Updated: July 2, 2026_
