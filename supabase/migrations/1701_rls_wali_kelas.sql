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
