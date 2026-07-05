CREATE OR REPLACE FUNCTION push_to_sync_queue(
    p_table_name VARCHAR,
    p_record_id UUID,
    p_operation operation_type,
    p_payload JSONB
) RETURNS UUID AS $$
DECLARE
    v_queue_id UUID;
BEGIN
    INSERT INTO sync_queue (table_name, record_id, operation, payload, status)
    VALUES (p_table_name, p_record_id, p_operation, p_payload, 'PENDING')
    RETURNING id INTO v_queue_id;
    RETURN v_queue_id;
END;
$$ LANGUAGE plpgsql;
