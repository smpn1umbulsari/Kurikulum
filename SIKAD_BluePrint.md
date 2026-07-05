# SIKAD v4.0 — BLUEPRINT UTAMA

> **Versi:** 4.0 | **Status:** MASTER DOCUMENT | **Klasifikasi:** Konfidensial
> **Terakhir Diperbarui:** Juni 2026 | **Disusun oleh:** SIKAD Agent (AETHER-Powered)

---

# ═══════════════════════════════════════════════════════════════════════
# BAGIAN 0: AI WORKFLOW — AETHER INTEGRATION
# ═══════════════════════════════════════════════════════════════════════

## AI Engineering Workspace Protocol (AETHER v1.1.0)

Platform AETHER adalah otak pengkoordinasian multi-agent AI yang telah ditingkatkan ke versi **AETHER v1.1.0 (Agent Compliance Enforcement)** pada proyek SIKAD v4.0. Dokumen ini mendefinisikan sistem pengawasan kepatuhan terprogram (compliance checking), onboarding, verifikasi peran, pertahanan skema RLS database, validasi kompilasi TypeScript, riset UI/UX terintegrasi, dan pengecekan usulan keputusan.

### 0.1 Arsitektur AETHER v1.1.0

```
+=====================================================================+
|                      IDE / HUMAN DEVELOPER                          |
+=====================================================================+
                                | (Read/Write)
                                v
+=====================================================================+
|                         AETHER PLATFORM                             |
|                                                                     |
|  ┌─── KERNEL LAYER ──────────────────────────────────────────────┐  |
|  │  [Project Manager]  [Event Bus]  [Security Engine]            │  |
|  └───────────────────────────────────────────────────────────────┘  |
|                         ↕ Event Pub/Sub                             |
|  ┌─── CONTEXT & KNOWLEDGE LAYER ─────────────────────────────────┐  |
|  │  [Document Engine] [Context Engine] [Knowledge Graph]          │  |
|  │  [Version Manager]                                           │  |
|  └───────────────────────────────────────────────────────────────┘  |
|                         ↕ Event Pub/Sub                             |
|  ┌─── WORKFLOW & TASK LAYER ─────────────────────────────────────┐  |
|  │  [Task Engine] [Workflow Engine] [Rule Engine]                │  |
|  │  [Decision Engine]                                           │  |
|  └───────────────────────────────────────────────────────────────┘  |
|                         ↕ Event Pub/Sub                             |
|  ┌─── AGENT & PROMPT LAYER ──────────────────────────────────────┐  |
|  │  [Agent Manager] [Prompt Engine] [Quality Engine]              │  |
|  │  [UiResearchEngine]                                           │  |
|  └───────────────────────────────────────────────────────────────┘  |
|                         ↕ Event Pub/Sub                             |
|  ┌─── EXTENSION & TELEMETRY LAYER ───────────────────────────────┐  |
|  │  [Plugin Engine] [Monitoring Engine] [Release Manager]          │  |
|  └───────────────────────────────────────────────────────────────┘  |
+=====================================================================+
                                ^
                                | (API Gateway / Adapters)
                                v
+=====================================================================+
|         AI AGENTS (Claude Code, Gemini, Cursor, Cline, Windsurf)     |
+=====================================================================+
```

### 0.2 Protokol Folder Lock (Wajib Dipatuhi Semua Agent AI)

```json
// .gitlocks.json — Wajib di-commit sebelum modifikasi folder
{
  "locks": [
    {
      "folder": "src/modules/assessment/",
      "locked_by": "claude-code",
      "locked_at": "2026-06-28T10:00:00Z",
      "status": "LOCKED"
    }
  ]
}
```

**Aturan Kunci:**
1. Setiap AI Agent WAJIB mendaftarkan folder yang akan dimodifikasi ke `.gitlocks.json`
2. SATU folder hanya boleh dikunci oleh SATU agent dalam satu waktu
3. Agent lain HARUS menunggu hingga kunci dilepaskan
4. Pelanggaran kunci = DO NOT COMMIT

### 0.3 Handoff Format (Wajib pada Setiap Commit/Status)

```markdown
## ✅ Completed Tasks
- [ ] Fitur yang selesai

## 📝 Changed Files
- `src/modules/assessment/services/assessmentService.ts`

## 🔗 Dependencies
- Modul ini bergantung pada `pembagian_mengajar` table

## ⚠️ Risks
- Regresi potensial pada modul rapor
```

### 0.4 AI Agent Roles & File Modification Rules
Untuk menjaga konsistensi pengerjaan, hak modifikasi berkas dibatasi berdasarkan peran teknis aktif AI Agent sebagai berikut:

| Peran Aktif | Cakupan Ekstensi File | Area Folder Utama |
|-------------|-----------------------|-------------------|
| **Software Architect** | Semua tipe file | `docs/`, `00-Platform/`, `src/core/` |
| **Database Architect** | `.sql` | `supabase/migrations/` |
| **Security Architect** | `.sql`, `.js`, `.ts` | `supabase/migrations/`, `src/core/` |
| **Backend Lead** | `.ts` | `src/modules/*/services/`, `src/database/` |
| **Frontend Lead** | `.tsx`, `.ts`, `.css` | `src/modules/*/pages/`, `src/modules/*/components/` |
| **QA Architect** | `.test.ts`, `.spec.ts`, `.js`| `src/tests/`, `tests/` |

### 0.5 Quality Gate Workflow
Sistem Aether menyaring kode sebelum diizinkan masuk ke repositori melalui gerbang kualitas berjenjang:
1. **TypeScript strict check** (`npx tsc --noEmit`) — Gagal kompilasi memicu Auto-Remediation Loop agar agent memperbaiki kode tipe-datanya sendiri secara mandiri.
2. **ESLint / Prettier formatting** — Merapikan penulisan kode atau memicu auto-fix secara instan.
3. **Vitest Unit & Integration Test runner** — Seluruh suite tes wajib lolos (0 failed).
4. **SQL Migration RLS Policy Scan** — Menjamin tidak ada celah keamanan pada migrasi skema database baru.

### 0.6 Onboarding & Role Verification
Setiap Agen AI yang masuk ke proyek SIKAD v4.0 diwajibkan melewati pengecekan:
* **Engineering Handbook Read:** Wajib membaca `docs/engineering-handbook/00-Engineering-Handbook.md`, `06-Definition-of-Ready.md`, dan `07-Definition-of-Done.md` sebelum diizinkan menyimpan hasil modifikasi file.
* **Role Check Validation:** Sistem memvalidasi peran aktif (misal `Frontend Lead`) terhadap jenis file yang diubah (misal `.tsx`), jika tidak cocok maka penyimpanan akan diblokir dengan pesan pelanggaran kepatuhan.

### 0.7 SQL RLS Policy Enforcement Scanner
Pembuatan skema tabel Supabase baru pada folder migrasi wajib menyertakan kebijakan keamanan RLS:
* Mendeteksi kata kunci pembuatan tabel `CREATE TABLE <nama_tabel>`.
* Memverifikasi keberadaan perintah pengaktifan RLS: `ALTER TABLE <nama_tabel> ENABLE ROW LEVEL SECURITY;`.
* Memverifikasi keberadaan minimal satu baris kebijakan: `CREATE POLICY <nama_policy> ON <nama_tabel> ...`.
* Pelanggaran terhadap salah satu poin di atas akan menggagalkan Quality Gate dan memicu kegagalan build/commit.

### 0.8 UI/UX Reference Engine & Decision Critic
* **Aether UI/UX Research Engine:** Menyediakan resep kode Spenturi siap pakai untuk meminimalisasi inkonsistensi antarmuka (dapat diakses via perintah terminal `aether ui-research [query]`).
* **Decision Evaluation:** Menyediakan fungsi kritik alternatif melalui perintah `aether evaluate-proposal` untuk memberikan masukan secara otomatis terhadap parameter usulan yang kurang optimal.

### 0.9 Core Engines Reference (AETHER v1.1.0)

AETHER v1.1.0 terdiri dari 25+ core engines yang bekerja sama:

#### Kernel Layer
| Engine | File | Fungsi |
|--------|------|--------|
| `ProjectManager` | `src/core/ProjectManager.js` | Manajemen workspace, config, dan metadata proyek |
| `EventBus` | `src/core/EventBus.js` | Pub/Sub event system untuk komunikasi antar engine |
| `SecurityEngine` | `src/core/SecurityEngine.js` | Enkripsi kredensial, AES-256-GCM |

