# 03-Database-Dictionary.md

# DATABASE DICTIONARY

## SIKAD v4.0

Version: 4.0

Status: APPROVED

Database Engine:

```text
PostgreSQL 16
Supabase
```

---

# TUJUAN

Dokumen ini menjadi referensi tunggal seluruh struktur database SIKAD v4.0.

Digunakan oleh:

```text
Backend Developer
Frontend Developer
DBA
DevOps
QA
AI Coding Agent
```

---

# PENAMAAN STANDAR

## Table

Format:

```text
snake_case
plural
```

Contoh:

```text
gurus
siswas
academic_terms
assessments
```

---

## Column

Format:

```text
snake_case
```

Contoh:

```text
created_at
updated_at
academic_term_id
```

---

## Primary Key

Semua tabel:

```sql
id UUID PRIMARY KEY
```

---

## Foreign Key

Format:

```text
entity_id
```

Contoh:

```text
guru_id
kelas_id
academic_term_id
```

---

# MASTER DATA DOMAIN

---

# auth.users

Managed by Supabase.

Tidak dikelola langsung aplikasi.

---

# gurus

Master guru.

| Field          | Type         | Null |
| -------------- | ------------ | ---- |
| id             | UUID         | NO   |
| nip            | VARCHAR(30)  | YES  |
| nama           | VARCHAR(150) | NO   |
| gelar_depan    | VARCHAR(50)  | YES  |
| gelar_belakang | VARCHAR(50)  | YES  |
| jk             | CHAR(1)      | NO   |
| tempat_lahir   | VARCHAR(100) | YES  |
| tanggal_lahir  | DATE         | YES  |
| no_hp          | VARCHAR(30)  | YES  |
| status_aktif   | BOOLEAN      | NO   |
| created_at     | TIMESTAMPTZ  | NO   |
| updated_at     | TIMESTAMPTZ  | NO   |
| deleted_at     | TIMESTAMPTZ  | YES  |

---

# RULE

```text
gurus.id = auth.users.id
```

---

# roles

Master role.

| Field | Type         |
| ----- | ------------ |
| id    | UUID         |
| kode  | VARCHAR(50)  |
| nama  | VARCHAR(100) |

---

# permissions

Master permission.

| Field | Type         |
| ----- | ------------ |
| id    | UUID         |
| kode  | VARCHAR(100) |
| nama  | VARCHAR(150) |

---

# role_permissions

Relasi role dan permission.

| Field         | Type |
| ------------- | ---- |
| role_id       | UUID |
| permission_id | UUID |

---

# user_roles

Relasi user dan role.

| Field   | Type |
| ------- | ---- |
| user_id | UUID |
| role_id | UUID |

---

# mata_pelajarans

Master mata pelajaran.

| Field    | Type         |
| -------- | ------------ |
| id       | UUID         |
| kode     | VARCHAR(50)  |
| nama     | VARCHAR(150) |
| kelompok | VARCHAR(100) |
| aktif    | BOOLEAN      |

---

# tugas_tambahan_types

Master tugas tambahan.

| Field      | Type         |
| ---------- | ------------ |
| id         | UUID         |
| kode       | VARCHAR(50)  |
| nama       | VARCHAR(150) |
| kategori   | VARCHAR(100) |
| default_jp | NUMERIC(5,2) |
| aktif      | BOOLEAN      |

---

# SISWA DOMAIN

---

# siswas

Master siswa aktif.

| Field         | Type         |
| ------------- | ------------ |
| id            | UUID         |
| nisn          | VARCHAR(20)  |
| nipd          | VARCHAR(20)  |
| nama          | VARCHAR(150) |
| jk            | CHAR(1)      |
| agama         | VARCHAR(20)  |
| tempat_lahir  | VARCHAR(100) |
| tanggal_lahir | DATE         |
| alamat        | TEXT         |
| status_aktif  | BOOLEAN      |
| created_at    | TIMESTAMPTZ  |
| updated_at    | TIMESTAMPTZ  |
| deleted_at    | TIMESTAMPTZ  |

---

# ACADEMIC TERM DOMAIN

---

# academic_terms

| Field           | Type            |
| --------------- | --------------- |
| id              | UUID            |
| tahun_ajaran    | VARCHAR(20)     |
| semester        | semester_type   |
| tanggal_mulai   | DATE            |
| tanggal_selesai | DATE            |
| status          | BOOLEAN         |
| input_mode      | term_input_mode |
| created_at      | TIMESTAMPTZ     |

---

# ENUM

```text
term_input_mode
```

```text
PTS
SEMESTER
```

---

# ACADEMIC STRUCTURE DOMAIN

---

# kelas

| Field            | Type        |
| ---------------- | ----------- |
| id               | UUID        |
| academic_term_id | UUID        |
| nama_kelas       | VARCHAR(50) |
| tingkat          | SMALLINT    |
| jenis            | kelas_type  |
| wali_kelas_id    | UUID        |
| status_aktif     | BOOLEAN     |
| created_at       | TIMESTAMPTZ |

