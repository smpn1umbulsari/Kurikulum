# RENCANA IMPLEMENTASI KONSOLIDASI SISTEM AKADEMIK SIKAD v4.0

Laporan perencanaan ini dirancang oleh **Software Architect**, **Database Architect**, dan **Frontend Lead** untuk mengonsolidasikan tiga proyek akademik (SIKAD v4.0, Guru Spenturi, dan Aplikasi Kurikulum) ke dalam satu platform tunggal yang tangguh, reaktif, berkinerja tinggi, dan ramah pengguna luring (*offline-first*).

---

## 1. DESKRIPSI TUJUAN

Proyek **Guru Spenturi (Data Kurikulum)** memiliki fungsionalitas logika sekolah menengah (SMP) yang paling sesuai dengan kebutuhan operasional di lapangan. Namun, ia menderita masalah kinerja yang lambat dan kode program kaku (*Vanilla JS DOM*). 
Tujuan dari konsolidasi ini adalah untuk **memindahkan seluruh logika bisnis sekolah dari Guru Spenturi ke dalam SIKAD v4.0**, sambil menerapkan **desain antarmuka interaktif premium (Tailwind CSS, Motion, Smart Importers) dari Aplikasi Kurikulum**, di atas **arsitektur offline-first (React 19, TypeScript strict, Dexie.js, Supabase RLS) dari SIKAD v4.0**.

---

## 2. USER REVIEW REQUIRED (TINJAUAN PENGGUNA)

> [!IMPORTANT]
> **1. Perubahan Skema Database (IndexedDB & PostgreSQL)**  
> Konsolidasi ini membutuhkan penambahan 5 tabel baru pada local database Dexie dan server Supabase PostgreSQL untuk mengakomodasi data Kalender Akademik dan Administrasi Asesmen (ruangan, kursi, pengawas). Kebijakan RLS (Row Level Security) akan diterapkan di tingkat tabel baru Postgres guna membatasi hak akses agar guru tidak dapat memodifikasi jadwal asesmen global tanpa izin.

> [!WARNING]
> **2. Pemisahan Alur Kerja Asesmen**  
> Kami akan membagi modul Asesmen di SIKAD v4.0 menjadi dua sub-layanan utama:
> - **Input Nilai Akademik (Grading)**: Lembar nilai reaktif untuk guru pengampu.
> - **Administrasi Asesmen Sekolah (Exam Admin)**: Pembagian ruang, denah bangku, jadwal pengawas, dan pencetakan kartu/label meja untuk panitia kurikulum.

> [!NOTE]
> **3. Porting Algoritma Distribusi Kursi (Seating Allocation)**  
> Kami akan menulis ulang algoritma pembagian ruang ujian versi 2 dari *Guru Spenturi* (yang mendistribusikan siswa secara acak lintas kelas/tingkatan ke kursi ujian demi mencegah kecurangan) menjadi fungsi TypeScript murni di SIKAD v4.0 untuk performa maksimal di sisi klien.

---

## 3. OPEN QUESTIONS (PERTANYAAN TERBUKA)

> [!IMPORTANT]
> **1. Kredensial Google Apps Script Cloud Sync**  
> Modul ekspor pengawasan ujian dari *Guru Spenturi* membutuhkan trigger ke berkas Apps Script sekolah. Apakah tim kurikulum memiliki URL Deployment Web App Apps Script aktif yang bisa kita simpan sebagai parameter lingkungan di `.env`?

> [!QUESTION]
> **2. Kunci API Penyedia Layanan Kecerdasan Buatan (AI)**  
> Fitur generator kisi-kisi soal dan RPP berbasis AI akan diarahkan menggunakan API Gemini. Apakah kita akan memakai kunci API terenkripsi di sisi klien (*client-side* dengan input key personal dari guru) atau via Supabase Edge Function terpusat? Kami merekomendasikan **Personal API Key Input** pada menu setelan untuk menghemat kuota server sekolah.

---

## 4. PROPOSED CHANGES (USULAN PERUBAHAN)

Proses konsolidasi akan dibagi berdasarkan layer arsitektur:

### Component 1: Database & Type Layer (Database Architect)
Menambahkan tipe data TypeScript dan memperluas skema IndexedDB & Postgres agar mendukung Kaldik interaktif dan administrasi Asesmen.

#### [MODIFY] [schema.ts](file:///d:/KURIKULUM/00%20Final%20Kurikulum/src/database/dexie/schema.ts)
*   Menambahkan tabel baru ke stores:
    *   `calendarEvents`: `id, title, start_date, end_date, category, academic_term_id`
    *   `examRooms`: `id, nama_ruang, kapasitas, academic_term_id`
    *   `examSeats`: `id, room_id, siswa_id, nomor_kursi`
    *   `examSupervisors`: `id, guru_id, room_id, slot_waktu, academic_term_id`
*   Menambahkan fungsi migrasi skema luring lokal.

#### [MODIFY] [types/index.ts](file:///d:/KURIKULUM/00%20Final%20Kurikulum/src/types/index.ts)
*   Mendefinisikan interface data TypeScript baru: `CalendarEvent`, `ExamRoom`, `ExamSeat`, `ExamSupervisor`, `ExcelImportPreviewRow`.

#### [NEW] [migrations/205_calendar_events.sql](file:///d:/KURIKULUM/00%20Final%20Kurikulum/supabase/migrations/205_calendar_events.sql)
*   Membuat tabel `calendar_events` di Postgres terintegrasi dengan trigger audit log dan kebijakan RLS kurikulum.

