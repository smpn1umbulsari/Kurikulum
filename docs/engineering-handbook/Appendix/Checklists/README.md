# Appendix Checklists

Koleksi checklist tambahan untuk operasi tim teknis SIKAD v4.0.

## 1. Checklist Keamanan RLS Database
- [ ] Pastikan semua tabel transaksi akademik mengaktifkan RLS (`ALTER TABLE x ENABLE ROW LEVEL SECURITY;`).
- [ ] Uji policy SELECT: Apakah guru hanya bisa melihat kelas di mana ia mengajar?
- [ ] Uji policy INSERT/UPDATE: Apakah guru diblokir saat mencoba memasukkan nilai untuk siswa kelas lain?
- [ ] Pastikan API key anonim (`anon_key`) tidak memiliki izin bypass RLS.

## 2. Checklist Migrasi Skema Supabase
- [ ] Buat file migrasi menggunakan Supabase CLI (`supabase migration new x`).
- [ ] Tulis perintah DDL SQL yang bersifat idempoten (misal: `CREATE TABLE IF NOT EXISTS`).
- [ ] Uji skema migrasi secara lokal (`supabase db reset`).
- [ ] Validasi tidak ada trigger atau constraint yang rusak setelah reset.
