\# PRD REVISION LOG



\## SIKAD v4.0 Final Architecture Alignment



Version: 4.0.1



Status: REQUIRED REVISION



\---



\# REVISION 1



\## Academic Term Menjadi Core Domain



\### Sebelum



Academic Term dianggap modul konfigurasi.



\---



\### Sesudah



Academic Term menjadi:



```text

CORE DOMAIN

```



Seluruh transaksi akademik wajib memiliki:



```text

academic\_term\_id

```



\---



\### Tabel Wajib



```text

kelas

pembagian\_mengajar

assessments

kehadiran

rapor\_snapshots

riwayat\_kelas

promotion\_jobs

graduation\_jobs

archive\_jobs

```



\---



\# REVISION 2



\## Configurable Assessment Engine



\### Sebelum



Assessment menggunakan:



```text

UH

PTS

PAS

```



atau enum statis.



\---



\### Sesudah



Assessment menggunakan:



```text

assessment\_types

```



yang dapat dikonfigurasi.



\---



\### Dampak



Tidak ada hardcode:



```text

UH1

UH2

UH3

PTS

PAS

```



di source code.



\---



\# REVISION 3



\## Guru Identity Unification



\### Sebelum



```text

auth.users

guru\_id

```



berbeda.



\---



\### Sesudah



```text

gurus.id

=

auth.users.id

```



\---



\### Dampak



RLS lebih sederhana.



Contoh:



```sql

guru\_id = auth.uid()

```



\---



\# REVISION 4



\## Kelas Bayangan Dihapus Total



\### Sebelum



```text

kelas\_real

kelas\_bayangan

mengajar\_bayangan

```



\---



\### Sesudah



Satu tabel:



```text

kelas

```



dan:



```text

pembagian\_mengajar

```



\---



\### ENUM



```text

REAL

DAPO

```



\---



\# REVISION 5



\## Alumni Hybrid Architecture



\### Sebelum



Seluruh data alumni berada di tabel relasional.



\---



\### Sesudah



Menggunakan:



```text

alumni

\+

alumni\_snapshots(JSONB)

```



\---



\### Tujuan



```text

Query cepat

Storage hemat

Riwayat lengkap

```



\---



\# REVISION 6



\## Snapshot First Strategy



\### Sebelum



Archive menggunakan record per record.



\---



\### Sesudah



Arsitektur utama:



```text

Snapshot

↓

Archive

↓

Read Only

```



\---



\### Tabel Utama



```text

academic\_snapshots

```



\---



\### Status



```text

archive\_records

```



menjadi:



```text

OPTIONAL

```



\---



\# REVISION 7



\## Promotion Engine



Tambahkan modul baru:



```text

Promotion Engine

```



\---



\### Fitur



```text

Validation

Batch Processing

Rollback

Monitoring

```



\---



\### Tabel Baru



```text

promotion\_jobs

promotion\_details

```



\---



\# REVISION 8



\## Graduation Engine



Tambahkan modul baru.



\---



\### Fitur



```text

Graduation

Alumni Conversion

Snapshot

Rollback

```



\---



\### Tabel Baru



```text

graduation\_jobs

graduation\_details

```



\---



\# REVISION 9



\## Sync Engine Formalization



\### Sebelum



Dexie hanya cache.



\---



\### Sesudah



Dexie menjadi:



```text

Operational Offline Database

```



\---



\### Tambahkan



```text

sync\_queue

conflict\_queue

device\_health

sync\_logs

```



\---



\# REVISION 10



\## Conflict Resolution Center



Tambahkan modul baru.



\---



\### Fitur



```text

Conflict Detection

Conflict Review

Conflict Resolution

Conflict Analytics

```



\---



\### Role



```text

ADMIN

KURIKULUM

```



\---



\# REVISION 11



\## Monitoring Center



Tambahkan modul:



```text

Monitoring Dashboard

```



\---



\### Monitoring



```text

Sync Health

Database Health

Device Health

Alert Center

```



\---



\# REVISION 12



\## Archive Engine



Tambahkan modul baru.



\---



\### Fungsi



```text

Snapshot

Archive

Restore

Read Only

```



\---



\### Mode



```text

Snapshot Only (Default)

Physical Archive (Future)

```



\---



\# REVISION 13



\## Rapor Versioning



Tambahkan:



```text

version

```



pada snapshot rapor.



\---



\### Mendukung



```text

Reopen Rapor

Re-Finalize

History Tracking

```



\---



\# REVISION 14



\## Device Management



Tambahkan:



```text

trusted\_devices

```



\---



\### Tujuan



```text

Offline Session

Device Monitoring

Security Tracking

```



\---



\# REVISION 15



\## Data Retention Policy



Tambahkan kebijakan resmi.



\---



\### Audit Logs



```text

10 Tahun

```



\---



\### Alumni



```text

Permanen

```



\---



\### Snapshot



```text

Permanen

```



\---



\### Sync Logs



```text

1 Tahun

```



\---



\# REVISION 16



\## New Go Live Requirements



Tambahkan syarat baru.



\---



\### Wajib Lulus



