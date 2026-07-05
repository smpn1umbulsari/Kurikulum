# SIKAD v4.0 â€” Workflow & Panduan Tim Lengkap

> **Versi:** 4.0 | **Status:** Draft Internal | **Klasifikasi:** Konfidensial

---

## 1. VISI & MISI PROYEK

**Visi:**
Menjadi standar baru sistem administrasi akademik yang handal, transparan, dan mampu beroperasi dalam kondisi internet terbatas *(Offline-First)*.

**Misi:**
- Menghilangkan redundansi data antara kebutuhan sekolah real dan pelaporan virtual (Dapodik).
- Memberikan antarmuka yang intuitif bagi tenaga pendidik tanpa mengorbankan integritas data.
- Menyediakan data historis akademik (alumni) yang dapat diakses permanen dalam hitungan milidetik.

**Story:**
SIKAD lahir dari keresahan sekolah yang sering kehilangan data saat internet mati dan kesulitan mengelola beban kerja guru yang kompleks. SIKAD v4.0 hadir dengan teknologi *Sync Engine* yang memungkinkan guru bekerja kapan saja, di mana saja.

---

## 2. JOB DESCRIPTIONS TIM TEKNIS

### A. Software Architect
**Tanggung Jawab:** Merancang "Cetak Biru" sistem agar modul (Nilai, Rapor, Ujian) terintegrasi secara scalable.

**Tugas Detail:**
- Menetapkan standar UUID Everywhere untuk mendukung sinkronisasi multi-device.
- Merancang arsitektur Offline-First menggunakan Dexie.js sebagai operasional cache dan Supabase sebagai Source of Truth.
- Menerapkan strategi Snapshot-First pada dashboard untuk menjaga performa di bawah 2 detik.

### B. Database Administrator (DBA) / Data Engineer
**Tanggung Jawab:** Merancang struktur data yang mampu menampung dual-layer (Data Real vs Data Dapodik).

**Tugas Detail:**
- Mengimplementasikan Row Level Security (RLS) di level database untuk menjamin isolasi data guru.
- Memastikan kebijakan ON DELETE RESTRICT pada data akademik untuk mencegah penghapusan massal yang tidak disengaja.
- Mengelola Materialized Views untuk agregasi data berat seperti beban kerja guru dan statistik sekolah.

### C. Backend Developer
**Tanggung Jawab:** Membangun logika bisnis utama (Engine Penjadwalan, Kalkulasi Nilai, Sync Engine).

**Tugas Detail:**
- Membangun Sync Engine dengan algoritma Exponential Backoff untuk penanganan jaringan yang tidak stabil.
- Mengimplementasikan Optimistic Versioning (kolom `version`) pada tabel transaksi untuk resolusi konflik data.
- Membangun Graduation & Promotion Engine untuk automatisasi kenaikan kelas dan kelulusan massal.

### D. Frontend Developer
**Tanggung Jawab:** Membangun antarmuka responsif dan fungsionalitas offline di sisi klien.

**Tugas Detail:**
- Mengintegrasikan TanStack Query untuk manajemen server state dan Zustand untuk global app state.
- Mengimplementasikan Optimistic Updates pada input nilai agar guru merasakan respons instan (< 100ms).
- Membangun dashboard interaktif berbasis Analytics Snapshots.

### E. UI/UX Designer
**Tanggung Jawab:** Merancang antarmuka yang ramah bagi pengguna non-teknis (Guru dan TU).

**Tugas Detail:**
- Menyusun alur kerja input nilai (Grading Sheet) yang menyerupai spreadsheet untuk kemudahan transisi pengguna.
- Memastikan hierarki visual pada dashboard monitoring kurikulum agar masalah (seperti guru overload) langsung terlihat.

---

## 3. WORKFLOW: URUTAN PENGERJAAN

| Fase | Penanggung Jawab | Deliverable Utama |
|------|-----------------|-------------------|
| **Fase 1 â€” Fondasi** | Architect & DBA | Setup Supabase, migrasi skema, konfigurasi RLS |
| **Fase 2 â€” Security & Auth** | Backend & Security | Supabase Auth + RBAC, tabel profil guru |
| **Fase 3 â€” Core Engine** | Backend & Architect | Sync Engine (Dexie â†” Supabase), Workload Engine |
| **Fase 4 â€” Module Implementation** | Frontend & Backend | Modul Guru, Siswa, Kelas, Penilaian, Kehadiran |
| **Fase 5 â€” Lifecycle** | Backend | Promotion, Graduation, Archive Engine |
| **Fase 6 â€” Reporting & Dashboard** | Frontend & DBA | Analytics Snapshots, dashboard eksekutif |
| **Fase 7 â€” Final** | QA & Tech Writer | Testing Suite menyeluruh, User Manual |

---

