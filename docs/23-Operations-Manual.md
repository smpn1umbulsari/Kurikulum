# 23-Operations-Manual.md

# OPERATIONS MANUAL

## SIKAD v4.0

Version: 4.0

Status: APPROVED

Audience:

```text
System Administrator
Operator Sekolah
Tim Kurikulum
Technical Support
```

---

# TUJUAN

Dokumen ini menjelaskan prosedur operasional harian, mingguan, bulanan, semesteran, dan tahunan untuk menjalankan SIKAD v4.0 secara aman dan konsisten.

---

# OPERATIONAL ROLES

## Kepala Sekolah

Responsibilities:

```text
Monitoring KPI

Monitoring Progress Akademik

Approval Operasional Strategis
```

---

## Kurikulum

Responsibilities:

```text
Academic Term

Kelas

Pembagian Mengajar

Assessment

Rapor

Promosi

Kelulusan
```

---

## Admin Sistem

Responsibilities:

```text
User Management

Role Management

Monitoring

Backup

Recovery
```

---

## Guru

Responsibilities:

```text
Input Nilai

Input Kehadiran

Monitoring Progress
```

---

# DAILY OPERATIONS

## Start Of Day Checklist

Waktu:

```text
06:00 - 07:00
```

---

Checklist:

```text
[ ] Database Online

[ ] API Online

[ ] Sync Engine Healthy

[ ] No Failed Queue

[ ] No Critical Alert

[ ] Academic Term Active
```

---

# Dashboard Monitoring

Admin wajib memeriksa:

```text
System Health

Database Health

Sync Health

Conflict Queue
```

---

Target:

```text
System Health ≥ 90
```

---

# User Login Monitoring

Periksa:

```text
Failed Login

Suspicious Device

Security Event
```

---

# Sync Queue Monitoring

Target:

```text
Pending Queue < 100
```

---

Target:

```text
Failed Queue = 0
```

---

Jika:

```text
Failed Queue > 0
```

Lakukan:

```text
Investigasi
```

---

# Conflict Queue Monitoring

Target:

```text
Conflict Queue < 10
```

---

Jika:

```text
Conflict Queue > 10
```

Lakukan:

```text
Review Konflik
```

---

# DAILY ACADEMIC OPERATIONS

## Guru

Memastikan:

```text
Assessment Draft

Assessment Finalization

Attendance Submission
```

berjalan normal.

---

## Wali Kelas

Memastikan:

```text
Catatan Wali Kelas

Monitoring Kehadiran
```

berjalan normal.

---

## Kurikulum

Memastikan:

```text
Monitoring Progress Penilaian

Monitoring Beban Mengajar
```

---

# DAILY INCIDENT RESPONSE

Jika ditemukan:

```text
Critical Alert
```

Maka:

```text
1. Catat Incident

2. Analisis

3. Tentukan Severity

4. Eskalasi
```

---

# WEEKLY OPERATIONS

Waktu:

```text
Jumat
```

atau

```text
Sabtu
```

---

# Weekly Checklist

```text
[ ] Review Audit Logs

[ ] Review Export Logs

[ ] Review Security Events

[ ] Review Slow Queries

[ ] Review Storage Usage
```

---

# Weekly Sync Review

Periksa:

```text
Average Sync Time

Conflict Trend

Failed Queue Trend
```

---

# Weekly User Review

Periksa:

```text
Guru Aktif

User Nonaktif

Device Aktif
```

---

# Weekly Performance Review

Review:

```text
Dashboard Performance

Assessment Performance

Attendance Performance

Export Performance
```

---

# MONTHLY OPERATIONS

## Capacity Review

Periksa:

```text
Database Size

Storage Size

Growth Rate
```

---

## Security Review

Review:

```text
Failed Login

Permission Changes

Export Activity

RLS Violations
```

---

## Device Review

Periksa:

```text
Registered Devices

Inactive Devices

Suspicious Devices
```

---

# Backup Validation

Periksa:

```text
Backup Status

Backup Size

Restore Availability
```

---

# SEMESTER OPERATIONS

## Semester Preparation

Checklist:

```text
[ ] Assessment Types Valid

[ ] Academic Term Valid

[ ] Kelas Valid

[ ] Pembagian Mengajar Valid
```

---

# Mid Semester Review

Periksa:

```text
Assessment Completion

Attendance Completion

Teacher Workload
```

---

# End Semester Review

Periksa:

```text
Rapor Completion

Assessment Completion

Attendance Completion
```

---

# RAPOR OPERATIONS

## Generate Rapor

Role:

```text
Wali Kelas
```

---

Checklist:

```text
[ ] Nilai Lengkap

[ ] Kehadiran Lengkap

[ ] Catatan Lengkap
```

---

# Finalisasi Rapor

Setelah finalisasi:

```text
Snapshot Generated
```

---

Tidak boleh:

```text
Edit Langsung
```

---

# PROMOTION OPERATIONS

## Promotion Preview

Role:

```text
Kurikulum
```

---

Validasi:

```text
Jumlah Siswa

Status Siswa

Tujuan Kelas
```

---

# Promotion Execution

Wajib:

```text
Generate Snapshot
```

sebelum eksekusi.

---

# GRADUATION OPERATIONS

## Graduation Preview

Validasi:

```text
Siswa Aktif

Status Kelulusan

Data Akademik
```

---

# Graduation Execution

Wajib:

```text
Create Alumni

Create Snapshot
```

---

# ARCHIVE OPERATIONS

## Archive Preparation

Pastikan:

```text
Promotion Selesai

Graduation Selesai

Snapshot Tersimpan
```

---

# Archive Execution

Tujuan:

```text
Mengurangi Beban Data Operasional
```

---

# USER MANAGEMENT OPERATIONS

## Create User

Role:

```text
Admin
```

---

Flow:

```text
Create Auth User
↓
Create Guru Record
↓
Assign Role
```

---

# Disable User

Jika:

```text
Guru Mutasi

Pensiun

Keluar
```

---

Lakukan:

```text
Deactivate
```

---

Bukan:

```text
Delete
```

---

# ROLE MANAGEMENT OPERATIONS

Perubahan role harus:

```text
Tercatat Audit Log
```

---

Tidak boleh:

```text
Direct Database Update
```

---

# DEVICE MANAGEMENT

## Register Device

Saat login pertama:

```text
Create Device Record
```

---

# Remove Device

Jika:

```text
Device Hilang

Device Diganti
```

---

Admin dapat:

```text
Revoke Device
```

---

# MONITORING OPERATIONS

## Daily

```text
System Health
```

---

## Weekly

```text
Performance Review
```

---

## Monthly

```text
Trend Analysis
```

---

# SECURITY OPERATIONS

## Failed Login Investigation

Jika:

```text
>10 Failed Login
```

per user.

---

Lakukan:

```text
Investigasi
```

---

# Mass Export Investigation

Jika:

```text
Export Besar
```

dalam waktu singkat.

---

Lakukan:

```text
Review Audit
```

---

# BACKUP OPERATIONS

## Daily

```text
Verify Backup Success
```

---

## Weekly

```text
Review Backup Logs
```

---

## Monthly

```text
Restore Validation
```

---

# RECOVERY OPERATIONS

Jika:

```text
Data Corruption
```

---

Gunakan:

```text
20-Backup-Recovery-Runbook.md
```

---

# CHANGE MANAGEMENT

## Minor Change

Contoh:

```text
Bug Fix
```

---

Approval:

```text
Technical Lead
```

---

## Major Change

Contoh:

```text
Database Schema

Security

Academic Logic
```

---

Approval:

```text
Technical Lead
+
Kurikulum
```

---

# INCIDENT MANAGEMENT

## Severity P1

Examples:

```text
Database Down

Auth Down

Sync Down
```

---

Response:

```text
Immediate
```

---

## Severity P2

Examples:

```text
Export Failure

Dashboard Failure
```

---

Response:

```text
<1 Jam
```

---

## Severity P3

Examples:

```text
Minor Bug
```

---

Response:

```text
<24 Jam
```

---

# OPERATIONAL REPORTING

## Daily Report

Isi:

```text
System Health

Sync Health

Security Events
```

---

## Weekly Report

Isi:

```text
Performance

Conflict Trend

Audit Summary
```

---

## Monthly Report

Isi:

```text
Capacity

Security

Growth

Incidents
```

---

# GO LIVE OPERATIONS

Sebelum Go Live:

```text
[ ] UAT Pass

[ ] Backup Verified

[ ] Monitoring Active

[ ] Security Validated

[ ] Rollback Plan Available
```

---

# POST GO LIVE OPERATIONS

Hari 1:

```text
Monitoring Intensif
```

---

Hari 2-7:

```text
Daily Review
```

---

Hari 8-30:

```text
Weekly Review
```

---

# OPERATIONAL KPI

## Availability

Target:

```text
99%
```

---

## Failed Queue

Target:

```text
0
```

---

## Critical Incident

Target:

```text
0
```

---

## Backup Success

Target:

```text
100%
```

---

# ACCEPTANCE CRITERIA

✓ Daily Operations Defined

✓ Weekly Operations Defined

✓ Monthly Operations Defined

✓ Semester Operations Defined

✓ Promotion Operations Defined

✓ Graduation Operations Defined

✓ Archive Operations Defined

✓ Security Operations Defined

✓ Monitoring Operations Defined

✓ Recovery Operations Defined

---

# FINAL OPERATIONS PRINCIPLE

SIKAD v4.0 bukan sekadar aplikasi.

SIKAD adalah:

```text
Mission Critical Academic System
```

Karena itu operasional harus mengikuti prinsip:

```text
Monitor Continuously
↓
Detect Early
↓
Respond Quickly
↓
Recover Safely
↓
Improve Continuously
```

dan bukan:

```text
Tunggu Keluhan
↓
Baru Investigasi
↓
Baru Perbaiki
```
