/* =========================================================
   SIKAD v4.0 - GRADE TRANSFER FUNCTION
   ========================================================= */

CREATE OR REPLACE FUNCTION transfer_siswa_nilai(
    p_siswa_id UUID,
    p_old_kelas_id UUID,
    p_new_kelas_id UUID,
    p_academic_term_id UUID
) RETURNS INTEGER AS $$
DECLARE
    v_rec RECORD;
    v_new_pm_id UUID;
    v_new_assessment_id UUID;
    v_transferred_count INTEGER := 0;
BEGIN
    -- Loop through all active grades of the student in the old class for the current term
    FOR v_rec IN 
        SELECT 
            ad.nilai,
            ad.catatan,
            a.judul,
            a.deskripsi,
            a.tanggal,
            a.bobot,
            a.assessment_type_id,
            a.stage,
            a.created_by,
            pm.mapel_id
        FROM assessment_details ad
        JOIN assessments a ON ad.assessment_id = a.id
        JOIN pembagian_mengajar pm ON a.pembagian_mengajar_id = pm.id
        WHERE ad.siswa_id = p_siswa_id
          AND pm.kelas_id = p_old_kelas_id
          AND pm.academic_term_id = p_academic_term_id
    LOOP
        -- Find the corresponding pembagian_mengajar in the new class for the same mapel
        SELECT id INTO v_new_pm_id
        FROM pembagian_mengajar
        WHERE kelas_id = p_new_kelas_id
          AND mapel_id = v_rec.mapel_id
          AND academic_term_id = p_academic_term_id
        LIMIT 1;

        -- If a teaching assignment exists in the new class for this mapel
        IF v_new_pm_id IS NOT NULL THEN
            -- Check if a matching assessment already exists in the new class
            -- We match by assessment_type_id and exact title match
            SELECT id INTO v_new_assessment_id
            FROM assessments
            WHERE pembagian_mengajar_id = v_new_pm_id
              AND assessment_type_id = v_rec.assessment_type_id
              AND judul = v_rec.judul
              AND academic_term_id = p_academic_term_id
            LIMIT 1;

            -- If it doesn't exist, we automatically create it in the new class
            IF v_new_assessment_id IS NULL THEN
                INSERT INTO assessments (
                    assessment_type_id,
                    pembagian_mengajar_id,
                    academic_term_id,
                    judul,
                    deskripsi,
                    tanggal,
                    bobot,
                    stage,
                    created_by
                ) VALUES (
                    v_rec.assessment_type_id,
                    v_new_pm_id,
                    p_academic_term_id,
                    v_rec.judul,
                    v_rec.deskripsi,
                    v_rec.tanggal,
                    v_rec.bobot,
                    v_rec.stage,
                    v_rec.created_by
                ) RETURNING id INTO v_new_assessment_id;
            END IF;

            -- Insert or update the grade for the student in the new assessment
            INSERT INTO assessment_details (assessment_id, siswa_id, nilai, catatan)
            VALUES (v_new_assessment_id, p_siswa_id, v_rec.nilai, v_rec.catatan)
            ON CONFLICT (assessment_id, siswa_id) 
            DO UPDATE SET 
                nilai = EXCLUDED.nilai,
                catatan = EXCLUDED.catatan,
                updated_at = now();

            v_transferred_count := v_transferred_count + 1;
        END IF;
    END LOOP;

    -- Delete the old grades for this student under the old class assessments
    IF v_transferred_count > 0 THEN
        DELETE FROM assessment_details
        WHERE siswa_id = p_siswa_id
          AND assessment_id IN (
              SELECT a.id 
              FROM assessments a
              JOIN pembagian_mengajar pm ON a.pembagian_mengajar_id = pm.id
              WHERE pm.kelas_id = p_old_kelas_id
                AND pm.academic_term_id = p_academic_term_id
          );
    END IF;

    RETURN v_transferred_count;
END;
$$ LANGUAGE plpgsql;