## 4. KOMUNIKASI DENGAN KLIEN (SCHOOL STAKEHOLDERS)

> Bagian ini adalah **panduan operasional Business Analyst dan Project Manager** dalam berinteraksi dengan pihak sekolah. Tujuannya: memastikan semua kebutuhan tergali secara tepat, tanpa menyita waktu klien dengan pertanyaan teknis yang tidak perlu mereka jawab.

---

### 4.1 Prinsip Dasar Komunikasi

| Prinsip | Penjelasan |
|---------|-----------|
| **Hormati waktu klien** | Guru dan operator sekolah punya beban kerja tinggi. Siapkan pertanyaan yang terstruktur dan efisien. |
| **Gunakan bahasa sekolah** | Hindari jargon teknis (UUID, RLS, Sync Engine). Gunakan istilah: Real, Mapel, JP, Dapodik, KKM. |
| **Bedakan keputusan teknis vs keputusan bisnis** | Jangan tanyakan hal teknis kepada klien â€” itu tanggung jawab tim internal. |
| **Validasi selalu dengan contoh nyata** | Setiap aturan bisnis yang diperoleh, minta klien memberi contoh kasus riil dari sekolah mereka. |
| **Dokumentasikan segera** | Setiap keputusan yang disepakati harus langsung dicatat dan dikirim kembali ke klien untuk konfirmasi tertulis. |

---

### 4.2 Matriks: WAJIB Ditanyakan vs TIDAK PERLU Ditanyakan

#### âœ… WAJIB Ditanyakan kepada Sekolah (Keputusan Bisnis/Operasional)

| No. | Topik | Pertanyaan Spesifik | Mengapa Penting |
|-----|-------|--------------------|--------------| 
| 1 | **Struktur Kelas Real & JP per Mapel** | Berapa total kelas real yang aktif belajar secara nyata? Berapa JP per Mapel per minggu menurut jadwal real vs yang tercatat di Dapodik? | Fondasi dual-layer jadwal: data real untuk operasional, data Dapodik untuk pelaporan. |
| 2 | **Kriteria Kenaikan Kelas & Kelulusan** | Apa syarat minimal kenaikan kelas? (KKM, kehadiran, dll.) Apakah ada siswa yang bisa naik dengan catatan (syarat)? Siapa yang berwenang memutuskan? | Menjadi business rules untuk Promotion & Graduation Engine. Tanpa ini, otomatisasi tidak bisa dibangun. |
| 3 | **Hak Akses Spesifik Guru BK & Wakasek** | Data apa saja yang boleh dilihat Guru BK? (nilai semua siswa, catatan perilaku?) Apakah Wakasek boleh edit jadwal atau hanya lihat? Adakah fitur yang hanya boleh diakses Kepala Sekolah? | Menentukan RBAC (Role-Based Access Control) yang tepat dan menjaga privasi data siswa. |
| 4 | **Format Rapor PDF Resmi** | Apakah ada template rapor resmi sekolah (logo, warna, tanda tangan)? Format Kurikulum Merdeka atau K13? Apakah ada kolom tambahan di luar standar nasional? | Rapor adalah output paling kritis. Kesalahan format berarti tidak bisa digunakan resmi. |
| 5 | **Mekanisme Pembagian Jam Mengajar** | Bagaimana sekolah menentukan siapa guru yang mengajar di ruang mana pada jam berapa? Apakah ada guru yang mengajar mapel berbeda di kelas berbeda? Siapa yang memasukkan data jadwal real? | Inti dari masalah dualitas data. Memastikan engine penjadwalan mencerminkan kondisi lapangan. |
| 6 | **Alur Pelaksanaan Ujian** | Siapa yang membuat soal ujian? Apakah ujian dilakukan serentak atau bergelombang? Apakah ada pengawas yang berbeda per ruang? Bagaimana distribusi lembar soal? | Menentukan fitur Exam Management Module: pembuatan soal, penjadwalan ruang ujian, pengawas. |
| 7 | **Kebijakan Koreksi Nilai** | Siapa yang boleh mengubah nilai setelah diinput? Apakah perlu persetujuan Kepala Sekolah? Apakah ada batas waktu input nilai? | Menentukan approval workflow dan audit trail pada modul penilaian. |
| 8 | **Kondisi Internet di Sekolah** | Seberapa sering internet mati? Berapa lama rata-rata downtime? Apakah semua guru punya perangkat sendiri atau pakai komputer bersama? | Menentukan seberapa robust Offline-First engine harus dibangun. |
| 9 | **Sinkronisasi dengan Dapodik** | Apakah sekolah ingin data otomatis sinkron ke Dapodik atau manual? Siapa operator Dapodik? Seberapa sering data Dapodik diupdate? | Menentukan kedalaman integrasi modul Dapodik Mapper. |
| 10 | **Data Historis & Alumni** | Apakah data alumni perlu bisa diakses? Berapa tahun ke belakang? Siapa yang boleh akses data alumni? | Menentukan kebijakan arsip dan kapasitas penyimpanan. |