---

# ENUM

```sql
kelas_jenis
```

```text
REAL
DAPO
```

---

# riwayat_kelas

| Field            | Type        |
| ---------------- | ----------- |
| id               | UUID        |
| siswa_id         | UUID        |
| kelas_id         | UUID        |
| academic_term_id | UUID        |
| created_at       | TIMESTAMPTZ |

---

# pembagian_mengajar

| Field            | Type         |
| ---------------- | ------------ |
| id               | UUID         |
| academic_term_id | UUID         |
| guru_id          | UUID         |
| mapel_id         | UUID         |
| kelas_id         | UUID         |
| jenis            | kelas_type   |
| jp               | NUMERIC(5,2) |
| created_at       | TIMESTAMPTZ  |

---

# tugas_tambahan_assignments

| Field                  | Type         |
| ---------------------- | ------------ |
| id                     | UUID         |
| academic_term_id       | UUID         |
| guru_id                | UUID         |
| tugas_tambahan_type_id | UUID         |
| nama_penugasan         | VARCHAR(200) |
| jp_override            | NUMERIC(5,2) |
| status                 | VARCHAR(20)  |

---

# ASSESSMENT DOMAIN

---

# assessment_types

| Field         | Type         |
| ------------- | ------------ |
| id            | UUID         |
| kode          | VARCHAR(50)  |
| nama          | VARCHAR(100) |
| kategori      | VARCHAR(50)  |
| bobot_default | NUMERIC(5,2) |
| aktif         | BOOLEAN      |

---

# assessments

| Field                 | Type             |
| --------------------- | ---------------- |
| id                    | UUID             |
| assessment_type_id    | UUID             |
| pembagian_mengajar_id | UUID             |
| academic_term_id      | UUID             |
| judul                 | VARCHAR(200)     |
| tanggal               | DATE             |
| bobot                 | NUMERIC(5,2)     |
| stage                 | assessment_stage |
| created_by            | UUID             |
| version               | BIGINT           |

---

# assessment_details

| Field         | Type         |
| ------------- | ------------ |
| id            | UUID         |
| assessment_id | UUID         |
| siswa_id      | UUID         |
| nilai         | NUMERIC(5,2) |
| catatan       | TEXT         |
| is_pts_locked | BOOLEAN      |
| version       | BIGINT       |

---

# ENUM

```text
assessment_stage
```

```text
DRAFT
PUBLISHED
FINALIZED
```

---

# FUNCTIONS

## transfer_siswa_nilai

Memindahkan seluruh baris nilai siswa dari kelas lama ke kelas baru ketika terjadi mutasi kelas tengah semester.

**Parameter**:
- `p_siswa_id` (UUID): ID siswa yang pindah kelas.
- `p_old_kelas_id` (UUID): ID kelas lama siswa.
- `p_new_kelas_id` (UUID): ID kelas baru siswa.
- `p_academic_term_id` (UUID): ID semester akademik yang aktif.

**Kembalian**: `INTEGER` (Jumlah baris nilai yang berhasil ditransfer).

---

# ATTENDANCE DOMAIN

---

# kehadiran

| Field                 | Type              |
| --------------------- | ----------------- |
| id                    | UUID              |
| academic_term_id      | UUID              |
| pembagian_mengajar_id | UUID              |
| siswa_id              | UUID              |
| tanggal               | DATE              |
| status                | attendance_status |
| keterangan            | TEXT              |
| version               | BIGINT            |

---

# ENUM

```text
attendance_status
```

```text
HADIR
SAKIT
IZIN
ALPA
```

---

# RAPOR DOMAIN

---

# catatan_wali_kelas

| Field            | Type |
| ---------------- | ---- |
| id               | UUID |
| academic_term_id | UUID |
| siswa_id         | UUID |
| kelas_id         | UUID |
| catatan          | TEXT |
| created_by       | UUID |

---

# rapor_snapshots

| Field            | Type        |
| ---------------- | ----------- |
| id               | UUID        |
| academic_term_id | UUID        |
| siswa_id         | UUID        |
| kelas_id         | UUID        |
| version          | INTEGER     |
| data_rapor       | JSONB       |
| finalized_by     | UUID        |
| finalized_at     | TIMESTAMPTZ |

---

# PROMOTION DOMAIN

---

# promotion_jobs

| Field           | Type        |
| --------------- | ----------- |
| id              | UUID        |
| source_term_id  | UUID        |
| target_term_id  | UUID        |
| status          | VARCHAR(30) |
| total_siswa     | INTEGER     |
| processed_siswa | INTEGER     |
| log             | JSONB       |

---

# promotion_details

