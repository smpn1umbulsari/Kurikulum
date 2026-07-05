# 16-Sync-Conflict-Specification.md

# SYNC & CONFLICT SPECIFICATION

## SIKAD v4.0

Version: 4.0

Status: APPROVED

Priority:

```text
CRITICAL
```

---

# TUJUAN

Dokumen ini mendefinisikan arsitektur sinkronisasi offline-first SIKAD v4.0.

Tujuan utama:

```text
Internet Putus ≠ Pekerjaan Hilang

Internet Lambat ≠ Sistem Tidak Bisa Digunakan

Multi Device ≠ Data Rusak
```

---

# DESIGN PRINCIPLE

## Offline First

Prioritas utama:

```text
Local Save
↓
Queue
↓
Cloud Sync
```

---

Bukan:

```text
Cloud Save
↓
Local Save
```

---

# SOURCE OF TRUTH

## Online

```text
PostgreSQL (Supabase)
```

adalah:

```text
Single Source Of Truth
```

---

## Offline

```text
Dexie
```

adalah:

```text
Working Copy
```

---

# CORE COMPONENTS

```text
Dexie Local DB

Sync Queue

Conflict Queue

Sync Engine

Realtime Listener

Monitoring Center
```

---

# HIGH LEVEL FLOW

```text
User Input
     │
     ▼
Dexie Save
     │
     ▼
Sync Queue
     │
     ▼
Sync Engine
     │
     ▼
Supabase
     │
     ▼
Realtime Event
     │
     ▼
Other Devices
```

---

# DEXIE SCHEMA

## sync_queue

```typescript
{
 id:string;
 table_name:string;
 record_id:string;

 operation:
   "INSERT"
 | "UPDATE"
 | "DELETE";

 payload:any;

 version:number;

 created_at:string;

 status:
   "PENDING"
 | "SYNCING"
 | "SYNCED"
 | "FAILED";
}
```

---

# conflict_queue

```typescript
{
 id:string;

 table_name:string;

 record_id:string;

 local_data:any;

 remote_data:any;

 local_version:number;

 remote_version:number;

 conflict_type:string;

 created_at:string;

 resolved:boolean;
}
```

---

# TRACKED MODULES

Wajib masuk Sync Queue:

```text
Assessment

Assessment Detail

Kehadiran

Tugas Tambahan

Catatan Wali Kelas
```

---

Opsional:

```text
User Preference

UI Settings
```

---

Tidak Disinkronkan:

```text
Audit Logs

Analytics Snapshot

System Monitoring
```

---

# RECORD VERSIONING

Semua tabel transaksi wajib memiliki:

```sql
version INTEGER
```

---

Contoh:

```text
Version 1
↓
Update
↓
Version 2
↓
Update
↓
Version 3
```

---

# LAST MODIFIED

Semua tabel transaksi wajib memiliki:

```sql
updated_at
```

---

Digunakan untuk:

```text
Conflict Detection

Sync Ordering

Audit
```

---

# SYNC ENGINE

Lokasi:

```text
src/services/sync
```

---

Komponen:

```text
SyncManager

SyncWorker

ConflictDetector

RetryManager
```

---

# SYNC INTERVAL

## Online

```text
Debounced Batch Sync (30 Detik jeda ketik / 5 Menit berkala)
```

---

## Reconnect

```text
Didebounse 10 Detik
```

---

## Manual

```text
Sync Now Button (Tombol Besar dengan indikator data lokal tertunda)
```

---

# SYNC PRIORITY

Level 1

```text
Assessment Detail
```

---

Level 2

```text
Assessment
```

---

Level 3

```text
Kehadiran
```

---

Level 4

```text
Lainnya
```

---

# BATCH INSERT/UPDATE STRATEGY (BULK OPERATION)

Flow:

```text
Input/Update Nilai Massal di UI
              │
              ▼
Simpan ke Dexie DB Lokal (Instan)
              │
              ▼
Tumpuk Mutasi di Sync Queue (Akumulasi)
              │
              ▼
Picu Sync (Debounce 30s / Tombol Manual)
              │
              ▼
Kirim Satu Panggilan Batch RPC ke Supabase (`bulk_upsert_nilai`)
              │
              ▼
Ubah Status Queue Menjadi SYNCED
```

---

# DELETE STRATEGY

Menggunakan:

```text
Soft Delete
```

---

Bukan:

```text
Hard Delete
```

---

# SOFT DELETE FLOW

```text
deleted_at
```

diisi.

---

Masuk queue.

---

Sinkronisasi ke cloud.

---

# CONFLICT DETECTION

Konflik terjadi jika:

```text
Local Version
≠
Remote Version
```

---

atau

```text
Remote Updated At
>
Local Updated At
```

---

# CONFLICT TYPES

## TYPE 1

Update vs Update

---

## TYPE 2

Update vs Delete

---

## TYPE 3

Delete vs Update

---

## TYPE 4

Schema Conflict

````

Versi aplikasi berbeda.

---

# RESOLUTION STRATEGY

## SIMPLE CONFLICT

Gunakan:

```text
Last Write Wins
````

---

Contoh:

```text
Cloud
08:00

Local
08:05
```

---

Hasil:

```text
Local Menang
```

---

# COMPLEX CONFLICT

Masuk:

```text
Conflict Queue
```

---

Tidak otomatis diselesaikan.

---

# DATA CLASSIFICATION

## LOW RISK

Boleh Last Write Wins.

```text
Catatan

Deskripsi

Komentar
```

---

## MEDIUM RISK

Perlu validasi.

```text
Kehadiran
```

---

## HIGH RISK

Wajib Conflict Queue.

```text
Nilai

Rapor

Promotion

Graduation
```

---

# ASSESSMENT CONFLICT RULE

Jika:

```text
Assessment Finalized
```

---

Maka:

```text
Reject Update
```

---

Buat:

```text
Conflict Queue
```

---

# RAPOR CONFLICT RULE

Jika:

```text
Rapor Finalized
```

---

Tidak boleh:

```text
Overwrite
```

---

Harus:

```text
Conflict Queue
```

---

# PROMOTION CONFLICT RULE

Tidak boleh:

```text
Auto Merge
```

---

Selalu:

```text
Manual Review
```

---

# GRADUATION CONFLICT RULE

Tidak boleh:

```text
Auto Merge
```

---

Selalu:

```text
Manual Review
```

---

# RETRY STRATEGY

Jika jaringan gagal:

```text
1s
↓
5s
↓
15s
↓
60s
↓
60s
↓
60s
```

Loop.

---

# FAILED STRATEGY

Jika:

```text
5 kali gagal
```

---

Status:

```text
FAILED
```

---

Masuk Monitoring.

---

# REALTIME STRATEGY

Source:

```text
Supabase Realtime
```

---

Flow:

```text
Cloud Change
↓
Realtime Event
↓
Invalidate Cache
↓
Refresh UI
```

---

# MULTI DEVICE SCENARIO

Device A:

```text
Laptop
```

---

Device B:

```text
Desktop
```

---

Flow:

```text
A Update
↓
Cloud
↓
Realtime
↓
B Refresh
```

---

# DEVICE REGISTRY

Tabel:

```text
user_devices
```

---

Digunakan untuk:

```text
Monitoring

Debugging

Sync Health
```

---

# CONFLICT CENTER

Lokasi:

```text
Monitoring Center
```

---

Menampilkan:

```text
Conflict ID

Table

Record

User

Time

Status
```

---

# CONFLICT RESOLUTION UI

Pilihan:

## Use Local

```text
Local Menang
```

---

## Use Remote

```text
Cloud Menang
```

---

## Merge Manual

```text
Editor
```

---

# SYNC DASHBOARD

Menampilkan:

```text
Pending Queue

Failed Queue

Conflict Queue

Last Sync

Device Status
```

---

# HEALTH SCORE

Formula:

```text
100
-
Failed Sync
-
Conflict
```

---

Range:

```text
90-100 Healthy

70-89 Warning

<70 Critical
```

---

# OFFLINE INDICATOR

Status:

```text
ONLINE

OFFLINE

SYNCING

