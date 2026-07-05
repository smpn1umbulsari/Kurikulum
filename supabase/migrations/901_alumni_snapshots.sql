CREATE TABLE IF NOT EXISTS alumni_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alumni_id UUID NOT NULL UNIQUE REFERENCES alumni(id) ON DELETE CASCADE,
    biodata_snapshot JSONB NOT NULL,
    akademik_snapshot JSONB NOT NULL,
    kehadiran_snapshot JSONB,
    rapor_snapshot JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