---

#### âŒ TIDAK PERLU Ditanyakan kepada Sekolah (Keputusan Teknis Internal Tim)

| Keputusan Teknis | Siapa yang Memutuskan | Alasan |
|-----------------|----------------------|--------|
| UUID vs Integer untuk ID Database | DBA & Architect | Klien tidak perlu tahu â€” UUID dipilih karena mendukung sinkronisasi offline. |
| Strategi caching: Zustand vs TanStack Query | Frontend Developer | Keputusan implementasi murni, tidak berdampak pada pengalaman fungsional klien. |
| Mekanisme sinkronisasi offline (Dexie.js) | Architect & Backend | Klien hanya perlu tahu: "aplikasi tetap bisa dipakai saat internet mati." |
| Implementasi RLS di level database | DBA | Klien tidak perlu tahu mekanismenya â€” hanya perlu tahu hasilnya: data guru A tidak bisa dilihat guru B. |
| Pemilihan framework (React, Next.js, dll.) | Frontend Developer | Murni keputusan teknis tim. |
| Struktur tabel database | DBA & Architect | Detail implementasi internal. |
| Algoritma Exponential Backoff | Backend Developer | Klien tidak perlu tahu cara kerja sinkronisasi, hanya perlu tahu hasilnya. |

---

### 4.3 Panduan Sesi Wawancara dengan Sekolah

#### Struktur Sesi Ideal (Durasi: 90â€“120 menit)

```
[10 menit] Pembukaan & Orientasi
  â†’ Perkenalkan tim, jelaskan tujuan SIKAD dalam bahasa awam
  â†’ Jelaskan apa yang akan ditanyakan dan apa yang tidak

[30 menit] Blok 1: Struktur Akademik
  â†’ Pertanyaan No. 1, 2, 5 (Kelas Real, Kenaikan Kelas, Jadwal)
  â†’ Minta dokumen pendukung: jadwal mengajar real, data kelas real

[25 menit] Blok 2: Penilaian & Rapor
  â†’ Pertanyaan No. 4, 6, 7 (Rapor, Ujian, Koreksi Nilai)
  â†’ Minta contoh rapor lama sebagai referensi format

[20 menit] Blok 3: Akses & Infrastruktur
  â†’ Pertanyaan No. 3, 8, 9, 10 (Hak Akses, Internet, Dapodik, Alumni)

[15 menit] Penutup & Konfirmasi
  â†’ Baca ulang ringkasan yang dicatat
  â†’ Minta konfirmasi lisan dari klien
  â†’ Jelaskan langkah berikutnya
```

#### Tips Penggalian Kebutuhan

- **Gunakan teknik "show me":** Minta klien tunjukkan secara langsung bagaimana mereka mengelola data saat ini (spreadsheet, buku, aplikasi lama).
- **Tanyakan pengecualian:** "Apakah ada kasus khusus yang tidak mengikuti aturan umum ini?" â€” pengecualian inilah yang sering jadi bug di sistem.
- **Konfirmasi dengan angka:** "Jadi kalau KKM 75, siswa yang dapat 74 otomatis tidak naik kelas â€” betul begitu?"
- **Jangan asumsikan:** Setiap sekolah punya kebijakan berbeda meski kurikulumnya sama.

---

### 4.4 Artefak Komunikasi yang Harus Dibuat

| Artefak | Dibuat Oleh | Kapan | Tujuan |
|---------|------------|-------|--------|
| **Interview Guide** | Business Analyst | Sebelum sesi wawancara | Panduan pertanyaan terstruktur |
| **Meeting Notes** | Business Analyst | Hari yang sama setelah sesi | Dokumentasi semua keputusan |
| **Business Rules Document** | Business Analyst | Maks. 3 hari setelah sesi | Dikirim ke klien untuk validasi tertulis |
| **Prototype/Mockup** | UI/UX Designer | Setelah Business Rules disetujui | Validasi tampilan sebelum coding dimulai |
| **UAT Checklist** | QA + Business Analyst | Sebelum Fase Final | Skenario pengujian yang disepakati klien |
| **User Manual** | Technical Writer | Fase Final | Panduan penggunaan untuk guru dan TU |

---

### 4.0 Eskalasi & Pengelolaan Konflik Kebutuhan

#### Skenario Umum yang Harus Diantisipasi

**Skenario 1: Kebutuhan Dapodik vs Kebutuhan Real Bertentangan**
> *"Di Dapodik, Pak Ahmad mengajar 24 JP. Tapi di real dia hanya mengajar 18 JP karena ruangannya dipakai bergantian."*