#### Context & Knowledge Layer
| Engine | File | Fungsi |
|--------|------|--------|
| `ContextEngine` | `src/core/ContextEngine.js` | Sinkronisasi konteks workspace, parsing SQL schema |
| `KnowledgeGraph` | `src/core/KnowledgeGraph.js` | Dependency graph analysis, impact analysis |
| `VersionManager` | `src/core/VersionManager.js` | Git operations, commit, branch, checkout |
| `SemanticIndexer` | `src/core/SemanticIndexer.js` | Local vector index untuk semantic search |

#### Workflow & Task Layer
| Engine | File | Fungsi |
|--------|------|--------|
| `TaskEngine` | `src/core/TaskEngine.js` | Parse & manage task checklist files |
| `WorkflowEngine` | `src/core/WorkflowEngine.js` | Multi-task workflow orchestration, parallel execution |
| `RuleEngine` | `src/core/RuleEngine.js` | Business rule validation |
| `DecisionEngine` | `src/core/DecisionEngine.js` | Proposal evaluation & suggestion engine |

#### Agent & Prompt Layer
| Engine | File | Fungsi |
|--------|------|--------|
| `AgentManager` | `src/core/AgentManager.js` | Multi-agent lifecycle management |
| `PromptEngine` | `src/core/PromptEngine.js` | System prompt assembly & scrubbing |
| `QualityEngine` | `src/core/QualityEngine.js` | Quality gate enforcement (lint, test, compile) |
| `UiResearchEngine` | `src/core/UiResearchEngine.js` | Spenturi UI/UX recipe finder |
| `AgentProtocol` | `src/core/AgentProtocol.js` | Agent communication protocol |

#### Extension & Telemetry Layer
| Engine | File | Fungsi |
|--------|------|--------|
| `PluginEngine` | `src/core/PluginEngine.js` | Plugin system untuk extensibility |
| `MonitoringEngine` | `src/core/MonitoringEngine.js` | Real-time monitoring dashboard |
| `ReleaseManager` | `src/core/ReleaseManager.js` | Database migration & rollback |
| `AuditLedger` | `src/core/AuditLedger.js` | Audit trail untuk semua operations |
| `RBACEngine` | `src/core/RBACEngine.js` | Role-based access control |

#### Supporting Engines
| Engine | File | Fungsi |
|--------|------|--------|
| `FileWatcher` | `src/core/FileWatcher.js` | Reactive file change detection |
| `PRDComplianceChecker` | `src/core/PRDComplianceChecker.js` | PRD gap analysis & compliance audit |
| `LockManager` | `src/core/LockManager.js` | File/folder lock management |
| `TeamSyncServer` | `src/core/TeamSyncServer.js` | Multi-agent team synchronization |

### 0.10 PRD Compliance Audit

AETHER menyediakan automated PRD compliance checking:

```bash
# Run full PRD audit
aether audit-prd

# Export as markdown
aether audit-prd -f md -o prd-audit-report.md

# Auto-fix minor gaps
aether audit-prd --fix
```

**Audit Coverage:**
- Feature completeness check
- Schema alignment verification
- UI/UX spec adherence
- Test coverage validation
- RLS policy enforcement

---

---

# ═══════════════════════════════════════════════════════════════════════
# BAGIAN 1: VISI, MISI & KONTEKS PROYEK
# ═══════════════════════════════════════════════════════════════════════

## 1.1 Visi SIKAD v4.0

Menjadi standar baru sistem administrasi akademik yang handal, transparan, dan mampu beroperasi dalam kondisi internet terbatas (*Offline-First*).

## 1.2 Misi

- Menghilangkan redundansi data antara kebutuhan sekolah real dan pelaporan virtual (Dapodik)
- Memberikan antarmuka yang intuitif bagi tenaga pendidik tanpa mengorbankan integritas data
- Menyediakan data historis akademik (alumni) yang dapat diakses permanen dalam hitungan milidetik

## 1.3 Story

SIKAD lahir dari keresahan sekolah yang sering kehilangan data saat internet mati dan kesulitan mengelola beban kerja guru yang kompleks. SIKAD v4.0 hadir dengan teknologi *Sync Engine* yang memungkinkan guru bekerja kapan saja, di mana saja.

## 1.4 Konteks Proyek AETHER

Platform AETHER lahir dari kebutuhan nyata proyek **SIKAD v4.0** — Sistem Informasi Kurikulum dan Administrasi Akademic berskala enterprise yang dibangun menggunakan arsitektur Offline-First, Clean Architecture, dan Dual-Layer Kelas (Real/Dapo).

---

# ═══════════════════════════════════════════════════════════════════════
# BAGIAN 2: ARSITEKTUR SISTEM
# ═══════════════════════════════════════════════════════════════════════

## 2.1 Arsitektur Clean Architecture

```
UI (Component/Page)
        ↓
Custom Hooks
        ↓
Service Layer        ← Business Logic, Validasi Zod
        ↓
Repository Layer     ← CRUD Supabase / Dexie.js
        ↓
Supabase (Cloud)     ← Source of Truth
        ↕
Dexie.js (Local)     ← Offline Cache
```

## 2.2 Dual-Layer Data Model

```text
┌─────────────────────────────────────────────────────────────┐
│                    DATA REAL (OPERASIONAL)                 │
│  • kelas REAL                                                │
│  • pembagian_mengajar REAL                                   │
│  • JP Real per Mapel                                         │
│  • Untuk: Wali Kelas, Guru, Kurikulum Intern                │
└─────────────────────────────────────────────────────────────┘
                              ↕ ISOLASI
┌─────────────────────────────────────────────────────────────┐
│                  DATA DAPODIK (PELAPORAN)                  │
│  • kelas DAPO                                               │
│  • pembagian_mengajar DAPO                                   │
│  • JP Dapodik per Mapel                                     │
│  • Untuk: Operator Dapodik, Pelaporan Resmi                 │
└─────────────────────────────────────────────────────────────┘
```

### 2.2.1 Aturan Bisnis & Tampilan Antarmuka Dual-Layer

Untuk menjaga konsistensi data operasional nyata (REAL) dan pelaporan virtual (DAPO), antarmuka pengguna menerapkan aturan sebagai berikut:
1. **Pemisahan Tampilan Togel (Segregated Views):**
   * Halaman Kelas dan Pembagian Mengajar wajib menyediakan togel pemilih jenis kelas (`REAL` atau `DAPO`).
   * Hanya satu jenis kelas yang ditampilkan di layar dalam satu waktu. Penggabungan data `REAL` dan `DAPO` dalam satu tabel grid tunggal dilarang keras untuk mencegah kerancuan operasional.
2. **Saran Penamaan Kelas Otomatis (Auto-Suggest Naming):**
   * Input teks manual bebas untuk nama kelas dikunci/di-nonaktifkan.
   * Nama kelas dihasilkan secara otomatis oleh sistem dengan menggabungkan tingkat angka Romawi (contoh: `VII`, `VIII`, `IX`) dengan huruf kelas (contoh: `A`, `B`, `C`) secara berurutan (*ascending*) berdasarkan kelas yang sudah terdaftar dalam tahun ajaran berjalan.
   * Apabila jenis kelas adalah `DAPO`, sistem wajib menyematkan sufiks ` DAPO` di akhir nama kelas (contoh: `VII A DAPO`, `VII B DAPO`).
3. **Penyelarasan Urutan Baris Grid (Grid Row Sorting):**
   * Baris daftar Mata Pelajaran pada grid tabel pembagian mengajar wajib diurutkan secara berurutan (*ascending*) berdasarkan nilai indeks kolom `mapping`. Indeks ini menjadi dasar acuan tunggal urutan tampil mapel kurikulum.
   * Daftar nama Guru pada selektor dropdown maupun baris tabel wajib diurutkan secara alfabetis (A-Z).
4. **Validasi Aksi Destruktif (SweetAlert2 Dialog):**
   * Seluruh permintaan penghapusan data kelas dan alokasi mengajar wajib divalidasi terlebih dahulu melalui popup konfirmasi **SweetAlert2** sebelum data dihapus dari database Dexie/Supabase.

## 2.3 Tech Stack

