# 27-Architecture-Remediation-Plan.md

# ARCHITECTURE REMEDIATION PLAN

## SIKAD v4.0

Version: 4.0

Status: APPROVED

---

# TUJUAN

Menetapkan spesifikasi perbaikan (remediasi) arsitektur untuk mengatasi lima celah teknis utama yang diidentifikasi pada perencanaan SIKAD v4.0 guna menjamin skalabilitas, integritas data, keamanan autentikasi, serta keandalan penyimpanan offline.

---

# 1. REMEDIASI FALLBACK STORAGE DESKTOP (TAURI V2)

*   **Masalah**: Webview OS pada Tauri v2 memiliki batasan kuota IndexedDB yang ketat dan dapat dibersihkan sepihak oleh OS.
*   **Solusi**: Mengintegrasikan `tauri-plugin-sql` dengan SQLite sebagai *fallback database* lokal yang persisten di sisi desktop, menggantikan IndexedDB/Dexie.js ketika aplikasi berjalan dalam bundel `.exe`.

### Desain Adapter Sinkronisasi Database Lokal

```typescript
// src/db/dbAdapter.ts
export interface IDatabaseAdapter {
  save(table: string, data: any): Promise<boolean>;
  get(table: string, id: string): Promise<any>;
  getAll(table: string): Promise<any[]>;
}

// Implementasi mendeteksi runtime Tauri v2
export const getActiveStorage = (): IDatabaseAdapter => {
  if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
    // Menggunakan SQLite lokal native via Tauri Rust Backend
    return new TauriSqliteAdapter();
  }
  // Fallback menggunakan IndexedDB/Dexie di browser web/PWA
  return new DexieIndexedDbAdapter();
};
```

---

# 2. OTOMASI AUTH & PROFILE GURU (USER LIFECYCLE)

*   **Masalah**: Otoritas skema `auth.users` dikelola secara terisolasi oleh Supabase Auth, berpotensi memicu kegagalan constraint kunci asing jika data profil tidak sinkron, serta trigger lama melanggar aturan `NOT NULL` dari kolom wajib `gurus` (`kode_guru`, `nama_lengkap`, `jenis_kelamin`, `tanggal_lahir`, `status_pegawai`, `username`).
*   **Solusi**: Menggunakan sistem undangan administrator (*invitation-only*) dan melengkapi database dengan trigger PL/pgSQL otomatis yang terintegrasi dengan tipe data/constraints di tabel `public.gurus` secara penuh.

### Trigger Sinkronisasi Supabase Auth ke Public Gurus (Aligned Schema)

```sql
-- Diletakkan di supabase/migrations/1500_triggers/1505_auth_sync_trigger.sql
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
    new_kode VARCHAR(50);
    new_username VARCHAR(100);
BEGIN
    -- Menghasilkan kode_guru unik berdasarkan UUID
    new_kode := 'G-' || substring(NEW.id::text from 1 for 6);
    
    -- Menghasilkan username unik dari meta data atau email
    new_username := COALESCE(
        NEW.raw_user_meta_data->>'username', 
        split_part(NEW.email, '@', 1), 
        'guru-' || substring(NEW.id::text from 1 for 8)
    );

    INSERT INTO public.gurus (
        id, 
        kode_guru,
        nama_lengkap, 
        jenis_kelamin, 
        tanggal_lahir, 
        nip, 
        status_pegawai, 
        jabatan_struktural, 
        username, 
        status, 
        is_active,
        created_at, 
        updated_at
    )
    VALUES (
        NEW.id::text,
        new_kode,
        COALESCE(NEW.raw_user_meta_data->>'nama_lengkap', NEW.raw_user_meta_data->>'nama', 'Guru Baru'),
        COALESCE(NEW.raw_user_meta_data->>'jenis_kelamin', 'L'),
        COALESCE((NEW.raw_user_meta_data->>'tanggal_lahir')::date, '1980-01-01'::date),
        COALESCE(NEW.raw_user_meta_data->>'nip', ''),
        COALESCE((NEW.raw_user_meta_data->>'status_pegawai')::status_pegawai_type, 'GTT'::status_pegawai_type),
        'NONE'::jabatan_struktural_type,
        new_username,
        'AKTIF'::status_aktif_type,
        TRUE,
        now(),
        now()
    )
    ON CONFLICT (id) DO UPDATE SET
        nama_lengkap = EXCLUDED.nama_lengkap,
        nip = CASE WHEN EXCLUDED.nip <> '' THEN EXCLUDED.nip ELSE gurus.nip END,
        username = EXCLUDED.username,
        updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
```

