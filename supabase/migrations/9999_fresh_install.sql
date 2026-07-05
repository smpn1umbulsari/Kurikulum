/* =========================================================
   SIKAD v4.0 - Fresh Install Script
   Creates all tables, functions, and seed data
   Run AFTER 9999_reset_all.sql
   ========================================================= */

BEGIN;

-- ============================================
-- 1. ROLES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode VARCHAR(50) UNIQUE NOT NULL,
    nama VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed roles
INSERT INTO public.roles (kode, nama) VALUES 
    ('SUPERADMIN', 'Super Administrator'),
    ('ADMIN', 'Administrator'),
    ('KEPALA_SEKOLAH', 'Kepala Sekolah'),
    ('WAKIL_KEPSEK', 'Wakil Kepala Sekolah'),
    ('GURU', 'Guru'),
    ('WALI_KELAS', 'Wali Kelas'),
    ('SISWA', 'Siswa')
ON CONFLICT (kode) DO NOTHING;

-- ============================================
-- 2. USER ROLES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_roles (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- ============================================
-- 3. CUSTOM USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.custom_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email TEXT,
    full_name TEXT,
    role_id UUID REFERENCES roles(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custom_users_username ON public.custom_users(username);

-- ============================================
-- 4. GURU TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.guru (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nip VARCHAR(20) UNIQUE NOT NULL,
    nama VARCHAR(255) NOT NULL,
    email TEXT,
    no_telp VARCHAR(20),
    alamat TEXT,
    foto_url TEXT,
    user_id UUID REFERENCES auth.users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. SISWA TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.siswa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nis VARCHAR(20) UNIQUE NOT NULL,
    nisn VARCHAR(20) UNIQUE,
    nama VARCHAR(255) NOT NULL,
    email TEXT,
    no_telp VARCHAR(20),
    alamat TEXT,
    foto_url TEXT,
    tempat_lahir VARCHAR(100),
    tanggal_lahir DATE,
    jenis_kelamin VARCHAR(10),
    agama VARCHAR(20),
    user_id UUID REFERENCES auth.users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. MATA PELAJARAN TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.mata_pelajaran (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode VARCHAR(20) UNIQUE NOT NULL,
    nama VARCHAR(255) NOT NULL,
    singkatan VARCHAR(50),
    kategori VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 7. MAPEL GURU (Junction)
-- ============================================
CREATE TABLE IF NOT EXISTS public.mapel_guru (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guru_id UUID NOT NULL REFERENCES guru(id) ON DELETE CASCADE,
    mapel_id UUID NOT NULL REFERENCES mata_pelajaran(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(guru_id, mapel_id)
);

-- ============================================
-- 8. TAHUN AJARAN TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.tahun_ajaran (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tahun VARCHAR(9) NOT NULL,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 9. SEMESTER TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.semester (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tahun_ajaran_id UUID NOT NULL REFERENCES tahun_ajaran(id) ON DELETE CASCADE,
    semester VARCHAR(10) NOT NULL,
    is_active BOOLEAN DEFAULT false,
    mulai DATE,
    selesai DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 10. KELAS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.kelas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama VARCHAR(50) NOT NULL,
    tingkat VARCHAR(10),
    tahun_ajaran_id UUID NOT NULL REFERENCES tahun_ajaran(id) ON DELETE CASCADE,
    wali_kelas_id UUID REFERENCES guru(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 11. KELAS SISWA (Junction)
-- ============================================
CREATE TABLE IF NOT EXISTS public.kelas_siswa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kelas_id UUID NOT NULL REFERENCES kelas(id) ON DELETE CASCADE,
    siswa_id UUID NOT NULL REFERENCES siswa(id) ON DELETE CASCADE,
    tahun_ajaran_id UUID NOT NULL REFERENCES tahun_ajaran(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(kelas_id, siswa_id, tahun_ajaran_id)
);

-- ============================================
-- 12. JADWAL TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.jadwal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kelas_id UUID NOT NULL REFERENCES kelas(id) ON DELETE CASCADE,
    mapel_id UUID NOT NULL REFERENCES mata_pelajaran(id) ON DELETE CASCADE,
    guru_id UUID NOT NULL REFERENCES guru(id) ON DELETE CASCADE,
    semester_id UUID NOT NULL REFERENCES semester(id) ON DELETE CASCADE,
    hari VARCHAR(20),
    jam_mulai TIME,
    jam_selesai TIME,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 13. ABSENSI TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.absensi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    siswa_id UUID NOT NULL REFERENCES siswa(id) ON DELETE CASCADE,
    kelas_id UUID NOT NULL REFERENCES kelas(id) ON DELETE CASCADE,
    semester_id UUID NOT NULL REFERENCES semester(id) ON DELETE CASCADE,
    tanggal DATE NOT NULL,
    status VARCHAR(20),
    keterangan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 14. NILAI TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.nilai (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    siswa_id UUID NOT NULL REFERENCES siswa(id) ON DELETE CASCADE,
    kelas_id UUID NOT NULL REFERENCES kelas(id) ON DELETE CASCADE,
    mapel_id UUID NOT NULL REFERENCES mata_pelajaran(id) ON DELETE CASCADE,
    semester_id UUID NOT NULL REFERENCES semester(id) ON DELETE CASCADE,
    guru_id UUID NOT NULL REFERENCES guru(id) ON DELETE CASCADE,
    tipe VARCHAR(50),
    nilai DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 15. SYNC TABLES
-- ============================================
CREATE TABLE IF NOT EXISTS public.sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    operation VARCHAR(20) NOT NULL,
    status VARCHAR(20),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sync_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    operation VARCHAR(20) NOT NULL,
    payload JSONB,
    status VARCHAR(20) DEFAULT 'pending',
    retry_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- ============================================
-- 16. CREATE SUPERADMIN USER
-- ============================================
INSERT INTO auth.users (id, email, encrypted_password, created_at, updated_at, email_confirmed_at)
VALUES (
    gen_random_uuid(),
    'superadmin@spenturi',
    crypt('shidiq2492', gen_salt('bf')),
    now(),
    now(),
    now()
);

-- Link to SUPERADMIN role
INSERT INTO public.user_roles (user_id, role_id)
SELECT u.id, r.id
FROM auth.users u
CROSS JOIN public.roles r
WHERE u.email = 'superadmin@spenturi' AND r.kode = 'SUPERADMIN';

-- ============================================
-- 17. ENABLE RLS
-- ============================================
ALTER TABLE public.guru ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.siswa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mata_pelajaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nilai ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absensi ENABLE ROW LEVEL SECURITY;

-- RLS Policies for SUPERADMIN (full access)
CREATE POLICY "SUPERADMIN full access guru" ON public.guru FOR ALL TO authenticated
    USING (true) WITH CHECK (true);

CREATE POLICY "SUPERADMIN full access siswa" ON public.siswa FOR ALL TO authenticated
    USING (true) WITH CHECK (true);

CREATE POLICY "SUPERADMIN full access mapel" ON public.mata_pelajaran FOR ALL TO authenticated
    USING (true) WITH CHECK (true);

CREATE POLICY "SUPERADMIN full access kelas" ON public.kelas FOR ALL TO authenticated
    USING (true) WITH CHECK (true);

CREATE POLICY "SUPERADMIN full access nilai" ON public.nilai FOR ALL TO authenticated
    USING (true) WITH CHECK (true);

CREATE POLICY "SUPERADMIN full access absensi" ON public.absensi FOR ALL TO authenticated
    USING (true) WITH CHECK (true);

COMMIT;

-- Verify
SELECT 'SIKAD v4.0 Fresh Install Complete!' as status;
SELECT email FROM auth.users WHERE email = 'superadmin@spenturi';
