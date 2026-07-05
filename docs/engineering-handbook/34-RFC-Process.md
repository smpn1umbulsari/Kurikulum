# 34. RFC (Request for Comments) Process

Proses RFC digunakan untuk mendiskusikan perubahan desain arsitektur besar sebelum kode diimplementasikan.

## 1. Kapan Harus Membuat RFC?
- Saat ingin menambahkan framework atau library baru ke dalam sistem.
- Saat melakukan restrukturisasi besar-besaran terhadap core engine (misal: penulisan ulang Sync Engine).
- Saat melakukan perubahan alur autentikasi pengguna.

## 2. Alur RFC
1. Pengusul membuat dokumen RFC berdasarkan template di [Appendix/Templates/README.md](Appendix/Templates/README.md).
2. Dokumen diunggah ke folder `docs/RFC/` di repositori Git.
3. Tim diberikan waktu 5 hari kerja untuk menulis komentar dan feedback pada PR RFC.
4. Keputusan akhir diambil oleh Software Architect (Approve/Reject/Postpone).
