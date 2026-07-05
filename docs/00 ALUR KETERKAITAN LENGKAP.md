# # 00 - ALUR KETERKAITAN LENGKAP (GRAND INTEGRATION MAP)

## SIKAD v4.0 Core Application & AETHER Platform Integration

> **Document Version**: 1.0 | **Last Updated**: Juni 2026 | **Status**: ACTIVE

---

### 1. PETA RELASI TIGA PILAR (THREE-PILLAR ARCHITECTURE MAP)

Sistem kerja pada repositori **SIKAD v4.0** ditopang oleh tiga pilar utama yang saling terintegrasi: **Target Codebase (SIKAD v4.0)**, **Workspace Middleware (AETHER)**, dan **Workspace Governance (Engineering Handbook & Agent Rules)**.

```text
+====================================================================================+
|                              WORKSPACE GOVERNANCE                                  |
|  - [AGENTS.md] Workspace Rules                                                     |
|  - [docs/engineering-handbook/] (00-Handbook, 06-DoR, 07-DoD, 13-Architect, etc.)  |
+====================================================================================+
                                           |
                   Mengevaluasi Kepatuhan  |  Mendikte Aturan Prompt & Quality Gate
                                           v
+====================================================================================+
|                               AETHER PLATFORM                                      |
|  - [00-Platform/] (00.01 PRD s.d 00.10 Sequence)                                   |
|  - 16 Core Engine Modules (Project Mgr, Event Bus, Context Eng, Quality Eng, dll.) |
+====================================================================================+
           |                                                       ^
           | Menginspeksi & Memodifikasi                           | Mengirimkan Event
           v                                                       | & Status Database
+====================================================================================+
|                             SIKAD v4.0 APPLICATION                                 |
|  - Database: Supabase / PostgreSQL Migrations ([docs/supabase/migrations/])       |
|  - Logic & UI: React SPA / Zustand Store / Dexie.js Offline Database               |
|  - Testing: Vitest TDD Testing Suites ([docs/02-TDD/])                           |
+====================================================================================+
```

---

### 2. SIKLUS EKSEKUSI TUGAS AGEN AI (AGENT EXECUTION CYCLE)

Diagram berikut menjelaskan alur interaksi end-to-end ketika seorang AI Agent menerima tugas di dalam workspace ini:

```text
 [1. TUJUAN] ────────────────> [2. ANALISIS KONTEKS] ───────────────> [3. PERAKITAN PROMPT]
  Manusia/PM membuat           AETHER Context Engine                 AETHER Prompt Engine
  fitur baru di task.md        membaca skema DB & file               menggabungkan tugas, kode
                               dependency via SQLite                 aktif, & aturan Handbook
                                                                                 │
                                                                                 v
 [6. KOMIT GIT] <───────────── [5. QUALITY GATE (DoD)] <───────────── [4. EKSEKUSI KODE]
  AETHER Version Manager       AETHER Quality Engine                 AI Agent mengadopsi peran
  melakukan auto-commit        menjalankan unit test &               (misal: Frontend Lead)
  dan push                     linter (Auto-Remediation)             dan memodifikasi kode
```

1. **Inisiasi Tugas (Task Initiation)**: Goal pengerjaan didefinisikan dalam [task.md](.task.md) oleh developer manusia.
2. **Pengumpulan Konteks (Context Gathering)**: `AETHER Context Engine` membaca database state lokal (SQLite) untuk memetakan dependency file dan skema database SIKAD v4.0 yang relevan.
3. **Perakitan Prompt Berorientasi Aturan (Rule Injection)**: `AETHER Prompt Engine` merakit payload prompt dengan memasukkan batasan arsitektur dari [AGENTS.md](../.agents/AGENTS.md) dan handbook teknis terkait.
4. **Adopsi Peran & Modifikasi Kode (Execution)**: AI Agent mengadopsi peran spesifik (misal: _Database Architect_ untuk file `.sql` atau _Frontend Lead_ untuk Zustand store) dan mengeksekusi perubahan kode pada aplikasi SIKAD v4.0.
5. **Quality Gate & Auto-Remediation (DoD Validation)**: `AETHER Quality Engine` menjalankan Vitest suite dan linter. Jika terjadi error, sistem memicu _Auto-Remediation Loop_ untuk meminta AI memperbaiki kodenya sendiri.
6. **Version Control & Release**: Setelah lolos Quality Gate, `AETHER Version Manager` secara otomatis memicu Git commit dengan ringkasan perubahan (diff summary).

