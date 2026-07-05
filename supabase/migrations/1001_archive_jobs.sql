CREATE TABLE IF NOT EXISTS archive_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_term_id UUID NOT NULL REFERENCES academic_terms(id),
    status VARCHAR(30) NOT NULL,
    total_records BIGINT DEFAULT 0,
    processed_records BIGINT DEFAULT 0,
    log JSONB,
    created_by UUID REFERENCES gurus(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    finished_at TIMESTAMPTZ
);
