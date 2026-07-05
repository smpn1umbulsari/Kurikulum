# 15-State-Management-Strategy.md

# STATE MANAGEMENT STRATEGY

## SIKAD v4.0

Version: 4.0

Status: APPROVED

---

# TUJUAN

Dokumen ini mendefinisikan strategi pengelolaan state pada SIKAD v4.0 agar:

```text
Predictable
Maintainable
Offline First
Realtime Ready
Scalable
```

---

# DESIGN PRINCIPLE

## Golden Rule

Gunakan state sekecil mungkin.

---

Jangan menyimpan data di state jika:

```text
Bisa dihitung

Bisa di-query ulang

Bisa dibaca dari cache
```

---

# STATE HIERARCHY

SIKAD menggunakan 4 lapisan state:

```text
React Local State
↓
Zustand
↓
TanStack Query
↓
Dexie Offline Cache
```

---

# STATE RESPONSIBILITY MATRIX

| Layer          | Tujuan           |
| -------------- | ---------------- |
| React State    | UI State         |
| Zustand        | Global App State |
| TanStack Query | Server State     |
| Dexie          | Offline State    |

---

# LAYER 1

## REACT LOCAL STATE

Digunakan untuk:

```text
Modal Open

Drawer Open

Selected Row

Expanded Row

Tab Active

Filter UI
```

---

Contoh:

```typescript
const [open,setOpen] = useState(false)
```

---

Tidak digunakan untuk:

```text
Data Guru

Data Siswa

Data Assessment
```

---

# LAYER 2

## ZUSTAND

Digunakan untuk:

```text
Authentication

Application Settings

Current Academic Term

Sidebar State

Sync Status

Theme
```

---

# AUTH STORE

```typescript
AuthStore
```

---

Menyimpan:

```text
User

Role

Permissions

Session
```

---

# APP STORE

```typescript
AppStore
```

---

Menyimpan:

```text
Current School

Current Academic Term

Global Config
```

---

# UI STORE

```typescript
UiStore
```

---

Menyimpan:

```text
Sidebar

Drawer

Fullscreen
```

---

# SYNC STORE

```typescript
SyncStore
```

---

Menyimpan:

```text
Queue Count

Conflict Count

Last Sync

Online Status
```

---

# YANG DILARANG DI ZUSTAND

```text
Daftar Guru

Daftar Siswa

Daftar Nilai

Daftar Kehadiran
```

---

Alasan:

```text
Server State
```

---

# LAYER 3

## TANSTACK QUERY

Digunakan untuk:

```text
Server State
```

---

# Contoh

```typescript
useQuery()

useMutation()

useInfiniteQuery()
```

---

# Data Yang Wajib Menggunakan Query

```text
Guru

Siswa

Kelas

Pembagian Mengajar

Assessment

Kehadiran

Rapor

Alumni
```

---

# QUERY KEY STANDARD

## Guru

```typescript
["gurus"]
```

---

Detail

```typescript
["guru", id]
```

---

## Siswa

```typescript
["siswas"]
```

---

Detail

```typescript
["siswa", id]
```

---

## Assessment

```typescript
["assessments"]
```

---

Detail

```typescript
["assessment", id]
```

---

# CACHE STRATEGY

## Static Data

```text
30 Menit
```

---

Contoh:

```text
Mata Pelajaran

Roles

Permissions
```

---

## Semi Dynamic

```text
5 Menit
```

---

Contoh:

```text
Guru

Siswa

Kelas
```

---

## Dynamic

```text
30 Detik
```

---

Contoh:

```text
Assessment

Kehadiran

Dashboard
```

---

# MUTATION STRATEGY

Semua mutation menggunakan:

```typescript
useMutation()
```

---

Flow:

```text
Mutate
↓
Invalidate Query
↓
Refetch
```

---

# OPTIMISTIC UPDATE

Digunakan untuk:

```text
Attendance

Assessment Input

Workload Assignment
```

---

Tidak digunakan untuk:

```text
Promotion

Graduation

Archive
```

---

# LAYER 4

## DEXIE OFFLINE CACHE

Digunakan untuk:

```text
Offline Data
```

---

