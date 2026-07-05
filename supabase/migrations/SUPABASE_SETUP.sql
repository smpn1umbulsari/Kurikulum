-- =========================================================
-- SIKAD v4.0 - COMPLETE DATABASE SETUP
-- Run this in Supabase Dashboard > SQL Editor
-- =========================================================

-- 1. Create ENUMS
CREATE TYPE kelas_jenis AS ENUM ('REGULER', 'CIPTA', 'CERNAM', 'REAL', 'DAPO');
CREATE TYPE tingkat_enum AS ENUM ('7', '8', '9', '10', '11', '12');
CREATE TYPE kelompok_mapel AS ENUM ('WAJIB', 'PILIHAN_A', 'PILIHAN_B', 'MULOK');
CREATE TYPE status_siswa AS ENUM ('AKTIF', 'CUTI', 'KELUAR', 'LULUS', 'DO');
CREATE TYPE status_kelas AS ENUM ('AKTIF', 'TIDAK_AKTIF', 'DIBUBARKAN');

-- 2. ROLES TABLE
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode VARCHAR(50) UNIQUE NOT NULL,
    nama VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.roles (kode, nama) VALUES 
    ('SUPERADMIN', 'Super Administrator'),
    ('ADMIN', 'Administrator'),
    ('KEPALA_SEKOLAH', 'Kepala Sekolah'),
    ('WAKIL_KEPSEK', 'Wakil Kepala Sekolah'),
    ('KURIKULUM', 'Kepala Kurikulum'),
    ('GURU', 'Guru'),
    ('WALI_KELAS', 'Wali Kelas'),
    ('BK', 'Bimbingan Konseling'),
    ('OPERATOR', 'Operator'),
    ('SISWA', 'Siswa')
ON CONFLICT (kode) DO NOTHING;

-- 3. USER ROLES TABLE
CREATE TABLE IF NOT EXISTS public.user_roles (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, role_id)
);

-- 4. CUSTOM USERS TABLE (for fallback auth)
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

-- 5. ACADEMIC TERMS TABLE
CREATE TABLE IF NOT EXISTS public.academic_terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tahun_ajaran VARCHAR(9) NOT NULL, -- '2025/2026'
    semester VARCHAR(10) NOT NULL, -- 'GANJIL' or 'GENAP'
    mulai DATE,
    selesai DATE,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tahun_ajaran, semester)
);

-- 6. GURU TABLE
CREATE TABLE IF NOT EXISTS public.gurus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nip VARCHAR(20) UNIQUE,
    nama VARCHAR(255) NOT NULL,
    email TEXT,
    no_telp VARCHAR(20),
    alamat TEXT,
    foto_url TEXT,
    user_id UUID REFERENCES auth.users(id),
    status_aktif BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. SISWA TABLE
CREATE TABLE IF NOT EXISTS public.siswas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nis VARCHAR(20) UNIQUE NOT NULL,
    nisn VARCHAR(20) UNIQUE,
    nipd VARCHAR(20),
    nama VARCHAR(255) NOT NULL,
    email TEXT,
    no_telp VARCHAR(20),
    alamat TEXT,
    foto_url TEXT,
    tempat_lahir VARCHAR(100),
    tanggal_lahir DATE,
    jenis_kelamin VARCHAR(10), -- 'L' or 'P'
    agama VARCHAR(20),
    nama_ayah TEXT,
    nama_ibu TEXT,
    pekerjaan_ayah TEXT,
    pekerjaan_ibu TEXT,
    user_id UUID REFERENCES auth.users(id),
    status_aktif status_siswa DEFAULT 'AKTIF',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. MATA PELAJARAN TABLE
CREATE TABLE IF NOT EXISTS public.mata_pelajarans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode VARCHAR(20) UNIQUE NOT NULL,
    nama VARCHAR(255) NOT NULL,
    kelompok_mapel kelompok_mapel DEFAULT 'WAJIB',
    mapping INTEGER DEFAULT 0,
    induk_mapel VARCHAR(20),
    induk_nama TEXT,
    agama VARCHAR(20), -- For PABP
    jp_real INTEGER DEFAULT 4, -- Jam Pelajaran REAL
    jp_dapo INTEGER DEFAULT 4, -- Jam Pelajaran DAPO
    aktif BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. KELAS TABLE
