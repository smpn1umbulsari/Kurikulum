-- SIKAD v4.0 Full Database Installation Script
-- Generated automatically from migrations
-- Generated at: 2026-07-04T04:35:00.360Z

-- =============================================
-- CLEANUP: Drop all existing objects if any
-- (Safe for fresh install & re-install)
-- =============================================

DROP VIEW IF EXISTS v_teacher_workload CASCADE;
DROP VIEW IF EXISTS v_student_current_class CASCADE;
DROP VIEW IF EXISTS v_assessment_progress CASCADE;
DROP VIEW IF EXISTS v_attendance_summary CASCADE;
DROP VIEW IF EXISTS v_rapor_completion CASCADE;
DROP VIEW IF EXISTS v_curriculum_health CASCADE;
DROP VIEW IF EXISTS v_alumni_statistics CASCADE;
DROP VIEW IF EXISTS v_dashboard_kepsek CASCADE;
DROP VIEW IF EXISTS v_dashboard_kurikulum CASCADE;

DROP FUNCTION IF EXISTS update_timestamp CASCADE;
DROP FUNCTION IF EXISTS get_teacher_total_jp CASCADE;
DROP FUNCTION IF EXISTS acquire_assessment_lock CASCADE;
DROP FUNCTION IF EXISTS release_assessment_lock CASCADE;
DROP FUNCTION IF EXISTS check_assessment_publish_status CASCADE;
DROP FUNCTION IF EXISTS transfer_siswa_nilai CASCADE;
DROP FUNCTION IF EXISTS lock_pts_grades CASCADE;
DROP FUNCTION IF EXISTS prevent_pts_edit CASCADE;
DROP FUNCTION IF EXISTS validate_assessment_details CASCADE;
DROP FUNCTION IF EXISTS refresh_rekap_kehadiran CASCADE;
DROP FUNCTION IF EXISTS execute_siswa_promotion CASCADE;
DROP FUNCTION IF EXISTS execute_siswa_graduation CASCADE;
DROP FUNCTION IF EXISTS public.hash_password CASCADE;
DROP FUNCTION IF EXISTS public.verify_password CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at CASCADE;
DROP FUNCTION IF EXISTS finalize_academic_term CASCADE;
DROP FUNCTION IF EXISTS process_audit_trigger CASCADE;
DROP FUNCTION IF EXISTS push_to_sync_queue CASCADE;
DROP FUNCTION IF EXISTS resolve_sync_conflict CASCADE;
DROP FUNCTION IF EXISTS increment_record_version CASCADE;
DROP FUNCTION IF EXISTS handle_soft_delete CASCADE;
DROP FUNCTION IF EXISTS queue_analytics_job CASCADE;
DROP FUNCTION IF EXISTS public.auth_is_admin CASCADE;
DROP FUNCTION IF EXISTS public.auth_is_kurikulum CASCADE;
DROP FUNCTION IF EXISTS public.auth_is_kepsek CASCADE;
DROP FUNCTION IF EXISTS public.auth_is_bk CASCADE;
DROP FUNCTION IF EXISTS public.auth_is_guru CASCADE;
DROP FUNCTION IF EXISTS public.auth_is_wali_kelas CASCADE;
DROP FUNCTION IF EXISTS public.auth_is_guru_mengajar_kelas CASCADE;
DROP FUNCTION IF EXISTS run_system_health_check CASCADE;
DROP FUNCTION IF EXISTS clean_expired_locks CASCADE;

DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS academic_terms CASCADE;
DROP TABLE IF EXISTS gurus CASCADE;
DROP TABLE IF EXISTS siswas CASCADE;
DROP TABLE IF EXISTS mata_pelajarans CASCADE;
DROP TABLE IF EXISTS academic_calendar_events CASCADE;
DROP TABLE IF EXISTS tugas_tambahan_types CASCADE;
DROP TABLE IF EXISTS calendar_events CASCADE;
DROP TABLE IF EXISTS kelas CASCADE;
DROP TABLE IF EXISTS riwayat_kelas CASCADE;
DROP TABLE IF EXISTS wali_kelas_histori CASCADE;
DROP TABLE IF EXISTS mutasi_siswa CASCADE;
DROP TABLE IF EXISTS pembagian_mengajar CASCADE;
DROP TABLE IF EXISTS tugas_tambahan_assignments CASCADE;
DROP TABLE IF EXISTS assessment_types CASCADE;
DROP TABLE IF EXISTS assessments CASCADE;
DROP TABLE IF EXISTS assessment_details CASCADE;
DROP TABLE IF EXISTS assessment_locks CASCADE;
DROP TABLE IF EXISTS exam_rooms CASCADE;
DROP TABLE IF EXISTS exam_seats CASCADE;
DROP TABLE IF EXISTS exam_supervisors CASCADE;
DROP TABLE IF EXISTS kehadiran CASCADE;
DROP TABLE IF EXISTS rekap_kehadiran CASCADE;
DROP TABLE IF EXISTS catatan_wali_kelas CASCADE;
DROP TABLE IF EXISTS rapor_snapshots CASCADE;
DROP TABLE IF EXISTS rapor_pdf CASCADE;
DROP TABLE IF EXISTS rapor_versioning CASCADE;
DROP TABLE IF EXISTS promotion_jobs CASCADE;
DROP TABLE IF EXISTS promotion_details CASCADE;
DROP TABLE IF EXISTS graduation_jobs CASCADE;
DROP TABLE IF EXISTS graduation_details CASCADE;
DROP TABLE IF EXISTS alumni CASCADE;
DROP TABLE IF EXISTS alumni_snapshots CASCADE;
DROP TABLE IF EXISTS custom_users CASCADE;
DROP TABLE IF EXISTS academic_snapshots CASCADE;
DROP TABLE IF EXISTS archive_jobs CASCADE;
DROP TABLE IF EXISTS archive_records CASCADE;
DROP TABLE IF EXISTS term_finalization_logs CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS soft_delete_logs CASCADE;
DROP TABLE IF EXISTS sync_queue CASCADE;
DROP TABLE IF EXISTS conflict_queue CASCADE;
DROP TABLE IF EXISTS sync_metadata CASCADE;
DROP TABLE IF EXISTS sync_logs CASCADE;
DROP TABLE IF EXISTS device_health CASCADE;
DROP TABLE IF EXISTS analytics_jobs CASCADE;
DROP TABLE IF EXISTS analytics_snapshots CASCADE;


-- =============================================
-- File: 000_extensions.sql
-- =============================================

/* =========================================================
   SIKAD v4.0 - SECTION 000 - EXTENSIONS
   ========================================================= */
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- =============================================
-- File: 001_enums.sql
-- =============================================

/* =========================================================
   SIKAD v4.0 - SECTION 001 - ENUMS
   ========================================================= */
DO $$ BEGIN
    CREATE TYPE semester_type AS ENUM ('GANJIL', 'GENAP');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE kelas_jenis AS ENUM ('REAL', 'DAPO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE assessment_stage AS ENUM ('DRAFT', 'PUBLISHED', 'FINALIZED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE attendance_status AS ENUM ('HADIR', 'IZIN', 'SAKIT', 'ALPA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE sync_status AS ENUM ('PENDING', 'SYNCING', 'SYNCED', 'FAILED', 'CONFLICT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE operation_type AS ENUM ('INSERT', 'UPDATE', 'DELETE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE role_type AS ENUM ('SUPERADMIN', 'ADMIN', 'URUSAN', 'KEPALA_SEKOLAH', 'BK', 'GURU');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE term_input_mode AS ENUM ('PTS', 'SEMESTER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- =============================================
-- File: 002_domains.sql
-- =============================================

/* =========================================================
   SIKAD v4.0 - SECTION 002 - DOMAINS
   ========================================================= */
-- Core domain types placeholders (can be customized)


-- =============================================
-- File: 003_helper_functions.sql
-- =============================================

/* =========================================================
   SIKAD v4.0 - SECTION 003 - HELPER FUNCTIONS
   ========================================================= */
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =============================================
-- File: 100_roles.sql
-- =============================================

CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode VARCHAR(50) NOT NULL UNIQUE,
    nama VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =============================================
-- File: 101_permissions.sql
-- =============================================

CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode VARCHAR(100) NOT NULL UNIQUE,
    nama VARCHAR(200) NOT NULL,
    modul VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =============================================
-- File: 102_role_permissions.sql
-- =============================================

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);


-- =============================================
-- File: 103_user_roles.sql
-- =============================================

CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);


-- =============================================
-- File: 104_rbac_seed.sql
-- =============================================

-- Will be seeded from 1800_seed


-- =============================================
-- File: 190_academic_terms.sql
-- =============================================

-- Migration: 300_academic_terms.sql
-- Description: Academic terms table (tahun ajaran & semester)

CREATE TABLE IF NOT EXISTS academic_terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tahun_ajaran VARCHAR(20) NOT NULL,
    semester semester_type NOT NULL,
    tanggal_mulai DATE NOT NULL,
    tanggal_selesai DATE NOT NULL,
    status BOOLEAN NOT NULL DEFAULT FALSE,
    finalized BOOLEAN NOT NULL DEFAULT FALSE,
    input_mode term_input_mode NOT NULL DEFAULT 'SEMESTER',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tahun_ajaran, semester)
);

-- Indexes for performance
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_term ON academic_terms(status) WHERE status = TRUE;
CREATE INDEX IF NOT EXISTS idx_academic_terms_tahun ON academic_terms(tahun_ajaran DESC);
CREATE INDEX IF NOT EXISTS idx_academic_terms_finalized ON academic_terms(finalized) WHERE finalized = FALSE;
CREATE INDEX IF NOT EXISTS idx_academic_terms_tanggal ON academic_terms(tanggal_mulai, tanggal_selesai);

-- Comments
COMMENT ON TABLE academic_terms IS 'Tabel tahun ajaran dan semester';
COMMENT ON COLUMN academic_terms.status IS 'TRUE = tahun ajaran aktif';
COMMENT ON COLUMN academic_terms.finalized IS 'TRUE = sudah difinalisasi, READ ONLY';



-- =============================================
-- File: 200_gurus.sql
-- =============================================

-- Migration: 200_gurus.sql
-- Description: Master data table for teachers/guru

CREATE TABLE IF NOT EXISTS gurus (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nip VARCHAR(30) UNIQUE,
    nama VARCHAR(150) NOT NULL,
    gelar_depan VARCHAR(50),
    gelar_belakang VARCHAR(50),
    jk CHAR(1) NOT NULL CHECK (jk IN ('L','P')),
    tempat_lahir VARCHAR(100),
    tanggal_lahir DATE,
    no_hp VARCHAR(30),
    email VARCHAR(255),
    status_aktif BOOLEAN NOT NULL DEFAULT TRUE,
    version BIGINT NOT NULL DEFAULT 1,
    sync_status sync_status NOT NULL DEFAULT 'PENDING',
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_gurus_nip ON gurus(nip) WHERE nip IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gurus_status_aktif ON gurus(status_aktif);
CREATE INDEX IF NOT EXISTS idx_gurus_deleted_at ON gurus(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_gurus_created_at ON gurus(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gurus_sync_status ON gurus(sync_status) WHERE sync_status != 'SYNCED';

-- Comments
COMMENT ON TABLE gurus IS 'Master data guru dan pegawai sekolah';
COMMENT ON COLUMN gurus.nip IS 'Nomor Induk Pegawai - unik per guru';
COMMENT ON COLUMN gurus.status_aktif IS ' TRUE = aktif mengajar, FALSE = tidak aktif';


-- =============================================
-- File: 201_siswas.sql
-- =============================================

-- Migration: 201_siswas.sql
-- Description: Master data table for students/siswa

CREATE TABLE IF NOT EXISTS siswas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nisn VARCHAR(20) NOT NULL UNIQUE,
    nipd VARCHAR(20) NOT NULL UNIQUE,
    nama VARCHAR(150) NOT NULL,
    jk CHAR(1) CHECK (jk IN ('L','P')),
    agama VARCHAR(20),
    tempat_lahir VARCHAR(100),
    tanggal_lahir DATE,
    alamat TEXT,
    nama_ayah VARCHAR(150),
    nama_ibu VARCHAR(150),
    no_hp_ortu VARCHAR(30),
    status_aktif BOOLEAN NOT NULL DEFAULT TRUE,
    version BIGINT NOT NULL DEFAULT 1,
    sync_status sync_status NOT NULL DEFAULT 'PENDING',
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_siswas_nisn ON siswas(nisn);
CREATE INDEX IF NOT EXISTS idx_siswas_nipd ON siswas(nipd);
CREATE INDEX IF NOT EXISTS idx_siswas_nama ON siswas(nama) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_siswas_status_aktif ON siswas(status_aktif);
CREATE INDEX IF NOT EXISTS idx_siswas_deleted_at ON siswas(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_siswas_created_at ON siswas(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_siswas_agama ON siswas(agama) WHERE agama IS NOT NULL;

-- Comments
COMMENT ON TABLE siswas IS 'Master data siswa';
COMMENT ON COLUMN siswas.nisn IS 'Nomor Induk Siswa Nasional - unik';
COMMENT ON COLUMN siswas.nipd IS 'Nomor Induk Peserta Didik - unik';


-- =============================================
-- File: 202_mata_pelajarans.sql
-- =============================================

-- Migration: 202_mata_pelajarans.sql
-- Description: Master data table for subjects/mata pelajaran

CREATE TABLE IF NOT EXISTS mata_pelajarans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode VARCHAR(50) NOT NULL UNIQUE,
    nama VARCHAR(150) NOT NULL,
    kelompok_mapel VARCHAR(50) NOT NULL DEFAULT 'A',
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    mapping INTEGER,
    induk_mapel VARCHAR(50),
    induk_nama VARCHAR(150),
    agama VARCHAR(50),
    jp_reguler INTEGER,
    jp_pagar INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_mata_pelajarans_kode ON mata_pelajarans(kode);
CREATE INDEX IF NOT EXISTS idx_mata_pelajarans_nama ON mata_pelajarans(nama) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_mata_pelajarans_kelompok_mapel ON mata_pelajarans(kelompok_mapel);
CREATE INDEX IF NOT EXISTS idx_mata_pelajarans_aktif ON mata_pelajarans(aktif);
CREATE INDEX IF NOT EXISTS idx_mata_pelajarans_deleted_at ON mata_pelajarans(deleted_at) WHERE deleted_at IS NULL;

-- Comments
COMMENT ON TABLE mata_pelajarans IS 'Master data mata pelajaran';
COMMENT ON COLUMN mata_pelajarans.kode IS 'Kode mata pelajaran - unik';
COMMENT ON COLUMN mata_pelajarans.kelompok_mapel IS 'Kelompok: A (Wajib), B (Muatan Lokal)';


-- =============================================
-- File: 203_academic_calendar_events.sql
-- =============================================

-- Migration: 203_academic_calendar_events.sql
-- Description: Academic calendar events table for RPE (Realistic Processing Education) calculation

CREATE TABLE IF NOT EXISTS academic_calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_term_id UUID REFERENCES academic_terms(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('national_holiday', 'school_event', 'exam', 'break')),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON academic_calendar_events(date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_year ON academic_calendar_events(academic_term_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_type ON academic_calendar_events(type);
CREATE INDEX IF NOT EXISTS idx_calendar_events_active ON academic_calendar_events(is_active) WHERE is_active = true;

-- Comments
COMMENT ON TABLE academic_calendar_events IS 'Academic calendar events for RPE calculation';
COMMENT ON COLUMN academic_calendar_events.type IS 'Event type: national_holiday, school_event, exam, break';
COMMENT ON COLUMN academic_calendar_events.is_active IS 'Soft delete flag - false means archived';

-- RLS Policies for kurikulum role
CREATE POLICY "Kurikulum can view calendar events" ON academic_calendar_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.kode = 'URUSAN'
    )
  );

CREATE POLICY "Kurikulum can insert calendar events" ON academic_calendar_events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.kode = 'URUSAN'
    )
  );

CREATE POLICY "Kurikulum can update calendar events" ON academic_calendar_events
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.kode = 'URUSAN'
    )
  );

CREATE POLICY "Kurikulum can delete calendar events" ON academic_calendar_events
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.kode = 'URUSAN'
    )
  );




