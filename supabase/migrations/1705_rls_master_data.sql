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
