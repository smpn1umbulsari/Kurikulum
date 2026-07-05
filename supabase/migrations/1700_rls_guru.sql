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
