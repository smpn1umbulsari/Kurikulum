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
