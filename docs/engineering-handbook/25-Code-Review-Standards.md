# 25. Code Review Standards

Proses code review bertujuan menjaga kualitas kode, mencegah bug lolos ke produksi, serta membagi pengetahuan teknis antar tim.

## 1. Alur Code Review
1. Developer membuat Pull Request (PR) ke branch `develop`.
2. PR minimal harus ditinjau oleh **1 Lead Developer** (Backend/Frontend Lead).
3. Reviewer memberikan komentar konstruktif jika ada perbaikan.
4. Setelah disetujui, PR baru boleh di-merge.

## 2. Checklist Reviewer
- [ ] **Type Safety:** Apakah tipe data aman? Tidak ada penggunaan `any`?
- [ ] **Clean Architecture:** Apakah business logic bocor ke komponen UI?
- [ ] **Error Handling:** Apakah semua operasi async menggunakan `try-catch` dengan format error terstandar?
- [ ] **Security (RLS Compatibility):** Apakah query database mematuhi batasan Row Level Security?
- [ ] **Offline Sync:** Apakah mutasi data transaksi sudah dimasukkan ke `sync_queue` Dexie?
- [ ] **Performance:** Apakah ada loop query yang tidak efisien?

## 3. Pintu Validasi AI (AI Validation Gate)
Sebelum sebuah Pull Request masuk ke tahap peninjauan manual oleh Lead Developer, PR tersebut wajib lolos pemeriksaan otomatis berikut:
- [ ] **Strict Linter Gate:** Perintah `npm run lint` dan `npm run typecheck` harus diselesaikan dengan status sukses (nol kesalahan tipe).
- [ ] **Coverage Gate:** Unit test dan integration test harus memiliki cakupan kode (*code coverage*) minimal **80%** untuk folder Service dan Repository.
- [ ] **Structure & Size Gate:** Pengecekan otomatis bahwa tidak ada file komponen UI melebihi 300 baris, dan file Service tidak melebihi 500 baris.
- [ ] **Audit Ketergantungan (Dependency Audit):** Verifikasi otomatis bahwa tidak ada pustaka pihak ketiga baru yang ditambahkan ke `package.json` tanpa persetujuan RFC.