| Layer | Teknologi | Version |
|-------|-----------|---------|
| **Frontend** | React + TypeScript | React 18+ |
| **Desktop App** | Tauri v2 | v2.x |
| **State Management** | Zustand + TanStack Query | Latest |
| **Local Database** | Dexie.js (IndexedDB) | v4.x |
| **Cloud Database** | PostgreSQL (Supabase) | v15+ |
| **Authentication** | Supabase Auth | - |
| **Sync Engine** | Custom Queue + Exponential Backoff | - |
| **Encryption** | AES-256-GCM (Web Crypto API) | - |

---

# ═══════════════════════════════════════════════════════════════════════
# BAGIAN 3: STRUKTUR DATABASE
# ═══════════════════════════════════════════════════════════════════════

## 3.1 Tabel Master

### gurus
| Field | Type | Keterangan |
|-------|------|------------|
| id | UUID | PK, FK auth.users |
| nip | VARCHAR(30) | NIP/NIPPPK |
| nama | VARCHAR(150) | Nama lengkap |
| status_aktif | BOOLEAN | Default TRUE |
| created_at | TIMESTAMPTZ | - |
| updated_at | TIMESTAMPTZ | - |
| deleted_at | TIMESTAMPTZ | Soft delete |

### siswas
| Field | Type | Keterangan |
|-------|------|------------|
| id | UUID | PK |
| nisn | VARCHAR(20) | UNIQUE |
| nipd | VARCHAR(20) | UNIQUE |
| nama | VARCHAR(150) | - |
| jk | VARCHAR(1) | L/P |
| status_aktif | BOOLEAN | Default TRUE |

### mata_pelajarans
| Field | Type | Keterangan |
|-------|------|------------|
| id | UUID | PK |
| kode | VARCHAR(20) | UNIQUE |
| nama | VARCHAR(150) | - |
| kelompok_mapel | VARCHAR(50) | A/B/C/D/E |

### academic_terms
| Field | Type | Keterangan |
|-------|------|------------|
| id | UUID | PK |
| tahun_ajaran | VARCHAR(20) | "2025/2026" |
| semester | semester_type | GANJIL/GENAP |
| status | BOOLEAN | ACTIVE |

## 3.2 Tabel Transaksi Akademik

### kelas
| Field | Type | Keterangan |
|-------|------|------------|
| id | UUID | PK |
| academic_term_id | UUID | FK |
| nama_kelas | VARCHAR(50) | "8A" |
| tingkat | SMALLINT | 7, 8, 9 |
| jenis | kelas_jenis | REAL/DAPO |
| wali_kelas_id | UUID | FK gurus |

### pembagian_mengajar
| Field | Type | Keterangan |
|-------|------|------------|
| id | UUID | PK |
| academic_term_id | UUID | FK |
| guru_id | UUID | FK |
| mapel_id | UUID | FK |
| kelas_id | UUID | FK |
| jenis | kelas_jenis | REAL/DAPO |
| jp | NUMERIC(5,2) | Jam Pelajaran (JP) per minggu |

### tugas_tambahan_types
| Field | Type | Keterangan |
|-------|------|------------|
| id | UUID | PK |
| kode | VARCHAR(50) | UNIQUE |
| nama | VARCHAR(150) | - |
| kategori | VARCHAR(100) | UTAMA/EKUIVALEN/SEKOLAH |
| default_jp | NUMERIC(5,2) | Beban JP bawaan |
| aktif | BOOLEAN | Default TRUE |

### tugas_tambahan_assignments
| Field | Type | Keterangan |
|-------|------|------------|
| id | UUID | PK |
| academic_term_id | UUID | FK |
| guru_id | UUID | FK |
| tugas_tambahan_type_id | UUID | FK |
| nama_penugasan | VARCHAR(200) | Deskripsi penugasan |
| jp_override | NUMERIC(5,2) | JP kustom jika berbeda dari default |
| status | VARCHAR(20) | AKTIF/NON_AKTIF |

### assessments
| Field | Type | Keterangan |
|-------|------|------------|
| id | UUID | PK |
| assessment_type_id | UUID | FK |
| pembagian_mengajar_id | UUID | FK |
| judul | VARCHAR(200) | - |
| tanggal | DATE | - |
| bobot | NUMERIC(5,2) | - |
| stage | assessment_stage | DRAFT/PUBLISH/FINAL |

### assessment_details
| Field | Type | Keterangan |
|-------|------|------------|
| id | UUID | PK |
| assessment_id | UUID | FK |
| siswa_id | UUID | FK |
| nilai | NUMERIC(5,2) | - |
| catatan | TEXT | - |

### kehadiran
| Field | Type | Keterangan |
|-------|------|------------|
| id | UUID | PK |
| academic_term_id | UUID | FK |
| siswa_id | UUID | FK |
| tanggal | DATE | - |
| status | VARCHAR(20) | HADIR/IZIN/SAKIT/ALPA |

### exam_rooms
| Field | Type | Keterangan |
|-------|------|------------|
| id | UUID | PK |
| academic_term_id | UUID | FK |
| nama_ruang | VARCHAR(50) | Nama ruang ujian |
| kapasitas | INTEGER | Kapasitas maksimal |
| lokasi | VARCHAR(100) | Lokasi gedung/lantai |
| is_active | BOOLEAN | Status aktif |

### exam_seats
| Field | Type | Keterangan |
|-------|------|------------|
| id | UUID | PK |
| room_id | UUID | FK exam_rooms |
| siswa_id | UUID | FK siswas |
| exam_id | UUID | FK assessments |
| nomor_kursi | INTEGER | Nomor kursi |

### exam_supervisors
| Field | Type | Keterangan |
|-------|------|------------|
| id | UUID | PK |
| academic_term_id | UUID | FK |
| guru_id | UUID | FK gurus |
| room_id | UUID | FK exam_rooms |
| exam_id | UUID | FK assessments |
| slot_waktu | VARCHAR(50) | SENIN-SESI1, dst. |
| shift | VARCHAR(20) | SESI1/SESI2/SESI3 |

## 3.3 ENUM Definitions

```sql
-- semester_type
GANJIL, GENAP

-- kelas_jenis
REAL, DAPO

-- assessment_stage
DRAFT, PUBLISH, FINAL

-- sync_status
PENDING, SYNCING, SYNCED, FAILED, CONFLICT

-- student_lifecycle_status
AKTIF, PINDAH, LULUS, DROPOUT, ARSIP
```

## 3.4 RLS Policy Summary

| Tabel | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| gurus | authenticated | admin/kurikulum | admin/kurikulum | admin |
| siswas | authenticated | admin/kurikulum | admin/kurikulum | - |
| assessments | authenticated | guru(owner) | guru(owner) | guru(owner) |
| assessment_details | authenticated | guru(owner) | guru(owner) | guru(owner) |
| kehadiran | authenticated | guru(owner) | guru(owner) | guru(owner) |
| rapor_snapshots | ROLE-based | admin | - | - |
| exam_rooms | authenticated | kurikulum | kurikulum | kurikulum |
| exam_seats | authenticated | kurikulum | kurikulum | - |
| exam_supervisors | authenticated | kurikulum | kurikulum | - |

---

# ═══════════════════════════════════════════════════════════════════════
# BAGIAN 4: MODUL UTAMA
# ═══════════════════════════════════════════════════════════════════════

## 4.1 Modul Akademik

```
┌─────────────────────────────────────────────────────────────┐
│  ACADEMIC TERM ENGINE                                       │
│  • Buat/Ubah/Tutup Tahun Ajaran                             │
│  • Enforce: Hanya 1 term aktif                             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  KELAS ENGINE                                               │
│  • Dual-Layer: REAL + DAPO                                 │
│  • Wali Kelas Assignment                                   │
│  • Histori Kelas (riwayat_kelas)                           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  PEMBAGIAN MENGAJAR & TUGAS TAMBAHAN ENGINE                 │
│  • Matriks Mengajar: Penempatan Guru-Mapel-Kelas terisolasi │
│    nyata (REAL) vs virtual (DAPO), tabel grid, sorot guru.  │
│  • Matriks Tugas Tambahan: Kategorisasi TT Utama (TTU),     │
│    TT Ekuivalen (TTE), TT Sekolah (TTS) beserta auto-lock   │
│    Wali Kelas pada TTE 1 (2 JP) dan validasi eksklusivitas. │
│  • Konfig Master Tugas: Pendaftaran dan penghapusan jenis    │
│    tugas tambahan ekuivalen kustom serta proteksi default.  │
│  • Rekap Beban JP: Penjumlahan total JP, klasifikasi beban  │
│    kerja sertifikasi (Seimbang 24-40 JP), dan layout cetak. │
└─────────────────────────────────────────────────────────────┘
```

