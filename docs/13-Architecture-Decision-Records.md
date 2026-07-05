# 13-Architecture-Decision-Records.md

# ARCHITECTURE DECISION RECORDS (ADR)

## SIKAD v4.0

Version: 4.0

Status: APPROVED

---

# TUJUAN

Dokumen ini mencatat seluruh keputusan arsitektur utama SIKAD v4.0 beserta alasan teknisnya.

Dokumen ini menjadi referensi resmi ketika:

```text
Developer Baru Masuk

Refactoring

Audit Sistem

Migrasi Teknologi

Evaluasi Arsitektur
```

---

# FORMAT ADR

Setiap keputusan menggunakan format:

```text
ID
Status
Tanggal
Keputusan
Alternatif
Konsekuensi
```

---

# ADR-001

## Supabase Sebagai Backend Platform

Status:

```text
ACCEPTED
```

---

# Keputusan

SIKAD menggunakan:

```text
Supabase
```

sebagai platform backend utama.

---

# Alternatif

```text
Firebase

Laravel

NestJS

ExpressJS
```

---

# Alasan

```text
PostgreSQL Native

RLS Native

Realtime Native

Storage Native

Auth Native

Cepat Dikembangkan
```

---

# Konsekuensi

```text
Ketergantungan pada Supabase

Perlu memahami PostgreSQL dan RLS
```

---

# ADR-002

## PostgreSQL Sebagai Single Source Of Truth

Status:

```text
ACCEPTED
```

---

# Keputusan

Seluruh data akademik disimpan di:

```text
PostgreSQL
```

---

# Tidak Diizinkan

```text
Google Sheet Sebagai Database

File JSON Sebagai Database
```

---

# Alasan

```text
ACID

Referential Integrity

Scalable

Audit Friendly
```

---

# ADR-003

## Dexie Sebagai Offline Database

Status:

```text
ACCEPTED
```

---

# Keputusan

Offline Storage menggunakan:

```text
Dexie.js
```

---

# Alternatif

```text
LocalStorage

SessionStorage

SQLite WASM
```

---

# Alasan

```text
IndexedDB

Mature

Large Dataset

Offline First
```

---

# Konsekuensi

Perlu:

```text
Sync Engine

Conflict Resolution

Version Tracking
```

---

# ADR-004

## Tauri Sebagai Desktop Platform

Status:

```text
ACCEPTED
```

---

# Keputusan

Desktop App menggunakan:

```text
Tauri v2
```

---

# Alternatif

```text
Electron
```

---

# Alasan

```text
Ukuran Build Kecil

Memori Rendah

Keamanan Lebih Baik
```

---

# Target

```text
< 15 MB
```

---

# ADR-005

## UUID Everywhere

Status:

```text
ACCEPTED
```

---

# Keputusan

Semua Primary Key menggunakan:

```text
UUID
```

---

# Tidak Diizinkan

```text
Auto Increment Integer
```

---

# Alasan

```text
Multi Device

Sync Friendly

Distributed Safe
```

---

# ADR-006

## Guru ID = Auth User ID

Status:

```text
ACCEPTED
```

---

# Keputusan

```text
gurus.id
=
auth.users.id
```

---

# Alasan

Mempermudah:

```text
RLS

Audit

Ownership

Authentication
```

---

# ADR-007

## Academic Term Centric Architecture

Status:

```text
ACCEPTED
```

---

# Keputusan

Semua transaksi akademik wajib memiliki:

```text
academic_term_id
```

---

# Berlaku Untuk

```text
kelas

pembagian_mengajar

assessments

kehadiran

rapor
```

---

# Tidak Berlaku Untuk

```text
gurus

siswas

mata_pelajarans
```

---

# Alasan

```text
Multi Tahun Ajaran

Histori

Audit
```

---

# ADR-008

## Kelas Tunggal Dengan ENUM

Status:

```text
ACCEPTED
```

---

# Keputusan

Menggunakan:

```text
kelas
```

tunggal.

---

# ENUM

```text
REAL

DAPO
```

---

# Menggantikan

```text
kelas_real

kelas_bayangan
```

---

# Manfaat

```text
Query Lebih Sederhana

Maintenance Lebih Mudah
```

---

# ADR-009

## Pembagian Mengajar Tunggal

Status:

```text
ACCEPTED
```

---

# Keputusan

Menggunakan:

```text
pembagian_mengajar
```

tunggal.

---

# ENUM

```text
REAL

DAPO
```

---

# Menggantikan

```text
mengajar

mengajar_bayangan
```

---

# ADR-010

## Configurable Assessment

Status:

```text
ACCEPTED
```

---

# Keputusan

Jenis penilaian tidak hardcoded.

---

# Menggunakan

```text
assessment_types
```

---

# Contoh