CREATE TABLE IF NOT EXISTS public.kelas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_term_id UUID NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
    nama_kelas VARCHAR(50) NOT NULL,
    tingkat VARCHAR(10) NOT NULL, -- '7', '8', '9', etc
    jenis kelas_jenis DEFAULT 'REGULER',
    wali_kelas_id UUID REFERENCES gurus(id) ON DELETE SET NULL,
    kapasitas INTEGER DEFAULT 36,
    status_aktif BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(academic_term_id, nama_kelas, jenis)
);

-- 10. KELAS SISWA (Rombel Students)
CREATE TABLE IF NOT EXISTS public.kelas_siswa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kelas_id UUID NOT NULL REFERENCES kelas(id) ON DELETE CASCADE,
    siswa_id UUID NOT NULL REFERENCES siswas(id) ON DELETE CASCADE,
    academic_term_id UUID NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(kelas_id, siswa_id, academic_term_id)
);

-- 11. PEMBAGIAN MENGAJAR (Teaching Assignments)
CREATE TABLE IF NOT EXISTS public.pembagian_mengajar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kelas_id UUID NOT NULL REFERENCES kelas(id) ON DELETE CASCADE,
    mapel_id UUID NOT NULL REFERENCES mata_pelajarans(id) ON DELETE CASCADE,
    guru_id UUID NOT NULL REFERENCES gurus(id) ON DELETE CASCADE,
    academic_term_id UUID NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
    jp_total INTEGER DEFAULT 4,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(kelas_id, mapel_id, guru_id, academic_term_id)
);

-- 12. TUGAS TAMBAHAN (Additional Teacher Duties)
CREATE TABLE IF NOT EXISTS public.tugas_tambahan_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode VARCHAR(50) UNIQUE NOT NULL,
    nama VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO tugas_tambahan_types (kode, nama) VALUES 
    ('WALI_KELAS', 'Wali Kelas'),
    ('KAPALA_PERPUSTAKAAN', 'Kepala Perpustakaan'),
    ('KA_SARPRAS', 'Ka. Sarana Prasarana'),
    ('KA_KESISWAAN', 'Ka. Kesiswaan'),
    ('KA_Humas', 'Ka. Hubungan Masyarakat')
ON CONFLICT (kode) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.tugas_tambahan_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guru_id UUID NOT NULL REFERENCES gurus(id) ON DELETE CASCADE,
    tugas_type_id UUID NOT NULL REFERENCES tugas_tambahan_types(id) ON DELETE CASCADE,
    academic_term_id UUID NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
    kelas_id UUID REFERENCES kelas(id) ON DELETE SET NULL, -- for Wali Kelas
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(guru_id, tugas_type_id, academic_term_id)
);

-- 13. ASSESSMENT TYPES
CREATE TYPE assessment_category AS ENUM ('SUMATIF', 'FORMATIF', 'DIAGNOSTIK', 'AKHIR');
CREATE TYPE assessment_stage AS ENUM ('H1', 'H2', 'PAS');

CREATE TABLE IF NOT EXISTS public.assessment_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode VARCHAR(50) UNIQUE NOT NULL,
    nama VARCHAR(255) NOT NULL,
    kategori assessment_category DEFAULT 'SUMATIF',
    stage assessment_stage,
    bobot DECIMAL(5,2) DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO assessment_types (kode, nama, kategori, stage, bobot) VALUES
    ('PH', 'Penilaian Harian', 'SUMATIF', 'H1', 60),
    ('PTS', 'Penilaian Tengah Semester', 'SUMATIF', 'H2', 20),
    ('PAS', 'Penilaian Akhir Semester', 'SUMATIF', 'PAS', 20)
ON CONFLICT (kode) DO NOTHING;

-- 14. ASSESSMENTS TABLE
CREATE TABLE IF NOT EXISTS public.assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_term_id UUID NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
    assessment_type_id UUID NOT NULL REFERENCES assessment_types(id) ON DELETE CASCADE,
    pembagian_mengajar_id UUID NOT NULL REFERENCES pembagian_mengajar(id) ON DELETE CASCADE,
    tanggal DATE,
    stage assessment_stage DEFAULT 'H1',
    status VARCHAR(20) DEFAULT 'DRAFT', -- DRAFT, PUBLISHED, LOCKED
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. ASSESSMENT DETAILS (Student Grades)
CREATE TABLE IF NOT EXISTS public.assessment_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    siswa_id UUID NOT NULL REFERENCES siswas(id) ON DELETE CASCADE,
    nilai DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(assessment_id, siswa_id)
);

