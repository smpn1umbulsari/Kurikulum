CREATE TABLE IF NOT EXISTS term_finalization_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_term_id UUID NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
    finalized_by UUID NOT NULL REFERENCES gurus(id),
    finalized_at TIMESTAMPTZ NOT NULL,
    catatan TEXT
);
