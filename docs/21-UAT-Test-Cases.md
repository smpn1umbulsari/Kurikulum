# 21-UAT-Test-Cases.md

# USER ACCEPTANCE TEST (UAT)

## SIKAD v4.0

Version: 4.0

Status: APPROVED

Priority:

```text
MANDATORY BEFORE GO LIVE
```

---

# TUJUAN

Memastikan seluruh proses bisnis sekolah berjalan sesuai kebutuhan pengguna nyata sebelum sistem digunakan secara resmi.

---

# PESERTA UAT

| Role           | Jumlah |
| -------------- | ------ |
| Admin          | 1      |
| Kurikulum      | 1      |
| Wali Kelas     | 2      |
| Guru Mapel     | 3      |
| BK             | 1      |
| Kepala Sekolah | 1      |

---

# KRITERIA KELULUSAN UAT

## Per Test Case

```text
PASS
FAIL
BLOCKED
```

---

## Go Live Requirement

```text
â‰¥ 95% PASS
0 Critical FAIL
0 Security FAIL
0 Data Integrity FAIL
```

---

# UAT-001

## Login System

### Role

Semua Role

---

### Langkah

```text
1. Buka aplikasi

2. Login menggunakan akun valid

3. Verifikasi dashboard tampil
```

---

### Expected Result

```text
Berhasil login

Role sesuai

Menu sesuai hak akses
```

---

### Priority

```text
CRITICAL
```

---

# UAT-002

## Login Gagal

### Langkah

```text
1. Masukkan password salah

2. Klik login
```

---

### Expected Result

```text
Login ditolak

Pesan error muncul
```

---

# UAT-003

## Academic Term Activation

### Role

Kurikulum

---

### Langkah

```text
1. Buat term baru

2. Aktifkan term
```

---

### Expected Result

```text
Hanya 1 term aktif
```

---

# UAT-004

## CRUD Guru

### Role

Admin

---

### Langkah

```text
Tambah Guru

Edit Guru

Nonaktifkan Guru
```

---

### Expected Result

```text
Data tersimpan

Audit tercatat
```

---

# UAT-005

## CRUD Siswa

### Role

Admin

---

### Expected Result

```text
Data siswa valid

Tidak ada duplikasi NISN
```

---

# UAT-006

## CRUD Mata Pelajaran

### Role

Kurikulum

---

### Expected Result

```text
Mapel berhasil dibuat
```

---

# UAT-007

## Pembuatan Kelas REAL

### Role

Kurikulum

---

### Expected Result

```text
Kelas REAL tersimpan
```

---

# UAT-008

## Pembuatan Kelas DAPODIK

### Role

Kurikulum

---

### Expected Result

```text
Kelas DAPODIK tersimpan
```

---

# UAT-009

## Pembagian Mengajar

### Role

Kurikulum

---

### Langkah

```text
Mapping Guru

Mapping Mapel

Mapping Kelas
```

---

### Expected Result

```text
Beban mengajar terbentuk
```

---

# UAT-010

## Assignment Wali Kelas

### Role

Kurikulum

---

### Expected Result

```text
Satu kelas memiliki wali kelas
```

---

# UAT-011

## Input Tugas Tambahan

### Role

Kurikulum

---

### Expected Result

```text
JP tambahan terhitung
```

---

# UAT-012

## Workload Calculation

### Role

Kurikulum

---

### Expected Result

```text
JP Mengajar

JP Tambahan

Total JP
```

terhitung benar.

---

# UAT-013

## Assessment Creation

### Role

Guru

---

### Langkah

```text
Buat assessment baru
```

---

### Expected Result

```text
Assessment berhasil dibuat
```

---

# UAT-014

## Assessment Draft Lock

### Role

Guru

---

### Langkah

```text
Guru A membuka assessment

Guru B membuka assessment yang sama
```

---

### Expected Result

```text
Guru B hanya Read Only
```

---

# UAT-015

## Input Nilai

### Role

Guru

---

### Expected Result

```text
Nilai tersimpan
```

---

# UAT-016

## Bulk Input Nilai

### Role

Guru

---

### Expected Result

```text
Seluruh nilai tersimpan
```

---

# UAT-017

## Assessment Finalization

### Role

Guru

---

### Expected Result

```text
Assessment terkunci
```

---

# UAT-018

## Edit Finalized Assessment

### Role

Guru

---

### Expected Result

```text
Ditolak
```

---

# UAT-019

## Kehadiran Harian

### Role

Guru

---

### Expected Result

```text
Absensi tersimpan
```

---

# UAT-020

## Bulk Kehadiran

### Role

Guru

---

### Expected Result

```text
Semua absensi tersimpan
```

---

# UAT-021

## Catatan Wali Kelas

### Role

Wali Kelas

---

### Expected Result

```text
Catatan tersimpan
```

---

# UAT-022

## Generate Rapor

### Role

Wali Kelas

---

### Expected Result

```text
Rapor terbentuk
```

---

# UAT-023

