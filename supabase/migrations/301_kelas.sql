-- Migration: 301_kelas.sql
-- Description: Academic class/rombel table

CREATE TABLE IF NOT EXISTS kelas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_term_id UUID NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
    nama_kelas VARCHAR(50) NOT NULL,
    tingkat SMALLINT NOT NULL CHECK (tingkat IN (7,8,9)),
    jenis kelas_jenis NOT NULL,
    wali_kelas_id UUID REFERENCES gurus(id) ON DELETE SET NULL,
    kapasitas SMALLINT DEFAULT 36,
    status_aktif BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(academic_term_id, nama_kelas, jenis)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_kelas_term ON kelas(academic_term_id);
CREATE INDEX IF NOT EXISTS idx_kelas_tingkat ON kelas(tingkat);
CREATE INDEX IF NOT EXISTS idx_kelas_wali ON kelas(wali_kelas_id) WHERE wali_kelas_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_kelas_jenis ON kelas(jenis);
CREATE INDEX IF NOT EXISTS idx_kelas_status ON kelas(status_aktif);

-- Comments
COMMENT ON TABLE kelas IS 'Tabel rombel/kelas per tahun ajaran';
COMMENT ON COLUMN kelas.tingkat IS 'Tingkat: 7, 8, 9 (SMP)';
COMMENT ON COLUMN kelas.jenis IS 'Jenis: REGULER, CIPTA, CERNAM';
COMMENT ON COLUMN kelas.kapasitas IS 'Jumlah siswa maksimal per kelas';
