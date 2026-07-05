CREATE TABLE IF NOT EXISTS promotion_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promotion_job_id UUID NOT NULL REFERENCES promotion_jobs(id) ON DELETE CASCADE,
    siswa_id UUID NOT NULL REFERENCES siswas(id) ON DELETE CASCADE,
    kelas_asal_id UUID REFERENCES kelas(id),
    kelas_tujuan_id UUID REFERENCES kelas(id),
    status VARCHAR(30),
    message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