-- =============================================
-- File: 203_tugas_tambahan_types.sql
-- =============================================

CREATE TABLE IF NOT EXISTS tugas_tambahan_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode VARCHAR(50) NOT NULL UNIQUE,
    nama VARCHAR(150) NOT NULL,
    kategori VARCHAR(100),
    default_jp NUMERIC(5,2) NOT NULL DEFAULT 0,
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =============================================
-- File: 204_master_seed.sql
-- =============================================

-- Will be seeded from 1800_seed


-- =============================================
-- File: 205_calendar_events.sql
-- =============================================

-- Migration: Calendar Events table
CREATE TYPE calendar_category AS ENUM ('LIBUR', 'UJIAN', 'KEGIATAN', 'UMUM');

CREATE TABLE calendar_events (
    id UUID PRIMARY KEY,
    academic_term_id UUID NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    category calendar_category NOT NULL DEFAULT 'UMUM',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Policies: Select allowed for all authenticated users
CREATE POLICY "Allow select calendar_events for all authenticated" 
    ON calendar_events FOR SELECT TO authenticated USING (true);

-- Policies: Admin & Kurikulum can insert/update/delete
CREATE POLICY "Allow edit calendar_events for admin and kurikulum"
    ON calendar_events FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.kode IN ('SUPERADMIN', 'ADMIN', 'URUSAN')
        )
    );


-- =============================================
-- File: 301_kelas.sql
-- =============================================

-- Migration: 301_kelas.sql
-- Description: Academic class/rombel table

CREATE TABLE IF NOT EXISTS kelas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_term_id UUID NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
    nama_kelas VARCHAR(50) NOT NULL,
    tingkat SMALLINT NOT NULL CHECK (tingkat IN (7,8,9)),
    jenis kelas_jenis NOT NULL,
    wali_kelas_id UUID REFERENCES gurus(id) ON DELETE SET NULL,
    kapasitas SMALLINT DEFAULT 36,
    status_aktif BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(academic_term_id, nama_kelas, jenis)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_kelas_term ON kelas(academic_term_id);
CREATE INDEX IF NOT EXISTS idx_kelas_tingkat ON kelas(tingkat);
CREATE INDEX IF NOT EXISTS idx_kelas_wali ON kelas(wali_kelas_id) WHERE wali_kelas_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_kelas_jenis ON kelas(jenis);
CREATE INDEX IF NOT EXISTS idx_kelas_status ON kelas(status_aktif);

-- Comments
COMMENT ON TABLE kelas IS 'Tabel rombel/kelas per tahun ajaran';
COMMENT ON COLUMN kelas.tingkat IS 'Tingkat: 7, 8, 9 (SMP)';
COMMENT ON COLUMN kelas.jenis IS 'Jenis: REGULER, CIPTA, CERNAM';
COMMENT ON COLUMN kelas.kapasitas IS 'Jumlah siswa maksimal per kelas';


-- =============================================
-- File: 302_riwayat_kelas.sql
-- =============================================

-- Migration: 302_riwayat_kelas.sql
-- Description: Student class history/riwayat kelas table

