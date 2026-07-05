CREATE TABLE IF NOT EXISTS analytics_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_type VARCHAR(100) NOT NULL,
    status VARCHAR(30) NOT NULL,
    generated_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    finished_at TIMESTAMPTZ
);
