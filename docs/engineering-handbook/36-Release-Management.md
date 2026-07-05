# 36. Release Management

 Release Management mendefinisikan langkah-langkah merilis versi baru aplikasi SIKAD v4.0 secara aman ke tangan pengguna.

## 1. Aturan Penomoran Versi (Semantic Versioning)
Format: `MAJOR.MINOR.PATCH` (contoh: `4.0.0`)
- **MAJOR:** Perubahan besar yang tidak kompatibel ke belakang (breaking changes).
- **MINOR:** Penambahan fitur baru yang kompatibel ke belakang (backward compatible).
- **PATCH:** Perbaikan bug yang kompatibel ke belakang.

## 2. Prosedur Go-Live Produksi
1. Pengujian UAT dinyatakan lulus oleh PO & Client.
2. Gabungkan branch `staging` ke `main`.
3. Buat rilis tag di GitHub (misal: `v4.0.0`).
4. Pipeline CI/CD akan otomatis men-deploy frontend ke Cloudflare Pages dan menghasilkan file installer desktop di GitHub Release.
5. Lakukan Smoke Test di lingkungan produksi untuk memverifikasi fitur kritis berjalan normal.