## 4.2 Modul Penilaian

```
┌─────────────────────────────────────────────────────────────┐
│  ASSESSMENT ENGINE                                          │
│  • Assessment Types (Formatif, Sumatif, Proyek, Praktik)   │
│  • Batch Entry Nilai                                        │
│  • Optimistic Updates (< 100ms response)                   │
│  • Version Control (stage: DRAFT → PUBLISH → FINAL)       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  RAPOR ENGINE                                               │
│  • Generate Rapor PDF                                       │
│  • Catatan Wali Kelas                                       │
│  • Rapot Snapshot (Immutable after FINAL)                   │
└─────────────────────────────────────────────────────────────┘
```

## 4.3 Modul Kehadiran

```
┌─────────────────────────────────────────────────────────────┐
│  ATTENDANCE ENGINE                                          │
│  • Input Harian (HADIR/IZIN/SAKIT/ALPA)                   │
│  • Rekap Semester                                           │
│  • Persentase Kehadiran per Siswa                          │
└─────────────────────────────────────────────────────────────┘
```

## 4.4 Modul Workload

```
┌─────────────────────────────────────────────────────────────┐
│  PROMOTION ENGINE                                           │
│  • Kenaikan Kelas Massal                                    │
│  • Business Rules: KKM, Kehadiran, Catatan                 │
│  • Rollback Support                                         │
│  • Histori: promotion_jobs + promotion_details             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  GRADUATION ENGINE                                          │
│  • Kelulusan Massal                                         │
│  • Transform: Siswa → Alumni                               │
│  • Generate: alumni_snapshots                               │
│  • Histori: graduation_jobs + graduation_details          │
└─────────────────────────────────────────────────────────────┘
```

## 4.5 Modul Mutasi

```
┌─────────────────────────────────────────────────────────────┐
│  MUTATION ENGINE                                            │
│  • Mutasi Masuk (from external school)                     │
│  • Mutasi Keluar (to external school)                      │
│  • Update: riwayat_kelas                                   │
└─────────────────────────────────────────────────────────────┘
```

## 4.6 Modul Sync

```
┌─────────────────────────────────────────────────────────────┐
│  SYNC ENGINE                                                │
│  • Dexie.js ↔ Supabase bidirectional sync                  │
│  • Exponential Backoff (handle unstable network)            │
│  • Conflict Resolution: Last Write Wins / Manual Review    │
│  • Queue: sync_queue table                                 │
└─────────────────────────────────────────────────────────────┘
```

## 4.7 Modul Exam Management

```
┌─────────────────────────────────────────────────────────────┐
│  EXAM ROOM MANAGEMENT                                       │
│  • CRUD Ruang Ujian (nama, kapasitas, lokasi)              │
│  • Status Ruangan (aktif/non-aktif)                        │
│  • View: Denah ruangan dengan visual seating               │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  SEATING ALGORITHM                                          │
│  • Auto-generate nomor kursi berdasarkan jumlah siswa      │
│  • Alokasi siswa ke ruang ujian (capacity-aware)           │
│  • Seating pattern: zigzag/snake pattern untuk anti-jabar  │
│  • Seating optimization: minimize adjacent same-class       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  SUPERVISOR SCHEDULING                                      │
│  • Jadwal Pengawas per Ruang & Sesi                         │
│  • Slot waktu: SENIN-SESI1, SENIN-SESI2, dst.              │
│  • Shift: SESI1 (07:00-09:00), SESI2 (09:30-11:30), dll.   │
│  • Constraint: Tidak boleh 2 shift sekaligus               │
│  • Conflict detection & resolution                         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  EXAM PRINT & INVIGILATION                                  │
│  • Daftar hadir per ruangan (PDF export)                   │
│  • Denah duduk printable                                   │
│  • Label nomor kursi                                       │
│  • Absensi pengawas                                        │
└─────────────────────────────────────────────────────────────┘
```

**Database Tables:**
| Table | Fungsi |
|-------|--------|
| `exam_rooms` | Master data ruang ujian |
| `exam_seats` | Alokasi siswa ke nomor kursi |
| `exam_supervisors` | Jadwal pengawas per sesi |

## 4.8 Modul Archive

```
┌─────────────────────────────────────────────────────────────┐
│  ARCHIVE ENGINE                                             │
│  • Term Finalization Checklist                             │
│  • Academic Snapshots (SISWA, GURU, NILAI, dll)           │
│  • Archived Data: READ ONLY                                 │
└─────────────────────────────────────────────────────────────┘
```

---

# ═══════════════════════════════════════════════════════════════════════
# BAGIAN 5: ENGINEERING STANDARDS
# ═══════════════════════════════════════════════════════════════════════

## 5.1 TypeScript Rules

- **WAJIB:** `"strict": true` di tsconfig.json
- **LARANG:** Tipe `any` — gunakan `interface` atau `type` custom
- **FILE SIZE:**
  - Komponen UI: Maksimal 300 baris
  - Service: Maksimal 500 baris

## 5.2 Naming Conventions

| Entity | Convention | Example |
|--------|-----------|---------|
| File | kebab-case | `academic-term-service.ts` |
| Function | camelCase | `getActiveTerm()` |
| Interface | PascalCase | `IAcademicTerm` |
| Constant | UPPER_SNAKE | `MAX_RETRY_COUNT` |
| Table | snake_case | `academic_terms` |
| Column | snake_case | `academic_term_id` |

## 5.3 Quality Gates (CI/CD)

| Parameter | Threshold | Action on Fail |
|-----------|-----------|----------------|
| TypeScript Compilation | 0 Errors | BLOCK PR |
| ESLint | 0 Warnings | AUTO-FIX |
| Unit Test Coverage | ≥ 80% | BLOCK PR |
| Security Scan | 0 High Vuln | BLOCK DEPLOY |

## 5.4 Git Workflow

```
develop ←───── feature/xxx ←───── fix/xxx
  ↑              │                  │
  │              └──────────────────┘
  │                      (PR)
  └──────────────────────────────→ main (RELEASE)
```

## 5.5 Definition of Done (DoD)

- [ ] Kode通过了 TypeScript strict mode
- [ ] Unit test dengan coverage ≥ 80%
- [ ] Dokumentasi JSDoc lengkap
- [ ] Migrasi database ter-deploy
- [ ] RLS policy teruji
- [ ] UI通过了 smoke test
- [ ] Tidak ada `TODO` atau `FIXME` yang tertinggal

---

# ═══════════════════════════════════════════════════════════════════════
# BAGIAN 6: PROJECT GOVERNANCE
# ═══════════════════════════════════════════════════════════════════════

## 6.1 Organisasi Tim

```
Head of Project
        ↓
┌───────────┬───────────┬───────────┬───────────┐
│ Project   │ Product   │ Business  │ System    │
│ Manager   │ Owner     │ Analyst   │ Analyst   │
└───────────┴───────────┴───────────┴───────────┘
        ↓
┌───────────────────────────────────────────────────┐
│               Software Architect                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ Backend  │ │ Frontend │ │ Database  │        │
│  │ Lead     │ │ Lead     │ │ Architect │        │
│  └──────────┘ └──────────┘ └──────────┘        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ Security │ │ QA       │ │ AI Sol.   │        │
│  │ Architect│ │ Architect│ │ Architect │        │
│  └──────────┘ └──────────┘ └──────────┘        │
└───────────────────────────────────────────────────┘
```

## 6.2 Role Consolidation (Tim Kecil)

| Profil | Roles | Focus |
|--------|-------|-------|
| **Business & Product** | PO + BA + SysA + CS | Requirement, training, use case |
| **Core Architecture** | SwArch + DbArch + BE + DevOps | Database, backend, CI/CD |
| **Frontend & UI/UX** | FE Lead + UI/UX + Performance | Components, pages, optimization |
| **QA & Security** | QA + Tech Writer + Security | Testing, docs, vulnerability |

## 6.3 RACI Matrix Summary

| Tahapan | SwArch | DbArch | BE Lead | QA | DevOps |
|---------|--------|--------|---------|----|----|
| Design (TDD/ERD) | A | R | R | C | I |
| Development | C | C | R | I | I |
| Testing & QA | I | I | C | R | I |
| Deployment | I | I | I | I | R |
| Maintenance | C | C | C | I | R |

## 6.4 Decision Making

| Skala | Proses | Penanggung Jawab |
|-------|--------|------------------|
| **Kecil** (Detail implementasi) | PR Discussion | Developer |
| **Menengah** (Schema, Fitur baru) | ADR | Lead Architect |
| **Besar** (Teknologi baru) | RFC | Head of Project |

