CREATE TABLE IF NOT EXISTS graduation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_term_id UUID NOT NULL REFERENCES academic_terms(id),
    total_siswa INTEGER DEFAULT 0,
    processed_siswa INTEGER DEFAULT 0,
    status VARCHAR(30),
    created_by UUID REFERENCES gurus(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    finished_at TIMESTAMPTZ
);