## Finalisasi Rapor

### Role

Wali Kelas

---

### Expected Result

```text
Rapor Snapshot dibuat
```

---

# UAT-024

## Edit Rapor Final

### Role

Wali Kelas

---

### Expected Result

```text
Ditolak
```

---

# UAT-025

## Promotion Preview

### Role

Kurikulum

---

### Expected Result

```text
Preview akurat
```

---

# UAT-026

## Promotion Execution

### Role

Kurikulum

---

### Expected Result

```text
Riwayat kelas dibuat
```

---

# UAT-027

## Graduation Preview

### Role

Kurikulum

---

### Expected Result

```text
Data siswa valid
```

---

# UAT-028

## Graduation Execution

### Role

Kurikulum

---

### Expected Result

```text
Alumni terbentuk

Snapshot dibuat
```

---

# UAT-029

## Archive Generation

### Role

Kurikulum

---

### Expected Result

```text
Snapshot tersimpan
```

---

# UAT-030

## Export Excel

### Role

Admin

---

### Expected Result

```text
File valid
```

---

# UAT-031

## Export PDF

### Role

Admin

---

### Expected Result

```text
PDF valid
```

---

# UAT-032

## Dashboard Kurikulum

### Role

Kurikulum

---

### Expected Result

```text
Data KPI tampil
```

---

# UAT-033

## Dashboard Kepala Sekolah

### Role

Kepala Sekolah

---

### Expected Result

```text
Data executive tampil
```

---

# UAT-034

## Audit Log

### Role

Admin

---

### Expected Result

```text
Semua perubahan tercatat
```

---

# UAT-035

## Role Permission Validation

### Role

Semua

---

### Expected Result

```text
Menu sesuai role
```

---

# UAT-036

## RLS Validation

### Role

Guru

---

### Langkah

```text
Akses data guru lain
```

---

### Expected Result

```text
Ditolak
```

---

# UAT-037

## Offline Assessment

### Role

Guru

---

### Langkah

```text
Matikan internet

Input nilai
```

---

### Expected Result

```text
Tetap tersimpan
```

---

# UAT-038

## Offline Attendance

### Role

Guru

---

### Expected Result

```text
Tetap tersimpan
```

---

# UAT-039

## Reconnect Sync

### Role

Guru

---

### Langkah

```text
Online kembali
```

---

### Expected Result

```text
Queue tersinkronisasi
```

---

# UAT-040

## Conflict Queue

### Role

Admin

---

### Langkah

```text
Buat konflik data
```

---

### Expected Result

```text
Conflict Queue muncul
```

---

# UAT-041

## Resolve Conflict

### Role

Admin

---

### Expected Result

```text
Conflict selesai
```

---

# UAT-042

## Monitoring Center

### Role

Admin

---

### Expected Result

```text
Semua metric tampil
```

---

# UAT-043

## Backup Verification

### Role

Admin

---

### Expected Result

```text
Backup tersedia
```

---

# UAT-044

## Restore Verification

### Role

Admin

---

### Expected Result

```text
Restore berhasil
```

---

# UAT-045

## Multi Device Assessment

### Role

Guru

---

### Langkah

```text
Laptop

Desktop
```

---

### Expected Result

```text
Realtime berjalan
```

---

# UAT-046

## Device Registration

### Role

Admin

---

### Expected Result

```text
Device tercatat
```

---

# UAT-047

## Security Event Logging

### Role

Admin

---

### Expected Result

```text
Event keamanan tercatat
```

---

# UAT-048

## Export Logging

### Role

Admin

---

### Expected Result

```text
Export tercatat
```

---

# UAT-049

## Performance Validation

### Expected Result

```text
Dashboard < 2 detik

Save Nilai < 500 ms

Sync < 3 detik
```

---

# UAT-050

## End-to-End Academic Cycle

### Skenario

```text
Buat Tahun Ajaran
â†“
Buat Kelas
â†“
Mapping Mengajar
â†“
Input Nilai
â†“
Input Kehadiran
â†“
Generate Rapor
â†“
Naik Kelas
â†“
Lulus
â†“
Archive
```

---

### Expected Result

```text
Seluruh proses berhasil
```

---

# UAT SIGN OFF

## Admin

```text
Nama:
Tanda Tangan:
Tanggal:
```

---

## Kurikulum

```text
Nama:
Tanda Tangan:
Tanggal:
```

---

## Kepala Sekolah

```text
Nama:
Tanda Tangan:
Tanggal:
```

---

# FINAL UAT PRINCIPLE

SIKAD v4.0 dianggap siap Go-Live bukan ketika:

```text
Developer Mengatakan Selesai
```

tetapi ketika:

```text
Admin Lulus UAT
+
Kurikulum Lulus UAT
+
Kepala Sekolah Menyetujui
```

dan seluruh proses akademik dari awal tahun ajaran hingga arsip alumni berhasil dijalankan tanpa kehilangan data, pelanggaran keamanan, atau konflik sinkronisasi yang tidak terselesaikan.