```text
PH

UH

PTS

PAS

Proyek

Portofolio
```

---

# Alasan

Siap perubahan kurikulum nasional.

---

# ADR-011

## Header Detail Assessment

Status:

```text
ACCEPTED
```

---

# Struktur

```text
assessments
↓
assessment_details
```

---

# Menggantikan

```text
flat nilai table
```

---

# Manfaat

```text
Normalisasi

Skalabilitas

Reporting
```

---

# ADR-012

## Snapshot Based Rapor

Status:

```text
ACCEPTED
```

---

# Keputusan

Rapor final disimpan sebagai:

```text
rapor_snapshots
```

---

# Alasan

```text
Audit

Versioning

Legal Archive
```

---

# ADR-013

## Hybrid Alumni Architecture

Status:

```text
ACCEPTED
```

---

# Struktur

```text
alumni
+
alumni_snapshots
```

---

# Bukan

```text
JSON Only

Table Only
```

---

# Alasan

```text
Performa

Efisiensi Storage

Kemudahan Pencarian
```

---

# ADR-014

## Snapshot Driven Analytics

Status:

```text
ACCEPTED
```

---

# Dashboard Tidak Membaca

```text
assessment_details

kehadiran
```

langsung.

---

# Dashboard Membaca

```text
analytics_snapshots
```

---

# Alasan

```text
Performa

Skalabilitas

Stabilitas
```

---

# ADR-015

## RLS As Primary Security Layer

Status:

```text
ACCEPTED
```

---

# Keputusan

Keamanan utama berada di:

```text
PostgreSQL RLS
```

---

# Bukan

```text
Frontend
```

---

# Alasan

```text
Tidak Bisa Dibypass
```

---

# ADR-016

## Repository Pattern

Status:

```text
ACCEPTED
```

---

# Flow

```text
UI
↓
Hook
↓
Service
↓
Repository
↓
Supabase
```

---

# Alasan

```text
Maintainable

Testable

Modular
```

---

# ADR-017

## Service Layer Business Logic

Status:

```text
ACCEPTED
```

---

# Business Logic

Harus berada pada:

```text
Service Layer
```

---

# Tidak Diizinkan

```text
Business Logic di Component
```

---

# ADR-018

## Offline First Strategy

Status:

```text
ACCEPTED
```

---

# Prioritas

```text
Local Save
↓
Queue
↓
Cloud Sync
```

---

# Bukan

```text
Cloud First
```

---

# Alasan

```text
Kondisi Internet Sekolah Tidak Stabil
```

---

# ADR-019

## Last Write Wins + Conflict Queue

Status:

```text
ACCEPTED
```

---

# Resolusi Konflik

Default:

```text
Last Write Wins
```

---

# Konflik Kompleks

```text
Conflict Queue
```

---

# Alasan

```text
Sederhana

Cepat

Masih Bisa Direview
```

---

# ADR-020

## Snapshot Before Archive

Status:

```text
ACCEPTED
```

---

# Sebelum Archive

Wajib:

```text
Generate Snapshot
```

---

# Alasan

```text
Data Recovery

Audit

Compliance
```

---

# ADR-021

## Dashboard Separation

Status:

```text
ACCEPTED
```

---

# Dashboard Kepala Sekolah

```text
Read Only

Executive
```

---

# Dashboard Kurikulum

```text
Operational

Actionable
```

---

# Alasan

Peran berbeda.

---

# ADR-022

## Export Engine Terpusat

Status:

```text
ACCEPTED
```

---

# Semua Export

Wajib melalui:

```text
Export Engine
```

---

# Tidak Diizinkan

```text
Export Logic Per Modul
```

---

# ADR-023

## Database First Development

Status:

```text
ACCEPTED
```

---

# Urutan Pengembangan

```text
Database
↓
RLS
↓
Service
↓
UI
```

---

# Bukan

```text
UI First
```

---

# ADR-024

## Single Source Of Truth

Status:

```text
ACCEPTED
```

---

# Hierarki Dokumen

```text
PRD
↓
TDD
↓
ERD
↓
Database
↓
Code
```

---

Jika terjadi konflik:

```text
Code Salah
Bukan PRD
```

---

# FINAL ARCHITECTURE PRINCIPLE

SIKAD v4.0 dibangun berdasarkan:

```text
PostgreSQL First

Offline First

RLS First

Snapshot Driven

Academic Term Centric

Configurable Assessment

Hybrid Alumni

Repository Pattern

Service Pattern

Analytics Layer

Enterprise Maintainable
```

---

# CHANGE CONTROL

Perubahan terhadap ADR wajib melalui:

```text
Review Arsitektur
↓
Approval
↓
Update ADR
↓
Update PRD/TDD
↓
Implementasi
```

Tidak diperbolehkan mengubah arsitektur langsung di level kode.