---

# ═══════════════════════════════════════════════════════════════════════
# BAGIAN 7: LIFECYCLE & WORKFLOW
# ═══════════════════════════════════════════════════════════════════════

## 7.1 Project Lifecycle (8 Tahapan)

```
Discovery → Analysis → Design → Development → Testing
    ↓         ↓          ↓          ↓            ↓
  [PM/PO]   [BA/SysA] [SA/DB]    [BE/FE]    [QA/Sec]
                                              ↓
                                     Deployment → Maintenance
                                           ↓           ↓
                                      [DevOps]    [Support]
```

## 7.2 Sprint Workflow

```
Sprint Planning (2 Minggu)
        ↓
Daily Standup (15 menit)
        ↓
Development (on branch feature/xxx)
        ↓
Pull Request → Code Review
        ↓
Sprint Review & Demo
        ↓
Retrospective
```

## 7.3 Data Lifecycle

```
AKTIF ────────────────→ PINDAH
  │                          │
  │                          ↓
  └──→ LULUS ───────────→ ARSIP
           │                   │
           ↓                   ↓
        ALUMNI ←─────────── READ ONLY
      (snapshots)
```

## 7.4 Promotion & Graduation Flow

```
┌─────────────────────────────────────────────────────────────┐
│  PROMOTION ENGINE                                           │
│  1. Create promotion_job (PENDING)                         │
│  2. For each siswa: check KKM, Kehadiran, Catatan          │
│  3. Update riwayat_kelas (NAIK_KELAS)                     │
│  4. Create kelas_tujuan                                    │
│  5. Mark promotion_job SUCCESS                            │
│  6. [FAIL] → ROLLBACK support                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  GRADUATION ENGINE                                          │
│  1. Create graduation_job (PENDING)                        │
│  2. For each siswa: check criteria                         │
│  3. Transform siswa → alumni                               │
│  4. Generate alumni_snapshots                              │
│  5. Archive akademik data                                  │
│  6. Lock data (READ ONLY)                                  │
└─────────────────────────────────────────────────────────────┘
```

---

# ═══════════════════════════════════════════════════════════════════════
# BAGIAN 8: MIGRATION PLAN (v3 → v4.0)
# ═══════════════════════════════════════════════════════════════════════

## 8.1 Phases

| Phase | Deskripsi | Durasi |
|-------|-----------|--------|
| M0 | Discovery & Audit | 2-3 hari |
| M1 | Database Preparation | 2 hari |
| M2 | Identity Migration (auth.users ↔ gurus) | 1 hari |
| M3 | Academic Term Migration | 1 hari |
| M4 | Kelas Consolidation (REAL + DAPO) | 2 hari |
| M5 | Pembagian Mengajar Consolidation | 2 hari |
| M6 | Student Migration | 1 hari |
| M7 | Assessment Migration (nilai flat → normalized) | 3-5 hari |
| M8 | Attendance Migration | 1 hari |
| M9 | Rapor Migration (to snapshots) | 2 hari |
| M10 | Tugas Tambahan Migration | 1 hari |
| M11 | Alumni Migration | 2 hari |
| M12 | Analytics Bootstrap | 1 hari |
| M13 | Verification | 2 hari |
| M14 | User Acceptance Testing | 3-5 hari |
| M15 | Production Cutover | 1 hari |

## 8.2 Success Criteria

```
✓ 100% Data Migrated
✓ 0 Orphan Record
✓ 100% RLS Active
✓ Dashboard < 2 sec
✓ Rapor < 5 sec
```

---

# ═══════════════════════════════════════════════════════════════════════
# BAGIAN 9: SECURITY & MONITORING
# ═══════════════════════════════════════════════════════════════════════

## 9.1 Security Measures

- [ ] AES-256-GCM encryption untuk kredensial lokal
- [ ] RLS aktif di SEMUA tabel
- [ ] Audit logs untuk semua mutasi data
- [ ] Soft delete dengan .deleted_at column
- [ ] No BYPASS KEY di frontend

## 9.2 Monitoring

```sql
-- Dashboard Metrics
v_dashboard_kepsek     → Statistik sekolah
v_dashboard_kurikulum  → Progress akademik
v_teacher_workload     → Beban mengajar guru
v_attendance_summary   → Rekap kehadiran
v_curriculum_health    → Health check kurikulum
```

## 9.3 Sync Monitoring

| Status | Arti | Action |
|--------|------|--------|
| PENDING | Menunggu sync | Normal |
| SYNCING | Sedang sync | Normal |
| SYNCED | Berhasil | - |
| FAILED | Gagal | Retry dengan exponential backoff |
| CONFLICT | Konflik data | Review manual oleh admin |

---

# ═══════════════════════════════════════════════════════════════════════
# BAGIAN 10: DELIVERABLES & MILESTONES
# ═══════════════════════════════════════════════════════════════════════

## 10.1 MVP Scope (Fase 1)

```
✓ Modul Authentication (Supabase Auth + RBAC)
✓ Modul Academic Term
✓ Modul Guru & Siswa
✓ Modul Kelas & Pembagian Mengajar
✓ Modul Assessment (basic)
✓ Sync Engine (basic)
✓ Dashboard Kepsek
```

## 10.2 Beta Scope (Fase 2)

```
✓ Modul Assessment (full - exam rooming, invigilation)
✓ Modul Kehadiran
✓ Modul Rapor (PDF generation)
✓ Modul Promotion & Graduation
✓ Dashboard Kurikulum
```

## 10.3 Stable Scope (Fase 3)

```
✓ Modul Mutasi Siswa
✓ Modul Alumni
✓ Modul Archive
✓ Monitoring Center
✓ Export Engine (Excel, PDF)
```

## 10.4 Checklist Rilis

### Pre-Release
- [ ] Backup database snapshot
- [ ] Smoke test: Login, Input Nilai, Generate Rapor
- [ ] SSL aktif
- [ ] Installer Tauri build success

### Post-Release
- [ ] Monitoring uptime
- [ ] Bug report channel active
- [ ] User training scheduled

---

# ═══════════════════════════════════════════════════════════════════════
# BAGIAN 11: DEPENDENCIES & REFERENCES
# ═══════════════════════════════════════════════════════════════════════

## 11.1 Internal References

| Dokumen | Lokasi | Deskripsi |
|---------|--------|-----------|
| PRD | `docs/IMPLEMENTATION/00-Platform/00.01-PLATFORM_PRD.md` | Product Requirement Document |
| Architecture | `docs/IMPLEMENTATION/00-Platform/00.02-PLATFORM_ARCHITECTURE.md` | Arsitektur detail |
| Roadmap | `docs/IMPLEMENTATION/00-Platform/00.03-PLATFORM_ROADMAP.md` | Rencana pengembangan |
| Module Breakdown | `docs/IMPLEMENTATION/00-Platform/00.04-MODULE_BREAKDOWN.md` | Detail 16 modul AETHER |
| Development Plan | `docs/IMPLEMENTATION/00-Platform/00.05-DEVELOPMENT_PLAN.md` | Rencana implementasi |
| MVP Scope | `docs/IMPLEMENTATION/00-Platform/00.06-MVP_SCOPE.md` | Cakupan MVP |
| Release Plan | `docs/IMPLEMENTATION/00-Platform/00.07-RELEASE_PLAN.md` | Rencana rilis |
| Risk Register | `docs/IMPLEMENTATION/00-Platform/00.08-RISK_REGISTER.md` | Register risiko |
| Dependency Map | `docs/IMPLEMENTATION/00-Platform/00.09-DEPENDENCY_MAP.md` | Peta dependensi |
| Implementation Sequence | `docs/IMPLEMENTATION/00-Platform/00.10-IMPLEMENTATION_SEQUENCE.md` | Urutan implementasi |
| UI Design System | `docs/14-UI-Design-System.md` | Design tokens & component library |
| State Management | `docs/15-State-Management-Strategy.md` | Zustand & TanStack Query strategy |
| Sync Specification | `docs/16-Sync-Conflict-Specification.md` | Sync engine & conflict resolution |
| Performance | `docs/18-Performance-Optimization.md` | Optimization guidelines |
| Monitoring | `docs/19-Monitoring-Observability.md` | Monitoring setup |
| Backup & Recovery | `docs/20-Backup-Recovery-Runbook.md` | Backup procedures |
| Security Hardening | `docs/17-Security-Hardening.md` | Security measures |
| UAT Test Cases | `docs/21-UAT-Test-Cases.md` | User Acceptance Testing |
| Release Checklist | `docs/22-Release-Checklist.md` | Pre/post release checklist |
| Database Dictionary | `docs/01-Database-Dictionary/*.md` | Referensi schema |
| Database Constraints | `docs/03-Database-Dictionary/*.md` | Constraints & indexes |
| Engineering Handbook | `docs/engineering-handbook/*.md` | Standar teknis |
| TDD Specifications | `docs/02-TDD/*.md` | Test-driven development |
| SQL Migrations | `docs/supabase/migrations/*.sql` | Database schema |