# Tujuan

```text
Offline Read

Offline Write

Sync Queue

Conflict Queue
```

---

# DATA YANG DISIMPAN

```text
Assessment

Assessment Detail

Kehadiran

Workload

Sync Queue
```

---

# TIDAK DISIMPAN

```text
Audit Logs

Analytics Snapshot

Archive Snapshot
```

---

# DATA FLOW

ONLINE

```text
Supabase
↓
TanStack Query
↓
UI
```

---

OFFLINE

```text
Dexie
↓
UI
```

---

SYNC

```text
Dexie
↓
Sync Queue
↓
Supabase
```

---

# CURRENT TERM STRATEGY

Current Academic Term:

```typescript
AppStore
```

---

Karena digunakan hampir seluruh modul.

---

# AUTH STRATEGY

Source:

```text
Supabase Auth
```

---

Mirror:

```text
AuthStore
```

---

# PERMISSION STRATEGY

Source:

```text
Database
```

---

Cache:

```text
AuthStore
```

---

Refresh:

```text
Login

Role Change

Permission Change
```

---

# DASHBOARD STRATEGY

Dashboard tidak membaca:

```text
assessment_details
```

langsung.

---

Dashboard membaca:

```text
analytics_snapshots
```

---

Disimpan menggunakan:

```text
TanStack Query
```

---

# FORM STRATEGY

Library:

```text
React Hook Form
```

---

Form State:

```text
Local State
```

---

Tidak disimpan ke:

```text
Zustand
```

---

# TABLE STRATEGY

Table State:

```text
Pagination

Sorting

Filtering

Column Visibility
```

---

Disimpan:

```text
Local State
```

---

# REALTIME STRATEGY

Source:

```text
Supabase Realtime
```

---

Flow:

```text
Realtime Event
↓
Invalidate Query
↓
Refetch
```

---

Tidak langsung:

```text
Mutasi Zustand
```

---

# OFFLINE FIRST STRATEGY

Saat user menyimpan data:

```text
Save Dexie
↓
Success UI
↓
Queue Sync
↓
Supabase
```

---

Bukan:

```text
Save Supabase
↓
Save Dexie
```

---

# CONFLICT STRATEGY

Jika konflik:

```text
Create Conflict Record
```

---

Simpan ke:

```text
conflict_queue
```

---

Tampilkan pada:

```text
Monitoring Center
```

---

# MEMORY MANAGEMENT

## Query Cache

Auto Cleanup:

```text
30 Menit
```

---

## Dexie Cache

Retention:

```text
90 Hari
```

---

## Sync Queue

Retention:

```text
Until Synced
```

---

# ANTI PATTERN

## Forbidden

```typescript
useEffect(() => {
 loadData()
})
```

---

Gunakan:

```typescript
useQuery()
```

---

## Forbidden

```typescript
Store All Data In Zustand
```

---

Gunakan:

```text
TanStack Query
```

---

## Forbidden

```typescript
Supabase Direct In Component
```

---

Gunakan:

```text
Repository
↓
Service
```

---

# STATE OWNERSHIP

## React State

Owner:

```text
Component
```

---

## Zustand

Owner:

```text
Application
```

---

## Query

Owner:

```text
Server
```

---

## Dexie

Owner:

```text
Offline Engine
```

---

# ACCEPTANCE CRITERIA

✓ No Data Duplication

✓ No Server State In Zustand

✓ Offline First

✓ Realtime Ready

✓ Query Driven

✓ Sync Queue Ready

✓ Conflict Queue Ready

✓ Memory Efficient

✓ Scalable

---

# FINAL STATE PRINCIPLE

SIKAD v4.0 menggunakan prinsip:

```text
React State
Untuk UI

Zustand
Untuk Global State

TanStack Query
Untuk Server State

Dexie
Untuk Offline State
```

Dengan aturan utama:

```text
Jika Data Berasal Dari Server
↓
Gunakan Query

Jika Data Berasal Dari User Interface
↓
Gunakan React State

Jika Data Bersifat Global
↓
Gunakan Zustand

Jika Data Harus Tetap Ada Saat Offline
↓
Gunakan Dexie
```