```text

Promotion Engine



Graduation Engine



Sync Queue



Conflict Center



Archive Engine



Monitoring Dashboard

```



\---



\# REVISION 17



\## New Production Architecture



Final Architecture:



AUTH

↓

RBAC

↓

ACADEMIC TERM

↓

MASTER DATA

↓

PEMBAGIAN MENGAJAR

↓

ASSESSMENT

↓

KEHADIRAN

↓

RAPOR

↓

PROMOTION

↓

GRADUATION

↓

ARCHIVE

↓

ALUMNI



Parallel:



DEXIE

↓

SYNC ENGINE

↓

CONFLICT CENTER

↓

SUPABASE



Monitoring:



AUDIT

↓

MONITORING CENTER



```

```

# REVISION 18

## Exam Rooming & Invigilation Engine (Modul Asesmen)

### Sebelum
Modul kepengawasan dan pembagian ruang ujian diatur secara terpisah, menggunakan skema data semi-terstruktur JSONB pada satu tabel tunggal `kepangawasan` dan `kepangawasan_kartu_guru` serta penyimpanan draft plaintext pada `localStorage` browser yang tidak aman dari serangan pencurian data XSS.

---

### Sesudah
Modul Asesmen dinormalisasi penuh dan diselaraskan secara penuh ke dalam arsitektur utama SIKAD v4.0 dengan ketentuan spesifikasi sebagai berikut:

#### 1. Skema Database Relasional (Supabase)
Tabel-tabel relasional menggantikan database NoSQL lama:
- **`asesmen_ruangs`**:
  - `id` (VARCHAR(50), Primary Key) -> UUID string.
  - `nama_ruang` (VARCHAR(100), NOT NULL) -> Nama ruang ujian (contoh: "Ruang 01").
  - `kapasitas` (INTEGER, NOT NULL) -> Kapasitas kursi peserta.
  - `semester_id` (VARCHAR(50), NOT NULL, FK ke `semesters.id`).
- **`asesmen_pesertas`**:
  - `id` (VARCHAR(50), Primary Key) -> UUID string.
  - `siswa_id` (VARCHAR(50), NOT NULL, FK ke `siswas.id`).
  - `ruang_id` (VARCHAR(50), NOT NULL, FK ke `asesmen_ruangs.id`).
  - `no_peserta` (VARCHAR(50), UNIQUE, NOT NULL).
  - `nomor_meja` (INTEGER, NOT NULL).
  - `semester_id` (VARCHAR(50), NOT NULL, FK ke `semesters.id`).
  - *Constraints*: `uq_siswa_asesmen_semester` komposit unik `(siswa_id, semester_id)` menjamin 1 siswa hanya terdaftar di 1 ruang dalam 1 semester.
- **`asesmen_pengawases`**:
  - `id` (VARCHAR(50), Primary Key) -> UUID string.
  - `guru_id` (VARCHAR(50), NOT NULL, FK ke `gurus.id`).
  - `ruang_id` (VARCHAR(50), NOT NULL, FK ke `asesmen_ruangs.id`).
  - `tanggal` (DATE, NOT NULL).
  - `sesi` (VARCHAR(50), NOT NULL).
  - `semester_id` (VARCHAR(50), NOT NULL, FK ke `semesters.id`).
  - *Constraints*: `uq_guru_ruang_tanggal_sesi` komposit unik `(guru_id, tanggal, sesi)` mencegah guru ditugaskan mengawasi ganda di slot waktu yang sama.

#### 2. IndexedDB & Volatile Key Security
- **Volatile Zustand Key**: Kunci enkripsi (`encryptionKey`) disimpan hanya di memori volatile Zustand (`useAuthStore`) dan dihapus otomatis saat browser ditutup/reload.
- **IndexedDB Encryption**: Data transaksional PII (Personally Identifiable Information) disimpan terenkripsi AES-GCM 256-bit di `sikad_offline_db` (store: `offline_sync_queue`, `cached_asesmen_pengawases`).
- **localStorage**: Hanya diperbolehkan menyimpan konfigurasi UI non-sensitif (`asesmenActiveTab`, filter, draf level settings).

#### 3. Offline Sync Engine & Transition Lock
- **Offline Queue**: Operasi offline masuk ke `offline_sync_queue` di IndexedDB dan dikirim ke Supabase via SDK Client (`.upsert()`) saat online menggunakan retry *Exponential Backoff & Jitter*.
- **Database Lock**: Trigger PostgreSQL `check_assessment_lock_trigger` membatalkan kueri manipulasi nilai jika periode asesmen dikunci (`is_locked = true`), melempar SQLSTATE `45000` dengan pesan "Data Asesmen Terkunci".

#### 4. Gherkin Acceptance Criteria
- **Alokasi Massal**:
  ```gherkin
  Skenario: Operator melakukan alokasi ruang ujian massal secara otomatis
    Dengan (Given) Operator login dengan hak akses Operator Kurikulum
    Dan (And) Data siswa aktif kelas 10 sebanyak 120 siswa telah terdaftar
    Dan (And) Tersedia 4 ruang kelas dengan kapasitas masing-masing ruang adalah 30 kursi
    Ketika (When) Operator mengklik "Generate Ruang Massal" di UI
    Maka (Then) Sistem membagi 120 siswa tersebut secara merata ke dalam 4 ruang kelas
    Dan (And) Sistem menyimpan data pembagian ke tabel "asesmen_pesertas" Supabase
  ```