---

# 3. MATRIKS RESOLUSI KONFLIK SINKRONISASI (CONFLICT MATRIX)

*   **Masalah**: Potensi penimpaan data secara tidak sengaja akibat sinkronisasi offline-first pada kolom nilai dan absensi.
*   **Solusi**: Menerapkan resolusi data granular yang disesuaikan dengan tipe entitas schema `assessments`, `assessment_details`, dan `kehadiran`.

| Tabel Target | Aturan Resolusi Utama | Kriteria Keputusan / Detail Teknis |
| :--- | :--- | :--- |
| `assessments` / `assessment_details` | **Field-Level Merge** / **Last-Write-Wins (LWW)** | Penyelesaian bentrok nilai dilakukan berdasarkan perbandingan timestamp `updated_at` level baris. Nilai yang diinput terakhir akan menang. |
| `kehadiran` | **Conflict Queue Flag (CQF)** | Jika terjadi bentrok data absensi (`sakit`, `izin`, `alpa`) pada term berjalan, sistem memblokir auto-overwrite lokal, memasukkan baris tersebut ke tabel lokal `conflict_queue` untuk resolusi manual oleh Wali Kelas. |
| `gurus` / `siswas` | **Cloud Overwrite Local (COL)** | Seluruh data master guru/siswa di cloud server adalah satu-satunya *source of truth*. Perubahan lokal klien akan diganti dengan data cloud saat sinkronisasi. |

---

# 4. STRATEGI SINKRONISASI PARSIAL (PARTIAL SYNC SCOPE)

*   **Masalah**: Sekolah besar memiliki ratusan ribu data transaksi yang memicu *out-of-memory* diIndexedDB/browser klien jika disinkronkan sekaligus.
*   **Solusi**: Membatasi unduhan kueri data relasional Supabase ke IndexedDB berdasarkan hak akses aktor yang terautentikasi.

### Spesifikasi Kueri Filter Sinkronisasi (Sync Scope SQL Filters)

1.  **Scope Guru Mata Pelajaran (Filter Relasional)**:
    *   Kueri data kelas riil yang diajar:
        ```sql
        SELECT k.* FROM public.kelas k
        INNER JOIN public.pembagian_mengajar pm ON pm.kelas_id = k.id
        WHERE pm.guru_id = :auth_guru_id 
          AND pm.academic_term_id = :active_term_id 
          AND pm.jenis = 'REAL';
        ```
    *   Kueri data siswa terbatas: Hanya mengunduh siswa (`siswas`) yang tergabung di kelas tersebut pada term aktif (menggunakan join ke `riwayat_kelas` di mana `kelas_real_id = :kelas_id` dan `academic_term_id = :active_term_id`).
    *   Kueri nilai terbatas: Mengunduh `assessments` dan `assessment_details` di mana `academic_term_id` adalah term aktif berjalan dan `pembagian_mengajar_id` diajar oleh guru terkait.

