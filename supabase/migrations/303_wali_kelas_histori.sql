-- Migration: 303_wali_kelas_histori.sql
-- Description: Class teacher history/wali kelas histori table

CREATE TABLE IF NOT EXISTS wali_kelas_histori (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kelas_id UUID NOT NULL REFERENCES kelas(id) ON DELETE CASCADE,
    guru_id UUID NOT NULL REFERENCES gurus(id) ON DELETE CASCADE,
    academic_term_id UUID NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
    tanggal_mulai DATE NOT NULL,
    tanggal_selesai DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_wali_kelas_histori_kelas ON wali_kelas_histori(kelas_id);
CREATE INDEX IF NOT EXISTS idx_wali_kelas_histori_guru ON wali_kelas_histori(guru_id);
CREATE INDEX IF NOT EXISTS idx_wali_kelas_histori_term ON wali_kelas_histori(academic_term_id);

-- Comments
COMMENT ON TABLE wali_kelas_histori IS 'Tabel histori wali kelas per tahun ajaran';