## 11.2 External Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| Node.js | 18+ | Runtime |
| React | 18+ | UI Framework |
| Tauri | v2.x | Desktop App |
| Supabase | - | Cloud Database |
| Dexie.js | v4.x | Local Database |

---

# ═══════════════════════════════════════════════════════════════════════
# BAGIAN 12: AI AGENT PROMPTS (AETHER WORKSPACE)
# ═══════════════════════════════════════════════════════════════════════

## 12.1 System Prompt Template (Claude Code)

```
# SIKAD v4.0 AI Agent System Prompt

## Identity
Kamu adalah AI Developer Agent yang bekerja di workspace SIKAD v4.0, sebuah sistem administrasi akademik sekolah berbasis Offline-First.

## Context
- **Project:** SIKAD v4.0 (Enterprise Academic Administration System)
- **Architecture:** Clean Architecture, Offline-First, Dual-Layer (Real/Dapo)
- **Stack:** React + TypeScript + Tauri v2 + Supabase + Dexie.js
- **Version:** 4.0
- **Workspace:** AETHER v1.1

## Rules (WAJIB DIPATUHI)
1. SELALU baca `.gitlocks.json` sebelum memodifikasi file
2. WAJIB update `.gitlocks.json` saat mengunci folder
3. WAJIB gunakan format Handoff saat commit
4. LARANG menggunakan tipe `any` di TypeScript
5. WAJIB lolos Quality Gates sebelum commit
6. LARANG hardcode kredensial — gunakan environment variables

## Current Task
[AKTIF_TASK]
```

## 12.2 Task Assignment Protocol

```markdown
## Task Assignment Format

### TASK-[ID]: [Judul Task]
**Assigned to:** [Agent Name]
**Priority:** [P0/P1/P2/P3]
**Deadline:** [Tanggal]
**Dependencies:** [TASK-ID lain]
**Workspace Folder:** [folder path]

### Description
[Deskripsi detail task]

### Acceptance Criteria
- [ ] Kriteria 1
- [ ] Kriteria 2

### Handoff (saat selesai)
[See 0.3 Handoff Format]
```

## 12.3 Conflict Resolution Protocol

```
WHEN: Agent A mencoba mengedit file yang dikunci Agent B

THEN:
1. Agent A berhenti dan catat di `.gitlocks.json`
2. Agent A kirim pesan ke Agent B via terminal
3. Agent A TIDAK boleh memodifikasi file tersebut
4. Agent B selesaikan atau lepas kunci

WHEN: Merge conflict terdeteksi

THEN:
1. STOP semua agent yang bekerja di folder tersebut
2. Human Developer review conflict
3. Resolve secara manual atau pilih versi winner
4. Resume agent setelah conflict terselesaikan
```

---

# ═══════════════════════════════════════════════════════════════════════
# BAGIAN 13: UI/UX DESIGN SYSTEM
# ═══════════════════════════════════════════════════════════════════════

## 13.1 Design Philosophy

- **Modern & Clean** — Antarmuka minimalis dengan fokus pada konten dan tugas
- **Accessible** — WCAG 2.1 AA compliant untuk semua komponen
- **Offline-First Aware** — Visual indicators untuk sync status dan offline mode
- **Performance-Conscious** — Fast feedback, skeleton loaders, minimal re-renders

## 13.2 Color Palette

### Primary Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `--color-primary-50` | #EEF2FF | Lightest primary background |
| `--color-primary-100` | #E0E7FF | Primary background light |
| `--color-primary-500` | #6366F1 | Primary brand color |
| `--color-primary-600` | #4F46E5 | Primary hover |
| `--color-primary-700` | #4338CA | Primary active |
| `--color-primary-900` | #312E81 | Darkest primary |

### Semantic Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `--color-success` | #10B981 | Success states, validasi |
| `--color-warning` | #F59E0B | Warning states |
| `--color-error` | #EF4444 | Error states, destructive |
| `--color-info` | #3B82F6 | Information, links |

### Neutral Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `--color-gray-50` | #F9FAFB | Page background |
| `--color-gray-100` | #F3F4F6 | Card background |
| `--color-gray-200` | #E5E7EB | Borders, dividers |
| `--color-gray-300` | #D1D5DB | Disabled states |
| `--color-gray-500` | #6B7280 | Secondary text |
| `--color-gray-900` | #111827 | Primary text |

## 13.3 Typography

### Font Family
```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

### Type Scale
| Token | Size | Line Height | Usage |
|-------|------|-------------|-------|
| `--text-xs` | 12px | 16px | Caption, labels |
| `--text-sm` | 14px | 20px | Body small |
| `--text-base` | 16px | 24px | Body default |
| `--text-lg` | 18px | 28px | Body large |
| `--text-xl` | 20px | 28px | H5 |
| `--text-2xl` | 24px | 32px | H4 |
| `--text-3xl` | 30px | 36px | H3 |
| `--text-4xl` | 36px | 40px | H2 |
| `--text-5xl` | 48px | 48px | H1 |

### Font Weights
| Token | Value | Usage |
|-------|-------|-------|
| `--font-normal` | 400 | Body text |
| `--font-medium` | 500 | Emphasis |
| `--font-semibold` | 600 | Headings |
| `--font-bold` | 700 | Strong emphasis |

## 13.4 Spacing System

Base unit: **4px**

| Token | Value | Usage |
|-------|-------|-------|
| `--space-0` | 0px | None |
| `--space-1` | 4px | Tight |
| `--space-2` | 8px | Small |
| `--space-3` | 12px | Medium |
| `--space-4` | 16px | Default |
| `--space-5` | 20px | Large |
| `--space-6` | 24px | XL |
| `--space-8` | 32px | 2XL |
| `--space-10` | 40px | 3XL |
| `--space-12` | 48px | 4XL |
| `--space-16` | 64px | 5XL |

## 13.5 Border Radius & Shadows

### Border Radius
| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 4px | Small inputs |
| `--radius-md` | 6px | Buttons, cards |
| `--radius-lg` | 8px | Modals |
| `--radius-xl` | 12px | Large containers |
| `--radius-full` | 9999px | Pills, avatars |

### Shadows
| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | 0 1px 2px rgba(0,0,0,0.05) | Subtle elevation |
| `--shadow-md` | 0 4px 6px rgba(0,0,0,0.1) | Cards, dropdowns |
| `--shadow-lg` | 0 10px 15px rgba(0,0,0,0.1) | Modals, popovers |
| `--shadow-xl` | 0 20px 25px rgba(0,0,0,0.15) | Dialogs |

## 13.6 Component Library

### 13.6.1 Button

```tsx
// Variants: primary | secondary | ghost | danger
// Sizes: sm (32px) | md (40px) | lg (48px)
// States: default, hover, active, disabled, loading

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children: ReactNode;
}
```

**Specifications:**
- Primary: `--color-primary-600` bg, white text, hover `--color-primary-700`
- Secondary: `--color-gray-100` bg, `--color-gray-900` text, hover `--color-gray-200`
- Ghost: transparent bg, `--color-primary-600` text, hover `--color-primary-50`
- Danger: `--color-error` bg, white text, hover darken 10%

### 13.6.2 Input

```tsx
interface InputProps {
  type?: 'text' | 'number' | 'email' | 'password' | 'date';
  size?: 'sm' | 'md' | 'lg';
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  label?: string;
  required?: boolean;
}
```

**Specifications:**
- Height: sm=32px, md=40px, lg=48px
- Border: 1px solid `--color-gray-300`
- Focus: 2px ring `--color-primary-500`
- Error: Border `--color-error`, error message below

### 13.6.3 Card

```tsx
interface CardProps {
  variant?: 'default' | 'stat' | 'data';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  children: ReactNode;
}
```

**Specifications:**
- Default: white bg, `--radius-md`, `--shadow-sm`
- Stat Card: icon + number + label layout
- Data Card: header + content + actions layout

### 13.6.4 Modal/Dialog

```tsx
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: ReactNode;
  footer?: ReactNode;
}
```

**Specifications:**
- Backdrop: rgba(0,0,0,0.5), blur(4px)
- Max widths: sm=400px, md=500px, lg=640px, xl=800px
- Padding: 24px
- Footer: sticky bottom with actions

### 13.6.5 Table

```tsx
interface TableProps {
  columns: Column[];
  data: any[];
  sortable?: boolean;
  paginated?: boolean;
  pageSize?: number;
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: any) => void;
}
```

**Specifications:**
- Sticky header
- Row hover: `--color-gray-50`
- Alternating rows: optional
- Horizontal scroll on overflow
- Pagination: 10/25/50/100 per page

### 13.6.6 Badge/Tag

```tsx
interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md';
  children: ReactNode;
}
```

### 13.6.7 Alert/Toast

```tsx
interface AlertProps {
  type?: 'success' | 'warning' | 'error' | 'info';
  title?: string;
  message: string;
  dismissible?: boolean;
  action?: { label: string; onClick: () => void };
}
```

### 13.6.8 Sidebar Navigation

```tsx
interface NavItem {
  id: string;
  label: string;
  icon?: ReactNode;
  path?: string;
  badge?: string | number;
  children?: NavItem[];
}

