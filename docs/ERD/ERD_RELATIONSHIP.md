# SIKAD v4.0 - Entity Relationship Diagram

> **Generated:** July 2, 2026  
> **Format:** ASCII Art / Mermaid

---

## Complete Database Relationships

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    SIKAD v4.0 ERD                                         │
│                          Academic Administration System                                     │
└─────────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────┐         ┌─────────────────────┐         ┌─────────────────────┐
│   auth.users         │         │      roles           │         │   permissions        │
│  ─────────────────   │         │  ─────────────────   │         │  ─────────────────   │
│  id (PK) UUID        │         │  id (PK) UUID        │         │  id (PK) UUID        │
│  email               │         │  name                │         │  name                │
│  created_at          │         │  description         │         │  resource            │
│                      │         │                      │         │  action              │
└──────────┬──────────┘         └──────────┬──────────┘         └──────────┬──────────┘
           │                                 │                                 │
           │ 1:1                             │ N:M                             │
           ▼                                 ▼                                 ▼
┌─────────────────────┐         ┌─────────────────────┐         ┌─────────────────────┐
│    custom_users      │         │  role_permissions    │         │    user_roles       │
│  ─────────────────   │         │  ─────────────────   │         │  ─────────────────   │
│  id (PK) UUID ◄─────┼────────►│  role_id (FK)        │◄────────┼─ user_id (FK)       │
│  email               │         │  permission_id (FK)   │         │  role_id (FK)       │
│  role                │         │                      │         │  assigned_at         │
│  created_at          │         └─────────────────────┘         └─────────────────────┘
└──────────┬──────────┘
           │
           │ 1:N
           ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                     GURUS                                                │
│  ─────────────────────────────────────────────────────────────────────────────────────  │
│  id (PK) UUID ◄───────────────────────────────────────────────────────────────────────│
│  nip                  │              ┌───────────────────────────────────────────────┐│
│  nama                 │              │              ACADEMIC_TERMS                   ││
│  gender               │              │  ─────────────────────────────────────────── ││
│  status_aktif         │              │  id (PK) UUID                               ││
│  created_at           │              │  tahun_ajaran        (e.g. "2025/2026")     ││
└──────────┬───────────┘              │  semester            (GANJIL/GENAP)           ││
           │                         │  status                                    ││
           │ 1:N                     └──────────┬──────────────────────────────────┘│
           ▼                                    │ 1:N
┌─────────────────────┐                         ▼
│    SISWAS            │         ┌─────────────────────────────────────────────────┐
│  ─────────────────   │         │                    KELAS                       │
│  id (PK) UUID        │         │  ─────────────────────────────────────────────  │
│  nisn                │         │  id (PK) UUID                                   │
│  nipd                │         │  academic_term_id (FK) ──────────────────┐     │
│  nama                │         │  nama_kelas      (e.g. "VII A")          │     │
│  jk                  │         │  tingkat         (7, 8, 9)              │     │
│  status_aktif        │         │  jenis           (REAL/DAPO)             │     │
└──────────┬───────────┘         │  wali_kelas_id   (FK) ────────────────┐   │     │
           │                     └───────────────────────┬────────────────┴───┘     │
           │ 1:N                                         │                          │
           │                                             │ 1:N
           ▼                                             ▼
┌─────────────────────┐                     ┌─────────────────────────────────────────┐
│  RIWAYAT_KELAS       │                     │         PEMBAGIAN_MENGAJAR              │
│  ─────────────────   │                     │  ─────────────────────────────────────  │
│  id (PK) UUID        │                     │  id (PK) UUID                          │
│  siswa_id (FK) ──┐   │                     │  academic_term_id (FK)                 │
│  kelas_id (FK) ◄─┼───┼────────────────────►│  guru_id (FK) ◄────────────────┐       │
│  academic_term_id     │                     │  mapel_id (FK)                       │       │
│  status_keluar        │                     │  kelas_id (FK) ◄────────────────┼──────┘
└─────────────────────┘                     │  jenis      (REAL/DAPO)              │
                                            │  jp         (Jam Pelajaran)         │
                                            └─────────────────────┬───────────────────┘
                                                                  │ N:1
                                                                  ▼
