# 33. Risk Management

Daftar risiko teknis utama pada proyek SIKAD v4.0 beserta rencana mitigasinya.

## 1. Risiko 1: Kegagalan Sinkronisasi Offline (Dexie.js â†” Supabase)
- **Dampak:** Data nilai guru hilang atau bertabrakan (concurrency conflict).
- **Mitigasi:** Mengimplementasikan **Sync Queue** berbasis urutan timestamp transaksi dan resolusi konflik otomatis (*Last Write Wins* atau review manual oleh Admin Kurikulum untuk data Kelas Real).

## 2. Risiko 2: Keterbatasan Memori Aplikasi Desktop Tauri
- **Dampak:** Aplikasi lag atau crash di komputer sekolah berspesifikasi rendah.
- **Mitigasi:** Membatasi caching data di IndexedDB hanya untuk tahun ajaran aktif. Hindari memuat seluruh data histori alumni ke memori RAM secara bersamaan.

## 3. Risiko 3: Kebocoran Data Akademik (Bypass RLS)
- **Dampak:** Guru A dapat melihat/mengubah nilai kelas Guru B.
- **Mitigasi:** Menerapkan pengujian otomatis kebijakan RLS pada tingkat database (`tests/rls/`) dan mematikan bypass bypass key pada API frontend.

## 4. Risiko 4: Kelelahan Peran (Role Fatigue) pada Tim Skala Kecil/Menengah
- **Dampak:** Terjadi duplikasi tugas dan penurunan fokus/kualitas rekayasa akibat personil memegang terlalu banyak peran.
- **Mitigasi:** Menerapkan panduan penggabungan peran (*Role Consolidation Mapping*) untuk merampingkan 16 peran spesifik menjadi 4 profil utama bisnis, arsitektur, frontend, dan QA/keamanan.

## 5. Risiko 5: Bentrokan Penggabungan Kode (Git Merge Conflicts) Akibat Multi-Agent AI
- **Dampak:** Kode rusak dan terjadi kemunduran progress akibat beberapa AI Agent mengubah file atau modul yang sama secara paralel.
- **Mitigasi:** Mengimplementasikan **AI Agent Branching & Folder Lock Protocol** (menggunakan `.gitlocks.json`) guna membatasi akses edit folder modul hanya untuk satu agent aktif dalam satu waktu.