#### [NEW] [migrations/507_exam_administration.sql](file:///d:/KURIKULUM/00%20Final%20Kurikulum/supabase/migrations/507_exam_administration.sql)
*   Membuat tabel server: `exam_rooms`, `exam_seats`, `exam_supervisors` lengkap dengan foreign key constraints dan indexes performa.

---

### Component 2: Logic & Repositories Layer (Software Architect)
Menyediakan class manajemen data bisnis dan memindahkan algoritma operasional sekolah ke TypeScript.

#### [NEW] [seatingAlgorithm.ts](file:///d:/KURIKULUM/00%20Final%20Kurikulum/src/modules/assessment/utils/seatingAlgorithm.ts)
*   Porting algoritma pembagian kursi Spenturi: membagi siswa secara seimbang dari tingkat 7, 8, 9 ke dalam daftar ruang ujian aktif, memastikan siswa satu kelas tidak duduk bersebelahan jika kapasitas mencukupi.

#### [NEW] [calendarRepository.ts](file:///d:/KURIKULUM/00%20Final%20Kurikulum/src/modules/calendar/repositories/calendarRepository.ts)
*   Repositori data kalender lokal Dexie yang tersinkron otomatis ke Supabase via Sync Queue.

#### [NEW] [examAdminRepository.ts](file:///d:/KURIKULUM/00%20Final%20Kurikulum/src/modules/assessment/repositories/examAdminRepository.ts)
*   Repositori lokal untuk mengelola setup ruangan, alokasi kursi, dan jadwal pengawas ujian.

---

### Component 3: UI & Component Layer (Frontend Lead)
Membangun antarmuka pengguna interaktif modern menggunakan React 19 dan Tailwind.

#### [NEW] [SmartExcelImporter.tsx](file:///d:/KURIKULUM/00%20Final%20Kurikulum/src/app/components/SmartExcelImporter.tsx)
*   Komponen modal generic pengimpor data Excel. Membaca file, mencocokkan kolom secara visual, menampilkan status baris (`BARU`, `PERBARUI`, `BENTROK`, `TIDAK VALID`) dan pratinjau data sebelum commit ke database.

#### [MODIFY] [GuruPage.tsx](file:///d:/KURIKULUM/00%20Final%20Kurikulum/src/modules/guru/pages/GuruPage.tsx)
*   Mengintegrasikan tombol Impor Excel Pintar menggunakan komponen `SmartExcelImporter`.

#### [MODIFY] [SiswaPage.tsx](file:///d:/KURIKULUM/00%20Final%20Kurikulum/src/modules/siswa/pages/SiswaPage.tsx)
*   Mengintegrasikan impor Excel pintar dan status kelulusan/mutasi siswa.

#### [NEW] [CalendarPage.tsx](file:///d:/KURIKULUM/00%20Final%20Kurikulum/src/modules/calendar/pages/CalendarPage.tsx)
*   Halaman kalender visual interaktif di mana admin dapat menambah kegiatan sekolah, hari libur nasional, jadwal ujian, dan **secara otomatis menampilkan Rincian Pekan Efektif (RPE)** di panel samping.

#### [NEW] [AssessmentAdminPage.tsx](file:///d:/KURIKULUM/00%20Final%20Kurikulum/src/modules/assessment/pages/AssessmentAdminPage.tsx)
*   Antarmuka administrasi ujian yang membagi halaman ke dalam tab:
    *   **Tab Ruangan**: Daftar ruang ujian, kapasitas, dan tombol acak kursi.
    *   **Tab Pengawas**: Grid penjadwalan guru pengawas dengan indikator bentrok otomatis.
    *   **Tab Cetak**: Antarmuka layout cetak cetak kartu peserta (dengan foto profil), cetak label meja (format stiker 121), serta berita acara pengawasan.

#### [MODIFY] [kurikulum.tsx](file:///d:/KURIKULUM/00%20Final%20Kurikulum/src/routes/kurikulum.tsx)
*   Mendaftarkan route baru `/kurikulum/calendar` ke `CalendarPage`.
*   Menambahkan route `/kurikulum/assessment-admin` ke `AssessmentAdminPage`.

---

## 5. VERIFICATION PLAN (RENCANA VERIFIKASI)

### Automated Tests (Pengujian Otomatis)
Kami akan menambahkan unit testing untuk menguji fungsi komputasi sensitif:
*   `npm run test src/modules/assessment/utils/seatingAlgorithm.test.ts`: Memastikan siswa terdistribusi rata ke ruangan tanpa ada kursi ganda (*double booking*) dan siswa sekelas tidak duduk bersebelahan.
*   `npm run test src/modules/calendar/utils/rpeCalculator.test.ts`: Memastikan perhitungan minggu efektif (RPE) menghasilkan angka yang tepat sesuai input hari libur semester.

### Manual Verification (Verifikasi Manual)
*   **Impor Excel**: Mengunggah berkas Excel berisi NIP ganda atau format tanggal lahir salah, memverifikasi bahwa `SmartExcelImporter` mendeteksi status `BENTROK` dan `TIDAK VALID` di layar pratinjau sebelum menyimpan.
*   **Uji Kalender**: Menambahkan event libur sekolah 1 minggu pada kalender akademik, memverifikasi bahwa jumlah minggu efektif (RPE) pada panel ringkasan langsung berkurang 1 secara reaktif.
*   **Uji Layout Cetak**: Membuka pratinjau cetak kartu peserta ujian dan label meja, memeriksa keselarasan layout halaman saat dicetak ke printer fisik atau disimpan sebagai PDF.
