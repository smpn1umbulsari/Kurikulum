# Examples

Koleksi contoh riil penerapan standar teknis SIKAD v4.0.

## 1. Contoh Commit Git Sesuai Standar
```text
feat(graduation): build graduation job scheduler engine

- Implement graduation_jobs trigger on academic_snapshots
- Add unit tests for batch graduation conversion
- Resolve sync conflict on offline database for graduated students

Approved-by: Software-Architect
Ref: SIKAD-402
```

## 2. Contoh Hubungan Clean Architecture
Berikut adalah struktur direktori modul `assessment` yang mencerminkan Clean Architecture:
```text
src/modules/assessment/
├── components/
│   └── GradingSheet.tsx      <-- UI Layer (Hanya menampilkan tabel dan menerima input)
├── hooks/
│   └── useGrading.ts         <-- Custom Hooks (Menghubungkan UI ke Service Layer)
├── services/
│   └── assessmentService.ts  <-- Service Layer (Business Logic & Validasi Zod)
├── repositories/
│   └── assessmentRepo.ts     <-- Repository Layer (Akses database Supabase & Dexie)
└── types/
    └── index.ts              <-- Definisi tipe data TS
```
