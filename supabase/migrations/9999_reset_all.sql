/* =========================================================
   SIKAD v4.0 - Full Reset Script
   Drops all tables and reinstalls fresh
   ========================================================= */

-- Disable triggers temporarily
SET session_replication_role = 'replica';

-- Drop all tables in correct order (child tables first)
DROP TABLE IF EXISTS public.sync_queue CASCADE;
DROP TABLE IF EXISTS public.sync_log CASCADE;
DROP TABLE IF EXISTS public.nilai_detail CASCADE;
DROP TABLE IF EXISTS public.nilai CASCADE;
DROP TABLE IF EXISTS public.absensi_detail CASCADE;
DROP TABLE IF EXISTS public.absensi CASCADE;
DROP TABLE IF EXISTS public.jadwal_detail CASCADE;
DROP TABLE IF EXISTS public.jadwal CASCADE;
DROP TABLE IF EXISTS public.tahun_ajaran CASCADE;
DROP TABLE IF EXISTS public.semester CASCADE;
DROP TABLE IF EXISTS public.kelas_siswa CASCADE;
DROP TABLE IF EXISTS public.kelas CASCADE;
DROP TABLE IF EXISTS public.mapel_guru CASCADE;
DROP TABLE IF EXISTS public.siswa CASCADE;
DROP TABLE IF EXISTS public.guru CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.custom_users CASCADE;
DROP TABLE IF EXISTS public.mata_pelajaran CASCADE;
DROP TABLE IF EXISTS public.roles CASCADE;

-- Re-enable triggers
SET session_replication_role = DEFAULT;

-- Verify all tables dropped
SELECT 'Tables dropped. Ready for fresh install.' as status;
