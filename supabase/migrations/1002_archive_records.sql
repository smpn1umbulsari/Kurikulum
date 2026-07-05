CREATE TABLE IF NOT EXISTS archive_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    archive_job_id UUID NOT NULL REFERENCES archive_jobs(id) ON DELETE CASCADE,
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    snapshot_data JSONB NOT NULL,
    archived_at TIMESTAMPTZ DEFAULT now()
);
