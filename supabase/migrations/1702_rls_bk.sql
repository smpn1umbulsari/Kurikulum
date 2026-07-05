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