CREATE TABLE IF NOT EXISTS riwayat_kelas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    siswa_id UUID NOT NULL REFERENCES siswas(id) ON DELETE CASCADE,
    academic_term_id UUID NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
    kelas_real_id UUID REFERENCES kelas(id) ON DELETE CASCADE,
    kelas_dapo_id UUID REFERENCES kelas(id) ON DELETE CASCADE,
    tanggal_masuk DATE NOT NULL DEFAULT CURRENT_DATE,
    tanggal_keluar DATE,
    status_keluar VARCHAR(30),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS uq_riwayat_term_siswa ON riwayat_kelas(academic_term_id, siswa_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_riwayat_siswa ON riwayat_kelas(siswa_id);
CREATE INDEX IF NOT EXISTS idx_riwayat_term ON riwayat_kelas(academic_term_id);
CREATE INDEX IF NOT EXISTS idx_riwayat_kelas_real ON riwayat_kelas(kelas_real_id);

-- Comments
COMMENT ON TABLE riwayat_kelas IS 'Tabel riwayat kelas siswa per tahun ajaran';
COMMENT ON COLUMN riwayat_kelas.status_keluar IS 'Status keluar: LULUS, PINDAH, KELUAR, WAFAT';


-- =============================================
-- File: 303_wali_kelas_histori.sql
-- =============================================

-- Migration: 303_wali_kelas_histori.sql
-- Description: Class teacher history/wali kelas histori table

CREATE TABLE IF NOT EXISTS wali_kelas_histori (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kelas_id UUID NOT NULL REFERENCES kelas(id) ON DELETE CASCADE,
    guru_id UUID NOT NULL REFERENCES gurus(id) ON DELETE CASCADE,
    academic_term_id UUID NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
    tanggal_mulai DATE NOT NULL,
    tanggal_selesai DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_wali_kelas_histori_kelas ON wali_kelas_histori(kelas_id);
CREATE INDEX IF NOT EXISTS idx_wali_kelas_histori_guru ON wali_kelas_histori(guru_id);
CREATE INDEX IF NOT EXISTS idx_wali_kelas_histori_term ON wali_kelas_histori(academic_term_id);

-- Comments
COMMENT ON TABLE wali_kelas_histori IS 'Tabel histori wali kelas per tahun ajaran';


-- =============================================
-- File: 304_mutasi_siswa.sql
-- =============================================

CREATE TABLE IF NOT EXISTS mutasi_siswa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    siswa_id UUID NOT NULL REFERENCES siswas(id) ON DELETE CASCADE,
    academic_term_id UUID NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
    jenis_mutasi VARCHAR(30) NOT NULL CHECK (jenis_mutasi IN ('MASUK', 'KELUAR', 'PINDAH', 'ALUMNI')),
    tanggal_mutasi DATE NOT NULL,
    alasan TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =============================================
-- File: 400_pembagian_mengajar.sql
-- =============================================

-- Migration: 400_pembagian_mengajar.sql
-- Description: Teacher assignment/pembagian mengajar table

CREATE TABLE IF NOT EXISTS pembagian_mengajar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_term_id UUID NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
    guru_id UUID NOT NULL REFERENCES gurus(id) ON DELETE CASCADE,
    mapel_id UUID NOT NULL REFERENCES mata_pelajarans(id) ON DELETE CASCADE,
    kelas_id UUID NOT NULL REFERENCES kelas(id) ON DELETE CASCADE,
    jenis kelas_jenis NOT NULL,
    jp NUMERIC(5,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(academic_term_id, guru_id, mapel_id, kelas_id, jenis)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pembagian_term ON pembagian_mengajar(academic_term_id);
CREATE INDEX IF NOT EXISTS idx_pembagian_guru ON pembagian_mengajar(guru_id);
CREATE INDEX IF NOT EXISTS idx_pembagian_mapel ON pembagian_mengajar(mapel_id);
CREATE INDEX IF NOT EXISTS idx_pembagian_kelas ON pembagian_mengajar(kelas_id);
CREATE INDEX IF NOT EXISTS idx_pembagian_jenis ON pembagian_mengajar(jenis);

-- Comments
COMMENT ON TABLE pembagian_mengajar IS 'Tabel pembagian mengajar guru per kelas';
COMMENT ON COLUMN pembagian_mengajar.jp IS 'Jumlah JP (Jam Pelajaran) per minggu';
COMMENT ON COLUMN pembagian_mengajar.jenis IS 'Jenis kelas: REGULER, CIPTA, CERNAM';


-- =============================================
-- File: 401_tugas_tambahan_assignments.sql
-- =============================================

CREATE TABLE IF NOT EXISTS tugas_tambahan_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_term_id UUID NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
    guru_id UUID NOT NULL REFERENCES gurus(id) ON DELETE CASCADE,
    tugas_tambahan_type_id UUID NOT NULL REFERENCES tugas_tambahan_types(id) ON DELETE CASCADE,
    nama_penugasan VARCHAR(200) NOT NULL,
    jp_override NUMERIC(5,2),
    status VARCHAR(20) NOT NULL DEFAULT 'AKTIF',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(academic_term_id, guru_id, tugas_tambahan_type_id, nama_penugasan)
);


-- =============================================
-- File: 402_teacher_workload_functions.sql
-- =============================================

CREATE OR REPLACE FUNCTION get_teacher_total_jp(p_guru_id UUID, p_term_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    v_mengajar_jp NUMERIC := 0;
    v_tambahan_jp NUMERIC := 0;
BEGIN
    SELECT COALESCE(SUM(jp), 0) INTO v_mengajar_jp 
    FROM pembagian_mengajar 
    WHERE guru_id = p_guru_id AND academic_term_id = p_term_id;

    SELECT COALESCE(SUM(COALESCE(a.jp_override, t.default_jp)), 0) INTO v_tambahan_jp
    FROM tugas_tambahan_assignments a
    JOIN tugas_tambahan_types t ON a.tugas_tambahan_type_id = t.id
    WHERE a.guru_id = p_guru_id AND a.academic_term_id = p_term_id AND a.status = 'AKTIF';

    RETURN v_mengajar_jp + v_tambahan_jp;
END;
$$ LANGUAGE plpgsql;


-- =============================================
-- File: 403_teacher_workload_views.sql
-- =============================================

-- Will be linked with views category in 1600


-- =============================================
-- File: 500_assessment_types.sql
-- =============================================

CREATE TABLE IF NOT EXISTS assessment_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode VARCHAR(50) NOT NULL UNIQUE,
    nama VARCHAR(100) NOT NULL,
    kategori VARCHAR(50),
    bobot_default NUMERIC(5,2) NOT NULL DEFAULT 0,
    urutan SMALLINT DEFAULT 0,
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =============================================
-- File: 501_assessments.sql
-- =============================================

-- Migration: 501_assessments.sql
-- Description: Assessment/penilaian table

CREATE TABLE IF NOT EXISTS assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_type_id UUID NOT NULL REFERENCES assessment_types(id) ON DELETE RESTRICT,
    pembagian_mengajar_id UUID NOT NULL REFERENCES pembagian_mengajar(id) ON DELETE CASCADE,
    academic_term_id UUID NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
    judul VARCHAR(200) NOT NULL,
    deskripsi TEXT,
    tanggal DATE NOT NULL,
    bobot NUMERIC(5,2) NOT NULL CHECK (bobot >= 0 AND bobot <= 100),
    stage assessment_stage NOT NULL DEFAULT 'DRAFT',
    created_by UUID NOT NULL REFERENCES gurus(id),
    version BIGINT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_assessments_type ON assessments(assessment_type_id);
CREATE INDEX IF NOT EXISTS idx_assessments_pembagian ON assessments(pembagian_mengajar_id);
CREATE INDEX IF NOT EXISTS idx_assessments_term ON assessments(academic_term_id);
CREATE INDEX IF NOT EXISTS idx_assessments_tanggal ON assessments(tanggal);
CREATE INDEX IF NOT EXISTS idx_assessments_stage ON assessments(stage);
CREATE INDEX IF NOT EXISTS idx_assessments_created_by ON assessments(created_by);

-- Comments
COMMENT ON TABLE assessments IS 'Tabel penilaian/ulangan';
COMMENT ON COLUMN assessments.bobot IS 'Persentase bobot (0-100)';
COMMENT ON COLUMN assessments.stage IS 'Stage: DRAFT, PUBLISHED, ARCHIVED';


-- =============================================
-- File: 502_assessment_details.sql
-- =============================================

CREATE TABLE IF NOT EXISTS assessment_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    siswa_id UUID NOT NULL REFERENCES siswas(id) ON DELETE CASCADE,
    nilai NUMERIC(5,2) CHECK (nilai >= 0 AND nilai <= 100),
    catatan TEXT,
    version BIGINT NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(assessment_id, siswa_id)
);


-- =============================================
-- File: 503_assessment_locking.sql
-- =============================================

/* =========================================================
   SIKAD v4.0 - ADR-025 & ADR-026 SEPARATE ASSESSMENT LOCKS
   ========================================================= */
CREATE TABLE IF NOT EXISTS assessment_locks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL UNIQUE REFERENCES assessments(id) ON DELETE CASCADE,
    locked_by UUID NOT NULL REFERENCES gurus(id) ON DELETE CASCADE,
    locked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    client_token VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION acquire_assessment_lock(
    p_assessment_id UUID,
    p_guru_id UUID,
    p_client_token VARCHAR,
    p_duration_seconds INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    v_now TIMESTAMPTZ := now();
    v_expires TIMESTAMPTZ := v_now + (p_duration_seconds || ' seconds')::interval;
    v_lock_exists BOOLEAN := FALSE;
    v_current_locked_by UUID;
    v_current_expires TIMESTAMPTZ;
    v_current_token VARCHAR;
BEGIN
    SELECT TRUE, locked_by, expires_at, client_token 
    INTO v_lock_exists, v_current_locked_by, v_current_expires, v_current_token
    FROM assessment_locks 
    WHERE assessment_id = p_assessment_id;

    IF NOT COALESCE(v_lock_exists, FALSE) THEN
        INSERT INTO assessment_locks (assessment_id, locked_by, locked_at, expires_at, client_token)
        VALUES (p_assessment_id, p_guru_id, v_now, v_expires, p_client_token);
        RETURN TRUE;
    ELSIF v_current_locked_by = p_guru_id AND v_current_token = p_client_token THEN
        UPDATE assessment_locks 
        SET expires_at = v_expires, locked_at = v_now
        WHERE assessment_id = p_assessment_id;
        RETURN TRUE;
    ELSIF v_current_expires < v_now THEN
        UPDATE assessment_locks 
        SET locked_by = p_guru_id, locked_at = v_now, expires_at = v_expires, client_token = p_client_token
        WHERE assessment_id = p_assessment_id;
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION release_assessment_lock(
    p_assessment_id UUID,
    p_guru_id UUID,
    p_client_token VARCHAR
) RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM assessment_locks 
    WHERE assessment_id = p_assessment_id 
      AND locked_by = p_guru_id 
      AND client_token = p_client_token;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;


-- =============================================
-- File: 504_assessment_functions.sql
-- =============================================

-- Grade Calculation and Publish helper functions
CREATE OR REPLACE FUNCTION check_assessment_publish_status(p_assessment_id UUID)
RETURNS VARCHAR AS $$
DECLARE
    v_stage assessment_stage;
BEGIN
    SELECT stage INTO v_stage FROM assessments WHERE id = p_assessment_id;
    RETURN v_stage::VARCHAR;
END;
$$ LANGUAGE plpgsql;


-- =============================================
-- File: 505_assessment_transfer.sql
-- =============================================

/* =========================================================
   SIKAD v4.0 - GRADE TRANSFER FUNCTION
   ========================================================= */

CREATE OR REPLACE FUNCTION transfer_siswa_nilai(
    p_siswa_id UUID,
    p_old_kelas_id UUID,
    p_new_kelas_id UUID,
    p_academic_term_id UUID
) RETURNS INTEGER AS $$
DECLARE
    v_rec RECORD;
    v_new_pm_id UUID;
    v_new_assessment_id UUID;
    v_transferred_count INTEGER := 0;
BEGIN
    -- Loop through all active grades of the student in the old class for the current term
    FOR v_rec IN 
        SELECT 
            ad.nilai,
            ad.catatan,
            a.judul,
            a.deskripsi,
            a.tanggal,
            a.bobot,
            a.assessment_type_id,
            a.stage,
            a.created_by,
            pm.mapel_id
        FROM assessment_details ad
        JOIN assessments a ON ad.assessment_id = a.id
        JOIN pembagian_mengajar pm ON a.pembagian_mengajar_id = pm.id
        WHERE ad.siswa_id = p_siswa_id
          AND pm.kelas_id = p_old_kelas_id
          AND pm.academic_term_id = p_academic_term_id
    LOOP
        -- Find the corresponding pembagian_mengajar in the new class for the same mapel
        SELECT id INTO v_new_pm_id
        FROM pembagian_mengajar
        WHERE kelas_id = p_new_kelas_id
          AND mapel_id = v_rec.mapel_id
          AND academic_term_id = p_academic_term_id
        LIMIT 1;

        -- If a teaching assignment exists in the new class for this mapel
        IF v_new_pm_id IS NOT NULL THEN
            -- Check if a matching assessment already exists in the new class
            -- We match by assessment_type_id and exact title match
            SELECT id INTO v_new_assessment_id
            FROM assessments
            WHERE pembagian_mengajar_id = v_new_pm_id
              AND assessment_type_id = v_rec.assessment_type_id
              AND judul = v_rec.judul
              AND academic_term_id = p_academic_term_id
            LIMIT 1;

            -- If it doesn't exist, we automatically create it in the new class
            IF v_new_assessment_id IS NULL THEN
                INSERT INTO assessments (
                    assessment_type_id,
                    pembagian_mengajar_id,
                    academic_term_id,
                    judul,
                    deskripsi,
                    tanggal,
                    bobot,
                    stage,
                    created_by
                ) VALUES (
                    v_rec.assessment_type_id,
                    v_new_pm_id,
                    p_academic_term_id,
                    v_rec.judul,
                    v_rec.deskripsi,
                    v_rec.tanggal,
                    v_rec.bobot,
                    v_rec.stage,
                    v_rec.created_by
                ) RETURNING id INTO v_new_assessment_id;
            END IF;

            -- Insert or update the grade for the student in the new assessment
            INSERT INTO assessment_details (assessment_id, siswa_id, nilai, catatan)
            VALUES (v_new_assessment_id, p_siswa_id, v_rec.nilai, v_rec.catatan)
            ON CONFLICT (assessment_id, siswa_id) 
            DO UPDATE SET 
                nilai = EXCLUDED.nilai,
                catatan = EXCLUDED.catatan,
                updated_at = now();

            v_transferred_count := v_transferred_count + 1;
        END IF;
    END LOOP;

    -- Delete the old grades for this student under the old class assessments
    IF v_transferred_count > 0 THEN
        DELETE FROM assessment_details
        WHERE siswa_id = p_siswa_id
          AND assessment_id IN (
              SELECT a.id 
              FROM assessments a
              JOIN pembagian_mengajar pm ON a.pembagian_mengajar_id = pm.id
              WHERE pm.kelas_id = p_old_kelas_id
                AND pm.academic_term_id = p_academic_term_id
          );
    END IF;

    RETURN v_transferred_count;
END;
$$ LANGUAGE plpgsql;


-- =============================================
-- File: 505_assessment_views.sql
-- =============================================

-- Will be defined in views folder


-- =============================================
-- File: 506_assessment_input_rules.sql
-- =============================================

/* =========================================================
   SIKAD v4.0 - GRADE INPUT MODES & SEQUENTIAL UH RULES
   ========================================================= */

-- 1. Create term input mode enum
DO $$ BEGIN
    CREATE TYPE term_input_mode AS ENUM ('PTS', 'SEMESTER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Add columns to academic_terms and assessment_details
ALTER TABLE academic_terms 
ADD COLUMN IF NOT EXISTS input_mode term_input_mode NOT NULL DEFAULT 'PTS';

ALTER TABLE assessment_details 
ADD COLUMN IF NOT EXISTS is_pts_locked BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Seed new assessment types (UH1-UH5) and remove old general 'UH'
DELETE FROM assessment_types WHERE kode = 'UH';

INSERT INTO assessment_types (kode, nama, kategori, bobot_default, urutan, aktif) VALUES
('UH1', 'Ulangan Harian 1', 'Formatif', 10.00, 1, TRUE),
('UH2', 'Ulangan Harian 2', 'Formatif', 10.00, 2, TRUE),
('UH3', 'Ulangan Harian 3', 'Formatif', 10.00, 3, TRUE),
('UH4', 'Ulangan Harian 4', 'Formatif', 10.00, 4, TRUE),
('UH5', 'Ulangan Harian 5', 'Formatif', 10.00, 5, TRUE)
ON CONFLICT (kode) DO UPDATE SET
    nama = EXCLUDED.nama,
    kategori = EXCLUDED.kategori,
    bobot_default = EXCLUDED.bobot_default,
    urutan = EXCLUDED.urutan,
    aktif = EXCLUDED.aktif;

-- Update default weights for PTS and PAS
UPDATE assessment_types SET bobot_default = 20.00 WHERE kode = 'PTS';
UPDATE assessment_types SET bobot_default = 30.00 WHERE kode = 'PAS';

-- 4. Trigger Function: Lock PTS Grades on Mode Shift (PTS -> SEMESTER)
CREATE OR REPLACE FUNCTION lock_pts_grades()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.input_mode = 'PTS' AND NEW.input_mode = 'SEMESTER' THEN
        UPDATE assessment_details
        SET is_pts_locked = TRUE
        WHERE is_pts_locked = FALSE
          AND assessment_id IN (
              SELECT a.id 
              FROM assessments a
              JOIN assessment_types aty ON a.assessment_type_id = aty.id
              WHERE a.academic_term_id = NEW.id
                AND aty.kode IN ('UH1', 'UH2', 'UH3', 'PTS')
          );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_lock_pts_grades
    AFTER UPDATE ON academic_terms
    FOR EACH ROW
    WHEN (OLD.input_mode IS DISTINCT FROM NEW.input_mode)
    EXECUTE FUNCTION lock_pts_grades();

-- 5. Trigger Function: Prevent Editing Locked PTS Grades
CREATE OR REPLACE FUNCTION prevent_pts_edit()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_pts_locked = TRUE AND (OLD.nilai IS DISTINCT FROM NEW.nilai OR OLD.catatan IS DISTINCT FROM NEW.catatan) THEN
        RAISE EXCEPTION 'Nilai yang diinput pada masa PTS tidak dapat diubah di mode Semester.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_prevent_pts_edit
    BEFORE UPDATE ON assessment_details
    FOR EACH ROW
    EXECUTE FUNCTION prevent_pts_edit();

-- 6. Trigger Function: Validate Input Mode Constraints and Sequential UH Rules
CREATE OR REPLACE FUNCTION validate_assessment_details()
RETURNS TRIGGER AS $$
DECLARE
    v_type_kode VARCHAR(50);
    v_term_id UUID;
    v_term_mode term_input_mode;
    v_mapel_id UUID;
    v_prev_kode VARCHAR(50);
    v_prev_grade_exists BOOLEAN := FALSE;
BEGIN
    -- Get assessment metadata
    SELECT aty.kode, a.academic_term_id, pm.mapel_id
    INTO v_type_kode, v_term_id, v_mapel_id
    FROM assessments a
    JOIN assessment_types aty ON a.assessment_type_id = aty.id
    JOIN pembagian_mengajar pm ON a.pembagian_mengajar_id = pm.id
    WHERE a.id = NEW.assessment_id;

    -- Get academic term input mode
    SELECT input_mode INTO v_term_mode
    FROM academic_terms
    WHERE id = v_term_id;

    -- A. Check if input mode is PTS and blocks UH4, UH5, PAS
    IF v_term_mode = 'PTS' AND v_type_kode IN ('UH4', 'UH5', 'PAS') THEN
        RAISE EXCEPTION 'Mata pelajaran ini berada dalam mode PTS. Nilai UH4, UH5, dan PAS belum dapat diinput.';
    END IF;

    -- B. Sequential UH Logic
    IF v_type_kode IN ('UH2', 'UH3', 'UH4', 'UH5') THEN
        -- Determine previous required type
        IF v_type_kode = 'UH2' THEN v_prev_kode := 'UH1';
        ELSIF v_type_kode = 'UH3' THEN v_prev_kode := 'UH2';
        ELSIF v_type_kode = 'UH4' THEN v_prev_kode := 'UH3';
        ELSIF v_type_kode = 'UH5' THEN v_prev_kode := 'UH4';
        END IF;

        -- Check if previous UH has a grade for this student in this mapel and term
        SELECT EXISTS (
            SELECT 1
            FROM assessment_details ad
            JOIN assessments a ON ad.assessment_id = a.id
            JOIN assessment_types aty ON a.assessment_type_id = aty.id
            JOIN pembagian_mengajar pm ON a.pembagian_mengajar_id = pm.id
            WHERE ad.siswa_id = NEW.siswa_id
              AND pm.mapel_id = v_mapel_id
              AND pm.academic_term_id = v_term_id
              AND aty.kode = v_prev_kode
              AND ad.nilai IS NOT NULL
        ) INTO v_prev_grade_exists;

        IF NOT v_prev_grade_exists THEN
            RAISE EXCEPTION 'Gagal menyimpan nilai. Siswa harus memiliki nilai untuk % terlebih dahulu.', v_prev_kode;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_validate_assessment_details
    BEFORE INSERT OR UPDATE ON assessment_details
    FOR EACH ROW
    EXECUTE FUNCTION validate_assessment_details();


-- =============================================
-- File: 507_exam_administration.sql
-- =============================================

-- Migration: Exam Administration Tables
CREATE TABLE exam_rooms (
    id UUID PRIMARY KEY,
    academic_term_id UUID NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
    nama_ruang TEXT NOT NULL,
    kapasitas INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE exam_seats (
    id UUID PRIMARY KEY,
    room_id UUID NOT NULL REFERENCES exam_rooms(id) ON DELETE CASCADE,
    siswa_id UUID NOT NULL REFERENCES siswas(id) ON DELETE CASCADE,
    nomor_kursi INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (room_id, nomor_kursi),
    UNIQUE (room_id, siswa_id)
);

CREATE TABLE exam_supervisors (
    id UUID PRIMARY KEY,
    academic_term_id UUID NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
    guru_id UUID NOT NULL REFERENCES gurus(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES exam_rooms(id) ON DELETE CASCADE,
    slot_waktu TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (guru_id, academic_term_id, slot_waktu)
);

-- Enable RLS
ALTER TABLE exam_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_supervisors ENABLE ROW LEVEL SECURITY;

-- Policies for exam_rooms
CREATE POLICY "Allow select exam_rooms for all authenticated"
    ON exam_rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow edit exam_rooms for admin and kurikulum"
    ON exam_rooms FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = auth.uid() AND r.kode IN ('SUPERADMIN', 'ADMIN', 'URUSAN'))
    );

-- Policies for exam_seats
CREATE POLICY "Allow select exam_seats for all authenticated"
    ON exam_seats FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow edit exam_seats for admin and kurikulum"
    ON exam_seats FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = auth.uid() AND r.kode IN ('SUPERADMIN', 'ADMIN', 'URUSAN'))
    );

-- Policies for exam_supervisors
CREATE POLICY "Allow select exam_supervisors for all authenticated"
    ON exam_supervisors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow edit exam_supervisors for admin and kurikulum"
    ON exam_supervisors FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = auth.uid() AND r.kode IN ('SUPERADMIN', 'ADMIN', 'URUSAN'))
    );