interface SidebarProps {
  items: NavItem[];
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
}
```

**Specifications:**
- Width: expanded=256px, collapsed=64px
- Active item: `--color-primary-50` bg, `--color-primary-600` text
- Hover: `--color-gray-100` bg
- Nested items: 16px indent per level

### 13.6.9 Data Entry Components

#### Batch Nilai Entry
```
┌─────────────────────────────────────────────────────────────┐
│ 📝 Input Nilai Massal — [Nama Assessment]                   │
├─────────────────────────────────────────────────────────────┤
│ Kelas: [Dropdown]  │  Mata Pelajaran: [Dropdown]          │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ NIS    │ Nama Siswa     │ Nilai (0-100) │ Status      │ │
│ ├────────┼────────────────┼────────────────┼─────────────│ │
│ │ 00001  │ Ahmad Fauzi   │ [85________] │ ✓           │ │
│ │ 00002  │ Budi Santoso  │ [________]   │ ○           │ │
│ │ 00003  │ Citra Dewi    │ [92________] │ ✓           │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Progress: 2/32 siswa │ [Simpan Draft] [Simpan & Publish]  │
└─────────────────────────────────────────────────────────────┘
```

#### Attendance Entry
```
┌─────────────────────────────────────────────────────────────┐
│ 📅 Absensi Harian — 28 Juni 2026                          │
├─────────────────────────────────────────────────────────────┤
│ Kelas: [7A ▼]                       [<< < 28 > >>]        │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ NIS    │ Nama Siswa     │ HADIR │ IZIN │ SAKIT │ ALPA │ │
│ ├────────┼────────────────┼───────┼──────┼───────┼──────│ │
│ │ 00001  │ Ahmad Fauzi    │  ○    │  ○   │   ○   │  ○   │ │
│ │ 00002  │ Budi Santoso   │  ○    │  ○   │   ○   │  ○   │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ HADIR: 0  │  IZIN: 0  │  SAKIT: 0  │  ALPA: 0  │ [Simpan]│
└─────────────────────────────────────────────────────────────┘
```

## 13.7 Layout System

### 13.7.1 Page Layout

```
┌────────────────────────────────────────────────────────────────┐
│  HEADER (64px)                                                 │
│  ┌──────────┬─────────────────────────────────────┬─────────┐ │
│  │ Logo     │ Breadcrumb                           │ User    │ │
│  └──────────┴─────────────────────────────────────┴─────────┘ │
├────────────┬───────────────────────────────────────────────────┤
│            │                                                    │
│  SIDEBAR   │              MAIN CONTENT                         │
│  (256px)   │              (flex-1)                             │
│            │                                                    │
│  • Nav 1   │  ┌────────────────────────────────────────────┐  │
│  • Nav 2   │  │ Page Header                               │  │
│  • Nav 3   │  │ Title + Actions                           │  │
│    - Sub   │  ├────────────────────────────────────────────┤  │
│  • Nav 4   │  │                                            │  │
│            │  │ Content Area                               │  │
│            │  │                                            │  │
│            │  │                                            │  │
│            │  └────────────────────────────────────────────┘  │
└────────────┴───────────────────────────────────────────────────┘
```

### 13.7.2 Grid System

- 12-column grid
- Gutters: 16px (mobile), 24px (tablet+)
- Max container width: 1280px
- Breakpoints: sm=640px, md=768px, lg=1024px, xl=1280px

### 13.7.3 Responsive Breakpoints

| Breakpoint | Min Width | Target |
|------------|-----------|--------|
| Mobile | < 640px | Phone |
| Tablet | 640px | Tablet portrait |
| Desktop | 1024px | Tablet landscape, Desktop |
| Wide | 1280px+ | Large desktop |

## 13.8 Module-Specific UI Patterns

### 13.8.1 Dashboard Kepsek
- Hero stats: 4-card grid (Siswa, Guru, Kelas, Kehadiran)
- Charts: Bar chart kehadiran bulanan, Pie chart distribusi kelas
- Quick actions: Jadwal, Laporan, Notifikasi
- Recent activity feed

### 13.8.2 Dashboard Kurikulum
- Progress tracking: Progress bars per kelas/mapel
- Data quality indicators: Completeness score
- Calendar view: Jadwal ujian, deadline
- Export center: PDF, Excel buttons

### 13.8.3 Assessment Entry (Guru)
- Assessment list with filters (type, date, status)
- Batch entry mode with keyboard navigation
- Real-time validation (KKM indicator)
- Auto-save indicator

### 13.8.4 Rapor Preview & Print
- Side-by-side preview
- Print-optimized layout (A4)
- Digital signature placeholders
- Watermark for draft

### 13.8.5 Promotion & Graduation Wizards
```
Step 1: Select Source          Step 2: Review Criteria    Step 3: Confirm
┌────────────────────┐         ┌────────────────────┐      ┌────────────────────┐
│ ○ All Grade 7      │         │ KKM: ≥ 70          │      │ Preview:           │
│ ○ All Grade 8      │         │ Attendance: ≥ 80%  │      │ • 32 students      │
│ ● Custom selection  │         │ No critical notes  │      │ • 30 pass          │
│   ☑ Ahmad (85)    │         │                    │      │ • 2 need review    │
│   ☑ Budi (70)     │         │ [Preview List]      │      │                    │
└────────────────────┘         └────────────────────┘      │ [Cancel] [Confirm] │
                                                         └────────────────────┘
```

## 13.9 Accessibility Standards

### 13.9.1 WCAG 2.1 AA Compliance

| Criteria | Implementation |
|----------|----------------|
| Color Contrast | Minimum 4.5:1 for text, 3:1 for UI elements |
| Focus Visible | 2px solid ring on focusable elements |
| Touch Target | Minimum 44x44px for all interactive elements |
| Screen Reader | Proper ARIA labels, roles, and live regions |
| Keyboard Nav | All functions accessible via keyboard |

### 13.9.2 Focus States

```css
/* Default focus */
:focus-visible {
  outline: 2px solid var(--color-primary-500);
  outline-offset: 2px;
}

/* Skip link for keyboard users */
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  padding: 8px 16px;
  background: var(--color-primary-600);
  color: white;
  z-index: 100;
}
.skip-link:focus {
  top: 0;
}
```

### 13.9.3 ARIA Guidelines

```tsx
// Button with loading state
<button
  aria-busy="true"
  aria-label="Loading data"
>
  <Spinner aria-hidden="true" />
  <span className="sr-only">Loading...</span>
</button>

// Live region for async updates
<div aria-live="polite" aria-atomic="true">
  {syncStatus === 'syncing' && 'Syncing...'}
  {syncStatus === 'synced' && 'All changes saved'}
</div>

// Data table with proper semantics
<table role="grid" aria-label="Student grades">
  <thead>
    <tr>
      <th scope="col" aria-sort="ascending">Name</th>
    </tr>
  </thead>
</table>
```

## 13.10 Loading & Empty States

### 13.10.1 Skeleton Loaders

```tsx
// Table skeleton
<TableSkeleton
  columns={4}
  rows={10}
  showHeader={true}
