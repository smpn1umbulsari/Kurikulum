-- Migration: 400_pembagian_mengajar.sql
-- Description: Teacher assignment/pembagian mengajar table

CREATE TABLE IF NOT EXISTS pembagian_mengajar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_term_id UUID NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
    guru_id UUID NOT NULL REFERENCES gurus(id) ON DELETE CASCADE,
    mapel_id UUID NOT NULL REFERENCES mata_pelajarans(id) ON DELETE CASCADE,
    kelas_id UUID NOT NULL REFERENCES kelas(id) ON DELETE CASCADE,
    jenis kelas_jenis NOT NULL,
    jp NUMERIC(5,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(academic_term_id, guru_id, mapel_id, kelas_id, jenis)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pembagian_term ON pembagian_mengajar(academic_term_id);
CREATE INDEX IF NOT EXISTS idx_pembagian_guru ON pembagian_mengajar(guru_id);
CREATE INDEX IF NOT EXISTS idx_pembagian_mapel ON pembagian_mengajar(mapel_id);
CREATE INDEX IF NOT EXISTS idx_pembagian_kelas ON pembagian_mengajar(kelas_id);
CREATE INDEX IF NOT EXISTS idx_pembagian_jenis ON pembagian_mengajar(jenis);

-- Comments
COMMENT ON TABLE pembagian_mengajar IS 'Tabel pembagian mengajar guru per kelas';
COMMENT ON COLUMN pembagian_mengajar.jp IS 'Jumlah JP (Jam Pelajaran) per minggu';
COMMENT ON COLUMN pembagian_mengajar.jenis IS 'Jenis kelas: REGULER, CIPTA, CERNAM';
