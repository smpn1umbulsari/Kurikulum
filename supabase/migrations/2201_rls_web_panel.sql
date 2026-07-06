/* =========================================================
   SIKAD v4.0 - Migration 2201: RLS Web Panel
   
   Purpose:
   1. Fix auth_is_guru_mengajar_kelas to handle BOTH desktop and web users
   2. Add version column to assessment_details for optimistic locking (G5)
   3. Create RLS policies for web panel access
   
   Fixes G1, G4, G5 from implementation plan
   ========================================================= */

-- ============================================
-- G1: Fix auth_is_guru_mengajar_kelas
-- Now handles BOTH:
-- - Path A: Web Panel users (linked directly to gurus.auth_user_id)
-- - Path B: Desktop users (linked via custom_users.auth_user_id)
-- ============================================

CREATE OR REPLACE FUNCTION public.auth_is_guru_mengajar_kelas(target_kelas_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.pembagian_mengajar pm
        WHERE pm.kelas_id = target_kelas_id
        AND (
            -- Path A: Web Panel — guru linked directly to auth.users
            pm.guru_id IN (SELECT id FROM gurus WHERE auth_user_id = auth.uid())
            -- Path B: Desktop — guru in custom_users, then linked to auth
            OR pm.guru_id IN (
                SELECT cu.guru_id FROM custom_users cu
                WHERE cu.auth_user_id = auth.uid()
            )
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- G1: Fix auth_is_guru for web panel
-- ============================================

CREATE OR REPLACE FUNCTION public.auth_is_guru()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() AND r.kode = 'GURU'
    )
    OR EXISTS (
        -- Web panel guru via direct link
        SELECT 1 FROM gurus WHERE auth_user_id = auth.uid() AND status_aktif = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- G1: Fix auth_is_wali_kelas for web panel
-- ============================================

CREATE OR REPLACE FUNCTION public.auth_is_wali_kelas(target_kelas_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.kelas k
        WHERE k.id = target_kelas_id 
        AND (
            -- Path A: Web panel (direct link)
            k.wali_kelas_id = auth.uid()
            -- Path B: Desktop (via custom_users)
            OR k.wali_kelas_id IN (SELECT guru_id FROM custom_users WHERE auth_user_id = auth.uid())
        )
        AND k.status_aktif = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- G5: Add version column to assessment_details
-- For optimistic locking (G5 fix)
-- ============================================

ALTER TABLE assessment_details ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1 NOT NULL;

-- ============================================
-- G5: Create upsert function with version check
-- ============================================

CREATE OR REPLACE FUNCTION public.upsert_assessment_detail(
    p_assessment_id UUID,
    p_siswa_id UUID,
    p_nilai NUMERIC(5,2),
    p_catatan TEXT DEFAULT NULL,
    p_expected_version INTEGER DEFAULT NULL
) RETURNS assessment_details AS $$
DECLARE
    v_existing assessment_details%ROWTYPE;
    v_new_version INTEGER;
BEGIN
    -- Check if exists
    SELECT * INTO v_existing
    FROM assessment_details
    WHERE assessment_id = p_assessment_id AND siswa_id = p_siswa_id;
    
    IF v_existing IS NOT NULL THEN
        -- Version check for optimistic locking
        IF p_expected_version IS NOT NULL AND v_existing.version != p_expected_version THEN
            RAISE EXCEPTION 'VERSION_CONFLICT: Expected version % but found %', 
                p_expected_version, v_existing.version;
        END IF;
        
        -- Update existing
        v_new_version := v_existing.version + 1;
        UPDATE assessment_details
        SET nilai = p_nilai,
            catatan = p_catatan,
            version = v_new_version,
            updated_at = now()
        WHERE assessment_id = p_assessment_id AND siswa_id = p_siswa_id
        RETURNING * INTO v_existing;
        
        RETURN v_existing;
    ELSE
        -- Insert new
        INSERT INTO assessment_details (assessment_id, siswa_id, nilai, catatan, version)
        VALUES (p_assessment_id, p_siswa_id, p_nilai, p_catatan, 1)
        RETURNING * INTO v_existing;
        
        RETURN v_existing;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant function access
GRANT EXECUTE ON FUNCTION public.upsert_assessment_detail TO authenticated;

-- ============================================
-- G4: Create assessment stage functions
-- ============================================

CREATE OR REPLACE FUNCTION public.get_assessment_stage(p_assessment_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_count_draft INTEGER;
    v_count_submitted INTEGER;
    v_count_approved INTEGER;
    v_count_finalized INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count_draft
    FROM assessment_details ad
    JOIN assessments a ON ad.assessment_id = a.id
    WHERE a.id = p_assessment_id AND a.status = 'DRAFT';
    
    SELECT COUNT(*) INTO v_count_submitted
    FROM assessment_details ad
    JOIN assessments a ON ad.assessment_id = a.id
    WHERE a.id = p_assessment_id AND a.status = 'SUBMITTED';
    
    SELECT COUNT(*) INTO v_count_approved
    FROM assessment_details ad
    JOIN assessments a ON ad.assessment_id = a.id
    WHERE a.id = p_assessment_id AND a.status = 'APPROVED';
    
    SELECT COUNT(*) INTO v_count_finalized
    FROM assessment_details ad
    JOIN assessments a ON ad.assessment_id = a.id
    WHERE a.id = p_assessment_id AND a.status = 'FINALIZED';
    
    IF v_count_finalized > 0 THEN
        RETURN 'FINALIZED';
    ELSIF v_count_approved > 0 THEN
        RETURN 'APPROVED';
    ELSIF v_count_submitted > 0 THEN
        RETURN 'SUBMITTED';
    ELSE
        RETURN 'DRAFT';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- RLS Policies for Web Panel
-- ============================================

-- Enable RLS on assessment_details if not already
ALTER TABLE assessment_details ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policy with fixed auth function
DROP POLICY IF EXISTS "Guru can update assessment_details" ON assessment_details;
CREATE POLICY "Guru can update assessment_details" ON assessment_details
FOR UPDATE
USING (
    auth_is_guru_mengajar_kelas(
        (SELECT kelas_id FROM assessments WHERE id = assessment_details.assessment_id)
    )
)
WITH CHECK (
    auth_is_guru_mengajar_kelas(
        (SELECT kelas_id FROM assessments WHERE id = assessment_details.assessment_id)
    )
);

-- Guru can SELECT their assessment details
DROP POLICY IF EXISTS "Guru can read assessment_details" ON assessment_details;
CREATE POLICY "Guru can read assessment_details" ON assessment_details
FOR SELECT
USING (
    auth_is_guru_mengajar_kelas(
        (SELECT kelas_id FROM assessments WHERE id = assessment_details.assessment_id)
    )
    OR auth_is_admin()
    OR auth_is_kurikulum()
    OR auth_is_kepsek()
);

-- ============================================
-- RLS Policies for assessments table
-- ============================================

ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;

-- Guru can read their assigned assessments
DROP POLICY IF EXISTS "Guru can read assigned assessments" ON assessments;
CREATE POLICY "Guru can read assigned assessments" ON assessments
FOR SELECT
USING (
    auth_is_guru_mengajar_kelas(kelas_id)
    OR auth_is_wali_kelas(kelas_id)
    OR auth_is_admin()
    OR auth_is_kurikulum()
    OR auth_is_kepsek()
);

-- Guru can update their assigned assessments (for status changes)
DROP POLICY IF EXISTS "Guru can update assigned assessments" ON assessments;
CREATE POLICY "Guru can update assigned assessments" ON assessments
FOR UPDATE
USING (
    auth_is_guru_mengajar_kelas(kelas_id)
    OR auth_is_admin()
    OR auth_is_kurikulum()
);

-- ============================================
-- RLS Policies for pembagian_mengajar
-- ============================================

ALTER TABLE pembagian_mengajar ENABLE ROW LEVEL SECURITY;

-- Guru can read their own teaching assignments
DROP POLICY IF EXISTS "Guru can read own mengajar" ON pembagian_mengajar;
CREATE POLICY "Guru can read own mengajar" ON pembagian_mengajar
FOR SELECT
USING (
    guru_id IN (SELECT id FROM gurus WHERE auth_user_id = auth.uid())
    OR guru_id IN (SELECT guru_id FROM custom_users WHERE auth_user_id = auth.uid())
    OR auth_is_admin()
    OR auth_is_kurikulum()
);

-- ============================================
-- Grant additional permissions for web panel
-- ============================================

GRANT EXECUTE ON FUNCTION public.auth_is_guru_mengajar_kelas TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_is_guru TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_is_wali_kelas TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_assessment_stage TO authenticated;

-- ============================================
-- Create view for web panel dashboard
-- ============================================

CREATE OR REPLACE VIEW public.v_guru_teaching_assignments AS
SELECT 
    pm.id AS pembagian_id,
    pm.guru_id,
    pm.kelas_id,
    pm.mata_pelajaran_id,
    k.nama AS kelas_nama,
    k.tingkat,
    mp.nama AS mata_pelajaran_nama,
    mp.kode AS mata_pelajaran_kode,
    g.nama AS guru_nama,
    g.auth_user_id,
    CASE 
        WHEN g.auth_user_id IS NOT NULL THEN TRUE 
        ELSE FALSE 
    END AS has_web_account
FROM pembagian_mengajar pm
JOIN kelas k ON pm.kelas_id = k.id
JOIN mata_pelajarans mp ON pm.mata_pelajaran_id = mp.id
JOIN gurus g ON pm.guru_id = g.id
WHERE k.status_aktif = TRUE AND pm.is_active = TRUE;

GRANT SELECT ON public.v_guru_teaching_assignments TO authenticated;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

/*
-- Test auth_is_guru_mengajar_kelas:
SELECT auth_is_guru_mengajar_kelas('some-kelas-uuid');

-- Test upsert_assessment_detail with version:
SELECT * FROM public.upsert_assessment_detail(
    'assessment-uuid',
    'siswa-uuid',
    85.5,
    'Catatan bagus',
    1  -- expected version
);

-- Check teaching assignments for current user:
SELECT * FROM v_guru_teaching_assignments 
WHERE guru_id IN (SELECT id FROM gurus WHERE auth_user_id = auth.uid());
*/