┌─────────────────────┐                     ┌─────────────────────────────────────────┐
│  MATA_PELAJARANS     │                     │     ASSESSMENT_TYPES                     │
│  ─────────────────   │                     │  ─────────────────────────────────────  │
│  id (PK) UUID        │                     │  id (PK) UUID                           │
│  kode                │                     │  kode     (FORMATIF, SUMATIF, dll)     │
│  nama                │                     │  nama                                     │
│  kelompok_mapel      │                     │  bobot_default                           │
│  induk_mapel         │                     └─────────────────────┬───────────────────┘
│  agama               │                                           │ 1:N
│  jp_real             │                                           ▼
└─────────────────────┘                     ┌─────────────────────────────────────────┐
                                            │         ASSESSMENTS                      │
┌─────────────────────┐                     │  ─────────────────────────────────────  │
│  ASSESSMENT_DETAILS │                     │  id (PK) UUID                           │
│  ─────────────────   │                     │  assessment_type_id (FK)                 │
│  id (PK) UUID        │                     │  pembagian_mengajar_id (FK)             │
│  assessment_id (FK) ◄┼─────────────────────│  judul                                   │
│  siswa_id (FK) ──────┼────────────────────►│  tanggal                                 │
│  nilai               │                     │  bobot                                   │
│  catatan             │                     │  stage    (DRAFT/PUBLISH/FINAL)         │
└─────────────────────┘                     └─────────────────────┬───────────────────┘
                                                                  │
                                                                  │ 1:N
                                                                  ▼
┌─────────────────────┐                     ┌─────────────────────────────────────────┐
│  KEHADIRAN           │                     │      CATATAN_WALI_KELAS                  │
│  ─────────────────   │                     │  ─────────────────────────────────────  │
│  id (PK) UUID        │                     │  id (PK) UUID                           │
│  academic_term_id (FK)│                    │  academic_term_id (FK)                   │
│  siswa_id (FK)       │                     │  siswa_id (FK) ◄────────────────┐        │
│  tanggal             │                     │  kelas_id (FK)                        │        │
│  status (H/I/S/A)   │                     │  catatan                                │
└─────────────────────┘                     └─────────────────────┬───────────────────┘
                                                                  │
                                                                  │ 1:1
                                                                  ▼
┌─────────────────────┐                     ┌─────────────────────────────────────────┐
│  EXAM_ROOMS          │                     │       RAPOR_SNAPSHOTS                   │
│  ─────────────────   │                     │  ─────────────────────────────────────  │
│  id (PK) UUID        │                     │  id (PK) UUID                           │
│  academic_term_id (FK)│                    │  academic_term_id (FK)                   │
│  nama_ruang          │                     │  siswa_id (FK)                           │
│  kapasitas           │                     │  kelas_id (FK)                           │
│  lokasi              │                     │  data_rapor    (JSONB)                   │
└──────────┬──────────┘                     │  finalized_by                               │
           │ 1:N                           │  finalized_at                              │
           ▼                               └─────────────────────┬───────────────────┘
┌─────────────────────┐                                           │
│  EXAM_SEATS          │                     ┌─────────────────────────────────────────┐
│  ─────────────────   │                     │       RAPOR_PDF                         │
│  id (PK) UUID        │                     │  ─────────────────────────────────────  │
│  room_id (FK) ◄──────┼─────────────────────│  id (PK) UUID                           │
│  siswa_id (FK)       │                     │  siswa_id (FK)                           │
│  exam_id (FK)        │                     │  file_url                                │
│  nomor_kursi         │                     │  generated_at                            │
└─────────────────────┘                     └─────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              PROMOTION & GRADUATION JOBS                                │
└─────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────┐                     ┌─────────────────────┐
│  PROMOTION_JOBS      │                     │  GRADUATION_JOBS    │
│  ─────────────────   │                     │  ─────────────────   │
│  id (PK) UUID        │                     │  id (PK) UUID        │
│  source_term_id (FK) │                     │  academic_term_id (FK)│
│  target_term_id (FK) │                     │  tahun_lulus         │
│  status              │                     │  status              │
│  total_siswa         │                     │  total_siswa         │
└──────────┬──────────┘                     └──────────┬──────────┘
           │ 1:N                                        │ 1:N
           ▼                                            ▼
┌─────────────────────┐                     ┌─────────────────────┐
│  PROMOTION_DETAILS  │                     │  GRADUATION_DETAILS │
│  ─────────────────   │                     │  ─────────────────   │
│  id (PK) UUID        │                     │  id (PK) UUID        │
│  promotion_job_id (FK)│                    │  graduation_job_id   │
│  siswa_id (FK)       │                     │  siswa_id (FK)       │
│  kelas_asal_id (FK) │                     │  status              │
│  kelas_tujuan_id (FK)│                    │  tahun_lulus         │
└─────────────────────┘                     └─────────────────────┘
                                                  │
                                                  │ Creates
                                                  ▼
