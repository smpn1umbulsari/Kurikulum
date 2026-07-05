# 05-RLS-Policy-Specification.md

# ROW LEVEL SECURITY (RLS)

## SIKAD v4.0

Version: 4.0

Status: APPROVED

Security Level:

```text
HIGH
```

---

# TUJUAN

Menjamin bahwa:

```text
Guru hanya melihat data miliknya

Wali Kelas hanya melihat kelasnya

BK hanya melihat data yang diizinkan

Kurikulum dapat mengelola akademik

Kepala Sekolah hanya membaca

Admin mengelola sistem
```

---

# SECURITY PRINCIPLE

## Database First Security

Hak akses tidak boleh ditentukan oleh:

```text
Frontend
Menu
Button
```

---

Hak akses wajib ditentukan oleh:

```text
RLS Policy
```

---

# ROLE HIERARCHY

```text
ADMIN

KURIKULUM

KEPALA_SEKOLAH

WALI_KELAS

BK

GURU
```

---

# USER CONTEXT

Semua policy menggunakan:

```sql
auth.uid()
```

---

Relasi:

```text
auth.users.id
=
gurus.id
```

---

# GURUS

## SELECT

Guru dapat membaca:

```sql
gurus.id = auth.uid()
```

---

Kurikulum:

```text
ALL
```

---

Admin:

```text
ALL
```

---

# SISWAS

## GURU

Hanya siswa yang diajar.

Policy:

```sql
EXISTS(
 SELECT 1
 FROM pembagian_mengajar pm
 WHERE pm.guru_id = auth.uid()
)
```

---

## WALI KELAS

Hanya siswa perwalian.

---

## BK

Seluruh siswa.

---

## KURIKULUM

Seluruh siswa.

---

# KELAS

## GURU

Hanya kelas yang diajar.

---

## WALI KELAS

Hanya kelas perwalian.

---

## KURIKULUM

CRUD.

---

# PEMBAGIAN MENGAJAR

## GURU

SELECT:

```sql
guru_id = auth.uid()
```

---

UPDATE:

```text
DENY
```

---

## KURIKULUM

CRUD.

---

# TUGAS TAMBAHAN

## GURU

Hanya tugas miliknya.

---

Policy:

```sql
guru_id = auth.uid()
```

---

# ASSESSMENTS

## GURU

Hanya assessment miliknya.

---

Policy:

```sql
EXISTS(
 SELECT 1
 FROM pembagian_mengajar
 WHERE
 guru_id = auth.uid()
)
```

---

## WALI KELAS

READ ONLY.

---

## KURIKULUM

CRUD.

---

# ASSESSMENT DETAILS

## GURU

Hanya nilai assessment miliknya.

---

CREATE:

```text
ALLOW
```

---

UPDATE:

```text
ALLOW
```

---

DELETE:

```text
DENY
```

---

Jika assessment:

```text
FINALIZED
```

↓

UPDATE:

```text
DENY
```

---

# KEHADIRAN

## GURU

CRUD kelas yang diajar.

---

## WALI KELAS

CRUD kelas perwalian.

---

## BK

READ.

---

## KURIKULUM

CRUD.

---

# RAPOR

## GURU

READ.

---

## WALI KELAS

CRUD.

---

## KURIKULUM

CRUD.

---

## KEPALA SEKOLAH

READ.

---

# PROMOTION

## KURIKULUM

EXECUTE.

---

## ADMIN

EXECUTE.

---

## GURU

DENY.

---

# GRADUATION

## KURIKULUM

EXECUTE.

---

## ADMIN

EXECUTE.

---

## GURU

DENY.

---

# ALUMNI

## BK

READ.

---

## KURIKULUM

READ.

---

## ADMIN

CRUD.

---

# AUDIT LOGS

## ADMIN

READ.

---

## KURIKULUM

READ.

---

## USER

NO ACCESS.

---

# ANALYTICS SNAPSHOTS

## KEPALA SEKOLAH

READ.

---

## KURIKULUM

READ.

---

## ADMIN

READ.

---

# EXPORT JOBS

## USER

Hanya job miliknya.

Policy:

```sql
user_id = auth.uid()
```

---

## ADMIN

ALL.

---

# CONFLICT QUEUE

## ADMIN

ALL.

---

## KURIKULUM

ALL.

---

## GURU

Hanya konflik miliknya.

---

# DEVICE HEALTH

## USER

Own Device.

---

## ADMIN

ALL.

---

# ARCHIVE

## ADMIN

CRUD.

---

## KURIKULUM

READ.

---

# SOFT DELETE RULE

Semua query wajib:

```sql
deleted_at IS NULL
```

---

# FINALIZED RULE

Jika:

```text
assessment.stage = FINALIZED
```

↓

Tidak boleh:

```text
UPDATE
DELETE
```

---

Jika:

```text
rapor finalized
```

↓

Tidak boleh:

```text
UPDATE
DELETE
```

---

# ACADEMIC TERM LOCK

Jika:

```text
academic_term.finalized = true
```

↓

Semua transaksi:

```text
READ ONLY
```

---

# SECURITY AUDIT

Semua aksi berikut dicatat:

```text
LOGIN

LOGOUT

CREATE

UPDATE

DELETE

EXPORT

FINALIZE

PROMOTION

GRADUATION
```

---

# SECURITY ACCEPTANCE CRITERIA

✓ Least Privilege

✓ No Cross-Class Access

✓ No Cross-Teacher Access

✓ RLS Enforced

✓ Audit Logged

✓ Finalized Protected

✓ Academic Term Lock

✓ Export Protected

✓ Multi Device Safe
