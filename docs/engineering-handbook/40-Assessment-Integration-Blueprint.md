# 40. Assessment Integration Blueprint — SIKAD v4.0

Dokumen ini merupakan cetak biru (blueprint) perencanaan integrasi konseptual untuk menyatukan modul Assessment (Exam Rooming & Invigilation) ke dalam sistem utama SIKAD v4.0. Cetak biru ini menjadi acuan resmi bagi pengembang ketika proses penulisan kode fisik sistem dimulai.

---

## 1. Arsitektur Integrasi Data (Database Level)

Untuk memastikan data master sekolah sinkron secara real-time dengan modul Assessment, relasi database dirancang terintegrasi di tingkat skema Supabase (PostgreSQL) menggunakan tabel relasional ternormalisasi penuh:

```
  ┌─────────────────────────────────────────────────────────────┐
  │                        SIKAD Master                         │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
           ┌───────────────────────┼───────────────────────┐
           ▼ 1-to-N                ▼ 1-to-N                ▼ 1-to-N
  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
  │  academic_terms  │    │      gurus       │    │      siswas      │
  └────────┬─────────┘    └────────┬─────────┘    └────────┬─────────┘
           │ 1                     │ 1                     │ 1
           ▼ N                     ▼ N                     ▼ N
  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
  │ assessment_rooms │    │assessment_invigi-│    │assessment_parti- │
  │                  │    │lators            │    │cipants           │
  └──────────────────┘    └──────────────────┘    └──────────────────┘
```

### 1.1 Relasi Tabel Master & Transaksi
- **Semester (Academic Term)**: Kolom `academic_term_id` pada tabel `assessment_rooms`, `assessment_participants`, dan `assessment_invigilators` terikat sebagai Foreign Key ke tabel master `academic_terms(id)` di SIKAD Utama. Hal ini menjamin isolasi penuh data ujian dan alokasi ruang per periode semester akademik.
- **Data Master Guru**: 
  - Penugasan pengawas pada tabel `assessment_invigilators` menautkan `guru_id` (FK ke `gurus.id`) dan `room_id` (FK ke `assessment_rooms.id`).
  - Constraint komposit unik `uq_guru_room_date_session` pada tabel `assessment_invigilators` mencegah guru ditugaskan mengawasi ganda di slot yang sama.
- **Data Master Siswa**:
  - Alokasi siswa disimpan di tabel `assessment_participants` menautkan `siswa_id` (FK ke `siswas.id`) dan `room_id` (FK ke `assessment_rooms.id`).
  - Constraint komposit unik `uq_siswa_assessment_term` pada tabel `assessment_participants` menjamin seorang siswa hanya dialokasikan ke maksimal 1 ruang ujian dalam satu semester.

---

## 2. Arsitektur Modul & State (Application Level)

Rancangan struktur file dan pengelolaan state modul Assessment diselaraskan dengan standar *Clean Architecture* dan *Zustand* di SIKAD Utama.

### 2.1 Struktur Folder Modul Assessment
Pengerjaan modul diposisikan di bawah modul fitur `/src/modules/`:
```text
src/modules/assessment/
├── pages/                    # Halaman Utama (JadwalUjianPage, JadwalMengawasiPage, dll)
├── components/               # View / UI Components Reusable (RoomCard, LevelPanel)
├── services/                 # Business Logic & API Layer (assessmentService.ts)
├── store/                    # Zustand State Store (useAssessmentStore, useOfflineSyncStore)
├── types/                    # TypeScript Type Definitions (index.ts)
└── tests/                    # Pengujian fungsional dan unit testing
```

