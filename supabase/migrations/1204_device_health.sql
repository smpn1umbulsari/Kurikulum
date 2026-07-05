CREATE TABLE IF NOT EXISTS device_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    device_id TEXT,
    app_version TEXT,
    last_sync_at TIMESTAMPTZ,
    queue_count INTEGER DEFAULT 0,
    conflict_count INTEGER DEFAULT 0,
    status TEXT
);
