# 20-Backup-Recovery-Runbook.md

# BACKUP & RECOVERY RUNBOOK

## SIKAD v4.0

Version: 4.0

Status: APPROVED

Priority:

```text
CRITICAL
```

---

# TUJUAN

Dokumen ini mendefinisikan prosedur:

```text
Backup

Restore

Recovery

Disaster Recovery

Business Continuity
```

untuk memastikan:

```text
Data Tidak Hilang

Operasional Cepat Pulih

Audit Terjamin

Go Live Aman
```

---

# RECOVERY OBJECTIVES

## RPO

Recovery Point Objective

Target:

```text
24 Jam
```

Maksimum kehilangan data:

```text
≤ 24 Jam
```

---

## RTO

Recovery Time Objective

Target:

```text
4 Jam
```

Maksimum downtime:

```text
≤ 4 Jam
```

---

# BACKUP STRATEGY

## Rule Utama

Tidak ada data penting yang hanya berada pada:

```text
Browser

Laptop Guru

Device User
```

---

Data wajib tersimpan di:

```text
Supabase PostgreSQL
```

dan memiliki backup.

---

# DATA CLASSIFICATION

## Tier 1

Critical

```text
Users

Roles

Permissions

Guru

Siswa

Kelas

Pembagian Mengajar

Assessment

Assessment Detail

Kehadiran

Rapor

Promotion

Graduation
```

---

## Tier 2

Important

```text
Audit Logs

Monitoring Logs

Export Logs

Analytics Snapshot
```

---

## Tier 3

Recoverable

```text
Cache

Dexie

Temporary Export
```

---

# BACKUP SCOPE

Wajib dibackup:

```text
Database

Storage

Migration

Configuration

Source Code
```

---

# DATABASE BACKUP

Source:

```text
PostgreSQL
```

---

Frequency:

```text
Daily
```

---

Time:

```text
02:00 WIB
```

---

Retention:

```text
30 Hari
```

---

# WEEKLY SNAPSHOT

Frequency:

```text
Weekly
```

---

Retention:

```text
12 Minggu
```

---

# MONTHLY SNAPSHOT

Frequency:

```text
Monthly
```

---

Retention:

```text
12 Bulan
```

---

# YEARLY SNAPSHOT

Frequency:

```text
Yearly
```

---

Retention:

```text
Permanent
```

---

# STORAGE BACKUP

Backup:

```text
Rapor PDF

Dokumen

Archive

Export
```

---

Frequency:

```text
Daily
```

---

Retention:

```text
30 Hari
```

---

# SOURCE CODE BACKUP

Repository:

```text
GitHub
```

---

Branches:

```text
main

staging

develop
```

---

Backup:

```text
Mirror Repository
```

---

Frequency:

```text
Weekly
```

---

# CONFIGURATION BACKUP

Backup:

```text
Supabase Config

RLS Policies

Environment Template

Deployment Config
```

---

Location:

```text
Private Repository
```

---

# BACKUP ENCRYPTION

Algorithm:

```text
AES-256
```

---

Required For:

```text
Database Backup

Storage Backup
```

---

# BACKUP VALIDATION

## Rule

Backup tidak dianggap valid hanya karena berhasil dibuat.

---

Backup harus:

```text
Berhasil Direstore
```

---

# VALIDATION SCHEDULE

Monthly:

```text
Restore Test
```

---

Quarterly:

```text
Full Disaster Recovery Test
```

---

# RESTORE PROCEDURE

## Scenario 1

Human Error

Contoh:

```text
Data Terhapus

Data Rusak
```

---

Steps:

```text
1. Identifikasi Tabel

2. Identifikasi Waktu

3. Restore Backup

4. Validasi Data

5. Audit
```

---

Target:

```text
< 1 Jam
```

---

# SCENARIO 2

Database Corruption

---

Symptoms:

```text
Data Tidak Konsisten

Foreign Key Rusak

Migration Gagal
```

---

Procedure:

```text
1. Lock Sistem

2. Backup Current State

3. Restore Snapshot

4. Validate

5. Reopen Access
```

---

Target:

```text
< 4 Jam
```

---

# SCENARIO 3

Supabase Outage

---

Procedure:

```text
1. Verify Outage

2. Inform Admin

3. Freeze Critical Operations

4. Monitor Recovery

5. Resume Service
```

---

Target:

```text
Mengikuti SLA Supabase
```

---

# SCENARIO 4

Accidental Migration Failure

---

Symptoms:

```text
Missing Tables

Broken Views

Failed Constraints
```

---

Procedure:

```text
1. Stop Deployment

2. Rollback Migration

3. Restore Snapshot

4. Validate Schema
```

---

Target:

```text
< 2 Jam
```

---

# SCENARIO 5

