# 24. Engineering Standards

Dokumen ini menetapkan standar teknis penulisan kode SIKAD v4.0 untuk memastikan konsistensi, performa, dan kemudahan pemeliharaan.

## 1. Arsitektur Utama (Clean Architecture)
SIKAD v4.0 mengikuti alur dependensi satu arah dari luar ke dalam:
```text
UI (Component/Page) ──> Custom Hooks ──> Service Layer ──> Repository Layer ──> Supabase/Dexie
```
- **UI Layer:** Hanya menangani visualisasi data dan interaksi pengguna. Dilarang mengakses database langsung.
- **Service Layer:** Berisi business logic, validasi skema (Zod), dan penanganan alur kerja.
- **Repository Layer:** Berisi query database (CRUD) menggunakan Supabase Client atau Dexie.js.

## 2. TypeScript Rules
- Wajib menggunakan strict mode (`"strict": true` di `tsconfig.json`).
- Dilarang keras menggunakan tipe `any`. Gunakan interface atau type custom yang aman.

## 3. Batasan Ukuran File
- **Komponen UI:** Maksimal 300 baris kode. Jika melebihi, pecah menjadi komponen anak.
- **Service:** Maksimal 500 baris kode. Jika melebihi, lakukan refactoring.
