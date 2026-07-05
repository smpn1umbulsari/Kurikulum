-- Migration: 800_promotion_jobs.sql
-- Description: Student promotion jobs/kenaikan kelas table

CREATE TABLE IF NOT EXISTS promotion_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_term_id UUID NOT NULL REFERENCES academic_terms(id),
    target_term_id UUID NOT NULL REFERENCES academic_terms(id),
    status VARCHAR(30) NOT NULL,
    total_siswa INTEGER NOT NULL DEFAULT 0,
    processed_siswa INTEGER NOT NULL DEFAULT 0,
    log JSONB,
    created_by UUID NOT NULL REFERENCES gurus(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_promotion_source ON promotion_jobs(source_term_id);
CREATE INDEX IF NOT EXISTS idx_promotion_target ON promotion_jobs(target_term_id);
CREATE INDEX IF NOT EXISTS idx_promotion_status ON promotion_jobs(status);
CREATE INDEX IF NOT EXISTS idx_promotion_created_by ON promotion_jobs(created_by);

-- Comments
COMMENT ON TABLE promotion_jobs IS 'Tabel job kenaikan kelas siswa';
COMMENT ON COLUMN promotion_jobs.status IS 'Status: PENDING, PROCESSING, COMPLETED, FAILED';
