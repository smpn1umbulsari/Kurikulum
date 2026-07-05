-- Migration: 202_mata_pelajarans.sql
-- Description: Master data table for subjects/mata pelajaran

CREATE TABLE IF NOT EXISTS mata_pelajarans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode VARCHAR(50) NOT NULL UNIQUE,
    nama VARCHAR(150) NOT NULL,
    kelompok_mapel VARCHAR(50) NOT NULL DEFAULT 'A',
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    mapping INTEGER,
    induk_mapel VARCHAR(50),
    induk_nama VARCHAR(150),
    agama VARCHAR(50),
    jp_reguler INTEGER,
    jp_pagar INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_mata_pelajarans_kode ON mata_pelajarans(kode);
CREATE INDEX IF NOT EXISTS idx_mata_pelajarans_nama ON mata_pelajarans(nama) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_mata_pelajarans_kelompok_mapel ON mata_pelajarans(kelompok_mapel);
CREATE INDEX IF NOT EXISTS idx_mata_pelajarans_aktif ON mata_pelajarans(aktif);
CREATE INDEX IF NOT EXISTS idx_mata_pelajarans_deleted_at ON mata_pelajarans(deleted_at) WHERE deleted_at IS NULL;

-- Comments
COMMENT ON TABLE mata_pelajarans IS 'Master data mata pelajaran';
COMMENT ON COLUMN mata_pelajarans.kode IS 'Kode mata pelajaran - unik';
COMMENT ON COLUMN mata_pelajarans.kelompok_mapel IS 'Kelompok: A (Wajib), B (Muatan Lokal)';