2.  **Scope Wali Kelas (Filter Perwalian)**:
    *   Kueri data siswa: Mengunduh seluruh murid di kelas perwaliannya saja.
        ```sql
        SELECT s.* FROM public.siswas s
        INNER JOIN public.riwayat_kelas r ON s.id = r.siswa_id
        INNER JOIN public.kelas k ON r.kelas_real_id = k.id
        WHERE k.wali_kelas_id = :auth_guru_id 
          AND r.academic_term_id = :active_term_id 
          AND r.tanggal_selesai IS NULL;
        ```

3.  **Scope Kurikulum / Admin**:
    *   Mengunduh data secara utuh, namun dilakukan bertahap menggunakan kueri paginasi kursor (`LIMIT 100 OFFSET :offset`) guna mencegah kelebihan memori klien.

---

# 5. STRATEGI BACKUP SUPABASE STORAGE

*   **Masalah**: Pencadangan PostgreSQL tidak mencakup berkas biner Supabase Storage (PDF Rapor, Avatar). Perintah CLI `supabase storage download` tidak efisien dan tidak andal untuk sinkronisasi biner dalam jumlah besar.
*   **Solusi**: Menggunakan protokol S3-compatible API bawaan Supabase Storage dan menyingkronkannya langsung ke AWS S3 eksternal menggunakan AWS CLI sync.

### Alur Kerja Backup Storage S3-Compatible (GitHub Actions Cron)

```yaml
# .github/workflows/storage-backup.yml
name: Scheduled Storage Backup

on:
  schedule:
    - cron: '0 2 * * *' # Berjalan setiap hari pukul 02:00 UTC (saat lalu lintas rendah)

jobs:
  backup-storage:
    runs-on: ubuntu-latest
    steps:
      - name: Install AWS CLI
        run: |
          sudo apt-get update
          sudo apt-get install -y awscli

      - name: Sync Supabase Storage Buckets to Destination AWS S3
        env:
          # Kredensial Akses Gateway S3 Supabase (Source)
          SUB_AWS_ACCESS_KEY_ID: ${{ secrets.SUPABASE_S3_ACCESS_KEY_ID }}
          SUB_AWS_SECRET_ACCESS_KEY: ${{ secrets.SUPABASE_S3_SECRET_ACCESS_KEY }}
          SUPABASE_PROJECT_ID: ${{ secrets.SUPABASE_PROJECT_ID }}
          
          # Kredensial Tujuan AWS S3 (Destination Backup)
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          AWS_DEFAULT_REGION: 'us-east-1'
        run: |
          # 1. Konfigurasi Profil Sumber (Supabase Storage S3 API)
          aws configure set aws_access_key_id $SUB_AWS_ACCESS_KEY_ID --profile source_supabase
          aws configure set aws_secret_access_key $SUB_AWS_SECRET_ACCESS_KEY --profile source_supabase
          
          # 2. Unduh data bucket Supabase secara lokal lewat gateway S3
          # Endpoint URL disesuaikan dengan S3 API Supabase: https://[PROJECT_ID].supabase.co/storage/v1/s3
          aws s3 sync s3://rapor ./backup/rapor --endpoint-url https://$SUPABASE_PROJECT_ID.supabase.co/storage/v1/s3 --profile source_supabase
          aws s3 sync s3://avatars ./backup/avatars --endpoint-url https://$SUPABASE_PROJECT_ID.supabase.co/storage/v1/s3 --profile source_supabase
          
          # 3. Sinkronisasikan cadangan lokal ke bucket AWS S3 utama sekolah
          aws s3 sync ./backup s3://sikad-backup-storage/$(date +%F) --profile aws_dest --delete
```

---

# KRITERIA PENERIMAAN REMEDIASI (ACCEPTANCE)

✓ Seluruh script trigger `handle_new_auth_user` terpasang di file migrasi `1500_triggers/`.

✓ Dokumentasi adapter Tauri SQLite tervalidasi oleh tim lead arsitek.

✓ Backup berkas biner Supabase Storage berhasil tersinkronisasi ke S3 dalam simulasi pemulihan bencana (*Disaster Recovery dry-run*).
