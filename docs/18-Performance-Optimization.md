# 18-Performance-Optimization.md

# PERFORMANCE OPTIMIZATION

## SIKAD v4.0

Version: 4.0

Status: APPROVED

Priority:

```text
CRITICAL
```

---

# TUJUAN

Dokumen ini mendefinisikan standar performa SIKAD v4.0 untuk memastikan sistem tetap responsif pada kondisi:

```text
100+ Guru

1500+ Siswa

100.000+ Record Nilai

Multi Device

Realtime Active

Offline Sync Active
```

---

# PERFORMANCE PRINCIPLE

## Rule #1

Jangan optimasi frontend jika masalah ada di database.

---

## Rule #2

Jangan optimasi database jika masalah ada di query.

---

## Rule #3

Dashboard tidak boleh membaca tabel transaksi besar secara langsung.

---

## Rule #4

Lebih baik membuat snapshot daripada menghitung ulang 100.000 record.

---

# PERFORMANCE TARGETS

| Feature          | Target  |
| ---------------- | ------- |
| Login            | < 2s    |
| Dashboard        | < 2s    |
| Open Assessment  | < 1s    |
| Save Assessment  | < 500ms |
| Attendance Save  | < 300ms |
| Generate Rapor   | < 5s    |
| Export PDF Kelas | < 30s   |
| Offline Save     | < 100ms |
| Queue Sync       | < 3s    |
| Realtime Refresh | < 2s    |

---

# DATABASE PERFORMANCE

## Golden Rule

```text
Database First Optimization
```

---

# INDEX STRATEGY

Semua Foreign Key wajib memiliki index.

---

Contoh:

```sql
CREATE INDEX idx_assessment_guru
ON assessments(guru_id);

CREATE INDEX idx_assessment_kelas
ON assessments(kelas_id);

CREATE INDEX idx_assessment_term
ON assessments(academic_term_id);
```

---

# COMPOSITE INDEX

Assessment Query:

```sql
CREATE INDEX idx_assessment_lookup
ON assessments(
  academic_term_id,
  guru_id,
  kelas_id
);
```

---

Attendance Query:

```sql
CREATE INDEX idx_attendance_lookup
ON attendances(
 academic_term_id,
 kelas_id,
 tanggal
);
```

---

# PARTIAL INDEX

Untuk data aktif:

```sql
CREATE INDEX idx_siswa_active
ON siswas(status)
WHERE status='AKTIF';
```

---

# QUERY OPTIMIZATION

## Forbidden

```sql
SELECT *
```

---

Gunakan:

```sql
SELECT
id,
nama,
nip
```

---

# Pagination

Wajib.

---

Forbidden:

```sql
SELECT semua siswa
```

---

Gunakan:

```sql
LIMIT 50
OFFSET 0
```

---

# CURSOR PAGINATION

Untuk:

```text
Audit Logs

Export Logs

Monitoring Logs
```

---

Gunakan:

```sql
created_at
```

sebagai cursor.

---

# MATERIALIZED VIEW STRATEGY

Digunakan untuk:

```text
Analytics

Dashboard

Workload Summary
```

---

# dashboard_summary_mv

Berisi:

```text
Jumlah Guru

Jumlah Siswa

Jumlah Kelas

Jumlah Assessment
```

---

Refresh:

```text
Setiap 1 Jam
```

---

# workload_summary_mv

Berisi:

```text
Total JP

JP Tambahan

Total Beban
```

---

Refresh:

```text
Setiap 15 Menit
```

---

# SNAPSHOT STRATEGY

## Dashboard

Tidak membaca:

```text
assessment_details
```

langsung.

---

Membaca:

```text
analytics_snapshots
```

---

# ANALYTICS SNAPSHOT

Tabel:

```sql
analytics_snapshots
```

---

Berisi:

```text
Daily KPI

Monthly KPI

Semester KPI
```

---

# APPLICATION PERFORMANCE

## React Strategy

Gunakan:

```text
React.memo
```

untuk:

```text
Table

Chart

Heavy Components
```

---

# Memoization

Gunakan:

```typescript
useMemo()

useCallback()
```

---

Untuk:

```text
Expensive Calculation
```

---

# Lazy Loading

Semua halaman besar wajib:

```typescript
React.lazy()
```

---

Modul:

```text
Analytics

Dashboard

Monitoring

Archive
```

---

# ROUTE SPLITTING

Wajib.

---

Contoh:

```typescript
const AssessmentPage =
lazy(...)
```

---

# TABLE PERFORMANCE

Library:

```text
TanStack Table
```

---

# Virtualization

Gunakan:

```text
TanStack Virtual
```

---

Untuk:

```text
> 100 Rows
```

---

# SEARCH PERFORMANCE

Gunakan:

```typescript
debounce(300)
```

---

Untuk:

```text
Search Guru

Search Siswa

Search Assessment
```

---

# CACHE STRATEGY

## Query Cache

Static:

```text
30 Menit
```

---

Semi Dynamic:

```text
5 Menit
```

---

Dynamic:

```text
30 Detik
```

---

# PREFETCH STRATEGY

Saat membuka:

```text
Daftar Assessment
```

---

Prefetch:

```text
Assessment Detail
```

---

Saat membuka:

```text
Daftar Kelas
```

---

Prefetch:

```text
Daftar Siswa
```

---

# DEXIE PERFORMANCE

## Local Read

Target:

```text
< 50 ms
```

---

## Local Write

Target:

```text
< 100 ms
```

---

# BULK OPERATION

Gunakan:

```typescript
bulkPut()
```

---

Bukan:

```typescript
for(...)
put()
```

---

# SYNC PERFORMANCE

## Batch Sync

Default:

```text
50 Record
```

per batch.

---

Maximum:

```text
200 Record
```

---

# Queue Processing

Target:

```text
< 3 Detik
```

---

# REALTIME PERFORMANCE

Realtime digunakan hanya untuk:

```text
Assessment

Attendance

Monitoring
```

---

Tidak digunakan untuk:

```text
Analytics

Archive

Export
```

---

# DASHBOARD PERFORMANCE

## Forbidden

Dashboard Query:

```sql
COUNT(*)
```

pada tabel besar setiap refresh.

---

Gunakan:

```text
analytics_snapshots
```

---

# KPI STRATEGY

Refresh:

```text
5 Menit
```

---

Bukan:

```text
Realtime
```

---

# EXPORT PERFORMANCE

## PDF

Gunakan:

```text
Background Job
```

---

Untuk:

```text
> 40 Rapor
```

---

# Excel

Gunakan:

```text
Streaming Export
```

---

Untuk:

```text
> 5000 Rows
```

---

# ATTENDANCE PERFORMANCE

Input:

```text
Bulk Save
```

---

Bukan:

```text
1 Request
Per Siswa
```

---

# ASSESSMENT PERFORMANCE

Input nilai:

```text
Bulk Update
```

---

Bukan:

```text
Update Per Cell
```

ke server.

---

# LOCKING PERFORMANCE

## Assessment Lock

TTL:

```text
15 Menit
```

---

Renew:

```text
60 Detik
```

---

Expired Lock Cleanup:

```text
5 Menit
```

---

# ARCHIVE PERFORMANCE

Archive Query:

```text
Read Snapshot
```

---

Bukan:

```text
Recalculate History
```

---

# MONITORING PERFORMANCE

## Metrics

Track:

```text
Query Time

API Time

Sync Time

Export Time

Render Time
```

---

# SLOW QUERY THRESHOLD

Warning:

```text
> 500 ms
```

---

Critical:

```text
> 1000 ms
```

---

# FRONTEND BUNDLE

Target:

```text
Initial JS < 500 KB
```

---

# Tauri Build

Target:

```text
Installer < 15 MB
```

---

# MEMORY TARGET

Browser:

```text
< 250 MB
```

---

Desktop:

```text
< 300 MB
```

---

# LOAD TEST TARGET

Concurrent Users:

```text
50
```

minimum.

---

Target:

```text
100
```

recommended.

---

# STRESS TEST TARGET

Assessment Details:

```text
200.000+
```

records.

---

Attendance:

```text
500.000+
```

records.

---

Audit Logs:

```text
1.000.000+
```

records.

---

# PERFORMANCE TEST SUITE

Mandatory:

```text
Database Benchmark

API Benchmark

Sync Benchmark

Dashboard Benchmark

Export Benchmark
```

---

# ACCEPTANCE CRITERIA

✓ Login < 2s

✓ Dashboard < 2s

✓ Save Nilai < 500ms

✓ Offline Save < 100ms

✓ Sync < 3s

✓ Export 40 Rapor < 30s

✓ Realtime < 2s

✓ Query < 300ms Average

✓ No N+1 Query

✓ No Full Table Scan

---

# PERFORMANCE BUDGET

## Database

```text
Average Query
< 300ms
```

---

## API

```text
Average Response
< 500ms
```

---

## Frontend

```text
Initial Render
< 2s
```

---

## Sync

```text
Conflict Detection
< 500ms
```

---

# PERFORMANCE REVIEW CHECKLIST

✓ Index Available

✓ Composite Index Available

✓ Query Profile Checked

✓ No SELECT *

✓ Pagination Applied

✓ Snapshot Used

✓ Materialized View Used

✓ Virtualized Table Used

✓ Batch Sync Used

✓ Bundle Size Verified

---

# FINAL PERFORMANCE PRINCIPLE

SIKAD v4.0 mengadopsi prinsip:

```text
Measure First
↓
Optimize Second
```

dengan prioritas optimasi:

```text
Database
↓
Query
↓
API
↓
Sync Engine
↓
Frontend
```

dan bukan:

```text
Frontend
↓
Frontend
↓
Frontend
```

karena lebih dari 80% masalah performa sistem akademik berasal dari model data, query, dan proses agregasi yang tidak efisien.
