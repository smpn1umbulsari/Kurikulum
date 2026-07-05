# 39. Checklists

Dokumen ini berisi kumpulan checklist kritis untuk memastikan konsistensi operasional tim teknis SIKAD v4.0.

## 1. Checklist Serah Terima Tugas (Developer Handoff)
- [ ] PR telah diuji di local machine.
- [ ] Dokumentasi kode (JSDoc/Comments) sudah lengkap.
- [ ] Skema database migrasi baru sudah teruji lancar (`supabase db deploy` local).
- [ ] Tautan ke test report / bukti uji lokal dilampirkan pada PR.

## 2. Checklist Rilis Go-Live Produksi
- [ ] Backup snapshot database sebelum migrasi dibuat.
- [ ] Smoke test fitur login, input nilai offline, dan generate rapor PDF lulus.
- [ ] Sertifikat SSL domain aktif dan konfigurasi DNS Cloudflare benar.
- [ ] Tautan rilis installer desktop Tauri v2 terverifikasi bisa diunduh.
