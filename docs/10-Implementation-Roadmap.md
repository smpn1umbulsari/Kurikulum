# 10-Implementation-Roadmap.md

# IMPLEMENTATION ROADMAP

## SIKAD v4.0

Version: 4.0

Status: APPROVED

Estimated Duration:

```text
10 – 14 Minggu
```

---

# IMPLEMENTATION PRINCIPLE

Jangan membangun berdasarkan menu.

Bangun berdasarkan dependency.

---

# PHASE 0

## Foundation Setup

Durasi:

```text
1 Minggu
```

---

# Deliverables

```text
Project Structure

Supabase Project

GitHub Repository

CI/CD

Dexie Setup

Authentication Setup
```

---

# Output

```text
Login Berfungsi
Environment Siap
```

---

# PHASE 1

## Security & Quota Foundation

Durasi:

```text
1 Minggu
```

---

# Implement

```text
Roles

Permissions

User Roles

RLS Policies

Audit Logs

Supabase Quota & Transaction Audits
```

---

# Output

```text
Security & Transaction Layer Aktif
```

---

# PHASE 2

## Master Data

Durasi:

```text
1 Minggu
```

---

# Implement

```text
Guru

Siswa

Academic Term

Mata Pelajaran
```

---

# Output

```text
Master Data Stabil
```

---

# PHASE 3

## Academic Structure

Durasi:

```text
1 Minggu
```

---

# Implement

```text
Kelas

Riwayat Kelas

Pembagian Mengajar
```

---

# Output

```text
Struktur Akademik Aktif
```

---

# PHASE 4

## Teacher Workload Engine

Durasi:

```text
1 Minggu
```

---

# Implement

```text
Tugas Tambahan

Workload Engine

Workload View

Workload Snapshot
```

---

# Output

```text
Rekap JP Berfungsi
```

---

# PHASE 5

## Assessment Engine

Durasi:

```text
2 Minggu
```

---

# Implement

```text
Assessment Types

Assessments

Assessment Details

Assessment Finalization

Configurable Assessment
```

---

# Output

```text
Input Nilai Stabil
```

---

# PHASE 6

## Attendance Engine

Durasi:

```text
1 Minggu
```

---

# Implement

```text
Kehadiran

Attendance Summary

Analytics Trigger
```

---

# Output

```text
Absensi Berfungsi
```

---

# PHASE 7

## Rapor Engine

Durasi:

```text
1 Minggu
```

---

# Implement

```text
Rapor Snapshot

Catatan Wali Kelas

Finalization

Versioning
```

---

# Output

```text
Rapor Berfungsi
```

---

# PHASE 8

## Promotion & Graduation

Durasi:

```text
1 Minggu
```

---

# Implement

```text
Promotion Engine

Graduation Engine

Alumni Engine

Archive Engine
```

---

# Output

```text
Naik Kelas & Lulus
```

---

# PHASE 9

## Offline First & Quota Optimization Layer

Durasi:

```text
1 Minggu
```

---

# Implement

```text
Dexie Schema

Sync Queue

Conflict Queue

Retry Strategy

Batch/Bulk Sync RPC (`bulk_upsert_nilai`)

Debounced Sync Algorithm (30s)

Cache-aside read storage for master tables
```

---

# Output

```text
Offline & Quota Optimized Sync Working
```

---

# PHASE 10

## Reporting & Dashboard

Durasi:

```text
1 Minggu
```

---

# Implement

```text
Analytics Engine

Dashboard Kurikulum

Dashboard Kepala Sekolah
```

---

# Output

```text
Monitoring Aktif
```

---

# PHASE 11

## Export Engine

Durasi:

```text
3 Hari
```

---

# Implement

```text
Excel Export

PDF Export

ZIP Export
```

---

# Output

```text
Dokumen Siap Cetak
```

---

# PHASE 12

## Migration

Durasi:

```text
3–5 Hari
```

---

# Implement

```text
Migration Scripts

Validation Scripts

Dry Run 1

Dry Run 2
```

---

# Output

```text
Database v4.0 Terisi
```

---

# PHASE 13

## UAT

Durasi:

```text
1 Minggu
```

---

# Peserta

```text
Admin

Kurikulum

Guru

Wali Kelas

Kepala Sekolah
```

---

# Output

```text
UAT Approved
```

---

# PHASE 14

## Production Release

Durasi:

```text
2 Hari
```

---

# Checklist

```text
Backup

Migration

Deployment

Smoke Test

Monitoring
```

---

# Output

```text
Go Live
```

---

# PHASE 15

## User Onboarding & CS Training

Durasi:

```text
1 Minggu
```

---

# Implement

```text
Elderly User Accessibility Onboarding

Action-First Beranda Layout Training

Video Guide Walkthrough Deployment

Teacher System Adoption Monitoring
```

---

# Output

```text
Guru Lansia Nyaman Menggunakan & Adopsi Sistem Tinggi
```

---

# CRITICAL PATH

```text
Authentication
↓
RLS
↓
Academic Term
↓
Kelas
↓
Pembagian Mengajar
↓
Assessment
↓
Rapor
↓
Promotion
↓
Graduation
```

---

# NON-CRITICAL PATH

```text
Export

Dashboard

Analytics
```

---

# RISK MATRIX

## HIGH

```text
Assessment Migration

Rapor Migration

Sync Engine

RLS
```

---

## MEDIUM

```text
Dashboard

Reporting

Export
```

---

## LOW

```text
Master Data
```

---

# TEAM ALLOCATION

## AI Agent A

```text
Database
Migration
RLS
```

---

## AI Agent B

```text
Frontend
UI
Forms
```

---

## AI Agent C

```text
Business Logic
Services
Testing
```

---

## AI Agent D

```text
QA
UAT
Documentation
```

---

# FINAL DEFINITION OF READY

Sebelum coding dimulai harus tersedia:

```text
✓ PRD

✓ TDD

✓ ERD

✓ Database Dictionary

✓ API Specification

✓ RLS Specification

✓ Migration Plan

✓ Deployment Architecture

✓ Testing Strategy
```

---

# FINAL DEFINITION OF DONE

SIKAD v4.0 dinyatakan selesai apabila:

```text
✓ Semua Modul Implemented

✓ Semua Test Passed

✓ RLS Active

✓ Offline Sync Stable

✓ Migration Successful

✓ UAT Approved

✓ Production Stable 14 Hari
```

---

# RECOMMENDATION

Untuk proyek SIKAD v4.0, urutan implementasi paling aman adalah:

```text
Database First
↓
Security First
↓
Business Engine
↓
UI Layer
↓
Offline Layer
↓
Analytics
↓
Migration
↓
Go Live
```

Bukan:

```text
UI First
↓
Database Belakangan
```

karena sebagian besar kompleksitas SIKAD berada pada model data, RLS, sinkronisasi offline, dan engine akademiknya.