CONFLICT
```

---

Harus selalu terlihat.

---

# ACCEPTANCE TESTS

## Test 1

Offline Save

Expected:

```text
Success
```

---

## Test 2

Reconnect

Expected:

```text
Auto Sync
```

---

## Test 3

Multi Device Update

Expected:

```text
Realtime Refresh
```

---

## Test 4

Conflict Create

Expected:

```text
Conflict Queue
```

---

## Test 5

Resolve Conflict

Expected:

```text
Queue Cleared
```

---

# PERFORMANCE TARGET

Queue Processing:

```text
< 3 Detik
```

---

Conflict Detection:

```text
< 500 ms
```

---

Realtime Update:

```text
< 2 Detik
```

---

Offline Save:

```text
< 100 ms
```

---

# ACCEPTANCE CRITERIA

✓ Offline First

✓ Auto Retry

✓ Conflict Detection

✓ Manual Resolution

✓ Multi Device Safe

✓ Realtime Ready

✓ Monitoring Ready

✓ Dexie Compatible

✓ Supabase Compatible

---

# FINAL SYNC PRINCIPLE

SIKAD v4.0 mengadopsi:

```text
Offline First
+
Queue Based Sync
+
Version Based Conflict Detection
+
Last Write Wins
+
Manual Conflict Resolution
```

dengan aturan utama:

```text
Data Tidak Boleh Hilang

Lebih Baik Konflik Terdeteksi
Daripada Konflik Tidak Terlihat

Lebih Baik Queue Menumpuk
Daripada Data Hilang
```


# ADR-025

## Assessment Draft Locking

Status:

```text
ACCEPTED
```

---

# Keputusan

Assessment yang sedang dikerjakan guru akan masuk status:

```text
LOCKED_DRAFT
```

selama sesi editing aktif.

---

# Tujuan

Mengurangi konflik:

```text
Guru A
dan
Guru B
```

yang mengedit assessment yang sama pada waktu bersamaan.

---

# Mekanisme

Saat guru membuka assessment:

```text
Assessment Open
↓
Create Draft Session
↓
Create Lock Record
```

---

Tabel:

```sql
assessment_locks
```

```sql
CREATE TABLE assessment_locks (
    assessment_id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    device_id UUID NOT NULL,
    locked_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);
```

---

# Lock Duration

Default:

```text
15 Menit
```

---

Auto Renew:

```text
Setiap 60 Detik
```

selama pengguna masih aktif.

---

# Lock Expiration

Jika:

```text
Browser Closed

Crash

Internet Putus
```

maka:

```text
expires_at
```

akan menghapus lock secara otomatis.

---

# Behaviour

User lain dapat:

```text
Read
```

tetapi tidak dapat:

```text
Edit
```

selama lock masih aktif.

---

# Result

Mengurangi sebagian besar konflik nilai sebelum masuk Sync Engine.

---

# ADR-026

## Soft Lock Editing

Status:

```text
ACCEPTED
```

---

# Keputusan

Sistem menerapkan:

```text
Soft Lock
```

untuk transaksi akademik kritis.

---

# Scope

```text
Assessment

Assessment Detail

Kehadiran

Rapor Draft
```

---

# Hard Lock vs Soft Lock

Hard Lock:

```text
Tidak Bisa Dibuka User Lain
```

---

Soft Lock:

```text
Masih Bisa Dibuka
Read Only
```

---

# UI Behaviour

Saat record sedang diedit:

```text
🔒 Sedang Diedit Oleh:
Nama Guru

Jam:
08:15
```

ditampilkan pada layar.

---

# Override

Hanya role:

```text
ADMIN
KURIKULUM
```

yang dapat melakukan:

```text
Force Unlock
```

---

# Audit

Setiap Force Unlock dicatat ke:

```text
audit_logs
```

---

# Manfaat

```text
Mengurangi Konflik

Meningkatkan Konsistensi Data
```

---

# KEBIJAKAN CACHE & EFISIENSI KUOTA SUPABASE

Untuk meminimalkan transaksi database ke Supabase dan menghemat kuota operasional:

## 1. Kebijakan Cache-Aside Master Data
- **Tabel Statis:** `academic_terms`, `gurus`, `siswas`, `mata_pelajarans` hanya diunduh sekali di awal sesi.
- **Penyimpanan:** Data master disimpan di Dexie.js database lokal.
- **Aturan Akses:** Aplikasi dilarang melakukan query langsung (`SELECT`) ke Supabase untuk data master tersebut. Semua pembacaan dilakukan dari Dexie DB lokal.

## 2. Penghematan Transaksi Baca (Read Quota)
- Dasbor analitik membaca data agregasi dari `analytics_snapshots` (JSONB) yang diperbarui terjadwal, bukan menghitung ulang query `kehadiran` dan `assessments` secara langsung.
- Data riwayat akademik alumni disimpan secara permanen di database lokal IndexedDB setelah penutupan term ajaran.

