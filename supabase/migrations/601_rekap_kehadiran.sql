CREATE TABLE IF NOT EXISTS rekap_kehadiran (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_term_id UUID NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
    siswa_id UUID NOT NULL REFERENCES siswas(id) ON DELETE CASCADE,
    total_hadir INTEGER NOT NULL DEFAULT 0,
    total_izin INTEGER NOT NULL DEFAULT 0,
    total_sakit INTEGER NOT NULL DEFAULT 0,
    total_alpa INTEGER NOT NULL DEFAULT 0,
    persentase_kehadiran NUMERIC(5,2),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(academic_term_id, siswa_id)
);
