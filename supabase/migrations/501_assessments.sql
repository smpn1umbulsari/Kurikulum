-- Migration: 501_assessments.sql
-- Description: Assessment/penilaian table

CREATE TABLE IF NOT EXISTS assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_type_id UUID NOT NULL REFERENCES assessment_types(id) ON DELETE RESTRICT,
    pembagian_mengajar_id UUID NOT NULL REFERENCES pembagian_mengajar(id) ON DELETE CASCADE,
    academic_term_id UUID NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
    judul VARCHAR(200) NOT NULL,
    deskripsi TEXT,
    tanggal DATE NOT NULL,
    bobot NUMERIC(5,2) NOT NULL CHECK (bobot >= 0 AND bobot <= 100),
    stage assessment_stage NOT NULL DEFAULT 'DRAFT',
    created_by UUID NOT NULL REFERENCES gurus(id),
    version BIGINT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_assessments_type ON assessments(assessment_type_id);
CREATE INDEX IF NOT EXISTS idx_assessments_pembagian ON assessments(pembagian_mengajar_id);
CREATE INDEX IF NOT EXISTS idx_assessments_term ON assessments(academic_term_id);
CREATE INDEX IF NOT EXISTS idx_assessments_tanggal ON assessments(tanggal);
CREATE INDEX IF NOT EXISTS idx_assessments_stage ON assessments(stage);
CREATE INDEX IF NOT EXISTS idx_assessments_created_by ON assessments(created_by);

-- Comments
COMMENT ON TABLE assessments IS 'Tabel penilaian/ulangan';
COMMENT ON COLUMN assessments.bobot IS 'Persentase bobot (0-100)';
COMMENT ON COLUMN assessments.stage IS 'Stage: DRAFT, PUBLISHED, ARCHIVED';