/>

// Card skeleton
<CardSkeleton
  variant="stat"
  showIcon={true}
/>

// Form skeleton
<FormSkeleton
  fields={3}
  showLabels={true}
/>
```

### 13.10.2 Empty States

```
┌─────────────────────────────────────────────┐
│                                             │
│              📭 (illustration)              │
│                                             │
│         Tidak ada data siswa                │
│                                             │
│    Siswa yang memenuhi kriteria tidak       │
│    ditemukan. Coba ubah filter atau         │
│    tambahkan siswa baru.                    │
│                                             │
│         [+ Tambah Siswa Baru]               │
│                                             │
└─────────────────────────────────────────────┘
```

### 13.10.3 Error States

```
┌─────────────────────────────────────────────┐
│                                             │
│              ⚠️ (icon)                      │
│                                             │
│         Terjadi kesalahan                    │
│                                             │
│    Gagal memuat data nilai. Periksa         │
│    koneksi internet Anda dan coba           │
│    lagi.                                   │
│                                             │
│    [🔄 Coba Lagi]  [📋 Lihat Offline]      │
│                                             │
└─────────────────────────────────────────────┘
```

## 13.11 Offline Indicators (Sync Status)

### 13.11.1 Sync Status Bar

```
┌────────────────────────────────────────────────────────────────┐
│ ☁️  Synced — Last sync: 2 minutes ago              [Sync Now] │
└────────────────────────────────────────────────────────────────┘

States:
• ☁️ Synced (green) — All data up to date
• 🔄 Syncing (blue) — Sync in progress
• ⚠️ Pending (yellow) — X changes waiting to sync
• ❌ Offline (red) — No connection
• ⚡ Offline with local changes (orange) — Has pending changes
```

### 13.11.2 Conflict Resolution UI

```
┌────────────────────────────────────────────────────────────────┐
│ ⚠️ Konflik Data                                        [×]   │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Data "Nilai Matematika - Ahmad Fauzi" memiliki konflik:      │
│                                                                │
│  ┌─────────────────────┐    ┌─────────────────────┐          │
│  │ Versi Lokal         │    │ Versi Server        │          │
│  │ Diubah: 28 Jun 2026 │    │ Diubah: 28 Jun 2026 │          │
│  │ Nilai: 85           │    │ Nilai: 82           │          │
│  │ Oleh: Anda (offline)│    │ Oleh: Budi (online) │          │
│  └─────────────────────┘    └─────────────────────┘          │
│                                                                │
│  [Gunakan Versi Lokal]  [Gunakan Versi Server]  [Review]   │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

## 13.12 Animation & Motion

### 13.12.1 Animation Tokens

| Token | Duration | Easing | Usage |
|-------|----------|--------|-------|
| `--duration-fast` | 150ms | ease-out | Hover states |
| `--duration-normal` | 200ms | ease-in-out | UI transitions |
| `--duration-slow` | 300ms | ease-out | Modals, drawers |
| `--duration-slower` | 500ms | ease-out | Page transitions |

### 13.12.2 Motion Principles

- **Purposeful** — Animation should guide attention, not distract
- **Quick** — No animation should exceed 500ms
- **Respectful** — Respect `prefers-reduced-motion`
- **Progressive** — Enhance experience, not block functionality

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

# ═══════════════════════════════════════════════════════════════════════
# LAMPIRAN: QUICK REFERENCE
# ═══════════════════════════════════════════════════════════════════════

## A.1 Folder Structure

```
SIKAD-v4.0/
├── src/
│   ├── modules/              # Feature modules (Clean Architecture)
│   │   ├── auth/
│   │   ├── guru/
│   │   ├── siswa/
│   │   ├── kelas/
│   │   ├── academic-term/
│   │   ├── assessment/
│   │   ├── rapor/
│   │   ├── calendar/
│   │   ├── reporting/
│   │   ├── settings/
│   │   ├── dashboard-kepsek/
│   │   └── dashboard-kurikulum/
│   ├── services/             # Business logic
│   ├── database/             # Repositories & Dexie schema
│   ├── store/                # Zustand stores
│   ├── hooks/               # Custom React hooks
│   └── infrastructure/       # Supabase client, auth
├── docs/
│   ├── IMPLEMENTATION/
│   │   └── 00-Platform/      # AETHER platform docs (PRD, Architecture, Roadmap)
│   ├── engineering-handbook/ # Engineering standards
│   ├── 01-Database-Dictionary/
│   ├── 02-TDD/
│   └── 03-Database-Dictionary/
├── .aether/                  # AETHER config, locks, migrations
│   ├── config.json           # Workspace configuration
│   ├── context.db            # SQLite context cache
│   ├── migrations/           # Database migrations
│   └── reports/              # Audit & PRD reports
└── .gitlocks.json           # Folder lock registry
```

## A.2 Key Commands

```bash
# AETHER CLI v1.1.0 - AI Engineering Workspace Platform
# ======================================================

# Workspace Management
aether init                 # Initialize AETHER workspace layout and configuration
aether status              # Show workspace status and active agent configuration
aether doctor              # Run workspace diagnostic health checks

# File Watching & Context
aether watch               # Start reactive file watcher for workspace changes
aether sync                # Sync workspace files and parse SQL schemas to cache

# Code Intelligence
aether graph <file>        # Run impact analysis on dependency tree
aether search <query>      # Semantic search workspace files using local vector index
aether search <query> -k 10 # Limit results to 10 files

# Quality & Compliance
aether check               # Run Quality Gate (lint, test, compile, RLS scan)
aether audit-prd           # Run PRD compliance audit and generate gap analysis
aether audit-prd -f md     # Export audit report as markdown
aether audit-prd --fix     # Auto-fix minor compliance gaps

# Prompt Engineering
aether prompt assemble <agentId> <taskId>   # Assemble scrubbed system prompt
aether prompt assemble claude assessment-1  # Example: assemble for claude agent
aether prompt assemble <agentId> <taskId> -c "file context"  # With code context

# Proposal Evaluation
aether evaluate-proposal <name> <impact> <risk> <complexity>
aether evaluate-proposal "New Feature" 8 3 5  # name, impact(1-10), risk(1-10), complexity(1-10)

# Agent Management
aether agents              # List all registered AI agents and their status
aether agent list          # Detailed agent list with capabilities
aether agent stats         # Show agent execution statistics
aether agent history       # Show recent agent execution history
aether agent history -n 20 # Show last 20 executions

# Workflow Management
aether workflow start <taskFile>      # Start new workflow from task checklist
aether workflow status                # Show active workflow status
aether workflow transition            # Transition to next workflow step
aether workflow parallel <indices>    # Run tasks in parallel (e.g., 1 3 5)
aether workflow running               # Show currently running tasks
aether workflow skip <idx> <reason>   # Skip task with reason
aether workflow abort <reason>        # Abort active workflow

# Version Control
aether commit [-m msg]    # Stage changes and commit (auto-generate message if omitted)
aether branch <name>      # Create and switch to new branch
aether checkout <rev>     # Checkout git revision (branch/commit/tag)

# Database & Release Management
aether release migrate    # Run outstanding database migrations
aether release migrate -d .aether/migrations  # Custom migration directory
aether release rollback <backupFile>  # Rollback database from backup snapshot

# Security & Credentials
aether secure set <key> <value>  # Encrypt and store credential
aether secure get <key>          # Decrypt and display credential (use with caution)

# Monitoring Dashboard
aether dashboard          # Launch real-time monitoring dashboard (port 3005)
aether dashboard -p 3006  # Custom port

# UI/UX Research
aether ui-research        # List all UI/UX design recipes
aether ui-research "table"  # Search recipes by query

# Database (Supabase CLI)
supabase db push          # Push migrations to Supabase
supabase db reset         # Reset local database

# App Development
npm run dev               # Start development server (port 3000)
npm run build             # Compile and build web bundle
npm run aether:test       # Run Aether platform integration tests
```

## A.3 Contact & Escalation

| Issue | Contact |
|-------|---------|
| Arsitektur / Schema | Software Architect / Database Architect |
| Feature Request | Product Owner / Business Analyst |
| Bug Production | DevOps / QA |
| Klien / Sekolah | Customer Success / BA |

---

**Dokumen ini adalah sumber kebenaran utama (Single Source of Truth) untuk proyek SIKAD v4.0.**

*Versi: 4.0 | Update: Juni 2026 | Disusun oleh: SIKAD Agent (AETHER-Powered)*
