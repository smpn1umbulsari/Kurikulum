# 07. Definition of Done (DoD)

Sebuah fitur atau modul dinyatakan **Done** dan siap digabungkan ke branch release (`staging` / `main`) jika memenuhi kriteria berikut:

1. **Kode Lulus Kompilasi:** Kode berhasil di-build tanpa error linting (`npm run build` & TypeScript strict lulus).
2. **Pengujian Unit & Integrasi:** Coverage unit test minimal **80%** untuk Service dan Repository Layer.
3. **Kompatibilitas Offline-First:** Fitur telah diuji bekerja dalam kondisi internet mati (data tersimpan di Dexie) dan berhasil disinkronkan saat internet aktif kembali tanpa kehilangan data.
4. **Keamanan RLS Terverifikasi:** Row Level Security (RLS) pada Supabase telah diuji dan tidak membocorkan data antar guru.
5. **Code Review Selesai:** Pull Request (PR) disetujui oleh minimal 1 Lead Developer dan tidak melanggar standard pengkodean.
6. **Dokumentasi Diperbarui:** Kode terdokumentasi (JSDoc), skema database baru dicatat di ERD, dan ADR dibuat jika ada keputusan arsitektur baru.