---

### 3. MATRIKS PEMETAAN FILE & TANGGUNG JAWAB (DOCUMENT MAPPING MATRIX)

Tabel berikut memetakan keterkaitan fungsional antara dokumen spesifikasi di dalam folder `docs/`, modul orkestrator di `00-Platform/`, dan peran penanggung jawab berdasarkan RACI Matrix:

| No  | Dokumen Spesifikasi SIKAD v4.0                                         | Modul AETHER Terkait | Peran Handbooks (RACI) | File Target Kode / SQL               |
| :-- | :--------------------------------------------------------------------- | :------------------- | :--------------------- | :----------------------------------- |
| 1   | [00 PRD REVISION LOG.md](00%20PRD%20REVISION%20LOG.md)                 | `Project Manager`    | **Product Owner**      | -                                    |
| 2   | [04-API-Specification.md](04-API-Specification.md)                     | `Prompt Engine`      | **Backend Lead**       | `docs/supabase/migrations/`          |
| 3   | [05-RLS-Policy-Specification.md](05-RLS-Policy-Specification.md)       | `Security Engine`    | **Security Architect** | RLS Policies di migrasi SQL          |
| 4   | [06-Migration-Plan-v3-to-v4.0.md](06-Migration-Plan-v3-to-v4.0.md)     | `Release Manager`    | **Database Architect** | SQLite migrations & Supabase scripts |
| 5   | [14-UI-Design-System.md](14-UI-Design-System.md)                       | `Document Engine`    | **Frontend Lead**      | React Components & CSS Variables     |
| 6   | [15-State-Management-Strategy.md](15-State-Management-Strategy.md)     | `Context Engine`     | **Frontend Lead**      | Zustand Stores & Dexie.js cache      |
| 7   | [16-Sync-Conflict-Specification.md](16-Sync-Conflict-Specification.md) | `Workflow Engine`    | **Software Architect** | Dexie sync queues & handlers         |
| 8   | [26-Testing-Suite-Specification.md](26-Testing-Suite-Specification.md) | `Quality Engine`     | **QA Architect**       | `docs/02-TDD/` test files            |

---

### 4. STUDI KASUS INTEGRASI: MODUL ASSESSMENT (ASSESSMENT MODULE INTEGRATION PATHWAY)

Sebagai contoh konkret, modul **Assessment (Invigilation & Rooming)** yang telah diintegrasikan ke dalam SIKAD v4.0 mengikuti jalur keterkaitan berikut:

```text
                     [00 PRD REVISION LOG (Revision 2)]
                    Mendefinisikan Configurable Assessment
                                     │
                                     v
             [docs/engineering-handbook/40-Assessment-Blueprint]
                    Rancangan teknis modul Assessment
                                     │
                                     v
                  [supabase/migrations/500_assessment/]
                     Skema tabel & PL/pgSQL locking triggers
                                     │
                                     v
                    [docs/02-TDD/02.7-TDD-Assessment.md]
                     Unit testing Vitest untuk validasi logika
                                     │
                                     v
                        [AETHER Quality Engine Validation]
                     Menjalankan test otomatis sebelum commit
```

1. **Requirement Level**: PRD Revision Log menetapkan penghapusan status _hardcode_ tipe ujian (UH, PTS, PAS) dan mengubahnya menjadi dynamic table `assessment_types` pada database SIKAD v4.0.
2. **Architecture Blueprint**: [40-Assessment-Integration-Blueprint.md](engineering-handbook/40-Assessment-Integration-Blueprint.md) menguraikan cara mengintegrasikan modul assessment tanpa mengganggu domain utama lainnya.
3. **Database Schema**: Migrasi SQL di folder [supabase/migrations/500_assessment/](supabase/migrations/500_assessment/) merealisasikan tabel `assessments` dan trigger PL/pgSQL locking.
4. **TDD Level**: Dokumen [02.7-TDD-Assessment.md](02-TDD/02.7-TDD-Assessment.md) memuat skenario Gherkin (Given/When/Then) dan pengujian Vitest untuk menjamin aturan alokasi ruang tidak terlanggar.
5. **Execution Verification**: AETHER Platform menggunakan `Quality Engine` untuk memverifikasi file migrasi database dan unit testing di atas sebelum memperbolehkan `Version Manager` membuat commit Git.
