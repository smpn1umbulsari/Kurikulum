-- Migration: 200_gurus.sql
-- Description: Master data table for teachers/guru

CREATE TABLE IF NOT EXISTS gurus (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nip VARCHAR(30) UNIQUE,
    nama VARCHAR(150) NOT NULL,
    gelar_depan VARCHAR(50),
    gelar_belakang VARCHAR(50),
    jk CHAR(1) NOT NULL CHECK (jk IN ('L','P')),
    tempat_lahir VARCHAR(100),
    tanggal_lahir DATE,
    no_hp VARCHAR(30),
    email VARCHAR(255),
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
CREATE INDEX IF NOT EXISTS idx_gurus_nip ON gurus(nip) WHERE nip IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gurus_status_aktif ON gurus(status_aktif);
CREATE INDEX IF NOT EXISTS idx_gurus_deleted_at ON gurus(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_gurus_created_at ON gurus(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gurus_sync_status ON gurus(sync_status) WHERE sync_status != 'SYNCED';

-- Comments
COMMENT ON TABLE gurus IS 'Master data guru dan pegawai sekolah';
COMMENT ON COLUMN gurus.nip IS 'Nomor Induk Pegawai - unik per guru';
COMMENT ON COLUMN gurus.status_aktif IS ' TRUE = aktif mengajar, FALSE = tidak aktif';
