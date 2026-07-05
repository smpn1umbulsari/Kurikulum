-- Migration: 700_catatan_wali_kelas.sql
-- Description: Class teacher notes/catatan wali kelas table

CREATE TABLE IF NOT EXISTS catatan_wali_kelas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_term_id UUID NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
    siswa_id UUID NOT NULL REFERENCES siswas(id) ON DELETE CASCADE,
    kelas_id UUID NOT NULL REFERENCES kelas(id) ON DELETE CASCADE,
    catatan TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES gurus(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS uq_catatan_term_siswa ON catatan_wali_kelas(academic_term_id, siswa_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_catatan_term ON catatan_wali_kelas(academic_term_id);
CREATE INDEX IF NOT EXISTS idx_catatan_siswa ON catatan_wali_kelas(siswa_id);
CREATE INDEX IF NOT EXISTS idx_catatan_kelas ON catatan_wali_kelas(kelas_id);

-- Comments
COMMENT ON TABLE catatan_wali_kelas IS 'Tabel catatan wali kelas per siswa';
