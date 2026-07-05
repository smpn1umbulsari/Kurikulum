# 24-User-Manual.md

# USER MANUAL

## SIKAD v4.0

### Sistem Informasi Kurikulum dan Akademik Digital

Version: 4.0

Audience:

```text
Kepala Sekolah
Kurikulum
Admin
Guru
Wali Kelas
BK
```

---

# SELAMAT DATANG DI SIKAD

SIKAD adalah sistem administrasi akademik sekolah yang digunakan untuk mengelola:

```text
Data Guru
Data Siswa
Kelas
Pembagian Mengajar
Penilaian
Kehadiran
Rapor
Kenaikan Kelas
Kelulusan
Arsip Akademik
```

dalam satu platform terintegrasi.

---

# BAB 1

# LOGIN SISTEM

## Cara Login

1. Buka aplikasi SIKAD.
2. Masukkan email.
3. Masukkan password.
4. Klik:

```text
MASUK
```

---

## Jika Login Berhasil

Sistem akan menampilkan dashboard sesuai hak akses pengguna.

---

## Jika Login Gagal

Periksa:

```text
Email
Password
Koneksi Internet
```

---

# BAB 2

# DASHBOARD

Dashboard berbeda untuk setiap role.

---

## Guru

Menampilkan:

```text
Jadwal Mengajar
Assessment Aktif
Kehadiran
Status Sinkronisasi
```

---

## Wali Kelas

Menampilkan:

```text
Data Perwalian
Kehadiran Siswa
Catatan Wali Kelas
Rapor
```

---

## Kurikulum

Menampilkan:

```text
Progress Penilaian
Beban Mengajar
Status Rapor
Kenaikan Kelas
Kelulusan
```

---

## Kepala Sekolah

Menampilkan:

```text
Jumlah Guru
Jumlah Siswa
Jumlah Kelas
KPI Akademik
Statistik Kehadiran
```

---

# BAB 3

# DATA GURU

Role:

```text
Admin
Kurikulum
```

---

## Menambah Guru

Pilih:

```text
Master Data
â†’ Guru
â†’ Tambah Guru
```

---

Isi:

```text
Nama
NIP
Email
Status
Role
```

---

Klik:

```text
Simpan
```

---

## Menonaktifkan Guru

Pilih guru.

Klik:

```text
Nonaktifkan
```

---

Catatan:

```text
Data Tidak Dihapus
```

---

# BAB 4

# DATA SISWA

Role:

```text
Admin
```

---

## Menambah Siswa

Masuk ke:

```text
Master Data
â†’ Siswa
```

---

Isi:

```text
NISN
Nama
Jenis Kelamin
Tanggal Lahir
Status
```

---

Klik:

```text
Simpan
```

---

## Import Excel

Pilih:

```text
Import Siswa
```

---

Upload file:

```text
Excel (.xlsx)
```

---

Klik:

```text
Proses Import
```

---

# BAB 5

# DATA KELAS

Role:

```text
Kurikulum
```

---

## Jenis Kelas

SIKAD menggunakan:

```text
REAL
DAPODIK
```

---

## Membuat Kelas

Masuk ke:

```text
Akademik
â†’ Kelas
```

---

Klik:

```text
Tambah Kelas
```

---

Isi:

```text
Nama Kelas
Tingkat
Jenis Kelas
Wali Kelas
```

---

# BAB 6

# PEMBAGIAN MENGAJAR

Role:

```text
Kurikulum
```

---

Masuk ke:

```text
Akademik
â†’ Pembagian Mengajar
```

---

Pilih:

```text
Guru
Mapel
Kelas
```

---

Klik:

```text
Simpan
```

---

Sistem akan menghitung:

```text
JP Mengajar
```

secara otomatis.

---

# BAB 7

# TUGAS TAMBAHAN

Role:

```text
Kurikulum
```

---

Masuk ke:

```text
Akademik
â†’ Tugas Tambahan
```

---

Contoh:

```text
Wali Kelas
Pembina OSIS
Operator
Laboran
```

---

Sistem otomatis menghitung:

```text
JP Tambahan
```

---

# BAB 8

# PENILAIAN (ASSESSMENT)

Role:

```text
Guru
```

---

## Membuat Assessment

Masuk ke:

```text
Penilaian
â†’ Assessment
```

---

Klik:

```text
Buat Assessment
```

---

Pilih:

```text
Kelas
Mapel
Jenis Assessment
```

---

Klik:

```text
Simpan
```

---

# Input Nilai

Masukkan nilai siswa.

---

Klik:

```text
Simpan
```

---

Nilai akan:

```text
Tersimpan Lokal
â†“
Masuk Queue
â†“
Sinkronisasi Cloud
```

---

# Draft Lock

Jika assessment sedang dibuka guru lain:

```text
Assessment Terkunci
```

---

Status:

```text
Read Only
```

---

# Finalisasi Assessment

Klik:

```text
Finalisasi
```

---

Setelah final:

```text
Tidak Bisa Diedit
```

---

# BAB 9

# KEHADIRAN

Role:

```text
Guru
Wali Kelas
```

---

Masuk:

```text
Kehadiran
```

---

Pilih:

```text
Tanggal
Kelas
```

---

Status:

```text
H = Hadir
S = Sakit
I = Izin
A = Alpa
```

---

Klik:

```text
Simpan
```

---

# BAB 10

# CATATAN WALI KELAS

Role:

```text
Wali Kelas
```

---

Masuk:

```text
Rapor
â†’ Catatan Wali Kelas
```

---

Isi:

```text
Catatan Perkembangan
Saran
Motivasi
```

---

Klik:

```text
Simpan
```

---

# BAB 11

# RAPOR

Role:

```text
Wali Kelas
```

---

## Generate Rapor

Masuk:

```text
Rapor
â†’ Generate
```

---

Sistem mengambil:

```text
Nilai
Kehadiran
Catatan
```

---

Klik:

```text
Generate
```

---

# Finalisasi Rapor

Klik:

```text
Finalisasi
```

---

Sistem membuat:

```text
Rapor Snapshot
```

---

Setelah final:

```text
Tidak Bisa Diedit
```

---

# BAB 12

# KENAIKAN KELAS

Role:

```text
Kurikulum
```

---

Masuk:

```text
Akademik
â†’ Promotion Engine
```

---

## Preview

Klik:

```text
Preview
```

---

Periksa:

```text
Jumlah Siswa
Kelas Asal
Kelas Tujuan
```

---

## Eksekusi

Klik:

```text
Jalankan Promotion
```

---

Sistem:

```text
Membuat Riwayat Kelas
```

---

# BAB 13

# KELULUSAN

Role:

```text
Kurikulum
```

---

Masuk:

```text
Akademik
â†’ Graduation Engine
```

---

## Preview

Periksa:

```text
Data Siswa
Status
```

---

## Eksekusi

Klik:

```text
Proses Kelulusan
```

---

Sistem:

```text
Membuat Data Alumni
Membuat Snapshot Akademik
```

---

# BAB 14

# EXPORT DATA

Role:

```text
Admin
Kurikulum
```

---

Format:

```text
Excel
PDF
```

---

Masuk:

```text
Export Center
```

---

Pilih:

```text
Modul
Format
```

---

Klik:

```text
Export
```

---

# BAB 15

# DASHBOARD KURIKULUM

Menampilkan:

```text
Progress Assessment
Progress Kehadiran
Beban Mengajar
Status Rapor
```

---

# BAB 16

# DASHBOARD KEPALA SEKOLAH

Menampilkan:

```text
Jumlah Guru
Jumlah Siswa
Jumlah Kelas
Statistik Akademik
```

---

Dashboard ini:

```text
Read Only
```

---

# BAB 17

# MODE OFFLINE

Jika internet terputus:

```text
Sistem Tetap Bisa Digunakan
```

---

Status:

```text
OFFLINE
```

akan muncul.

---

Data disimpan ke:

```text
Database Lokal
```

---

Saat internet kembali:

```text
Sinkronisasi Otomatis
```

---

# BAB 18

# STATUS SINKRONISASI

Indikator:

## Online

```text
ONLINE
```

---

## Offline

```text
OFFLINE
```

---

## Sinkronisasi

```text
SYNCING
```

---

## Konflik

```text
CONFLICT
```

---

# BAB 19

# MONITORING CENTER

Role:

```text
Admin
```

---

Menampilkan:

```text
System Health

Queue Status

Conflict Queue

Security Event

Audit Logs
```

---

# BAB 20

# PENYELESAIAN KONFLIK

Role:

```text
Admin
Kurikulum
```

---

Masuk:

```text
Monitoring
â†’ Conflict Center
```

---

Pilihan:

```text
Gunakan Data Lokal

Gunakan Data Cloud

Gabungkan Manual
```

---

# BAB 21

# KEAMANAN AKUN

## Ganti Password

Masuk:

```text
Profil
â†’ Ubah Password
```

---

Gunakan password:

```text
Minimal 8 Karakter
```

---

Jangan membagikan:

```text
Email
Password
```

kepada orang lain.

---

# BAB 22

# TROUBLESHOOTING

## Tidak Bisa Login

Periksa:

```text
Email

Password

Internet
```

---

## Data Tidak Sinkron

Periksa:

```text
Status Queue

Status Internet
```

---

Klik:

```text
Sync Now
```

---

## Konflik Data

Masuk:

```text
Conflict Center
```

---

## Dashboard Lambat

Lakukan:

```text
Refresh Halaman
```

---

Jika masih terjadi:

```text
Hubungi Admin
```

---

# BAB 23

# GLOSSARY

## Academic Term

Semester aktif.

---

## Assessment

Lembar penilaian.

---

## Snapshot

Salinan data final yang tidak berubah.

---

## Sync Queue

Antrean sinkronisasi.

---

## Conflict Queue

Antrean konflik data.

---

## RLS

Row Level Security.

---

## REAL

Kelas operasional sekolah (Real).

---

## DAPODIK

Kelas referensi Dapodik.

---

# BAB 24

# BEST PRACTICES

Guru:

```text
Finalisasi assessment setelah selesai.

Pastikan sinkronisasi berhasil.

Periksa status queue.
```

---

Wali Kelas:

```text
Lengkapi catatan wali kelas.

Verifikasi rapor sebelum finalisasi.
```

---

Kurikulum:

```text
Review beban mengajar.

Review assessment progress.

Review conflict queue.
```

---

Admin:

```text
Review backup.

Review monitoring.

Review audit log.
```

---

# FINAL USER PRINCIPLE

SIKAD v4.0 dirancang dengan prinsip:

```text
Mudah Digunakan
â†“
Aman
â†“
Konsisten
â†“
Terukur
```

Jika terjadi masalah:

```text
Jangan Mengubah Database Secara Langsung
```

Gunakan:

```text
Menu Resmi Sistem
```

atau hubungi:

```text
Administrator SIKAD
```

untuk menjaga integritas data akademik sekolah.
