CREATE OR REPLACE FUNCTION handle_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO soft_delete_logs (table_name, record_id, deleted_at, deleted_by)
        VALUES (TG_TABLE_NAME, OLD.id, now(), auth.uid());
        RETURN NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