- **Penjadwalan Offline**:
  ```gherkin
  Skenario: Operator menyusun ketersediaan pengawas guru saat kondisi jaringan offline
    Dengan (Given) Operator di halaman Matriks dengan kondisi jaringan Offline
    Dan (And) Zustand memuat volatile "encryptionKey" di memori aplikasi
    Ketika (When) Operator mencentang ketersediaan Guru "Budi" pada sesi 1
    Maka (Then) Antrean offline sync terenkripsi AES-GCM ditulis ke IndexedDB
    Dan (And) Status visual pada matriks menunjukkan indikasi pending (oranye)
    Ketika (When) Koneksi internet kembali pulih (Online)
    Maka (Then) Sync engine otomatis mengirim batch upsert ke tabel "asesmen_pengawases"
    Dan (And) Status visual berubah menjadi sukses (biru)
  ```
- **Assessment Lock**:
  ```gherkin
  Skenario: Sistem menolak perubahan nilai jika status asesmen telah terkunci
    Dengan (Given) Database memiliki data asesmen dengan status "is_locked = true"
    Ketika (When) Guru melakukan UPDATE nilai siswa melalui pemanggilan API
    Maka (Then) Database trigger membatalkan transaksi & melempar error SQLSTATE "45000"
  ```

#### 5. Task Breakdown & Story Points (24 SP)
- **DB-01**: Migrasi database relasional `asesmen_ruangs`, `asesmen_pesertas`, `asesmen_pengawases` (3 SP)
- **DB-02**: Trigger `check_assessment_lock_trigger` PostgreSQL (2 SP)
- **FE-01**: Helper `LocalEncryptor` (AES-GCM PBKDF2 + Zustand volatile key) (5 SP)
- **FE-02**: Offline Sync Engine (IndexedDB Queue + Backoff) (8 SP)
- **FE-03**: React modular components (`AsesmenRoomCard`, `AsesmenLevelPanel`) (3 SP)
- **BE-01**: Optimasi API Kueri join relasional Supabase client (3 SP)

#### 6. React Modular Project Structure
Logika dipetakan ke folder `src/modules/assessment/`:
- `pages/` (JadwalUjianPage, JadwalMengawasiPage, PembagianRuangPage, KartuPengawasPage, PembagianRuangSiswaPage)
- `components/` (AsesmenRoomCard, AsesmenLevelPanel, AsesmenToggle)
- `services/` (assessmentService.ts)
- `store/` (useAsesmenStore.ts, useOfflineSyncStore.ts)
- `types/` (index.ts)





---

\# REVISION 19

## Academic Terms Domain Documentation

### Deskripsi

Tabel `academic_terms` telah didokumentasikan sebagai **Core Domain** utama dalam sistem SIKAD v4.0.

### Tabel: academic_terms

```text
academic_terms
├── id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
├── tahun_ajaran    VARCHAR(9) NOT NULL -- Format: "2024/2025"
├── semester        semester_type NOT NULL -- 'GANJIL' | 'GENAP'
├── status          VARCHAR(20) NOT NULL DEFAULT 'AKTIF'
├── tanggal_mulai   DATE
├── tanggal_selesai DATE
├── created_at      TIMESTAMPTZ DEFAULT now()
└── updated_at      TIMESTAMPTZ DEFAULT now()
```

### Relasi

```text
academic_terms (1) ──< (N) assessments
academic_terms (1) ──< (N)kehadirans
academic_terms (1) ──< (N) rapor_nilais
academic_terms (1) ──< (N) academic_snapshots
academic_terms (1) ──< (N) promotion_jobs
academic_terms (1) ──< (N) graduation_jobs
```

---

\# REVISION 20

## Mata Pelajaran (Mapel) Domain Documentation

### Deskripsi

Tabel `mata_pelajarans` (mapels) mendefinisikan daftar mata pelajaran yang diajarkan di sekolah.

### Tabel: mata_pelajarans

```text
mata_pelajarans
├── id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
├── nama            VARCHAR(100) NOT NULL
├── kode            VARCHAR(20) UNIQUE NOT NULL
├── singkatan       VARCHAR(10)
├── kelompok        VARCHAR(50) -- 'WAJIB', 'PILIHAN', 'MUATAN LOKAL'
├── jenjang         VARCHAR(20) -- 'SD', 'SMP', 'SMA', 'SMK'
├── semester_bobot  INTEGER DEFAULT 2
├── created_at      TIMESTAMPTZ DEFAULT now()
└── updated_at      TIMESTAMPTZ DEFAULT now()
```

### Relasi

```text
mata_pelajarans (1) ──< (N) pembagian_mengajars
mata_pelajarans (1) ──< (N) assessment_types
```

### Catatan Implementasi

- Kode mapel unik untuk setiap jenjang
- Kelompok mapel menentukan kurikulum yang digunakan
- Mapel dapat memiliki bobot semester yang berbeda

---

