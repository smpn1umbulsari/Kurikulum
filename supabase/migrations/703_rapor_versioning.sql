CREATE TABLE IF NOT EXISTS rapor_versioning (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rapor_snapshot_id UUID NOT NULL REFERENCES rapor_snapshots(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    data_rapor JSONB NOT NULL,
    created_by UUID REFERENCES gurus(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
