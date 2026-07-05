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

