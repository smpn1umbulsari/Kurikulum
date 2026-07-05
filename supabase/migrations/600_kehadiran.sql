-- Migration: 600_kehadiran.sql
-- Description: Attendance/kehadiran table

CREATE TABLE IF NOT EXISTS kehadiran (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_term_id UUID NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
    pembagian_mengajar_id UUID NOT NULL REFERENCES pembagian_mengajar(id) ON DELETE CASCADE,
    siswa_id UUID NOT NULL REFERENCES siswas(id) ON DELETE CASCADE,
    tanggal DATE NOT NULL,
    status attendance_status NOT NULL,
    keterangan TEXT,
    created_by UUID NOT NULL REFERENCES gurus(id),
    version BIGINT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(pembagian_mengajar_id, siswa_id, tanggal)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_kehadiran_term ON kehadiran(academic_term_id);
CREATE INDEX IF NOT EXISTS idx_kehadiran_pembagian ON kehadiran(pembagian_mengajar_id);
CREATE INDEX IF NOT EXISTS idx_kehadiran_siswa ON kehadiran(siswa_id);
CREATE INDEX IF NOT EXISTS idx_kehadiran_tanggal ON kehadiran(tanggal);
CREATE INDEX IF NOT EXISTS idx_kehadiran_status ON kehadiran(status);
CREATE INDEX IF NOT EXISTS idx_kehadiran_created_by ON kehadiran(created_by);

-- Comments
COMMENT ON TABLE kehadiran IS 'Tabel kehadiran siswa';
COMMENT ON COLUMN kehadiran.status IS 'Status: HADIR, SAKIT, IZIN, ALPHA';
