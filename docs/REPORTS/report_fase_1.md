# QA Audit & Analysis Report - SIKAD v4.0 Fase 1: Security & RLS Policies

> **Tanggal Audit:** 26 Juni 2026  
> **Auditor:** QA Architect (AI Agent)  
> **Status:** ⚠️ DRAFT AUDIT (PENDING REMEDIATION)  
> **Skor Kualitas Awal:** **7.5 / 10**  
> **Skor Kualitas Akhir:** **TBD / 10** (Menunggu Perbaikan)

---

## 1. PENDAHULUAN
Laporan ini mengevaluasi kualitas implementasi keamanan database pada SIKAD v4.0 Fase 1, khususnya terkait Row Level Security (RLS) dan otorisasi database PostgreSQL.

---

## 2. HASIL PEMERIKSAAN KUALITAS KODE (QA FINDINGS)

Berdasarkan tinjauan mendalam pada berkas `supabase/migrations/1700_rls_guru.sql` hingga `1704_rls_admin.sql`, diidentifikasi beberapa area kritis yang perlu ditingkatkan untuk mencapai kepatuhan standar enterprise:

### temuan 1: Potensi Celah Keamanan Multi-Tenancy (Multi-School Isolation)
*   **Deskripsi:** Advanced Architecture Remediation Plan menetapkan isolasi data multi-sekolah menggunakan kolom `sekolah_id` dan klaim JWT. RLS policy saat ini belum memvalidasi kepemilikan `sekolah_id` lintas tabel.
*   **Risiko:** Potensi kebocoran data jika satu instance database digunakan untuk beberapa sekolah (*cross-tenant data leakage*).
*   **Rekomendasi Perbaikan:** Tambahkan validasi klaim JWT `sekolah_id` pada policy yang membatasi data per-sekolah.

### temuan 2: Absensi Filter Soft Delete (`deleted_at IS NULL`) pada RLS SELECT
*   **Deskripsi:** Spesifikasi menyatakan semua kueri operasional wajib menyaring record yang sudah dihapus secara lunak (`deleted_at IS NULL`). Kebijakan SELECT RLS saat ini tidak menerapkan penyaringan ini secara otomatis di level database.
*   **Risiko:** Pengguna terotorisasi dapat secara tidak sengaja membaca data yang sudah di-soft-delete jika kueri frontend lupa menyertakan filter tersebut.
*   **Rekomendasi Perbaikan:** Tambahkan filter `deleted_at IS NULL` pada policy SELECT untuk tabel yang mendukung soft delete (seperti `gurus`, `siswas`, dll.).

### temuan 3: Ketiadaan Proteksi Kunci Tahun Akademik (*Academic Term Lock*)
*   **Deskripsi:** Sesuai spesifikasi, apabila suatu tahun akademik sudah difinalisasi (`academic_term.finalized = true`), seluruh transaksi akademik pada term tersebut wajib bersifat *READ ONLY*. RLS policy saat ini belum memeriksa status finalisasi term pada operasi INSERT/UPDATE/DELETE.
*   **Risiko:** Guru atau pengguna lain masih dapat mengubah nilai atau absensi pada semester yang sudah ditutup/dikunci.
*   **Rekomendasi Perbaikan:** Tambahkan pemeriksaan status `finalized` dari tabel `academic_terms` pada policy modifikasi (INSERT/UPDATE/DELETE) tabel transaksi.

### temuan 4: Optimasi Keamanan `SECURITY DEFINER` Helper Functions
*   **Deskripsi:** Fungsi otorisasi pembantu (seperti `auth_is_admin`) menggunakan opsi `SECURITY DEFINER` untuk memintas RLS. Namun, fungsi tersebut belum mengeset `search_path` secara eksplisit.
*   **Risiko:** Risiko kerentanan keamanan berupa *search_path hijacking* apabila pengguna jahat membuat fungsi tiruan di skema lain.
*   **Rekomendasi Perbaikan:** Tambahkan klausa `SET search_path = public` pada seluruh fungsi otorisasi pembantu.

---

## 3. RENCANA TINDAKAN PERBAIKAN (REMEDIATION PLAN)

| #   | File Target | Deskripsi Perbaikan | Prioritas |
| --- | ----------- | ------------------- | --------- |
| 1   | [1700_rls_guru.sql](file:///d:/KURIKULUM/00 Final Kurikulum/supabase/migrations/1700_rls_guru.sql) | Tambahkan `SET search_path = public` ke seluruh helper functions. | Tinggi |
| 2   | [1700_rls_guru.sql](file:///d:/KURIKULUM/00 Final Kurikulum/supabase/migrations/1700_rls_guru.sql) | Tambahkan filter `deleted_at IS NULL` pada policy SELECT tabel `gurus`. | Sedang |
| 3   | [1702_rls_bk.sql](file:///d:/KURIKULUM/00 Final Kurikulum/supabase/migrations/1702_rls_bk.sql) | Tambahkan filter `deleted_at IS NULL` pada policy SELECT tabel `siswas`. | Sedang |
| 4   | [1703_rls_kurikulum.sql](file:///d:/KURIKULUM/00 Final Kurikulum/supabase/migrations/1703_rls_kurikulum.sql) | Terapkan validasi *Academic Term Lock* pada RLS INSERT/UPDATE/DELETE untuk assessments dan kelas. | Tinggi |

---

## 4. VERIFIKASI REMEDIASI
Skor akhir akan diperbarui setelah tindakan perbaikan selesai diimplementasikan, disinkronkan, dan diverifikasi melalui Pipeline Quality check AETHER.