| Field            | Type        |
| ---------------- | ----------- |
| id               | UUID        |
| promotion_job_id | UUID        |
| siswa_id         | UUID        |
| kelas_asal_id    | UUID        |
| kelas_tujuan_id  | UUID        |
| status           | VARCHAR(30) |

---

# GRADUATION DOMAIN

---

# graduation_jobs

| Field            | Type        |
| ---------------- | ----------- |
| id               | UUID        |
| academic_term_id | UUID        |
| status           | VARCHAR(30) |
| total_siswa      | INTEGER     |
| processed_siswa  | INTEGER     |
| log              | JSONB       |

---

# graduation_details

| Field             | Type        |
| ----------------- | ----------- |
| id                | UUID        |
| graduation_job_id | UUID        |
| siswa_id          | UUID        |
| status            | VARCHAR(30) |

---

# alumni

| Field       | Type         |
| ----------- | ------------ |
| id          | UUID         |
| siswa_id    | UUID         |
| nisn        | VARCHAR(20)  |
| nipd        | VARCHAR(20)  |
| nama        | VARCHAR(150) |
| tahun_lulus | INTEGER      |

---

# alumni_snapshots

| Field              | Type  |
| ------------------ | ----- |
| id                 | UUID  |
| alumni_id          | UUID  |
| biodata_snapshot   | JSONB |
| akademik_snapshot  | JSONB |
| kehadiran_snapshot | JSONB |
| rapor_snapshot     | JSONB |

---

# ARCHIVE DOMAIN

---

# academic_snapshots

| Field            | Type         |
| ---------------- | ------------ |
| id               | UUID         |
| academic_term_id | UUID         |
| snapshot_type    | VARCHAR(100) |
| data             | JSONB        |
| generated_at     | TIMESTAMPTZ  |

---

# archive_jobs

| Field             | Type        |
| ----------------- | ----------- |
| id                | UUID        |
| academic_term_id  | UUID        |
| status            | VARCHAR(30) |
| total_records     | BIGINT      |
| processed_records | BIGINT      |
| log               | JSONB       |

---

# MONITORING DOMAIN

---

# audit_logs

| Field      | Type        |
| ---------- | ----------- |
| id         | BIGSERIAL   |
| table_name | TEXT        |
| record_id  | UUID        |
| action     | TEXT        |
| old_data   | JSONB       |
| new_data   | JSONB       |
| user_id    | UUID        |
| created_at | TIMESTAMPTZ |

---

# sync_logs

| Field         | Type        |
| ------------- | ----------- |
| id            | BIGSERIAL   |
| user_id       | UUID        |
| device_id     | UUID        |
| operation     | TEXT        |
| table_name    | TEXT        |
| record_id     | UUID        |
| status        | TEXT        |
| duration_ms   | INTEGER     |
| error_message | TEXT        |
| created_at    | TIMESTAMPTZ |

---

# device_health

| Field          | Type        |
| -------------- | ----------- |
| id             | UUID        |
| user_id        | UUID        |
| device_id      | TEXT        |
| app_version    | TEXT        |
| last_sync_at   | TIMESTAMPTZ |
| queue_count    | INTEGER     |
| conflict_count | INTEGER     |
| status         | TEXT        |

---

# REPORTING DOMAIN

---

# analytics_snapshots

| Field            | Type         |
| ---------------- | ------------ |
| id               | UUID         |
| academic_term_id | UUID         |
| snapshot_type    | VARCHAR(100) |
| data             | JSONB        |
| generated_at     | TIMESTAMPTZ  |

---

# analytics_jobs

| Field        | Type         |
| ------------ | ------------ |
| id           | UUID         |
| report_type  | VARCHAR(100) |
| status       | VARCHAR(30)  |
| generated_by | UUID         |
| created_at   | TIMESTAMPTZ  |
| finished_at  | TIMESTAMPTZ  |

---

# EXPORT DOMAIN

---

# export_jobs

| Field       | Type         |
| ----------- | ------------ |
| id          | UUID         |
| user_id     | UUID         |
| export_type | VARCHAR(100) |
| format      | VARCHAR(20)  |
| status      | VARCHAR(20)  |
| file_url    | TEXT         |
| metadata    | JSONB        |
| created_at  | TIMESTAMPTZ  |
| finished_at | TIMESTAMPTZ  |

---

# TOTAL ESTIMASI TABEL

## Core Tables

```text
22 - 28 tabel
```

---

## Monitoring Tables

```text
4 - 6 tabel
```

---

## Reporting Tables

```text
2 - 4 tabel
```

---

## Total

```text
30 - 38 tabel
```

---

# FINAL DATABASE PRINCIPLES

✓ UUID Everywhere

✓ Academic Term Centric

✓ Configurable Assessment

✓ Hybrid Alumni Architecture

✓ Snapshot First Strategy

✓ Offline First Ready

✓ Multi Device Ready

✓ RLS Ready

✓ Audit Ready

✓ Future Proof For Curriculum Changes
