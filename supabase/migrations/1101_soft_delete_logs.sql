CREATE TABLE IF NOT EXISTS soft_delete_logs (
    id BIGSERIAL PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    deleted_by UUID,
    deleted_at TIMESTAMPTZ,
    restored_by UUID,
    restored_at TIMESTAMPTZ
);
