# ANALISIS PERBEDAAN KONSEP AKADEMIK

**Tanggal**: 27 Juni 2026  
**Dokumen**: `perbedaan.md`  
**Proyek Referensi**:

- `SIKAD v4.0` (`00 Final Kurikulum`)
- `Guru Spenturi` (`Data Kurikulum`)

---

## 1. PENDAHULUAN

Dokumen ini memetakan perbedaan mendasar mengenai pemodelan data akademik—khususnya pada entitas **Mata Pelajaran (Mapel)**, **Guru**, **Siswa**, dan **Pembagian Mengajar**—antara desain awal sistem **SIKAD v4.0** (`00 Final Kurikulum`) dengan sistem **Guru Spenturi** (`Data Kurikulum`).

Pemetaan ini menjadi acuan dalam penyelarasan schema database luring (Dexie/IndexedDB) dan backend (Supabase).

---

## 2. ENTITAS MATA PELAJARAN (MAPEL)

| Dimensi                | Projek SIKAD v4.0 (Awal)                                       | Projek Data Kurikulum (Spenturi)                                                            | Dampak Penyelarasan                                                             |
| :--------------------- | :------------------------------------------------------------- | :------------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------ |
| **Jenjang Belajar**    | Mengikuti struktur SMA (`Tingkat 10, 11, 12`).                 | Mengikuti struktur SMP (`Tingkat 7, 8, 9`).                                                 | Tingkat kelas dibatasi ke jenjang SMP.                                          |
| **Pengelompokan**      | Kelompok `A`, `B`, `C`, `D` (Umum, Peminatan SMA, Kejuruan).   | Kelompok `A` (Mata Pelajaran Wajib), `B` (Muatan Lokal) Kurikulum Merdeka SMP.              | Pengelompokan disesuaikan dengan regulasi Kemendikbud SMP.                      |
| **Relasi Induk**       | Flat (Setiap baris mapel mandiri tanpa relasi hierarki).       | Menggunakan **Induk Mata Pelajaran** (seperti `PABP` untuk Pendidikan Agama, `MTK`, `IPA`). | Menambahkan kolom `induk_mapel` dan `induk_nama` pada skema Dexie dan Postgres. |
| **Pengurutan (Sort)**  | Berdasarkan alfabetis kode atau nama mata pelajaran.           | Menggunakan kolom `mapping` (angka) sebagai no urut wajib cetak rapor.                      | Kolom `mapping` diindeks di Dexie untuk visualisasi tabel dan cetakan.          |
| **Spesifikasi Agama**  | Umum (PABP dianggap satu mapel universal).                     | Menyediakan atribut `agama` khusus di bawah induk `PABP` (Islam, Kristen, dll.).            | Siswa hanya mendapatkan rekap nilai PABP yang sesuai dengan agamanya.           |
| **Jam Pelajaran (JP)** | Jumlah JP bersifat statis atau diatur pada pembagian mengajar. | Mengatur JP secara eksplisit berdasarkan jenis kelas: `jp_reguler` dan `jp_pagar`.          | Struktur data mapel diperluas untuk menampung beban JP bawaan kurikulum.        |

---

## 3. ENTITAS GURU & USER

