/* =========================================================
   SIKAD v4.0 - GRADE INPUT MODES & SEQUENTIAL UH RULES
   ========================================================= */

-- 1. Create term input mode enum
DO $$ BEGIN
    CREATE TYPE term_input_mode AS ENUM ('PTS', 'SEMESTER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Add columns to academic_terms and assessment_details
ALTER TABLE academic_terms 
ADD COLUMN IF NOT EXISTS input_mode term_input_mode NOT NULL DEFAULT 'PTS';

ALTER TABLE assessment_details 
ADD COLUMN IF NOT EXISTS is_pts_locked BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Seed new assessment types (UH1-UH5) and remove old general 'UH'
DELETE FROM assessment_types WHERE kode = 'UH';

INSERT INTO assessment_types (kode, nama, kategori, bobot_default, urutan, aktif) VALUES
('UH1', 'Ulangan Harian 1', 'Formatif', 10.00, 1, TRUE),
('UH2', 'Ulangan Harian 2', 'Formatif', 10.00, 2, TRUE),
('UH3', 'Ulangan Harian 3', 'Formatif', 10.00, 3, TRUE),
('UH4', 'Ulangan Harian 4', 'Formatif', 10.00, 4, TRUE),
('UH5', 'Ulangan Harian 5', 'Formatif', 10.00, 5, TRUE)
ON CONFLICT (kode) DO UPDATE SET
    nama = EXCLUDED.nama,
    kategori = EXCLUDED.kategori,
    bobot_default = EXCLUDED.bobot_default,
    urutan = EXCLUDED.urutan,
    aktif = EXCLUDED.aktif;

-- Update default weights for PTS and PAS
UPDATE assessment_types SET bobot_default = 20.00 WHERE kode = 'PTS';
UPDATE assessment_types SET bobot_default = 30.00 WHERE kode = 'PAS';

-- 4. Trigger Function: Lock PTS Grades on Mode Shift (PTS -> SEMESTER)
CREATE OR REPLACE FUNCTION lock_pts_grades()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.input_mode = 'PTS' AND NEW.input_mode = 'SEMESTER' THEN
        UPDATE assessment_details
        SET is_pts_locked = TRUE
        WHERE is_pts_locked = FALSE
          AND assessment_id IN (
              SELECT a.id 
              FROM assessments a
              JOIN assessment_types aty ON a.assessment_type_id = aty.id
              WHERE a.academic_term_id = NEW.id
                AND aty.kode IN ('UH1', 'UH2', 'UH3', 'PTS')
          );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_lock_pts_grades
    AFTER UPDATE ON academic_terms
    FOR EACH ROW
    WHEN (OLD.input_mode IS DISTINCT FROM NEW.input_mode)
    EXECUTE FUNCTION lock_pts_grades();

-- 5. Trigger Function: Prevent Editing Locked PTS Grades
CREATE OR REPLACE FUNCTION prevent_pts_edit()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_pts_locked = TRUE AND (OLD.nilai IS DISTINCT FROM NEW.nilai OR OLD.catatan IS DISTINCT FROM NEW.catatan) THEN
        RAISE EXCEPTION 'Nilai yang diinput pada masa PTS tidak dapat diubah di mode Semester.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_prevent_pts_edit
    BEFORE UPDATE ON assessment_details
    FOR EACH ROW
    EXECUTE FUNCTION prevent_pts_edit();

-- 6. Trigger Function: Validate Input Mode Constraints and Sequential UH Rules
CREATE OR REPLACE FUNCTION validate_assessment_details()
RETURNS TRIGGER AS $$
DECLARE
    v_type_kode VARCHAR(50);
    v_term_id UUID;
    v_term_mode term_input_mode;
    v_mapel_id UUID;
    v_prev_kode VARCHAR(50);
    v_prev_grade_exists BOOLEAN := FALSE;
BEGIN
    -- Get assessment metadata
    SELECT aty.kode, a.academic_term_id, pm.mapel_id
    INTO v_type_kode, v_term_id, v_mapel_id
    FROM assessments a
    JOIN assessment_types aty ON a.assessment_type_id = aty.id
    JOIN pembagian_mengajar pm ON a.pembagian_mengajar_id = pm.id
    WHERE a.id = NEW.assessment_id;

    -- Get academic term input mode
    SELECT input_mode INTO v_term_mode
    FROM academic_terms
    WHERE id = v_term_id;

    -- A. Check if input mode is PTS and blocks UH4, UH5, PAS
    IF v_term_mode = 'PTS' AND v_type_kode IN ('UH4', 'UH5', 'PAS') THEN
        RAISE EXCEPTION 'Mata pelajaran ini berada dalam mode PTS. Nilai UH4, UH5, dan PAS belum dapat diinput.';
    END IF;

    -- B. Sequential UH Logic
    IF v_type_kode IN ('UH2', 'UH3', 'UH4', 'UH5') THEN
        -- Determine previous required type
        IF v_type_kode = 'UH2' THEN v_prev_kode := 'UH1';
        ELSIF v_type_kode = 'UH3' THEN v_prev_kode := 'UH2';
        ELSIF v_type_kode = 'UH4' THEN v_prev_kode := 'UH3';
        ELSIF v_type_kode = 'UH5' THEN v_prev_kode := 'UH4';
        END IF;

        -- Check if previous UH has a grade for this student in this mapel and term
        SELECT EXISTS (
            SELECT 1
            FROM assessment_details ad
            JOIN assessments a ON ad.assessment_id = a.id
            JOIN assessment_types aty ON a.assessment_type_id = aty.id
            JOIN pembagian_mengajar pm ON a.pembagian_mengajar_id = pm.id
            WHERE ad.siswa_id = NEW.siswa_id
              AND pm.mapel_id = v_mapel_id
              AND pm.academic_term_id = v_term_id
              AND aty.kode = v_prev_kode
              AND ad.nilai IS NOT NULL
        ) INTO v_prev_grade_exists;

        IF NOT v_prev_grade_exists THEN
            RAISE EXCEPTION 'Gagal menyimpan nilai. Siswa harus memiliki nilai untuk % terlebih dahulu.', v_prev_kode;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_validate_assessment_details
    BEFORE INSERT OR UPDATE ON assessment_details
    FOR EACH ROW
    EXECUTE FUNCTION validate_assessment_details();
