CREATE OR REPLACE FUNCTION resolve_sync_conflict(
    p_conflict_id UUID,
    p_resolved_by UUID,
    p_resolution_data JSONB
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE conflict_queue
    SET resolved = TRUE,
        resolved_by = p_resolved_by,
        resolved_at = now()
    WHERE id = p_conflict_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
