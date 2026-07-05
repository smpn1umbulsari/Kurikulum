# 06-Migration-Plan-v3-to-v4.0.md

# MIGRATION PLAN

## SIKAD v3 → SIKAD v4.0

Version: 4.0

Status: APPROVED

Risk Level:

```text
HIGH
```

Estimated Duration:

```text
2 - 4 Weeks
```

---

# TUJUAN

Migrasi dilakukan untuk memindahkan seluruh data dan proses bisnis dari:

```text
SIKAD v3
```

ke:

```text
SIKAD v4.0
```

tanpa kehilangan:

```text
Data Guru
Data Siswa
Riwayat Kelas
Nilai
Kehadiran
Rapor
Tugas Tambahan
```

---

# TARGET AKHIR

Setelah migrasi selesai:

```text
✓ PostgreSQL Aktif

✓ Supabase Aktif

✓ RLS Aktif

✓ Academic Term Engine Aktif

✓ Assessment Engine Aktif

✓ Sync Engine Aktif

✓ Monitoring Aktif

✓ Archive Aktif

✓ Reporting Aktif
```

---

# STRATEGI MIGRASI

Menggunakan pendekatan:

```text
Expand
↓
Migrate
↓
Validate
↓
Switch
↓
Cleanup
```

---

# PHASE M0

## Discovery & Audit

Durasi:

```text
2-3 Hari
```

---

# Aktivitas

Inventaris seluruh:

```text
Tabel
Sheet
API
View
Script
Cron
```

---

# Output

## Migration Inventory

Contoh:

| Modul Lama        | Status    |
| ----------------- | --------- |
| guru              | migrate   |
| siswa             | migrate   |
| nilai             | transform |
| kelas_bayangan    | merge     |
| mengajar_bayangan | merge     |
| rapor             | snapshot  |

---

# PHASE M1

## Database Preparation

Durasi:

```text
2 Hari
```

---

# Aktivitas

Deploy seluruh:

```text
Schema Baru
ENUM
Index
Constraint
Trigger
View
RLS
```

---

# Output

```text
Database Kosong
Siap Migrasi
```

---

# PHASE M2

## Identity Migration

Durasi:

```text
1 Hari
```

---

# Tujuan

Menyatukan:

```text
auth.users
=
gurus.id
```

---

# Flow

```text
Guru Lama
↓
Create Auth User
↓
Get UUID
↓
Insert Guru
```

---

# Mapping Table

## migration_guru_map

| old_id | new_uuid |
| ------ | -------- |
| 13     | UUID     |
| 14     | UUID     |

---

# VALIDATION

```text
Jumlah Guru Lama
=
Jumlah Guru Baru
```

---

# PHASE M3

## Academic Term Migration

Durasi:

```text
1 Hari
```

---

# Tujuan

Mengubah:

```text
2024/2025
GANJIL
```

menjadi:

```text
academic_term_id
```

---

# Mapping

## migration_term_map

| Old              | New  |
| ---------------- | ---- |
| 2024/2025 GANJIL | UUID |
| 2024/2025 GENAP  | UUID |

---

# PHASE M4

## Kelas Consolidation

Durasi:

```text
2 Hari
```

---

# Sebelum

```text
kelas_real

kelas_bayangan
```

---

# Sesudah

```text
kelas
```

---

# Mapping

```text
kelas_real
→
jenis=REAL
```

---

```text
kelas_bayangan
→
jenis=DAPO
```

---

# VALIDATION

Tidak boleh ada:

```text
Duplicate Class
```

---

# PHASE M5

## Pembagian Mengajar Consolidation

Durasi:

```text
2 Hari
```

---

# Sebelum

```text
mengajar

mengajar_bayangan
```

---

# Sesudah

```text
pembagian_mengajar
```

---

# Mapping

```text
mengajar
→
REAL
```

---

```text
mengajar_bayangan
→
DAPO
```

---

# VALIDATION

Tidak boleh ada:

```text
Duplicate Assignment
```

---

# PHASE M6

## Student Migration

Durasi:

```text
1 Hari
```

---

# Migrasi

```text
siswas
riwayat_kelas
```

---

# Validation

```text
Jumlah Siswa Aktif
=
Jumlah Siswa Baru
```

---

# PHASE M7

## Assessment Migration

Durasi:

```text
3-5 Hari
```

---

# PALING KRITIS

Karena struktur berubah total.

---

