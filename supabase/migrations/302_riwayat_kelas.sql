-- Migration: 302_riwayat_kelas.sql
-- Description: Student class history/riwayat kelas table

CREATE TABLE IF NOT EXISTS riwayat_kelas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    siswa_id UUID NOT NULL REFERENCES siswas(id) ON DELETE CASCADE,
    academic_term_id UUID NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
    kelas_real_id UUID REFERENCES kelas(id) ON DELETE CASCADE,
    kelas_dapo_id UUID REFERENCES kelas(id) ON DELETE CASCADE,
    tanggal_masuk DATE NOT NULL DEFAULT CURRENT_DATE,
    tanggal_keluar DATE,
    status_keluar VARCHAR(30),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS uq_riwayat_term_siswa ON riwayat_kelas(academic_term_id, siswa_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_riwayat_siswa ON riwayat_kelas(siswa_id);
CREATE INDEX IF NOT EXISTS idx_riwayat_term ON riwayat_kelas(academic_term_id);
CREATE INDEX IF NOT EXISTS idx_riwayat_kelas_real ON riwayat_kelas(kelas_real_id);

-- Comments
COMMENT ON TABLE riwayat_kelas IS 'Tabel riwayat kelas siswa per tahun ajaran';
COMMENT ON COLUMN riwayat_kelas.status_keluar IS 'Status keluar: LULUS, PINDAH, KELUAR, WAFAT';
