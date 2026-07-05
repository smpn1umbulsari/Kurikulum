# Glossary

Berikut adalah daftar istilah teknis dan operasional yang digunakan dalam proyek SIKAD v4.0:

- **Kelas Real (Real Class):** Kelompok siswa yang terdaftar belajar dalam satu kelas akademik.
- **Dapodik (Data Pokok Pendidikan):** Sistem database nasional milik Kemendikbudristek untuk pelaporan data sekolah.
- **Dual-Layer Kelas:** Arsitektur database SIKAD yang memisahkan kelas riil sekolah (REAL) dengan kelas pelaporan Dapodik (DAPO) untuk mengakomodasi perbedaan jam mengajar guru.
- **Offline-First:** Pendekatan pengembangan aplikasi di mana fungsi utama (input nilai/kehadiran) dapat berjalan penuh tanpa koneksi internet dengan memanfaatkan database lokal (Dexie.js/IndexedDB).
- **RLS (Row Level Security):** Fitur PostgreSQL untuk membatasi akses data pada level baris tabel berdasarkan konteks pengguna yang masuk.
- **Sync Engine:** Komponen backend/frontend yang bertanggung jawab menyelaraskan mutasi data lokal di Dexie ke database pusat Supabase.
- **Tauri v2:** Framework untuk membangun aplikasi desktop berukuran kecil (<15MB) menggunakan frontend web (React) dan sistem backend Rust.
