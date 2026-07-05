-- Migration: 300_academic_terms.sql
-- Description: Academic terms table (tahun ajaran & semester)

CREATE TABLE IF NOT EXISTS academic_terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tahun_ajaran VARCHAR(20) NOT NULL,
    semester semester_type NOT NULL,
    tanggal_mulai DATE NOT NULL,
    tanggal_selesai DATE NOT NULL,
    status BOOLEAN NOT NULL DEFAULT FALSE,
    finalized BOOLEAN NOT NULL DEFAULT FALSE,
    input_mode term_input_mode NOT NULL DEFAULT 'SEMESTER',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tahun_ajaran, semester)
);

-- Indexes for performance
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_term ON academic_terms(status) WHERE status = TRUE;
CREATE INDEX IF NOT EXISTS idx_academic_terms_tahun ON academic_terms(tahun_ajaran DESC);
CREATE INDEX IF NOT EXISTS idx_academic_terms_finalized ON academic_terms(finalized) WHERE finalized = FALSE;
CREATE INDEX IF NOT EXISTS idx_academic_terms_tanggal ON academic_terms(tanggal_mulai, tanggal_selesai);

-- Comments
COMMENT ON TABLE academic_terms IS 'Tabel tahun ajaran dan semester';
COMMENT ON COLUMN academic_terms.status IS 'TRUE = tahun ajaran aktif';
COMMENT ON COLUMN academic_terms.finalized IS 'TRUE = sudah difinalisasi, READ ONLY';