┌─────────────────────┐                     ┌─────────────────────┐
│     ALUMNI           │                     │  ALUMNI_SNAPSHOTS   │
│  ─────────────────   │                     │  ─────────────────   │
│  id (PK) UUID        │                     │  id (PK) UUID        │
│  siswa_id (FK) ──────┼────────────────────►│  alumni_id (FK)       │
│  tahun_lulus         │                     │  data_snapshot        │
│  created_at          │                     │  created_at           │
└─────────────────────┘                     └─────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    SYNC & AUDIT                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────┐                     ┌─────────────────────┐
│    SYNC_QUEUE        │                     │   CONFLICT_QUEUE    │
│  ─────────────────   │                     │  ─────────────────   │
│  id (PK) UUID        │                     │  id (PK) UUID        │
│  table_name          │                     │  table_name          │
│  record_id (FK)      │                     │  record_id           │
│  operation           │                     │  local_data          │
│  status              │                     │  cloud_data          │
│  retry_count         │                     │  resolved            │
└─────────────────────┘                     └─────────────────────┘

┌─────────────────────┐                     ┌─────────────────────┐
│    AUDIT_LOGS        │                     │  SOFT_DELETE_LOGS   │
│  ─────────────────   │                     │  ─────────────────   │
│  id BIGSERIAL        │                     │  id BIGSERIAL        │
│  table_name          │                     │  table_name          │
│  record_id           │                     │  record_id           │
│  action              │                     │  deleted_by          │
│  old_data            │                     │  deleted_at          │
│  new_data            │                     │  data_snapshot       │
│  performed_by        │                     └─────────────────────┘
└─────────────────────┘
```

---

## Mermaid ERD Format

```mermaid
erDiagram
    auth_users ||--o| custom_users : "1:1"
    custom_users ||--o{ user_roles : "1:N"
    roles ||--o{ user_roles : "1:N"
    roles ||--o{ role_permissions : "1:N"
    permissions ||--o{ role_permissions : "1:N"

    custom_users ||--o{ gurus : "1:N"
    gurus ||--o{ kelas : "1:N"
    gurus ||--o{ pembagian_mengajar : "1:N"
    gurus ||--o{ exam_supervisors : "1:N"

    academic_terms ||--o{ kelas : "1:N"
    academic_terms ||--o{ pembagian_mengajar : "1:N"
    academic_terms ||--o{ kehadiran : "1:N"
    academic_terms ||--o{ rapor_snapshots : "1:N"
    academic_terms ||--o{ exam_rooms : "1:N"
    academic_terms ||--o{ graduation_jobs : "1:N"

    kelas ||--o{ siswa : "1:N"
    kelas ||--o{ riwayat_kelas : "1:N"
    kelas ||--o{ pembagian_mengajar : "1:N"
    kelas ||--o{ catatan_wali_kelas : "1:N"
    kelas ||--o{ rapor_snapshots : "1:N"

    siswa ||--o{ riwayat_kelas : "1:N"
    siswa ||--o{ kehadiran : "1:N"
    siswa ||--o{ assessment_details : "1:N"
    siswa ||--o{ exam_seats : "1:N"
    siswa ||--o{ catatan_wali_kelas : "1:N"
    siswa ||--o{ rapor_snapshots : "1:N"
    siswa ||--|| alumni : "1:1"

    mata_pelajarans ||--o{ pembagian_mengajar : "1:N"

    assessment_types ||--o{ assessments : "1:N"
    assessments ||--o{ assessment_details : "1:N"
    assessments ||--o| exam_seats : "1:N"
    pembagian_mengajar ||--o{ assessments : "1:N"

    exam_rooms ||--o{ exam_seats : "1:N"
    exam_rooms ||--o{ exam_supervisors : "1:N"

    rapor_snapshots ||--o| rapor_pdf : "1:1"

    promotion_jobs ||--o{ promotion_details : "1:N"
    graduation_jobs ||--o{ graduation_details : "1:N"

    alumni ||--o{ alumni_snapshots : "1:N"

    -- Sync Tables (No FK constraints)
    sync_queue { }
    conflict_queue { }
    audit_logs { }
```

---

## Table Summary

| #   | Table Name           | Type        | Primary Key              | Foreign Keys                                       |
| --- | -------------------- | ----------- | ------------------------ | -------------------------------------------------- |
| 1   | `auth.users`         | System      | id (UUID)                | -                                                  |
| 2   | `custom_users`       | Auth        | id (UUID)                | → auth.users                                       |
| 3   | `roles`              | Auth        | id (UUID)                | -                                                  |
| 4   | `permissions`        | Auth        | id (UUID)                | -                                                  |
| 5   | `role_permissions`   | Auth        | (role_id, permission_id) | → roles, → permissions                             |
| 6   | `user_roles`         | Auth        | id (UUID)                | → auth.users, → roles                              |
| 7   | `gurus`              | Master      | id (UUID)                | → auth.users                                       |
| 8   | `siswas`             | Master      | id (UUID)                | -                                                  |
| 9   | `academic_terms`     | Master      | id (UUID)                | -                                                  |
| 10  | `kelas`              | Master      | id (UUID)                | → academic_terms, → gurus                          |
| 11  | `mata_pelajarans`    | Master      | id (UUID)                | -                                                  |
| 12  | `pembagian_mengajar` | Transaction | id (UUID)                | → academic_terms, → gurus, → mapel, → kelas        |
| 13  | `assessment_types`   | Master      | id (UUID)                | -                                                  |
| 14  | `assessments`        | Transaction | id (UUID)                | → assessment_types, → pembagian_mengajar           |
| 15  | `assessment_details` | Transaction | id (UUID)                | → assessments, → siswas                            |
| 16  | `kehadiran`          | Transaction | id (UUID)                | → academic_terms, → siswas                         |
| 17  | `catatan_wali_kelas` | Transaction | id (UUID)                | → academic_terms, → siswas, → kelas                |
| 18  | `rapor_snapshots`    | Snapshot    | id (UUID)                | → academic_terms, → siswas, → kelas                |
| 19  | `riwayat_kelas`      | Transaction | id (UUID)                | → siswas, → kelas, → academic_terms                |
| 20  | `exam_rooms`         | Transaction | id (UUID)                | → academic_terms                                   |
| 21  | `exam_seats`         | Transaction | id (UUID)                | → exam_rooms, → siswas, → assessments              |
| 22  | `exam_supervisors`   | Transaction | id (UUID)                | → gurus, → exam_rooms, → assessments               |
| 23  | `promotion_jobs`     | Batch       | id (UUID)                | → academic_terms (source, target)                  |
| 24  | `promotion_details`  | Batch       | id (UUID)                | → promotion_jobs, → siswas, → kelas (asal, tujuan) |
| 25  | `graduation_jobs`    | Batch       | id (UUID)                | → academic_terms                                   |
| 26  | `graduation_details` | Batch       | id (UUID)                | → graduation_jobs, → siswas                        |
| 27  | `alumni`             | Archive     | id (UUID)                | → siswas                                           |
| 28  | `alumni_snapshots`   | Archive     | id (UUID)                | → alumni                                           |
| 29  | `sync_queue`         | System      | id (UUID)                | -                                                  |
| 30  | `conflict_queue`     | System      | id (UUID)                | -                                                  |
| 31  | `audit_logs`         | System      | id (BIGSERIAL)           | -                                                  |

---

## Relationship Cardinality

```
Legend:
  ||    = Exactly one
  }o    = Zero or one
  }|    = One or more
  }o    = Zero or more

1:1  - auth.users : custom_users
1:1  - kelas : rapor_snapshots (latest)
1:1  - siswas : alumni
1:N  - gurus : kelas (wali_kelas)
1:N  - gurus : pembagian_mengajar
1:N  - academic_terms : kelas
1:N  - academic_terms : pembagian_mengajar
1:N  - academic_terms : siswa (via riwayat_kelas)
1:N  - academic_terms : rapor_snapshots
1:N  - kelas : siswa
1:N  - kelas : pembagian_mengajar
1:N  - kelas : riwayat_kelas
1:N  - siswa : riwayat_kelas
1:N  - siswa : assessment_details
1:N  - siswa : kehadiran
1:N  - siswa : exam_seats
1:N  - siswa : catatan_wali_kelas
1:N  - siswa : rapor_snapshots
1:N  - mata_pelajarans : pembagian_mengajar
1:N  - assessment_types : assessments
1:N  - assessments : assessment_details
1:N  - exam_rooms : exam_seats
1:N  - exam_rooms : exam_supervisors
1:N  - promotion_jobs : promotion_details
1:N  - graduation_jobs : graduation_details
1:N  - alumni : alumni_snapshots
```

---

_Last Updated: July 2, 2026_
