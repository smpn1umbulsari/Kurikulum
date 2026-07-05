-- Migration: 201_siswas.sql
-- Description: Master data table for students/siswa

CREATE TABLE IF NOT EXISTS siswas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nisn VARCHAR(20) NOT NULL UNIQUE,
    nipd VARCHAR(20) NOT NULL UNIQUE,
    nama VARCHAR(150) NOT NULL,
    jk CHAR(1) CHECK (jk IN ('L','P')),
    agama VARCHAR(20),
    tempat_lahir VARCHAR(100),
    tanggal_lahir DATE,
    alamat TEXT,
    nama_ayah VARCHAR(150),
    nama_ibu VARCHAR(150),
    no_hp_ortu VARCHAR(30),
    status_aktif BOOLEAN NOT NULL DEFAULT TRUE,
    version BIGINT NOT NULL DEFAULT 1,
    sync_status sync_status NOT NULL DEFAULT 'PENDING',
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_siswas_nisn ON siswas(nisn);
CREATE INDEX IF NOT EXISTS idx_siswas_nipd ON siswas(nipd);
CREATE INDEX IF NOT EXISTS idx_siswas_nama ON siswas(nama) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_siswas_status_aktif ON siswas(status_aktif);
CREATE INDEX IF NOT EXISTS idx_siswas_deleted_at ON siswas(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_siswas_created_at ON siswas(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_siswas_agama ON siswas(agama) WHERE agama IS NOT NULL;

-- Comments
COMMENT ON TABLE siswas IS 'Master data siswa';
COMMENT ON COLUMN siswas.nisn IS 'Nomor Induk Siswa Nasional - unik';
COMMENT ON COLUMN siswas.nipd IS 'Nomor Induk Peserta Didik - unik';