Storage Bucket Corruption

---

Procedure:

```text
1. Lock Upload

2. Restore Storage Backup

3. Verify Documents

4. Reopen Upload
```

---

# SCENARIO 6

RLS Policy Failure

---

Symptoms:

```text
Unauthorized Access

Access Denied Everywhere
```

---

Procedure:

```text
1. Disable New Deployments

2. Restore Previous Policy Version

3. Run Security Validation

4. Reopen Access
```

---

# SCENARIO 7

Sync Engine Failure

---

Symptoms:

```text
Queue Menumpuk

Sync Tidak Jalan
```

---

Procedure:

```text
1. Pause Sync

2. Backup Queue

3. Fix Root Cause

4. Replay Queue

5. Validate
```

---

# SCENARIO 8

Conflict Queue Explosion

Definition:

```text
Conflict Queue > 100
```

---

Procedure:

```text
1. Stop Auto Sync

2. Analyze Pattern

3. Resolve Conflict

4. Resume Sync
```

---

# DISASTER RECOVERY

## Level P1

Critical

Examples:

```text
Database Down

Auth Down

Data Corruption
```

---

Response:

```text
Immediate
```

---

Target:

```text
15 Menit
```

---

# LEVEL P2

High

Examples:

```text
Export Failure

Monitoring Failure

Storage Failure
```

---

Target:

```text
1 Jam
```

---

# LEVEL P3

Medium

Examples:

```text
UI Bug

Minor Sync Issue
```

---

Target:

```text
24 Jam
```

---

# RECOVERY CHECKLIST

## Database

```text
✓ Tables Exist

✓ Constraints Exist

✓ Indexes Exist

✓ Views Exist
```

---

## Security

```text
✓ RLS Active

✓ Auth Working

✓ Audit Active
```

---

## Application

```text
✓ Login Working

✓ Assessment Working

✓ Attendance Working

✓ Rapor Working
```

---

## Sync

```text
✓ Queue Processing

✓ Conflict Detection

✓ Realtime Working
```

---

# POST RECOVERY VALIDATION

Mandatory:

```text
User Login

Assessment Save

Attendance Save

Generate Rapor

Export PDF

Sync Test
```

---

# RECOVERY TEAM

## Incident Commander

Responsibilities:

```text
Decision Making

Communication

Approval
```

---

## Database Lead

Responsibilities:

```text
Restore

Migration

Validation
```

---

## Application Lead

Responsibilities:

```text
Frontend

Backend

Testing
```

---

## Security Lead

Responsibilities:

```text
Audit

RLS

Access Validation
```

---

# COMMUNICATION PLAN

## Internal

```text
Admin

Kurikulum

Kepala Sekolah
```

---

## Status Levels

```text
Investigating

Identified

Recovering

Resolved
```

---

# BUSINESS CONTINUITY

Jika cloud tidak tersedia:

```text
Guru Tetap Input Data
↓
Dexie Offline
↓
Queue
↓
Sync Setelah Online
```

---

Tujuan:

```text
Proses Pembelajaran Tetap Berjalan
```

---

# ARCHIVE STRATEGY

Sebelum:

```text
Promotion

Graduation

Archive
```

---

Wajib:

```text
Generate Snapshot
```

---

Snapshot menjadi:

```text
Recovery Point
```

---

# BACKUP AUDIT

Track:

```text
Backup Created

Backup Failed

Restore Started

Restore Completed

Restore Failed
```

---

Tabel:

```sql
backup_logs
```

---

Fields:

```text
id

backup_type

started_at

completed_at

status

file_size

created_by
```

---

# AUTOMATED HEALTH CHECK

Daily:

```text
Backup Success

Storage Health

Database Health

Queue Health
```

---

Alert jika:

```text
Backup Gagal
```

---

# ACCEPTANCE CRITERIA

✓ Daily Backup

✓ Weekly Snapshot

✓ Monthly Snapshot

✓ Yearly Snapshot

✓ Encrypted Backup

✓ Restore Tested

✓ Disaster Recovery Tested

✓ Queue Recovery Available

✓ Audit Trail Available

✓ Business Continuity Available

---

# RECOVERY MATURITY MODEL

Level 1

```text
Manual Backup
```

---

Level 2

```text
Automated Backup
```

---

Level 3

```text
Automated Backup
+
Restore Validation
```

---

Target SIKAD v4.0:

```text
Level 3
```

---

# FINAL BACKUP PRINCIPLE

SIKAD v4.0 mengadopsi prinsip:

```text
Backup Is Useless
If Restore Has Never Been Tested
```

dan:

```text
Every Critical Data
Must Exist
In At Least
Two Independent Locations
```

serta:

```text
Recovery Is A Feature

Not A Documentation Exercise
```