-- 16. EXAM ROOMS
CREATE TABLE IF NOT EXISTS public.exam_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_term_id UUID NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
    nama_ruang VARCHAR(50) NOT NULL,
    lokasi VARCHAR(100),
    kapasitas INTEGER DEFAULT 36,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. EXAM SEATS
CREATE TABLE IF NOT EXISTS public.exam_seats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES exam_rooms(id) ON DELETE CASCADE,
    siswa_id UUID NOT NULL REFERENCES siswas(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    nomor_kursi INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(room_id, exam_id, siswa_id),
    UNIQUE(room_id, exam_id, nomor_kursi)
);

-- 18. EXAM SUPERVISORS
CREATE TABLE IF NOT EXISTS public.exam_supervisors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guru_id UUID NOT NULL REFERENCES gurus(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES exam_rooms(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    academic_term_id UUID NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
    slot_waktu VARCHAR(20),
    shift INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 19. CALENDAR EVENTS
CREATE TABLE IF NOT EXISTS public.calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_term_id UUID NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE,
    event_type VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 20. CATATAN WALI KELAS
CREATE TABLE IF NOT EXISTS public.catatan_wali_kelas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    siswa_id UUID NOT NULL REFERENCES siswas(id) ON DELETE CASCADE,
    kelas_id UUID NOT NULL REFERENCES kelas(id) ON DELETE CASCADE,
    academic_term_id UUID NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
    catatan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(siswa_id, kelas_id, academic_term_id)
);

-- 21. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.gurus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.siswas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mata_pelajarans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pembagian_mengajar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_details ENABLE ROW LEVEL SECURITY;

-- 22. RLS POLICIES (Allow all authenticated users for now)
CREATE POLICY "Enable read for authenticated users" ON public.gurus FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.gurus FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON public.gurus FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable read for authenticated users" ON public.siswas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.siswas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON public.siswas FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable read for authenticated users" ON public.mata_pelajarans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.mata_pelajarans FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON public.mata_pelajarans FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable read for authenticated users" ON public.kelas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.kelas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON public.kelas FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable read for authenticated users" ON public.academic_terms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.academic_terms FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON public.academic_terms FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable read for authenticated users" ON public.pembagian_mengajar FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.pembagian_mengajar FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON public.pembagian_mengajar FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable read for authenticated users" ON public.assessments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.assessments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON public.assessments FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable read for authenticated users" ON public.assessment_details FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.assessment_details FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON public.assessment_details FOR UPDATE TO authenticated USING (true);

-- 23. CREATE INDEXES
CREATE INDEX IF NOT EXISTS idx_kelas_term ON kelas(academic_term_id);
CREATE INDEX IF NOT EXISTS idx_kelas_tingkat ON kelas(tingkat);
CREATE INDEX IF NOT EXISTS idx_kelas_wali ON kelas(wali_kelas_id) WHERE wali_kelas_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_siswas_nama ON siswas(nama);
CREATE INDEX IF NOT EXISTS idx_gurus_nama ON gurus(nama);
CREATE INDEX IF NOT EXISTS idx_pembagian_mengajar_kelas ON pembagian_mengajar(kelas_id);
CREATE INDEX IF NOT EXISTS idx_pembagian_mengajar_guru ON pembagian_mengajar(guru_id);
CREATE INDEX IF NOT EXISTS idx_assessments_term ON assessments(academic_term_id);
CREATE INDEX IF NOT EXISTS idx_assessment_details_assessment ON assessment_details(assessment_id);

-- 24. SEED DATA: Sample Academic Term
INSERT INTO public.academic_terms (tahun_ajaran, semester, mulai, selesai, is_active)
VALUES ('2025/2026', 'GANJIL', '2025-07-15', '2025-12-20', true)
ON CONFLICT (tahun_ajaran, semester) DO NOTHING;

-- 25. VERIFY
SELECT 'SIKAD v4.0 Database Setup Complete!' as status;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