# Sebelum

```text
nilai
```

flat table.

---

# Sesudah

```text
assessments
+
assessment_details
```

---

# Flow

```text
Mapel
+
Guru
+
Kelas
+
Jenis Nilai
```

↓

Generate:

```text
assessment header
```

↓

Generate:

```text
assessment_details
```

---

# Contoh

## Lama

| siswa | mapel | nilai |
| ----- | ----- | ----- |
| A     | MTK   | 90    |
| B     | MTK   | 85    |

---

## Baru

### assessments

| id | mapel |
| -- | ----- |
| X  | MTK   |

---

### assessment_details

| assessment | siswa | nilai |
| ---------- | ----- | ----- |
| X          | A     | 90    |
| X          | B     | 85    |

---

# VALIDATION

```text
Jumlah Nilai Lama
=
Jumlah Nilai Baru
```

---

# PHASE M8

## Attendance Migration

Durasi:

```text
1 Hari
```

---

# Mapping

```text
absensi
```

↓

```text
kehadiran
```

---

# VALIDATION

Total:

```text
HADIR
SAKIT
IZIN
ALPA
```

harus sama.

---

# PHASE M9

## Rapor Migration

Durasi:

```text
2 Hari
```

---

# Flow

```text
Rapor Lama
↓
Transform
↓
rapor_snapshots
```

---

# Output

```text
version = 1
```

---

# PHASE M10

## Tugas Tambahan Migration

Durasi:

```text
1 Hari
```

---

# Mapping

Data:

```text
Wali Kelas
Operator
Pembina
BK
Kurikulum
```

↓

```text
tugas_tambahan_assignments
```

---

# PHASE M11

## Alumni Migration

Durasi:

```text
2 Hari
```

---

# Flow

```text
Alumni Lama
↓
Create Alumni
↓
Generate Snapshot
```

---

# Hybrid Model

```text
alumni
+
alumni_snapshots
```

---

# PHASE M12

## Analytics Bootstrap

Durasi:

```text
1 Hari
```

---

# Generate

```text
analytics_snapshots
```

---

# Generate

```text
teacher_workload_snapshot
```

---

# PHASE M13

## Verification

Durasi:

```text
2 Hari
```

---

# Row Count Validation

Bandingkan:

```text
OLD
vs
NEW
```

---

# Referential Validation

Cek:

```text
Orphan Record
```

---

# Duplicate Validation

Cek:

```text
Duplicate Data
```

---

# PHASE M14

## User Acceptance Testing

Durasi:

```text
3-5 Hari
```

---

# Skenario

```text
Login

Input Nilai

Input Kehadiran

Generate Rapor

Promotion

Graduation

Export
```

---

# PHASE M15

## Production Cutover

Durasi:

```text
1 Hari
```

---

# Flow

```text
Freeze v3
↓
Backup
↓
Final Sync
↓
Switch DNS
↓
Go Live
```

---

# ROLLBACK PLAN

Jika gagal:

```text
Go Live Fail
↓
Restore Backup
↓
Rollback DNS
↓
Return To v3
```

---

# MIGRATION VALIDATION RULES

Migrasi wajib gagal jika:

```text
Guru Hilang

Siswa Hilang

Nilai Hilang

Kelas Hilang

Mapping Hilang

Term Tidak Valid
```

---

# SUCCESS CRITERIA

## Data

```text
100% Record Migrated
```

---

## Integrity

```text
0 Orphan Record
```

---

## Security

```text
100% RLS Active
```

---

## Performance

```text
Dashboard < 2 sec

Rapor < 5 sec

Workload < 1 sec
```

---

# DELIVERABLES

✓ Migration Scripts

✓ Validation Scripts

✓ Rollback Scripts

✓ Mapping Tables

✓ Migration Logs

✓ Cutover Checklist

✓ Go Live Checklist

✓ Post Migration Report

---

# FINAL RECOMMENDATION

Jangan melakukan migrasi langsung:

```text
v3
→
v4.0
```

sekali jalan.

Gunakan pendekatan:

```text
v3
↓
Database Baru
↓
Dry Run 1
↓
Dry Run 2
↓
UAT
↓
Production
```

Minimal lakukan:

```text
2 kali Dry Run
```

sebelum Go Live agar seluruh transformasi:

```text
Nilai
Rapor
Pembagian Mengajar
Alumni
```

terbukti aman dan dapat direproduksi.
