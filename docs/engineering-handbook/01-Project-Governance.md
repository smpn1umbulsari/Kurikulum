# 01. Project Governance

Dokumen ini mendefinisikan tata kelola proyek SIKAD v4.0 untuk memastikan kepatuhan teknis, transparansi keputusan, dan mitigasi konflik kepentingan selama siklus hidup proyek.

## 1. Tata Tertib Pengambilan Keputusan Teknis
- **Skala Kecil (Implementasi Detail):** Diselesaikan di level developer melalui diskusi Pull Request (PR).
- **Skala Menengah (Skema DB, Fitur Baru):** Diusulkan oleh Lead Engineer terkait dan harus disetujui oleh Software Architect / Database Architect melalui ADR (Architecture Decision Record).
- **Skala Besar (Teknologi Baru, Perubahan Framework):** Wajib melalui proses **RFC (Request for Comments)** yang melibatkan Head of Project dan disetujui secara formal.

## 2. Kepatuhan Hukum & Privasi Data
- **GDPR & UU PDP (Perlindungan Data Pribadi):** Data siswa, riwayat nilai, dan catatan konseling masuk kategori data sensitif. RLS (Row Level Security) wajib diaktifkan untuk mencegah pelanggaran privasi.
- **Auditability:** Setiap mutasi data akademik (Kenaikan Kelas, Kelulusan, Pengubahan Nilai) wajib mencatat log audit (`created_by`, `updated_by`, timestamp, snapshot data lama).

## 3. Penanganan Konflik Kebutuhan
Apabila terdapat pertentangan antara kebutuhan sekolah real dan regulasi Dapodik:
1. **Prinsip Dual-Layer:** Sistem harus menyimpan kedua data secara terisolasi.
2. **Eskalasi:** PM dan BA wajib memediasi dengan pihak kurikulum sekolah sebelum mengambil keputusan final.
