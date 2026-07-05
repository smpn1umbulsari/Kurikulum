CREATE TABLE IF NOT EXISTS sync_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    last_sync_at TIMESTAMPTZ,
    last_success_sync_at TIMESTAMPTZ,
    device_id VARCHAR(100),
    app_version VARCHAR(50)
);