-- =============================================
-- File: 508_assessment_rooms.sql
-- =============================================

-- Migration: 204_assessment_rooms.sql
-- Description: Assessment room management tables with extended fields

-- Add columns to existing exam_rooms table if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exam_rooms' AND column_name = 'lokasi') THEN
        ALTER TABLE exam_rooms ADD COLUMN lokasi TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exam_rooms' AND column_name = 'is_active') THEN
        ALTER TABLE exam_rooms ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exam_rooms' AND column_name = 'updated_at') THEN
        ALTER TABLE exam_rooms ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();
    END IF;
END $$;

-- Add exam_id column to exam_seats if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exam_seats' AND column_name = 'exam_id') THEN
        ALTER TABLE exam_seats ADD COLUMN exam_id UUID REFERENCES assessments(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add exam_id and shift columns to exam_supervisors if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exam_supervisors' AND column_name = 'exam_id') THEN
        ALTER TABLE exam_supervisors ADD COLUMN exam_id UUID REFERENCES assessments(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exam_supervisors' AND column_name = 'shift') THEN
        ALTER TABLE exam_supervisors ADD COLUMN shift VARCHAR(10) CHECK (shift IN ('SESI1', 'SESI2', 'SESI3'));
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_exam_rooms_term_active ON exam_rooms(academic_term_id, is_active);
CREATE INDEX IF NOT EXISTS idx_exam_rooms_nama ON exam_rooms(nama_ruang);
CREATE INDEX IF NOT EXISTS idx_exam_seats_exam ON exam_seats(exam_id) WHERE exam_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_exam_seats_room_seat ON exam_seats(room_id, nomor_kursi);
CREATE INDEX IF NOT EXISTS idx_exam_supervisors_slot ON exam_supervisors(slot_waktu, shift);
CREATE INDEX IF NOT EXISTS idx_exam_supervisors_exam ON exam_supervisors(exam_id) WHERE exam_id IS NOT NULL;

-- Add comments
COMMENT ON COLUMN exam_rooms.lokasi IS 'Lokasi gedung/lantai/ruang ujian';
COMMENT ON COLUMN exam_rooms.is_active IS 'Status aktif ruangan';
COMMENT ON COLUMN exam_seats.exam_id IS 'ID ujian/asesmen yang terkait';
COMMENT ON COLUMN exam_supervisors.exam_id IS 'ID ujian/asesmen yang diawasi';
COMMENT ON COLUMN exam_supervisors.shift IS 'Shift ujian: SESI1, SESI2, SESI3';

-- =============================================
-- File: 600_kehadiran.sql
-- =============================================

-- Migration: 600_kehadiran.sql
-- Description: Attendance/kehadiran table

CREATE TABLE IF NOT EXISTS kehadiran (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_term_id UUID NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
    pembagian_mengajar_id UUID NOT NULL REFERENCES pembagian_mengajar(id) ON DELETE CASCADE,
    siswa_id UUID NOT NULL REFERENCES siswas(id) ON DELETE CASCADE,
    tanggal DATE NOT NULL,
    status attendance_status NOT NULL,
    keterangan TEXT,
    created_by UUID NOT NULL REFERENCES gurus(id),
    version BIGINT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(pembagian_mengajar_id, siswa_id, tanggal)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_kehadiran_term ON kehadiran(academic_term_id);
CREATE INDEX IF NOT EXISTS idx_kehadiran_pembagian ON kehadiran(pembagian_mengajar_id);
CREATE INDEX IF NOT EXISTS idx_kehadiran_siswa ON kehadiran(siswa_id);
CREATE INDEX IF NOT EXISTS idx_kehadiran_tanggal ON kehadiran(tanggal);
CREATE INDEX IF NOT EXISTS idx_kehadiran_status ON kehadiran(status);
CREATE INDEX IF NOT EXISTS idx_kehadiran_created_by ON kehadiran(created_by);

-- Comments
COMMENT ON TABLE kehadiran IS 'Tabel kehadiran siswa';
COMMENT ON COLUMN kehadiran.status IS 'Status: HADIR, SAKIT, IZIN, ALPHA';


-- =============================================
-- File: 601_rekap_kehadiran.sql
-- =============================================

CREATE TABLE IF NOT EXISTS rekap_kehadiran (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_term_id UUID NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
    siswa_id UUID NOT NULL REFERENCES siswas(id) ON DELETE CASCADE,
    total_hadir INTEGER NOT NULL DEFAULT 0,
    total_izin INTEGER NOT NULL DEFAULT 0,
    total_sakit INTEGER NOT NULL DEFAULT 0,
    total_alpa INTEGER NOT NULL DEFAULT 0,
    persentase_kehadiran NUMERIC(5,2),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(academic_term_id, siswa_id)
);


-- =============================================
-- File: 602_attendance_functions.sql
-- =============================================

CREATE OR REPLACE FUNCTION refresh_rekap_kehadiran(p_siswa_id UUID, p_term_id UUID)
RETURNS VOID AS $$
DECLARE
    v_hadir INTEGER := 0;
    v_izin INTEGER := 0;
    v_sakit INTEGER := 0;
    v_alpa INTEGER := 0;
    v_total INTEGER := 0;
    v_persen NUMERIC(5,2) := 100.00;
BEGIN
    SELECT COUNT(*) INTO v_hadir FROM kehadiran WHERE siswa_id = p_siswa_id AND academic_term_id = p_term_id AND status = 'HADIR';
    SELECT COUNT(*) INTO v_izin FROM kehadiran WHERE siswa_id = p_siswa_id AND academic_term_id = p_term_id AND status = 'IZIN';
    SELECT COUNT(*) INTO v_sakit FROM kehadiran WHERE siswa_id = p_siswa_id AND academic_term_id = p_term_id AND status = 'SAKIT';
    SELECT COUNT(*) INTO v_alpa FROM kehadiran WHERE siswa_id = p_siswa_id AND academic_term_id = p_term_id AND status = 'ALPA';

    v_total := v_hadir + v_izin + v_sakit + v_alpa;
    IF v_total > 0 THEN
        v_persen := (v_hadir::NUMERIC / v_total::NUMERIC) * 100.00;
    END IF;

    INSERT INTO rekap_kehadiran (academic_term_id, siswa_id, total_hadir, total_izin, total_sakit, total_alpa, persentase_kehadiran, updated_at)
    VALUES (p_term_id, p_siswa_id, v_hadir, v_izin, v_sakit, v_alpa, v_persen, now())
    ON CONFLICT (academic_term_id, siswa_id) DO UPDATE SET
        total_hadir = EXCLUDED.total_hadir,
        total_izin = EXCLUDED.total_izin,
        total_sakit = EXCLUDED.total_sakit,
        total_alpa = EXCLUDED.total_alpa,
        persentase_kehadiran = EXCLUDED.persentase_kehadiran,
        updated_at = EXCLUDED.updated_at;
END;
$$ LANGUAGE plpgsql;


-- =============================================
-- File: 603_attendance_views.sql
-- =============================================

-- Will be defined in views folder


-- =============================================
-- File: 700_catatan_wali_kelas.sql
-- =============================================

-- Migration: 700_catatan_wali_kelas.sql
-- Description: Class teacher notes/catatan wali kelas table

CREATE TABLE IF NOT EXISTS catatan_wali_kelas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_term_id UUID NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
    siswa_id UUID NOT NULL REFERENCES siswas(id) ON DELETE CASCADE,
    kelas_id UUID NOT NULL REFERENCES kelas(id) ON DELETE CASCADE,
    catatan TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES gurus(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS uq_catatan_term_siswa ON catatan_wali_kelas(academic_term_id, siswa_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_catatan_term ON catatan_wali_kelas(academic_term_id);
CREATE INDEX IF NOT EXISTS idx_catatan_siswa ON catatan_wali_kelas(siswa_id);
CREATE INDEX IF NOT EXISTS idx_catatan_kelas ON catatan_wali_kelas(kelas_id);

-- Comments
COMMENT ON TABLE catatan_wali_kelas IS 'Tabel catatan wali kelas per siswa';


-- =============================================
-- File: 701_rapor_snapshots.sql
-- =============================================

CREATE TABLE IF NOT EXISTS rapor_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_term_id UUID NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
    siswa_id UUID NOT NULL REFERENCES siswas(id) ON DELETE CASCADE,
    kelas_id UUID NOT NULL REFERENCES kelas(id) ON DELETE CASCADE,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
    data_rapor JSONB NOT NULL,
    finalized_by UUID NOT NULL REFERENCES gurus(id),
    finalized_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =============================================
-- File: 702_rapor_pdf.sql
-- =============================================

CREATE TABLE IF NOT EXISTS rapor_pdf (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rapor_snapshot_id UUID NOT NULL REFERENCES rapor_snapshots(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =============================================
-- File: 703_rapor_versioning.sql
-- =============================================

CREATE TABLE IF NOT EXISTS rapor_versioning (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rapor_snapshot_id UUID NOT NULL REFERENCES rapor_snapshots(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    data_rapor JSONB NOT NULL,
    created_by UUID REFERENCES gurus(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =============================================
-- File: 704_rapor_views.sql
-- =============================================

-- Will be defined in views folder


-- =============================================
-- File: 800_promotion_jobs.sql
-- =============================================

-- Migration: 800_promotion_jobs.sql
-- Description: Student promotion jobs/kenaikan kelas table

CREATE TABLE IF NOT EXISTS promotion_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_term_id UUID NOT NULL REFERENCES academic_terms(id),
    target_term_id UUID NOT NULL REFERENCES academic_terms(id),
    status VARCHAR(30) NOT NULL,
    total_siswa INTEGER NOT NULL DEFAULT 0,
    processed_siswa INTEGER NOT NULL DEFAULT 0,
    log JSONB,
    created_by UUID NOT NULL REFERENCES gurus(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_promotion_source ON promotion_jobs(source_term_id);
CREATE INDEX IF NOT EXISTS idx_promotion_target ON promotion_jobs(target_term_id);
CREATE INDEX IF NOT EXISTS idx_promotion_status ON promotion_jobs(status);
CREATE INDEX IF NOT EXISTS idx_promotion_created_by ON promotion_jobs(created_by);

-- Comments
COMMENT ON TABLE promotion_jobs IS 'Tabel job kenaikan kelas siswa';
COMMENT ON COLUMN promotion_jobs.status IS 'Status: PENDING, PROCESSING, COMPLETED, FAILED';


-- =============================================
-- File: 801_promotion_details.sql
-- =============================================

CREATE TABLE IF NOT EXISTS promotion_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promotion_job_id UUID NOT NULL REFERENCES promotion_jobs(id) ON DELETE CASCADE,
    siswa_id UUID NOT NULL REFERENCES siswas(id) ON DELETE CASCADE,
    kelas_asal_id UUID REFERENCES kelas(id),
    kelas_tujuan_id UUID REFERENCES kelas(id),
    status VARCHAR(30),
    message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =============================================
-- File: 802_graduation_jobs.sql
-- =============================================

CREATE TABLE IF NOT EXISTS graduation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_term_id UUID NOT NULL REFERENCES academic_terms(id),
    total_siswa INTEGER DEFAULT 0,
    processed_siswa INTEGER DEFAULT 0,
    status VARCHAR(30),
    created_by UUID REFERENCES gurus(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    finished_at TIMESTAMPTZ
);


-- =============================================
-- File: 803_graduation_details.sql
-- =============================================

CREATE TABLE IF NOT EXISTS graduation_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    graduation_job_id UUID NOT NULL REFERENCES graduation_jobs(id) ON DELETE CASCADE,
    siswa_id UUID NOT NULL REFERENCES siswas(id) ON DELETE CASCADE,
    status VARCHAR(30),
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);


-- =============================================
-- File: 804_promotion_functions.sql
-- =============================================

CREATE OR REPLACE FUNCTION execute_siswa_promotion(
    p_job_id UUID,
    p_siswa_id UUID,
    p_kelas_asal_id UUID,
    p_kelas_tujuan_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    -- Core promotion logic
    UPDATE riwayat_kelas 
    SET tanggal_keluar = now()
    WHERE siswa_id = p_siswa_id AND kelas_real_id = p_kelas_asal_id AND tanggal_keluar IS NULL;

    INSERT INTO riwayat_kelas (siswa_id, kelas_real_id, academic_term_id, tanggal_masuk)
    VALUES (p_siswa_id, p_kelas_tujuan_id, (SELECT academic_term_id FROM kelas WHERE id = p_kelas_tujuan_id), now());

    INSERT INTO promotion_details (promotion_job_id, siswa_id, kelas_asal_id, kelas_tujuan_id, status, message)
    VALUES (p_job_id, p_siswa_id, p_kelas_asal_id, p_kelas_tujuan_id, 'SUCCESS', 'Promoted successfully');

    RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
    INSERT INTO promotion_details (promotion_job_id, siswa_id, kelas_asal_id, kelas_tujuan_id, status, message)
    VALUES (p_job_id, p_siswa_id, p_kelas_asal_id, p_kelas_tujuan_id, 'FAILED', SQLERRM);
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;


-- =============================================
-- File: 805_graduation_functions.sql
-- =============================================

CREATE OR REPLACE FUNCTION execute_siswa_graduation(
    p_job_id UUID,
    p_siswa_id UUID,
    p_tahun_lulus INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    v_siswa RECORD;
BEGIN
    SELECT * INTO v_siswa FROM siswas WHERE id = p_siswa_id;

    UPDATE siswas SET status_aktif = FALSE WHERE id = p_siswa_id;

    INSERT INTO alumni (siswa_id, nisn, nipd, nama, jk, agama, tahun_lulus)
    VALUES (p_siswa_id, v_siswa.nisn, v_siswa.nipd, v_siswa.nama, v_siswa.jk, v_siswa.agama, p_tahun_lulus);

    INSERT INTO graduation_details (graduation_job_id, siswa_id, status, message)
    VALUES (p_job_id, p_siswa_id, 'SUCCESS', 'Graduated and converted to alumni');

    RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
    INSERT INTO graduation_details (graduation_job_id, siswa_id, status, message)
    VALUES (p_job_id, p_siswa_id, 'FAILED', SQLERRM);
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;


-- =============================================
-- File: 900_alumni.sql
-- =============================================

CREATE TABLE IF NOT EXISTS alumni (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    siswa_id UUID NOT NULL UNIQUE REFERENCES siswas(id) ON DELETE RESTRICT,
    nisn VARCHAR(20),
    nipd VARCHAR(20),
    nama VARCHAR(150) NOT NULL,
    jk CHAR(1),
    agama VARCHAR(20),
    tahun_lulus INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =============================================
-- File: 901_alumni_snapshots.sql
-- =============================================

CREATE TABLE IF NOT EXISTS alumni_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alumni_id UUID NOT NULL UNIQUE REFERENCES alumni(id) ON DELETE CASCADE,
    biodata_snapshot JSONB NOT NULL,
    akademik_snapshot JSONB NOT NULL,
    kehadiran_snapshot JSONB,
    rapor_snapshot JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =============================================
-- File: 902_alumni_views.sql
-- =============================================

-- Will be defined in views folder


-- =============================================
-- File: 999_custom_auth.sql
-- =============================================

-- Custom Authentication Table
-- Alternative login using username + password

CREATE TABLE IF NOT EXISTS public.custom_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email TEXT,
  full_name TEXT,
  role_id UUID REFERENCES public.roles(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_custom_users_username ON public.custom_users(username);

-- Function to hash password (using pgcrypto)
CREATE OR REPLACE FUNCTION public.hash_password(password TEXT)
RETURNS TEXT AS $$
  SELECT crypt(password, gen_salt('bf'));
$$ LANGUAGE SQL STRICT;

-- Function to verify password
CREATE OR REPLACE FUNCTION public.verify_password(password TEXT, hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN crypt(password, hash) = hash;
END;
$$ LANGUAGE plpgsql STRICT;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_custom_users_updated_at ON public.custom_users;
CREATE TRIGGER trigger_custom_users_updated_at
  BEFORE UPDATE ON public.custom_users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Insert default superadmin user
-- Password: shidiq2492
INSERT INTO public.custom_users (username, password_hash, full_name, role_id, email)
VALUES (
  'superadmin',
  hash_password('shidiq2492'),
  'Super Administrator',
  (SELECT id FROM public.roles WHERE kode = 'SUPERADMIN'),
  'superadmin@shidiq2492'
) ON CONFLICT (username) DO NOTHING;


-- =============================================
-- File: 999_initial_superadmin.sql
-- =============================================

-- Initial Superadmin User Setup
-- Run this AFTER Supabase Auth user is created

-- NOTE: Supabase Auth requires email format for authentication
-- Username for login: superadmin@shidiq2492
-- Password: shidiq2492

-- Create SUPERADMIN role if not exists
INSERT INTO roles (kode, nama) VALUES
('SUPERADMIN', 'Super Administrator')
ON CONFLICT (kode) DO NOTHING;

-- Link user to SUPERADMIN role
DO $$
DECLARE
  v_user_id UUID;
  v_role_id UUID;
BEGIN
  -- Find user by email
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = 'superadmin@shidiq2492';
  
  -- Find SUPERADMIN role
  SELECT id INTO v_role_id 
  FROM roles 
  WHERE kode = 'SUPERADMIN';
  
  -- Create user_roles entry
  IF v_user_id IS NOT NULL AND v_role_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role_id)
    VALUES (v_user_id, v_role_id)
    ON CONFLICT (user_id, role_id) DO NOTHING;
    
    RAISE NOTICE 'Superadmin role assigned successfully';
  ELSE
    RAISE WARNING 'User or role not found. Make sure to create auth user first.';
  END IF;
END $$;


-- =============================================
-- File: 1000_academic_snapshots.sql
-- =============================================

CREATE TABLE IF NOT EXISTS academic_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_term_id UUID NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
    snapshot_type VARCHAR(100) NOT NULL,
    data JSONB NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =============================================
-- File: 1001_archive_jobs.sql
-- =============================================

CREATE TABLE IF NOT EXISTS archive_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_term_id UUID NOT NULL REFERENCES academic_terms(id),
    status VARCHAR(30) NOT NULL,
    total_records BIGINT DEFAULT 0,
    processed_records BIGINT DEFAULT 0,
    log JSONB,
    created_by UUID REFERENCES gurus(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    finished_at TIMESTAMPTZ
);


-- =============================================
-- File: 1002_archive_records.sql
-- =============================================

CREATE TABLE IF NOT EXISTS archive_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    archive_job_id UUID NOT NULL REFERENCES archive_jobs(id) ON DELETE CASCADE,
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    snapshot_data JSONB NOT NULL,
    archived_at TIMESTAMPTZ DEFAULT now()
);


-- =============================================
-- File: 1003_term_finalization_logs.sql
-- =============================================

CREATE TABLE IF NOT EXISTS term_finalization_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_term_id UUID NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
    finalized_by UUID NOT NULL REFERENCES gurus(id),
    finalized_at TIMESTAMPTZ NOT NULL,
    catatan TEXT
);


-- =============================================
-- File: 1004_lifecycle_functions.sql
-- =============================================

CREATE OR REPLACE FUNCTION finalize_academic_term(
    p_term_id UUID,
    p_guru_id UUID,
    p_notes TEXT
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE academic_terms 
    SET status = FALSE 
    WHERE id = p_term_id;

    INSERT INTO term_finalization_logs (academic_term_id, finalized_by, finalized_at, catatan)
    VALUES (p_term_id, p_guru_id, now(), p_notes);

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;


-- =============================================
-- File: 1100_audit_logs.sql
-- =============================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL,
    old_data JSONB,
    new_data JSONB,
    user_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =============================================
-- File: 1101_soft_delete_logs.sql
-- =============================================

CREATE TABLE IF NOT EXISTS soft_delete_logs (
    id BIGSERIAL PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    deleted_by UUID,
    deleted_at TIMESTAMPTZ,
    restored_by UUID,
    restored_at TIMESTAMPTZ
);


-- =============================================
-- File: 1102_audit_functions.sql
-- =============================================

CREATE OR REPLACE FUNCTION process_audit_trigger()
RETURNS TRIGGER AS $$
DECLARE
    v_old JSONB := NULL;
    v_new JSONB := NULL;
    v_user_id UUID := NULL;
BEGIN
    BEGIN
        v_user_id := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        v_user_id := NULL;
    END;

    IF TG_OP = 'INSERT' THEN
        v_new := to_jsonb(NEW);
        INSERT INTO audit_logs (table_name, record_id, action, new_data, user_id)
        VALUES (TG_TABLE_NAME, COALESCE((v_new->>'id')::UUID, gen_random_uuid()), 'INSERT', v_new, v_user_id);
    ELSIF TG_OP = 'UPDATE' THEN
        v_old := to_jsonb(OLD);
        v_new := to_jsonb(NEW);
        INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data, user_id)
        VALUES (TG_TABLE_NAME, (v_new->>'id')::UUID, 'UPDATE', v_old, v_new, v_user_id);
    ELSIF TG_OP = 'DELETE' THEN
        v_old := to_jsonb(OLD);
        INSERT INTO audit_logs (table_name, record_id, action, old_data, user_id)
        VALUES (TG_TABLE_NAME, (v_old->>'id')::UUID, 'DELETE', v_old, v_user_id);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;


-- =============================================
-- File: 1103_audit_triggers.sql
-- =============================================

-- Will be attached in triggers category

-- Audit log trigger for calendar events
CREATE TRIGGER tr_academic_calendar_events_audit
  AFTER UPDATE OR DELETE ON academic_calendar_events
  FOR EACH ROW EXECUTE FUNCTION process_audit_trigger();


-- =============================================
-- File: 1200_sync_queue.sql
-- =============================================

CREATE TABLE IF NOT EXISTS sync_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    operation operation_type NOT NULL,
    payload JSONB NOT NULL,
    status sync_status NOT NULL DEFAULT 'PENDING',
    retry_count INTEGER DEFAULT 0,
    last_error TEXT,
    next_retry_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);


-- =============================================
-- File: 1201_conflict_queue.sql
-- =============================================

CREATE TABLE IF NOT EXISTS conflict_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    local_data JSONB NOT NULL,
    cloud_data JSONB NOT NULL,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_by UUID,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);


-- =============================================
-- File: 1202_sync_metadata.sql
-- =============================================

CREATE TABLE IF NOT EXISTS sync_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    last_sync_at TIMESTAMPTZ,
    last_success_sync_at TIMESTAMPTZ,
    device_id VARCHAR(100),
    app_version VARCHAR(50)
);


-- =============================================
-- File: 1203_sync_logs.sql
-- =============================================

CREATE TABLE IF NOT EXISTS sync_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID,
    device_id VARCHAR(100),
    action VARCHAR(100),
    status VARCHAR(50),
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);


-- =============================================
-- File: 1204_device_health.sql
-- =============================================

CREATE TABLE IF NOT EXISTS device_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    device_id TEXT,
    app_version TEXT,
    last_sync_at TIMESTAMPTZ,
    queue_count INTEGER DEFAULT 0,
    conflict_count INTEGER DEFAULT 0,
    status TEXT
);


-- =============================================
-- File: 1205_sync_functions.sql
-- =============================================

CREATE OR REPLACE FUNCTION push_to_sync_queue(
    p_table_name VARCHAR,
    p_record_id UUID,
    p_operation operation_type,
    p_payload JSONB
) RETURNS UUID AS $$
DECLARE
    v_queue_id UUID;
BEGIN
    INSERT INTO sync_queue (table_name, record_id, operation, payload, status)
    VALUES (p_table_name, p_record_id, p_operation, p_payload, 'PENDING')
    RETURNING id INTO v_queue_id;
    RETURN v_queue_id;
END;
$$ LANGUAGE plpgsql;


-- =============================================
-- File: 1206_conflict_resolution.sql
-- =============================================

CREATE OR REPLACE FUNCTION resolve_sync_conflict(
    p_conflict_id UUID,
    p_resolved_by UUID,
    p_resolution_data JSONB
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE conflict_queue
    SET resolved = TRUE,
        resolved_by = p_resolved_by,
        resolved_at = now()
    WHERE id = p_conflict_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;


-- =============================================
-- File: 1300_analytics_jobs.sql
-- =============================================

CREATE TABLE IF NOT EXISTS analytics_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_type VARCHAR(100) NOT NULL,
    status VARCHAR(30) NOT NULL,
    generated_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    finished_at TIMESTAMPTZ
);


-- =============================================
-- File: 1301_analytics_snapshots.sql
-- =============================================

CREATE TABLE IF NOT EXISTS analytics_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_term_id UUID NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
    snapshot_type VARCHAR(100) NOT NULL,
    data JSONB NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =============================================
-- File: 1302_materialized_views.sql
-- =============================================

-- Placeholder for materialized views


-- =============================================
-- File: 1303_dashboard_views.sql
-- =============================================

-- Will be attached in views category


-- =============================================
-- File: 1400_indexes_master.sql
-- =============================================

CREATE INDEX IF NOT EXISTS idx_siswa_nisn ON siswas(nisn);
CREATE INDEX IF NOT EXISTS idx_siswa_nama ON siswas(nama);
CREATE INDEX IF NOT EXISTS idx_guru_nip ON gurus(nip);
CREATE INDEX IF NOT EXISTS idx_guru_nama ON gurus(nama);
CREATE INDEX IF NOT EXISTS idx_kelas_term ON kelas(academic_term_id);
CREATE INDEX IF NOT EXISTS idx_kelas_wali ON kelas(wali_kelas_id);
CREATE INDEX IF NOT EXISTS idx_mengajar_guru ON pembagian_mengajar(guru_id);
CREATE INDEX IF NOT EXISTS idx_mengajar_kelas ON pembagian_mengajar(kelas_id);
CREATE INDEX IF NOT EXISTS idx_mengajar_term ON pembagian_mengajar(academic_term_id);
CREATE INDEX IF NOT EXISTS idx_assessment_term ON assessments(academic_term_id);
CREATE INDEX IF NOT EXISTS idx_assessment_mengajar ON assessments(pembagian_mengajar_id);
CREATE INDEX IF NOT EXISTS idx_assessment_detail_assessment ON assessment_details(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_detail_siswa ON assessment_details(siswa_id);
CREATE INDEX IF NOT EXISTS idx_kehadiran_siswa ON kehadiran(siswa_id);
CREATE INDEX IF NOT EXISTS idx_kehadiran_tanggal ON kehadiran(tanggal);
CREATE INDEX IF NOT EXISTS idx_rapor_siswa ON rapor_snapshots(siswa_id);
CREATE INDEX IF NOT EXISTS idx_alumni_nama ON alumni(nama);
CREATE INDEX IF NOT EXISTS idx_alumni_tahun ON alumni(tahun_lulus);
-- Phase 2: Master Data Indexes
CREATE INDEX IF NOT EXISTS idx_mapel_kode ON mata_pelajarans(kode);
CREATE INDEX IF NOT EXISTS idx_mapel_nama ON mata_pelajarans(nama);
CREATE INDEX IF NOT EXISTS idx_term_status ON academic_terms(status);
CREATE INDEX IF NOT EXISTS idx_term_finalized ON academic_terms(finalized);
CREATE INDEX IF NOT EXISTS idx_tugas_type_kode ON tugas_tambahan_types(kode);
CREATE INDEX IF NOT EXISTS idx_riwayat_siswa ON riwayat_kelas(siswa_id);
CREATE INDEX IF NOT EXISTS idx_riwayat_term ON riwayat_kelas(academic_term_id);
CREATE INDEX IF NOT EXISTS idx_mutasi_siswa ON mutasi_siswa(siswa_id);
CREATE INDEX IF NOT EXISTS idx_mutasi_term ON mutasi_siswa(academic_term_id);



-- =============================================
-- File: 1401_jsonb_indexes.sql
-- =============================================

CREATE INDEX IF NOT EXISTS idx_rapor_jsonb ON rapor_snapshots USING gin(data_rapor);
CREATE INDEX IF NOT EXISTS idx_alumni_snapshot_jsonb ON alumni_snapshots USING gin(akademik_snapshot);


-- =============================================
-- File: 1402_rls_indexes.sql
-- =============================================

-- RLS indexes for performance optimisation
CREATE INDEX IF NOT EXISTS idx_kelas_rls ON kelas(academic_term_id, wali_kelas_id);
CREATE INDEX IF NOT EXISTS idx_pembagian_mengajar_rls ON pembagian_mengajar(guru_id, academic_term_id);


-- =============================================
-- File: 1500_updated_at_triggers.sql
-- =============================================

/* =========================================================
   SIKAD v4.0 - TRIGGER CONFIGURATION FOR TIMESTAMPS
   ========================================================= */
CREATE TRIGGER tr_update_guru_timestamp BEFORE UPDATE ON gurus FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER tr_update_siswa_timestamp BEFORE UPDATE ON siswas FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER tr_update_mapel_timestamp BEFORE UPDATE ON mata_pelajarans FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER tr_update_kelas_timestamp BEFORE UPDATE ON kelas FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER tr_update_mengajar_timestamp BEFORE UPDATE ON pembagian_mengajar FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER tr_update_tugas_timestamp BEFORE UPDATE ON tugas_tambahan_assignments FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER tr_update_assessment_timestamp BEFORE UPDATE ON assessments FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER tr_update_assessment_detail_timestamp BEFORE UPDATE ON assessment_details FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER tr_update_kehadiran_timestamp BEFORE UPDATE ON kehadiran FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER tr_update_academic_term_timestamp BEFORE UPDATE ON academic_terms FOR EACH ROW EXECUTE FUNCTION update_timestamp();



-- =============================================
-- File: 1501_version_triggers.sql
-- =============================================

CREATE OR REPLACE FUNCTION increment_record_version()
RETURNS TRIGGER AS $$
BEGIN
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_inc_version_gurus BEFORE UPDATE ON gurus FOR EACH ROW EXECUTE FUNCTION increment_record_version();
CREATE TRIGGER tr_inc_version_siswas BEFORE UPDATE ON siswas FOR EACH ROW EXECUTE FUNCTION increment_record_version();
CREATE TRIGGER tr_inc_version_assessments BEFORE UPDATE ON assessments FOR EACH ROW EXECUTE FUNCTION increment_record_version();
CREATE TRIGGER tr_inc_version_assessment_details BEFORE UPDATE ON assessment_details FOR EACH ROW EXECUTE FUNCTION increment_record_version();
CREATE TRIGGER tr_inc_version_kehadiran BEFORE UPDATE ON kehadiran FOR EACH ROW EXECUTE FUNCTION increment_record_version();


-- =============================================
-- File: 1502_soft_delete_triggers.sql
-- =============================================

CREATE OR REPLACE FUNCTION handle_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO soft_delete_logs (table_name, record_id, deleted_at, deleted_by)
        VALUES (TG_TABLE_NAME, OLD.id, now(), auth.uid());
        RETURN NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =============================================
-- File: 1503_analytics_triggers.sql
-- =============================================

CREATE OR REPLACE FUNCTION queue_analytics_job()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO analytics_jobs (report_type, status, created_at)
    VALUES ('TERM_SUMMARY', 'PENDING', now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =============================================
-- File: 1504_notification_triggers.sql
-- =============================================

-- Notifications/alerts integration logic


-- =============================================
-- File: 1505_sync_delta_triggers.sql
-- =============================================

-- Migration: Sync Delta — updated_at columns and triggers for exam tables
-- Required for delta sync (Phase 4) — pull only records changed since last pull.
-- Safe to run on any environment: uses IF NOT EXISTS for both columns and triggers.

-- ─── exam_rooms ────────────────────────────────────────────────────────────────
ALTER TABLE exam_rooms ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE OR REPLACE TRIGGER tr_update_exam_room_timestamp
    BEFORE UPDATE ON exam_rooms
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

COMMENT ON COLUMN exam_rooms.updated_at IS 'Updated automatically by trigger — used for delta sync';

-- ─── exam_seats ────────────────────────────────────────────────────────────────
ALTER TABLE exam_seats ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE OR REPLACE TRIGGER tr_update_exam_seat_timestamp
    BEFORE UPDATE ON exam_seats
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

COMMENT ON COLUMN exam_seats.updated_at IS 'Updated automatically by trigger — used for delta sync';

-- ─── exam_supervisors ─────────────────────────────────────────────────────────
ALTER TABLE exam_supervisors ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE OR REPLACE TRIGGER tr_update_exam_supervisor_timestamp
    BEFORE UPDATE ON exam_supervisors
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

COMMENT ON COLUMN exam_supervisors.updated_at IS 'Updated automatically by trigger — used for delta sync';

-- ─── Indexes for delta sync query performance ───────────────────────────────────
-- Partial indexes on updated_at for large tables
CREATE INDEX IF NOT EXISTS idx_exam_rooms_updated_at ON exam_rooms(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_exam_seats_updated_at ON exam_seats(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_exam_supervisors_updated_at ON exam_supervisors(updated_at DESC);


-- =============================================
-- File: 1600_v_teacher_workload.sql
-- =============================================

CREATE OR REPLACE VIEW v_teacher_workload AS
SELECT 
    g.id AS guru_id,
    g.nama,
    COALESCE(SUM(pm.jp), 0) AS jp_mengajar,
    COALESCE(SUM(COALESCE(tta.jp_override, ttt.default_jp)), 0) AS jp_tambahan,
    (COALESCE(SUM(pm.jp), 0) + COALESCE(SUM(COALESCE(tta.jp_override, ttt.default_jp)), 0)) AS jp_total
FROM gurus g
LEFT JOIN pembagian_mengajar pm ON g.id = pm.guru_id
LEFT JOIN tugas_tambahan_assignments tta ON g.id = tta.guru_id AND tta.status = 'AKTIF'
LEFT JOIN tugas_tambahan_types ttt ON tta.tugas_tambahan_type_id = ttt.id
GROUP BY g.id, g.nama;


-- =============================================
-- File: 1601_v_student_current_class.sql
-- =============================================

CREATE OR REPLACE VIEW v_student_current_class AS
SELECT 
    s.id AS siswa_id,
    s.nisn,
    s.nama,
    k.nama_kelas AS kelas,
    k.tingkat,
    t.tahun_ajaran AS term
FROM siswas s
JOIN riwayat_kelas r ON s.id = r.siswa_id
JOIN kelas k ON r.kelas_real_id = k.id
JOIN academic_terms t ON r.academic_term_id = t.id
WHERE r.tanggal_keluar IS NULL;


-- =============================================
-- File: 1602_v_assessment_progress.sql
-- =============================================

CREATE OR REPLACE VIEW v_assessment_progress AS
SELECT 
    a.id AS assessment_id,
    a.judul,
    COUNT(ad.id) AS jumlah_siswa,
    COUNT(ad.nilai) AS jumlah_nilai,
    CASE 
        WHEN COUNT(ad.id) > 0 THEN (COUNT(ad.nilai)::NUMERIC / COUNT(ad.id)::NUMERIC) * 100.00
        ELSE 0.00
    END AS completion_percent
FROM assessments a
LEFT JOIN assessment_details ad ON a.id = ad.assessment_id
GROUP BY a.id, a.judul;


-- =============================================
-- File: 1603_v_attendance_summary.sql
-- =============================================

CREATE OR REPLACE VIEW v_attendance_summary AS
SELECT 
    siswa_id,
    SUM(CASE WHEN status = 'HADIR' THEN 1 ELSE 0 END) AS hadir,
    SUM(CASE WHEN status = 'IZIN' THEN 1 ELSE 0 END) AS izin,
    SUM(CASE WHEN status = 'SAKIT' THEN 1 ELSE 0 END) AS sakit,
    SUM(CASE WHEN status = 'ALPA' THEN 1 ELSE 0 END) AS alpa,
    CASE 
        WHEN COUNT(*) > 0 THEN (SUM(CASE WHEN status = 'HADIR' THEN 1 ELSE 0 END)::NUMERIC / COUNT(*)::NUMERIC) * 100.00
        ELSE 100.00
    END AS persentase
FROM kehadiran
GROUP BY siswa_id;


-- =============================================
-- File: 1604_v_rapor_completion.sql
-- =============================================

CREATE OR REPLACE VIEW v_rapor_completion AS
SELECT 
    k.id AS kelas_id,
    k.nama_kelas,
    COUNT(r.siswa_id) AS jumlah_siswa,
    COUNT(rs.id) AS rapor_final,
    (COUNT(r.siswa_id) - COUNT(rs.id)) AS rapor_draft,
    CASE 
        WHEN COUNT(r.siswa_id) > 0 THEN (COUNT(rs.id)::NUMERIC / COUNT(r.siswa_id)::NUMERIC) * 100.00
        ELSE 0.00
    END AS completion_percent
FROM kelas k
LEFT JOIN riwayat_kelas r ON k.id = r.kelas_real_id AND r.tanggal_keluar IS NULL
LEFT JOIN rapor_snapshots rs ON r.siswa_id = rs.siswa_id AND k.academic_term_id = rs.academic_term_id
GROUP BY k.id, k.nama_kelas;


-- =============================================
-- File: 1605_v_curriculum_health.sql
-- =============================================

CREATE OR REPLACE VIEW v_curriculum_health AS
SELECT 
    (SELECT COALESCE(AVG(completion_percent), 100.00) FROM v_assessment_progress) AS assessment_completion,
    (SELECT COALESCE(AVG(completion_percent), 100.00) FROM v_rapor_completion) AS rapor_completion;


-- =============================================
-- File: 1606_v_alumni_statistics.sql
-- =============================================

CREATE OR REPLACE VIEW v_alumni_statistics AS
SELECT 
    tahun_lulus,
    COUNT(*) AS jumlah_alumni,
    SUM(CASE WHEN jk = 'L' THEN 1 ELSE 0 END) AS laki_laki,
    SUM(CASE WHEN jk = 'P' THEN 1 ELSE 0 END) AS perempuan
FROM alumni
GROUP BY tahun_lulus;


-- =============================================
-- File: 1607_v_dashboard_kepsek.sql
-- =============================================

CREATE OR REPLACE VIEW v_dashboard_kepsek AS
SELECT 
    (SELECT COUNT(*) FROM gurus WHERE status_aktif = TRUE) AS guru_aktif,
    (SELECT COUNT(*) FROM siswas WHERE status_aktif = TRUE) AS siswa_aktif,
    (SELECT COUNT(*) FROM kelas WHERE status_aktif = TRUE) AS kelas_aktif;


-- =============================================
-- File: 1608_v_dashboard_kurikulum.sql
-- =============================================

CREATE OR REPLACE VIEW v_dashboard_kurikulum AS
SELECT 
    (SELECT COUNT(*) FROM assessments WHERE stage = 'DRAFT') AS assessment_draft,
    (SELECT COUNT(*) FROM assessments WHERE stage = 'FINALIZED') AS assessment_final,
    (SELECT COUNT(*) FROM rapor_snapshots) AS rapor_final;


-- =============================================
-- File: 1700_rls_guru.sql
-- =============================================

/* =========================================================
   SIKAD v4.0 - SECTION 1700 - RLS GURU & HELPER FUNCTIONS
   ========================================================= */

-- Helper functions for RLS Otorisasi
CREATE OR REPLACE FUNCTION public.auth_is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() AND r.kode IN ('SUPERADMIN', 'ADMIN')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.auth_is_kurikulum()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() AND r.kode = 'URUSAN'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.auth_is_kepsek()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() AND r.kode = 'KEPALA_SEKOLAH'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.auth_is_bk()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() AND r.kode = 'BK'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.auth_is_guru()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() AND r.kode = 'GURU'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.auth_is_wali_kelas(target_kelas_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.kelas k
        WHERE k.id = target_kelas_id AND k.wali_kelas_id = auth.uid() AND k.status_aktif = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.auth_is_guru_mengajar_kelas(target_kelas_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.pembagian_mengajar pm
        WHERE pm.guru_id = auth.uid() AND pm.kelas_id = target_kelas_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Enable Row Level Security
ALTER TABLE gurus ENABLE ROW LEVEL SECURITY;

-- Gurus Policies
DROP POLICY IF EXISTS "Gurus can read their own or authorized profiles" ON gurus;
CREATE POLICY "Gurus can read their own or authorized profiles"
    ON gurus FOR SELECT
    USING (
        id = auth.uid() 
        OR auth_is_admin() 
        OR auth_is_kurikulum() 
        OR auth_is_bk() 
        OR auth_is_kepsek()
    );

DROP POLICY IF EXISTS "Gurus can update their own profile" ON gurus;
CREATE POLICY "Gurus can update their own profile"
    ON gurus FOR UPDATE
    USING (id = auth.uid() OR auth_is_admin() OR auth_is_kurikulum());

DROP POLICY IF EXISTS "Admin and Kurikulum can insert gurus" ON gurus;
CREATE POLICY "Admin and Kurikulum can insert gurus"
    ON gurus FOR INSERT
    WITH CHECK (auth_is_admin() OR auth_is_kurikulum());

DROP POLICY IF EXISTS "Admin and Kurikulum can delete gurus" ON gurus;
CREATE POLICY "Admin and Kurikulum can delete gurus"
    ON gurus FOR DELETE
    USING (auth_is_admin() OR auth_is_kurikulum());


-- =============================================
-- File: 1701_rls_wali_kelas.sql
-- =============================================

/* =========================================================
   SIKAD v4.0 - SECTION 1701 - RLS WALI KELAS & RAPOR
   ========================================================= */

-- Enable Row Level Security
ALTER TABLE catatan_wali_kelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE rapor_snapshots ENABLE ROW LEVEL SECURITY;

-- Catatan Wali Kelas Policies
DROP POLICY IF EXISTS "Wali kelas can manage their own comments" ON catatan_wali_kelas;
CREATE POLICY "Wali kelas can manage their own comments"
    ON catatan_wali_kelas FOR ALL
    USING (created_by = auth.uid() OR auth_is_admin() OR auth_is_kurikulum())
    WITH CHECK (created_by = auth.uid() OR auth_is_admin() OR auth_is_kurikulum());

DROP POLICY IF EXISTS "BK and Kepsek can read comments" ON catatan_wali_kelas;
CREATE POLICY "BK and Kepsek can read comments"
    ON catatan_wali_kelas FOR SELECT
    USING (auth_is_bk() OR auth_is_kepsek());


-- Rapor Snapshots Policies
DROP POLICY IF EXISTS "Wali kelas can manage rapor snapshots for their class" ON rapor_snapshots;
CREATE POLICY "Wali kelas can manage rapor snapshots for their class"
    ON rapor_snapshots FOR ALL
    USING (auth_is_wali_kelas(kelas_id) OR auth_is_admin() OR auth_is_kurikulum())
    WITH CHECK (auth_is_wali_kelas(kelas_id) OR auth_is_admin() OR auth_is_kurikulum());

DROP POLICY IF EXISTS "Gurus and Kepsek can read rapor snapshots" ON rapor_snapshots;
CREATE POLICY "Gurus and Kepsek can read rapor snapshots"
    ON rapor_snapshots FOR SELECT
    USING (auth_is_guru() OR auth_is_kepsek() OR auth_is_bk());


-- =============================================
-- File: 1702_rls_bk.sql
-- =============================================

/* =========================================================
   SIKAD v4.0 - SECTION 1702 - RLS BK, SISWAS, ALUMNI
   ========================================================= */

-- Enable Row Level Security
ALTER TABLE siswas ENABLE ROW LEVEL SECURITY;
ALTER TABLE kehadiran ENABLE ROW LEVEL SECURITY;
ALTER TABLE alumni ENABLE ROW LEVEL SECURITY;

-- Siswas Policies
DROP POLICY IF EXISTS "Authorized users can read siswas" ON siswas;
CREATE POLICY "Authorized users can read siswas"
    ON siswas FOR SELECT
    USING (
        auth_is_admin()
        OR auth_is_kurikulum()
        OR auth_is_bk()
        OR auth_is_kepsek()
        OR EXISTS (
            SELECT 1 FROM public.pembagian_mengajar pm
            JOIN public.riwayat_kelas rk ON pm.kelas_id = rk.kelas_real_id AND pm.academic_term_id = rk.academic_term_id
            WHERE pm.guru_id = auth.uid() AND rk.siswa_id = siswas.id
        )
        OR EXISTS (
            SELECT 1 FROM public.kelas k
            JOIN public.riwayat_kelas rk ON k.id = rk.kelas_real_id AND k.academic_term_id = rk.academic_term_id
            WHERE k.wali_kelas_id = auth.uid() AND rk.siswa_id = siswas.id
        )
    );

DROP POLICY IF EXISTS "Admin and Kurikulum can insert/update/delete siswas" ON siswas;
CREATE POLICY "Admin and Kurikulum can insert/update/delete siswas"
    ON siswas FOR ALL
    USING (auth_is_admin() OR auth_is_kurikulum())
    WITH CHECK (auth_is_admin() OR auth_is_kurikulum());


-- Kehadiran Policies
DROP POLICY IF EXISTS "Authorized users can read kehadiran" ON kehadiran;
CREATE POLICY "Authorized users can read kehadiran"
    ON kehadiran FOR SELECT
    USING (
        auth_is_admin()
        OR auth_is_kurikulum()
        OR auth_is_bk()
        OR auth_is_kepsek()
        OR EXISTS (
            SELECT 1 FROM public.pembagian_mengajar pm
            WHERE pm.id = kehadiran.pembagian_mengajar_id AND pm.guru_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.kelas k
            JOIN public.pembagian_mengajar pm ON k.id = pm.kelas_id
            WHERE pm.id = kehadiran.pembagian_mengajar_id AND k.wali_kelas_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Authorized users can insert/update/delete kehadiran" ON kehadiran;
CREATE POLICY "Authorized users can insert/update/delete kehadiran"
    ON kehadiran FOR ALL
    USING (
        auth_is_admin()
        OR auth_is_kurikulum()
        OR EXISTS (
            SELECT 1 FROM public.pembagian_mengajar pm
            WHERE pm.id = kehadiran.pembagian_mengajar_id AND pm.guru_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.kelas k
            JOIN public.pembagian_mengajar pm ON k.id = pm.kelas_id
            WHERE pm.id = kehadiran.pembagian_mengajar_id AND k.wali_kelas_id = auth.uid()
        )
    )
    WITH CHECK (
        auth_is_admin()
        OR auth_is_kurikulum()
        OR EXISTS (
            SELECT 1 FROM public.pembagian_mengajar pm
            WHERE pm.id = pembagian_mengajar_id AND pm.guru_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.kelas k
            JOIN public.pembagian_mengajar pm ON k.id = pm.kelas_id
            WHERE pm.id = pembagian_mengajar_id AND k.wali_kelas_id = auth.uid()
        )
    );


-- Alumni Policies
DROP POLICY IF EXISTS "Authorized users can read alumni" ON alumni;
CREATE POLICY "Authorized users can read alumni"
    ON alumni FOR SELECT
    USING (
        auth_is_admin()
        OR auth_is_kurikulum()
        OR auth_is_bk()
        OR auth_is_kepsek()
        OR auth_is_guru()
    );

DROP POLICY IF EXISTS "Admin can manage alumni" ON alumni;
CREATE POLICY "Admin can manage alumni"
    ON alumni FOR ALL
    USING (auth_is_admin())
    WITH CHECK (auth_is_admin());


-- =============================================
-- File: 1703_rls_kurikulum.sql
-- =============================================

/* =========================================================
   SIKAD v4.0 - SECTION 1703 - RLS ACADEMIC & ASSESSMENTS
   ========================================================= */

-- Enable Row Level Security
ALTER TABLE academic_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE kelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pembagian_mengajar ENABLE ROW LEVEL SECURITY;
ALTER TABLE tugas_tambahan_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_details ENABLE ROW LEVEL SECURITY;


-- Academic Terms Policies
DROP POLICY IF EXISTS "Anyone can read academic terms" ON academic_terms;
CREATE POLICY "Anyone can read academic terms"
    ON academic_terms FOR SELECT
    USING (TRUE);

DROP POLICY IF EXISTS "Admin and Kurikulum can manage academic terms" ON academic_terms;
CREATE POLICY "Admin and Kurikulum can manage academic terms"
    ON academic_terms FOR ALL
    USING (auth_is_admin() OR auth_is_kurikulum())
    WITH CHECK (auth_is_admin() OR auth_is_kurikulum());


-- Kelas Policies
DROP POLICY IF EXISTS "Authorized users can read kelas" ON kelas;
CREATE POLICY "Authorized users can read kelas"
    ON kelas FOR SELECT
    USING (TRUE);

DROP POLICY IF EXISTS "Admin and Kurikulum can manage kelas" ON kelas;
CREATE POLICY "Admin and Kurikulum can manage kelas"
    ON kelas FOR ALL
    USING (auth_is_admin() OR auth_is_kurikulum())
    WITH CHECK (auth_is_admin() OR auth_is_kurikulum());


-- Pembagian Mengajar Policies
DROP POLICY IF EXISTS "Authorized users can read pembagian_mengajar" ON pembagian_mengajar;
CREATE POLICY "Authorized users can read pembagian_mengajar"
    ON pembagian_mengajar FOR SELECT
    USING (TRUE);

DROP POLICY IF EXISTS "Admin and Kurikulum can manage pembagian_mengajar" ON pembagian_mengajar;
CREATE POLICY "Admin and Kurikulum can manage pembagian_mengajar"
    ON pembagian_mengajar FOR ALL
    USING (auth_is_admin() OR auth_is_kurikulum())
    WITH CHECK (auth_is_admin() OR auth_is_kurikulum());


-- Tugas Tambahan Assignments Policies
DROP POLICY IF EXISTS "Authorized users can read tugas_tambahan_assignments" ON tugas_tambahan_assignments;
CREATE POLICY "Authorized users can read tugas_tambahan_assignments"
    ON tugas_tambahan_assignments FOR SELECT
    USING (guru_id = auth.uid() OR auth_is_admin() OR auth_is_kurikulum() OR auth_is_bk() OR auth_is_kepsek());

DROP POLICY IF EXISTS "Admin and Kurikulum can manage tugas_tambahan_assignments" ON tugas_tambahan_assignments;
CREATE POLICY "Admin and Kurikulum can manage tugas_tambahan_assignments"
    ON tugas_tambahan_assignments FOR ALL
    USING (auth_is_admin() OR auth_is_kurikulum())
    WITH CHECK (auth_is_admin() OR auth_is_kurikulum());


-- Assessment Types Policies
DROP POLICY IF EXISTS "Anyone can read assessment_types" ON assessment_types;
CREATE POLICY "Anyone can read assessment_types"
    ON assessment_types FOR SELECT
    USING (TRUE);

DROP POLICY IF EXISTS "Admin and Kurikulum can manage assessment_types" ON assessment_types;
CREATE POLICY "Admin and Kurikulum can manage assessment_types"
    ON assessment_types FOR ALL
    USING (auth_is_admin() OR auth_is_kurikulum())
    WITH CHECK (auth_is_admin() OR auth_is_kurikulum());


-- Assessments Policies
DROP POLICY IF EXISTS "Authorized users can read assessments" ON assessments;
CREATE POLICY "Authorized users can read assessments"
    ON assessments FOR SELECT
    USING (
        auth_is_admin()
        OR auth_is_kurikulum()
        OR auth_is_bk()
        OR auth_is_kepsek()
        OR EXISTS (
            SELECT 1 FROM public.pembagian_mengajar pm
            WHERE pm.id = assessments.pembagian_mengajar_id
            AND (auth_is_guru_mengajar_kelas(pm.kelas_id) OR auth_is_wali_kelas(pm.kelas_id))
        )
    );

DROP POLICY IF EXISTS "Teachers and Kurikulum can manage assessments" ON assessments;
CREATE POLICY "Teachers and Kurikulum can manage assessments"
    ON assessments FOR ALL
    USING (
        auth_is_admin()
        OR auth_is_kurikulum()
        -- Guru mapel pengajar kelas bersangkutan
        OR EXISTS (
            SELECT 1 FROM public.pembagian_mengajar pm
            WHERE pm.id = assessments.pembagian_mengajar_id
            AND auth_is_guru_mengajar_kelas(pm.kelas_id)
        )
    )
    WITH CHECK (
        auth_is_admin()
        OR auth_is_kurikulum()
        OR EXISTS (
            SELECT 1 FROM public.pembagian_mengajar pm
            WHERE pm.id = pembagian_mengajar_id
            AND auth_is_guru_mengajar_kelas(pm.kelas_id)
        )
    );


-- Assessment Details Policies
DROP POLICY IF EXISTS "Authorized users can read assessment_details" ON assessment_details;
CREATE POLICY "Authorized users can read assessment_details"
    ON assessment_details FOR SELECT
    USING (
        auth_is_admin()
        OR auth_is_kurikulum()
        OR auth_is_bk()
        OR auth_is_kepsek()
        OR EXISTS (
            SELECT 1 FROM public.assessments a
            JOIN public.pembagian_mengajar pm ON a.pembagian_mengajar_id = pm.id
            WHERE a.id = assessment_details.assessment_id
            AND (auth_is_guru_mengajar_kelas(pm.kelas_id) OR auth_is_wali_kelas(pm.kelas_id))
        )
    );

DROP POLICY IF EXISTS "Authorized users can insert assessment_details" ON assessment_details;
CREATE POLICY "Authorized users can insert assessment_details"
    ON assessment_details FOR INSERT
    WITH CHECK (
        auth_is_admin()
        OR auth_is_kurikulum()
        OR EXISTS (
            SELECT 1 FROM public.assessments a
            JOIN public.pembagian_mengajar pm ON a.pembagian_mengajar_id = pm.id
            WHERE a.id = assessment_id
            AND auth_is_guru_mengajar_kelas(pm.kelas_id)
            AND a.stage <> 'FINALIZED' -- Tidak boleh input jika sudah FINALIZED
        )
    );

DROP POLICY IF EXISTS "Authorized users can update assessment_details" ON assessment_details;
CREATE POLICY "Authorized users can update assessment_details"
    ON assessment_details FOR UPDATE
    USING (
        auth_is_admin()
        OR auth_is_kurikulum()
        OR EXISTS (
            SELECT 1 FROM public.assessments a
            JOIN public.pembagian_mengajar pm ON a.pembagian_mengajar_id = pm.id
            WHERE a.id = assessment_details.assessment_id
            AND auth_is_guru_mengajar_kelas(pm.kelas_id)
            AND a.stage <> 'FINALIZED' -- Tidak boleh edit jika sudah FINALIZED
        )
    );

DROP POLICY IF EXISTS "Admin and Kurikulum can delete assessment_details" ON assessment_details;
CREATE POLICY "Admin and Kurikulum can delete assessment_details"
    ON assessment_details FOR DELETE
    USING (auth_is_admin() OR auth_is_kurikulum());



-- =============================================
-- File: 1704_rls_admin.sql
-- =============================================

/* =========================================================
   SIKAD v4.0 - SECTION 1704 - RLS ADMIN, AUDITS, & SYNC
   ========================================================= */

-- Enable Row Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE soft_delete_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE conflict_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE archive_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE archive_records ENABLE ROW LEVEL SECURITY;


-- Audit Logs Policies
DROP POLICY IF EXISTS "Admin and Kurikulum can read audit_logs" ON audit_logs;
CREATE POLICY "Admin and Kurikulum can read audit_logs"
    ON audit_logs FOR SELECT
    USING (auth_is_admin() OR auth_is_kurikulum());

DROP POLICY IF EXISTS "System can insert audit_logs" ON audit_logs;
CREATE POLICY "System can insert audit_logs"
    ON audit_logs FOR INSERT
    WITH CHECK (TRUE); -- System triggers and APIs can write logs


-- Soft Delete Logs Policies
DROP POLICY IF EXISTS "Admin can read soft_delete_logs" ON soft_delete_logs;
CREATE POLICY "Admin can read soft_delete_logs"
    ON soft_delete_logs FOR SELECT
    USING (auth_is_admin());


-- Sync Queue Policies
DROP POLICY IF EXISTS "Users can manage their own sync queue" ON sync_queue;
CREATE POLICY "Users can manage their own sync queue"
    ON sync_queue FOR ALL
    USING (auth_is_admin() OR auth_is_kurikulum())
    WITH CHECK (auth_is_admin() OR auth_is_kurikulum());


-- Conflict Queue Policies
DROP POLICY IF EXISTS "Users can read/update their own conflicts" ON conflict_queue;
CREATE POLICY "Users can read/update their own conflicts"
    ON conflict_queue FOR ALL
    USING (auth_is_admin() OR auth_is_kurikulum())
    WITH CHECK (auth_is_admin() OR auth_is_kurikulum());


-- Device Health Policies
DROP POLICY IF EXISTS "Users can manage their own device health record" ON device_health;
CREATE POLICY "Users can manage their own device health record"
    ON device_health FOR ALL
    USING (user_id = auth.uid() OR auth_is_admin() OR auth_is_kurikulum())
    WITH CHECK (user_id = auth.uid() OR auth_is_admin() OR auth_is_kurikulum());


-- Archive Jobs Policies
DROP POLICY IF EXISTS "Admin and Kurikulum can read archive jobs" ON archive_jobs;
CREATE POLICY "Admin and Kurikulum can read archive jobs"
    ON archive_jobs FOR SELECT
    USING (auth_is_admin() OR auth_is_kurikulum());

DROP POLICY IF EXISTS "Admin can manage archive jobs" ON archive_jobs;
CREATE POLICY "Admin can manage archive jobs"
    ON archive_jobs FOR ALL
    USING (auth_is_admin())
    WITH CHECK (auth_is_admin());


-- Archive Records Policies
DROP POLICY IF EXISTS "Admin and Kurikulum can read archive records" ON archive_records;
CREATE POLICY "Admin and Kurikulum can read archive records"
    ON archive_records FOR SELECT
    USING (auth_is_admin() OR auth_is_kurikulum());

DROP POLICY IF EXISTS "Admin can manage archive records" ON archive_records;
CREATE POLICY "Admin can manage archive records"
    ON archive_records FOR ALL
    USING (auth_is_admin())
    WITH CHECK (auth_is_admin());


-- =============================================
-- File: 1705_rls_master_data.sql
-- =============================================

/* =========================================================
   SIKAD v4.0 - SECTION 1705 - RLS MASTER DATA
   (mata_pelajarans, tugas_tambahan_types, riwayat_kelas,
    wali_kelas_histori, mutasi_siswa)
   ========================================================= */

-- ========================================
-- MATA PELAJARANS
-- ========================================
ALTER TABLE mata_pelajarans ENABLE ROW LEVEL SECURITY;

-- Semua pengguna terautentikasi dapat membaca (exclude soft deleted)
DROP POLICY IF EXISTS "Authorized users can read mata_pelajarans" ON mata_pelajarans;
CREATE POLICY "Authorized users can read mata_pelajarans"
    ON mata_pelajarans FOR SELECT
    USING (deleted_at IS NULL);

-- Hanya Admin dan Kurikulum yang bisa mengelola mata pelajaran
DROP POLICY IF EXISTS "Admin and Kurikulum can manage mata_pelajarans" ON mata_pelajarans;
CREATE POLICY "Admin and Kurikulum can manage mata_pelajarans"
    ON mata_pelajarans FOR INSERT
    WITH CHECK (auth_is_admin() OR auth_is_kurikulum());

DROP POLICY IF EXISTS "Admin and Kurikulum can update mata_pelajarans" ON mata_pelajarans;
CREATE POLICY "Admin and Kurikulum can update mata_pelajarans"
    ON mata_pelajarans FOR UPDATE
    USING (auth_is_admin() OR auth_is_kurikulum());

DROP POLICY IF EXISTS "Admin and Kurikulum can delete mata_pelajarans" ON mata_pelajarans;
CREATE POLICY "Admin and Kurikulum can delete mata_pelajarans"
    ON mata_pelajarans FOR DELETE
    USING (auth_is_admin() OR auth_is_kurikulum());


-- ========================================
-- TUGAS TAMBAHAN TYPES
-- ========================================
ALTER TABLE tugas_tambahan_types ENABLE ROW LEVEL SECURITY;

-- Semua pengguna terautentikasi dapat membaca
DROP POLICY IF EXISTS "Authorized users can read tugas_tambahan_types" ON tugas_tambahan_types;
CREATE POLICY "Authorized users can read tugas_tambahan_types"
    ON tugas_tambahan_types FOR SELECT
    USING (TRUE);

-- Hanya Admin dan Kurikulum yang bisa mengelola
DROP POLICY IF EXISTS "Admin and Kurikulum can manage tugas_tambahan_types" ON tugas_tambahan_types;
CREATE POLICY "Admin and Kurikulum can manage tugas_tambahan_types"
    ON tugas_tambahan_types FOR INSERT
    WITH CHECK (auth_is_admin() OR auth_is_kurikulum());

DROP POLICY IF EXISTS "Admin and Kurikulum can update tugas_tambahan_types" ON tugas_tambahan_types;
CREATE POLICY "Admin and Kurikulum can update tugas_tambahan_types"
    ON tugas_tambahan_types FOR UPDATE
    USING (auth_is_admin() OR auth_is_kurikulum());

DROP POLICY IF EXISTS "Admin and Kurikulum can delete tugas_tambahan_types" ON tugas_tambahan_types;
CREATE POLICY "Admin and Kurikulum can delete tugas_tambahan_types"
    ON tugas_tambahan_types FOR DELETE
    USING (auth_is_admin() OR auth_is_kurikulum());


-- ========================================
-- RIWAYAT KELAS
-- ========================================
ALTER TABLE riwayat_kelas ENABLE ROW LEVEL SECURITY;

-- Pengguna terautentikasi dengan kepentingan akademik bisa membaca
DROP POLICY IF EXISTS "Authorized users can read riwayat_kelas" ON riwayat_kelas;
CREATE POLICY "Authorized users can read riwayat_kelas"
    ON riwayat_kelas FOR SELECT
    USING (
        auth_is_admin()
        OR auth_is_kurikulum()
        OR auth_is_bk()
        OR auth_is_kepsek()
        -- Guru yang mengajar di kelas terkait
        OR EXISTS (
            SELECT 1 FROM public.pembagian_mengajar pm
            WHERE pm.kelas_id = riwayat_kelas.kelas_real_id AND pm.guru_id = auth.uid()
        )
        -- Wali kelas
        OR EXISTS (
            SELECT 1 FROM public.kelas k
            WHERE k.id = riwayat_kelas.kelas_real_id AND k.wali_kelas_id = auth.uid()
        )
    );

-- Hanya Admin dan Kurikulum yang bisa mengelola riwayat kelas
DROP POLICY IF EXISTS "Admin and Kurikulum can manage riwayat_kelas" ON riwayat_kelas;
CREATE POLICY "Admin and Kurikulum can manage riwayat_kelas"
    ON riwayat_kelas FOR ALL
    USING (auth_is_admin() OR auth_is_kurikulum())
    WITH CHECK (auth_is_admin() OR auth_is_kurikulum());


-- ========================================
-- WALI KELAS HISTORI
-- ========================================
ALTER TABLE wali_kelas_histori ENABLE ROW LEVEL SECURITY;

-- Pengguna terautentikasi bisa membaca histori wali kelas
DROP POLICY IF EXISTS "Authorized users can read wali_kelas_histori" ON wali_kelas_histori;
CREATE POLICY "Authorized users can read wali_kelas_histori"
    ON wali_kelas_histori FOR SELECT
    USING (
        auth_is_admin()
        OR auth_is_kurikulum()
        OR auth_is_kepsek()
        OR guru_id = auth.uid() -- Wali kelas bisa lihat histori diri sendiri
    );

-- Hanya Admin dan Kurikulum yang bisa mengelola histori
DROP POLICY IF EXISTS "Admin and Kurikulum can manage wali_kelas_histori" ON wali_kelas_histori;
CREATE POLICY "Admin and Kurikulum can manage wali_kelas_histori"
    ON wali_kelas_histori FOR ALL
    USING (auth_is_admin() OR auth_is_kurikulum())
    WITH CHECK (auth_is_admin() OR auth_is_kurikulum());


-- ========================================
-- MUTASI SISWA
-- ========================================
ALTER TABLE mutasi_siswa ENABLE ROW LEVEL SECURITY;

-- Hanya Admin, Kurikulum, BK, dan Kepsek yang bisa membaca mutasi siswa
DROP POLICY IF EXISTS "Authorized users can read mutasi_siswa" ON mutasi_siswa;
CREATE POLICY "Authorized users can read mutasi_siswa"
    ON mutasi_siswa FOR SELECT
    USING (
        auth_is_admin()
        OR auth_is_kurikulum()
        OR auth_is_bk()
        OR auth_is_kepsek()
    );

-- Hanya Admin dan Kurikulum yang bisa mengelola mutasi
DROP POLICY IF EXISTS "Admin and Kurikulum can manage mutasi_siswa" ON mutasi_siswa;
CREATE POLICY "Admin and Kurikulum can manage mutasi_siswa"
    ON mutasi_siswa FOR ALL
    USING (auth_is_admin() OR auth_is_kurikulum())
    WITH CHECK (auth_is_admin() OR auth_is_kurikulum());


-- =============================================
-- File: 1800_seed_roles.sql
-- =============================================

INSERT INTO roles (kode, nama) VALUES
('SUPERADMIN', 'Super Administrator'),
('ADMIN', 'Administrator Sekolah'),
('URUSAN', 'Urusan Kurikulum'),
('KEPALA_SEKOLAH', 'Kepala Sekolah'),
('BK', 'Bimbingan Konseling'),
('GURU', 'Guru Mata Pelajaran')
ON CONFLICT (kode) DO NOTHING;


-- =============================================
-- File: 1801_seed_permissions.sql
-- =============================================

INSERT INTO permissions (kode, nama, modul) VALUES
('assessments:create', 'Dapat membuat asesmen baru', 'Assessment'),
('assessments:update', 'Dapat mengubah asesmen', 'Assessment'),
('assessments:lock', 'Dapat mengunci draf asesmen', 'Assessment'),
('rapor:finalize', 'Dapat melakukan finalisasi rapor', 'Rapor')
ON CONFLICT (kode) DO NOTHING;


-- =============================================
-- File: 1802_seed_assessment_types.sql
-- =============================================

INSERT INTO assessment_types (kode, nama, kategori, bobot_default, urutan, aktif) VALUES
('UH', 'Ulangan Harian', 'Formatif', 20.00, 1, TRUE),
('PTS', 'Penilaian Tengah Semester', 'Sumatif', 30.00, 2, TRUE),
('PAS', 'Penilaian Akhir Semester', 'Sumatif', 50.00, 3, TRUE)
ON CONFLICT (kode) DO NOTHING;


-- =============================================
-- File: 1803_seed_tugas_tambahan.sql
-- =============================================

INSERT INTO tugas_tambahan_types (kode, nama, kategori, default_jp, aktif) VALUES
('WAKASEK', 'Wakil Kepala Sekolah', 'Struktural', 12.00, TRUE),
('WALIKELAS', 'Wali Kelas', 'Ekuivalen', 2.00, TRUE),
('KALAB', 'Kepala Laboratorium', 'Ekuivalen', 12.00, TRUE)
ON CONFLICT (kode) DO NOTHING;


-- =============================================
-- File: 1900_backup_views.sql
-- =============================================

-- Internal backup diagnostics


-- =============================================
-- File: 1901_health_check.sql
-- =============================================

CREATE OR REPLACE FUNCTION run_system_health_check()
RETURNS TABLE (
    check_name TEXT,
    status TEXT,
    message TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 'Active Academic Term'::TEXT, 
           CASE WHEN COUNT(*) = 1 THEN 'OK' ELSE 'WARNING' END::TEXT,
           (COUNT(*) || ' active terms configured')::TEXT
    FROM academic_terms WHERE academic_terms.status = TRUE;
END;
$$ LANGUAGE plpgsql;


-- =============================================
-- File: 1902_maintenance_jobs.sql
-- =============================================

-- Database garbage collection routines


-- =============================================
-- File: 1903_cleanup_jobs.sql
-- =============================================

CREATE OR REPLACE FUNCTION clean_expired_locks()
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM assessment_locks
    WHERE expires_at < now();
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;