| Dimensi             | Projek SIKAD v4.0 (Awal)                                        | Projek Data Kurikulum (Spenturi)                                                   | Dampak Penyelarasan                                                                                                                                              |
| :------------------ | :-------------------------------------------------------------- | :--------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Metode Login**    | Supabase Auth Standard (Email + Password).                      | Username + Password custom (contoh: `superadmin` / `shidiq2492`).                  | Menggunakan Edge Function `custom-login` dan tabel `custom_users` di Postgres.                                                                                   |
| **Tipe Data Lahir** | String format ISO Timestamp (`string`).                         | Date murni format YYYY-MM-DD (`DATE`).                                             | Schema database diubah ke `DATE` untuk presisi laporan administratif.                                                                                            |
| **Tugas Tambahan**  | Sederhana, tidak terikat langsung pada ekuivalensi JP mingguan. | Memiliki ekuivalensi Jam Pelajaran (`jam_per_minggu`) untuk pelaporan beban kerja. | Dibuat repository [tugasTambahanRepository.ts](file:///d:/KURIKULUM/00%20Final%20Kurikulum/src/modules/settings/repositories/tugasTambahanRepository.ts) khusus. |

---

## 4. ENTITAS SISWA

| Dimensi             | Projek SIKAD v4.0 (Awal)                                 | Projek Data Kurikulum (Spenturi)                                                                    | Dampak Penyelarasan                                               |
| :------------------ | :------------------------------------------------------- | :-------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------- |
| **Penamaan Rombel** | Mengikuti kelas SMA (contoh: `"X IPA 1"`, `"XI IPS 2"`). | Mengikuti kelas SMP (contoh: `"VII A"`, `"VIII B"`).                                                | Placeholder form dan seeder diubah ke penamaan SMP.               |
| **Status Akademik** | Status aktif / nonaktif (`boolean`).                     | Memiliki status terperinci (`status_keluar`): `AKTIF`, `NAIK_KELAS`, `PINDAH`, `LULUS`, `DROP_OUT`. | Riwayat kelas siswa menyimpan status kelulusan/kenaikan semester. |
| **Tanggal Lahir**   | String Timestamp.                                        | Date murni format `DATE`.                                                                           | Kolom database dikonversi ke tipe data `DATE`.                    |

---

## 5. PEMBAGIAN MENGAJAR (TEACHING ALLOCATIONS)

| Dimensi                     | Projek SIKAD v4.0 (Awal)                                                                 | Projek Data Kurikulum (Spenturi)                                                           | Dampak Penyelarasan                                                           |
| :-------------------------- | :--------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------- |
| **Jenis Rombongan Belajar** | Dibedakan berdasarkan kelas `REAL` (Kelas Riil) dan `DAPO` (Kelas Administrasi Dapodik). | Dibedakan berdasarkan rombel `REGULER` dan `PAGAR` (Sistem kelas SMP).                     | Jenis rombel di semua form input kelas diubah ke pilihan `REGULER` / `PAGAR`. |
| **Validasi JP Maksimum**    | Input bebas tanpa validasi ketat per mapel.                                              | Alokasi JP divalidasi langsung terhadap kolom `jp_reguler` atau `jp_pagar` di tabel mapel. | Menghindari alokasi jam mengajar guru melebihi kapasitas struktur kurikulum.  |

---

## 6. KESIMPULAN

Integrasi konsep dari **Data Kurikulum** ke dalam **SIKAD v4.0** membawa standarisasi yang lebih presisi untuk sistem setingkat SMP (terutama penerapan Kurikulum Merdeka). Perubahan ini telah diterapkan sepenuhnya pada:

- [index.ts](file:///d:/KURIKULUM/00%20Final%20Kurikulum/src/types/index.ts) (pembaruan tipe data, enum, dan seeder mapel SMP).
- [schema.ts](file:///d:/KURIKULUM/00%20Final%20Kurikulum/src/database/dexie/schema.ts) (penambahan indeks `mapping`, `induk_mapel`, dan `agama`).
- [MataPelajaranPage.tsx](file:///d:/KURIKULUM/00%20Final%20Kurikulum/src/modules/settings/pages/MataPelajaranPage.tsx) (UI baru pengelolaan mapel dengan induk PABP & agama).
- [KelasPage.tsx](file:///d:/KURIKULUM/00%20Final%20Kurikulum/src/modules/kelas/pages/KelasPage.tsx) & [PembagianMengajarPage.tsx](file:///d:/KURIKULUM/00%20Final%20Kurikulum/src/modules/kelas/pages/PembagianMengajarPage.tsx) (migrasi dari tipe REAL/DAPO ke REGULER/PAGAR).
