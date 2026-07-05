CREATE TABLE IF NOT EXISTS graduation_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    graduation_job_id UUID NOT NULL REFERENCES graduation_jobs(id) ON DELETE CASCADE,
    siswa_id UUID NOT NULL REFERENCES siswas(id) ON DELETE CASCADE,
    status VARCHAR(30),
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
