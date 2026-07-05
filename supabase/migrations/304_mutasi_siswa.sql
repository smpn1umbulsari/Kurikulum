CREATE TABLE IF NOT EXISTS mutasi_siswa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    siswa_id UUID NOT NULL REFERENCES siswas(id) ON DELETE CASCADE,
    academic_term_id UUID NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
    jenis_mutasi VARCHAR(30) NOT NULL CHECK (jenis_mutasi IN ('MASUK', 'KELUAR', 'PINDAH', 'ALUMNI')),
    tanggal_mutasi DATE NOT NULL,
    alasan TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
