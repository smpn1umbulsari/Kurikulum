CREATE TABLE IF NOT EXISTS sync_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID,
    device_id VARCHAR(100),
    action VARCHAR(100),
    status VARCHAR(50),
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
