CREATE OR REPLACE FUNCTION finalize_academic_term(
    p_term_id UUID,
    p_guru_id UUID,
    p_notes TEXT
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE academic_terms 
    SET status = FALSE 
    WHERE id = p_term_id;

    INSERT INTO term_finalization_logs (academic_term_id, finalized_by, finalized_at, catatan)
    VALUES (p_term_id, p_guru_id, now(), p_notes);

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