### 2.2 Integrasi Zustand Store (Draft vs Applied)
Global Zustand store di `store/useAssessmentStore.ts` mengisolasi draft settings dari applied settings sebelum dikirim ke database:
```typescript
interface LevelSettings {
  enabled: boolean;
  mode: "setengah" | "20siswa" | "manual";
  order: "az" | "za";
  roomRanges: Array<{ start: number; end: number }>;
  manualCounts: number[];
}

interface AssessmentState {
  activeTab: "jadwal-ujian" | "jadwal-mengawasi" | "pembagian-ruang" | "kartu-pengawas";
  draftLevelSettings: Record<"7" | "8" | "9", LevelSettings>;
  appliedLevelSettings: Record<"7" | "8" | "9", LevelSettings>;
  updateDraftSettings: (level: "7" | "8" | "9", settings: Partial<LevelSettings>) => void;
  applySettings: () => void; // Memindahkan draft ke applied & memicu sinkronisasi
}
```

---

## 3. Penyelarasan UI/UX & Design Tokens (Presentation Level)

- **Menu Sidebar Navigasi**: Menu "Administrasi Assessment" diintegrasikan di bawah kelompok navigasi "Kurikulum" pada sidebar SIKAD Utama.
- **CSS Styling Adherence**: Kelas-kelas styling khusus modul Assessment diselaraskan dengan standard CSS Vanilla proyek utama:
  - `.app-panel--toolbar` menggunakan rendering sticky dengan backdrop-blur untuk konsistensi layout.
  - `.assessment-level-panel-disabled` menyajikan visual opacity 50% dan menonaktifkan pointer-events untuk menjamin aksesibilitas kontras.
- **SweetAlert2 (Swal) Unified**: Pemicuan notifikasi toast dan dialog konfirmasi menggunakan instance Swal terpusat dari core SIKAD untuk menjamin konsistensi warna tema (terutama penanganan dark mode).

---

## 4. Kebijakan Keamanan RLS Terpadu (Security Level)

Perlindungan data untuk guru pengawas dan pencegahan manipulasi jadwal asesmen diimplementasikan secara terintegrasi melalui PostgreSQL RLS di Supabase:

### 4.1 Aturan Otorisasi (RLS Policies)
- **Tabel `assessment_rooms` & `assessment_participants`**:
  - Operasi SELECT diizinkan bagi seluruh pengguna terotentikasi (`authenticated`).
  - Operasi WRITE (Insert/Update/Delete) hanya diizinkan bagi pengguna dengan role `'admin'` atau `'kurikulum'` (Operator).
- **Tabel `assessment_invigilators`**:
  - Operasi SELECT dibatasi menggunakan RLS agar guru pengawas hanya dapat membaca tugas mengawas milik mereka sendiri (`guru_id = auth.uid()::varchar`), sedangkan admin dan operator sekolah dapat membaca seluruh data.
  - Operasi WRITE hanya diizinkan bagi pengguna dengan role `'admin'` atau `'kurikulum'`.

---

## 5. Rekomendasi Implementasi Bertahap (Roadmap)

Ketika proses penulisan kode sistem SIKAD v4.0 dimulai, berikut adalah langkah-langkah implementasi modul Assessment secara bertahap:
1. **Fase 1 (Database Migration)**: Jalankan skrip pembuatan tabel relasional `assessment_rooms`, `assessment_participants`, dan `assessment_invigilators` lengkap dengan index komposit di database Supabase.
2. **Fase 2 (Core Logic & Service)**: Implementasikan kelas service `assessmentService.ts` untuk melayani batch upsert via Supabase Client SDK, serta verifikasi trigger lock `check_assessment_lock_trigger`.
3. **Fase 3 (Zustand & IndexedDB Sync Queue)**: Buat state store `useAssessmentStore.ts` and `useOfflineSyncStore.ts`, serta integrasikan `LocalEncryptor` (Web Crypto API AES-GCM) untuk mengamankan data antrean offline di IndexedDB browser.
4. **Fase 4 (UI Components)**: Buat komponen antarmuka panel level, tabel ketersediaan, dan kartu preview ruang menggunakan Vanilla CSS yang reaktif.
5. **Fase 5 (PDF & Excel Export)**: Pasang library ekspor dokumen di frontend untuk mengaktifkan cetak administrasi Tempel Kaca, Denah, Kartu Ujian, dan XLSX Daftar Peserta.
