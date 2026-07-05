CREATE TABLE IF NOT EXISTS rapor_pdf (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rapor_snapshot_id UUID NOT NULL REFERENCES rapor_snapshots(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