**Penanganan:** Sistem harus menyimpan kedua data secara terpisah. BA harus konfirmasi: "Laporan untuk Dapodik menggunakan angka 24 JP, laporan internal menggunakan 18 JP. Apakah ini benar?"

---

**Skenario 2: Kepala Sekolah dan Wakasek Punya Keinginan Berbeda**
> *Kepala Sekolah ingin semua nilai terbuka untuk semua guru. Wakasek ingin data per kelas hanya bisa diakses wali kelas masing-masing.*

**Penanganan:** Eskalasikan ke Project Manager. Jangan ambil keputusan sendiri. Jadwalkan sesi khusus dengan kedua pihak untuk mediasi.

---

**Skenario 3: Permintaan Fitur di Luar Scope**
> *"Bisa sekalian dibuatkan fitur absensi sidik jari?"*

**Penanganan:** Catat sebagai backlog. Jelaskan dengan sopan bahwa fitur tersebut berada di luar scope v4.0, tetapi dapat dipertimbangkan untuk versi berikutnya. Jangan berjanji tanpa persetujuan PM.

---

**Skenario 4: Klien Tidak Bisa Memberi Keputusan**
> *"Untuk KKM, nanti saya tanyakan dulu ke Wakasek..."*

**Penanganan:** Tetapkan deadline jawaban (maks. 5 hari kerja). Jika tidak ada respons, gunakan nilai default yang paling umum dan dokumentasikan asumsi tersebut secara eksplisit untuk divalidasi kemudian.

---

### 4.6 Template Pengiriman Business Rules Document

```
Kepada Yth. [Nama Kepala Sekolah / Operator Dapodik]
Di [Nama Sekolah]

Dengan hormat,

Melanjutkan diskusi pada [tanggal sesi], berikut kami rangkum kesepakatan 
yang telah dicapai sebagai dasar pengembangan SIKAD v4.0 untuk sekolah Bapak/Ibu.

Mohon konfirmasi dengan membalas email ini: "Disetujui" atau berikan 
koreksi jika ada yang perlu diubah. Dokumen ini akan menjadi acuan resmi 
pengembangan sistem.

--- RINGKASAN KESEPAKATAN ---

[1] Struktur Kelas Real
    - Total kelas real aktif nyata: [X kelas real]
    - Total kelas dapo di Dapodik: [Y kelas dapo]
    - Selisih yang akan dikelola sistem: [Z kelas]

[2] Kriteria Kenaikan Kelas
    - KKM minimal: [nilai]
    - Kehadiran minimal: [%]
    - Pihak yang berwenang memutuskan: [jabatan]

[3] Format Rapor
    - Kurikulum: [Merdeka / K13]
    - Template terlampir: [Ya / Dalam Proses]

[4] Hak Akses
    - Guru: melihat dan mengedit nilai kelas sendiri
    - Wali Kelas: melihat semua data siswa di kelasnya
    - Wakasek: melihat seluruh data akademik, tidak bisa edit nilai
    - Kepala Sekolah: akses penuh, termasuk laporan eksekutif

[5] Kondisi Infrastruktur
    - Frekuensi internet mati: [X kali/minggu]
    - Mode offline diaktifkan: [Ya]

Hormat kami,
[Nama Business Analyst]
Tim SIKAD v4.0
```

---

## 5. CHECKLIST KESIAPAN RILIS

### Per Modul

- [ ] Modul Input Nilai: semua jenis penilaian (Harian, PTS, PAS) berfungsi offline
- [ ] Modul Rapor: generate PDF sesuai template resmi sekolah
- [ ] Modul Ujian: jadwal, ruang, dan pengawas ter-assign dengan benar
- [ ] Modul Jadwal Real: pembagian jam mengajar real tersimpan dan dapat dicetak
- [ ] Modul Jadwal Dapodik: data JP Dapodik tersinkron dan bisa dieksport
- [ ] Dual-Layer Engine: tidak ada kontaminasi data real ke data Dapodik
- [ ] Offline Sync: semua perubahan offline tersinkron saat online kembali
- [ ] RBAC: setiap role hanya dapat mengakses data sesuai haknya

### Komunikasi Klien

- [ ] Business Rules Document telah disetujui klien secara tertulis
- [ ] Mockup/prototype telah divalidasi Wakasek Kurikulum dan Operator Dapodik
- [ ] UAT (User Acceptance Testing) telah dilakukan bersama klien
- [ ] User Manual telah diserahkan dan dipahami oleh minimal 2 pengguna kunci
- [ ] Sesi pelatihan (training) telah dijadwalkan sebelum go-live

---

*Dokumen ini diperbarui secara berkala oleh Project Manager. Versi terbaru selalu menjadi acuan.*

*Last updated: 24 Juni 2026 | Tim SIKAD v4.0*
