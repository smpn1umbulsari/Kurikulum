# 01-Database-Dictionary.md

# SIKAD v4.0

## Database Dictionary

### PostgreSQL + Supabase

Version: 4.0

Status: Approved

---

# Tujuan

Dokumen ini menjadi sumber referensi resmi seluruh struktur database SIKAD v4.0.

Setiap tabel, kolom, relasi, constraint, index, dan aturan validasi wajib mengacu pada dokumen ini.

---

# Konvensi Umum

## Primary Key

Seluruh tabel menggunakan:

```sql
UUID
```

---

## Audit Columns

Seluruh tabel transaksi wajib memiliki:

```sql
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

---

## Soft Delete

Seluruh tabel master wajib memiliki:

```sql
deleted_at TIMESTAMPTZ NULL
deleted_by UUID NULL
```

---

## Foreign Key Naming

```text
guru_id
siswa_id
kelas_id
mapel_id
academic_term_id
```

---

# ENUM DEFINITIONS

## semester_type

```sql
GANJIL
GENAP
```

---

## kelas_jenis

```sql
REAL
DAPO
```

---

## status_aktif

```sql
AKTIF
NONAKTIF
```

---

## assessment_stage

```sql
DRAFT
PUBLISH
FINAL
```

---

## sync_status

```sql
PENDING
SYNCING
SYNCED
FAILED
CONFLICT
```

---

## operation_type

```sql
INSERT
UPDATE
DELETE
```

---

# AUTHENTICATION

# auth.users

Managed by Supabase Authentication.

Tidak boleh dimodifikasi langsung oleh aplikasi.

---

# MASTER DATA

# gurus

Deskripsi:

Menyimpan data guru dan pegawai.

Relasi langsung dengan auth.users.

---

| Field          | Type         | Null | Keterangan       |
| -------------- | ------------ | ---- | ---------------- |
| id             | UUID         | NO   | FK auth.users.id |
| nip            | VARCHAR(30)  | YES  | NIP/NIPPPK       |
| nama           | VARCHAR(150) | NO   | Nama lengkap     |
| gelar_depan    | VARCHAR(50)  | YES  | Gelar depan      |
| gelar_belakang | VARCHAR(50)  | YES  | Gelar belakang   |
| jk             | VARCHAR(1)   | YES  | L/P              |
| tempat_lahir   | VARCHAR(100) | YES  | TTL              |
| tanggal_lahir  | DATE         | YES  | TTL              |
| no_hp          | VARCHAR(30)  | YES  | Nomor HP         |
| status_aktif   | BOOLEAN      | NO   | Default TRUE     |
| created_at     | TIMESTAMPTZ  | NO   | Timestamp        |
| updated_at     | TIMESTAMPTZ  | NO   | Timestamp        |
| deleted_at     | TIMESTAMPTZ  | YES  | Soft delete      |

---

## Constraints

```sql
PRIMARY KEY(id)
```

```sql
FOREIGN KEY(id)
REFERENCES auth.users(id)
```

---

## Index

```sql
idx_guru_nip
```

```sql
idx_guru_status
```

---

# siswas

Deskripsi:

Master siswa aktif.

Tidak terikat semester.

---

| Field         | Type         |
| ------------- | ------------ |
| id            | UUID         |
| nisn          | VARCHAR(20)  |
| nipd          | VARCHAR(20)  |
| nama          | VARCHAR(150) |
| jk            | VARCHAR(1)   |
| agama         | VARCHAR(20)  |
| tempat_lahir  | VARCHAR(100) |
| tanggal_lahir | DATE         |
| alamat        | TEXT         |
| status_aktif  | BOOLEAN      |
| created_at    | TIMESTAMPTZ  |
| updated_at    | TIMESTAMPTZ  |
| deleted_at    | TIMESTAMPTZ  |

---

## Unique

```sql
UNIQUE(nisn)
```

```sql
UNIQUE(nipd)
```

---

# mata_pelajarans

Deskripsi:

Master mapel.

---

| Field          | Type         |
| -------------- | ------------ |
| id             | UUID         |
| kode           | VARCHAR(20)  |
| nama           | VARCHAR(150) |
| kelompok_mapel | VARCHAR(50)  |
| aktif          | BOOLEAN      |
| created_at     | TIMESTAMPTZ  |
| updated_at     | TIMESTAMPTZ  |

---

## Unique

```sql
UNIQUE(kode)
```

---

# academic_terms

Deskripsi:

Pusat seluruh transaksi akademik.

---

| Field           | Type          |
| --------------- | ------------- |
| id              | UUID          |
| tahun_ajaran    | VARCHAR(20)   |
| semester        | semester_type |
| tanggal_mulai   | DATE          |
| tanggal_selesai | DATE          |
| status          | BOOLEAN       |
| created_at      | TIMESTAMPTZ   |

---

## Rule

Hanya satu record aktif.

---

# kelas

Deskripsi:

Kelas aktif pada suatu academic term.

---

| Field            | Type        |
| ---------------- | ----------- |
| id               | UUID        |
| academic_term_id | UUID        |
| nama_kelas       | VARCHAR(50) |
| tingkat          | SMALLINT    |
| jenis            | kelas_jenis |
| wali_kelas_id    | UUID        |
| status_aktif     | BOOLEAN     |
| created_at       | TIMESTAMPTZ |

---

## FK

```sql
academic_term_id
→ academic_terms.id
```

```sql
wali_kelas_id
→ gurus.id
```

---

## Index

```sql
idx_kelas_term
```

```sql
idx_kelas_jenis
```

---

# pembagian_mengajar

Deskripsi:

Relasi guru-mapel-kelas dalam satu term.

---

| Field            | Type        |
| ---------------- | ----------- |
| id               | UUID        |
| academic_term_id | UUID        |
| guru_id          | UUID        |
| mapel_id         | UUID        |
| kelas_id         | UUID        |
| jenis            | kelas_jenis |
| jp               | SMALLINT    |
| created_at       | TIMESTAMPTZ |

---

## Unique

```sql
UNIQUE(
 guru_id,
 mapel_id,
 kelas_id,
 academic_term_id
)
```

---

# assessment_types

Deskripsi:

Jenis penilaian yang dapat dikonfigurasi.

---

| Field         | Type         |
| ------------- | ------------ |
| id            | UUID         |
| kode          | VARCHAR(50)  |
| nama          | VARCHAR(100) |
| kategori      | VARCHAR(50)  |
| bobot_default | NUMERIC(5,2) |
| urutan        | SMALLINT     |
| aktif         | BOOLEAN      |

---

## Contoh Data

```text
FORMATIF
SUMATIF
PROYEK
PRAKTIK
PORTOFOLIO
```

---

# assessments

Header penilaian.

---

| Field                 | Type             |
| --------------------- | ---------------- |
| id                    | UUID             |
| assessment_type_id    | UUID             |
| pembagian_mengajar_id | UUID             |
| academic_term_id      | UUID             |
| judul                 | VARCHAR(200)     |
| deskripsi             | TEXT             |
| tanggal               | DATE             |
| bobot                 | NUMERIC(5,2)     |
| stage                 | assessment_stage |
| created_by            | UUID             |
| created_at            | TIMESTAMPTZ      |

---

# assessment_details

Detail nilai siswa.

---

| Field         | Type         |
| ------------- | ------------ |
| id            | UUID         |
| assessment_id | UUID         |
| siswa_id      | UUID         |
| nilai         | NUMERIC(5,2) |
| catatan       | TEXT         |
| updated_at    | TIMESTAMPTZ  |

---

## Unique

```sql
UNIQUE(
 assessment_id,
 siswa_id
)
```

---

# LANJUTAN

Dokumen berikutnya akan memuat:

* 01.2 Attendance Dictionary
* 01.3 Rapor Dictionary
* 01.4 Alumni Dictionary
* 01.5 RBAC Dictionary
* 01.6 Sync Dictionary
* 01.7 Audit Dictionary
* 01.8 Promotion Engine Dictionary
* 01.9 Archive Dictionary
