/* =========================================================
   SIKAD v4.0 - ADR-025 & ADR-026 SEPARATE ASSESSMENT LOCKS
   ========================================================= */
CREATE TABLE IF NOT EXISTS assessment_locks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL UNIQUE REFERENCES assessments(id) ON DELETE CASCADE,
    locked_by UUID NOT NULL REFERENCES gurus(id) ON DELETE CASCADE,
    locked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    client_token VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION acquire_assessment_lock(
    p_assessment_id UUID,
    p_guru_id UUID,
    p_client_token VARCHAR,
    p_duration_seconds INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    v_now TIMESTAMPTZ := now();
    v_expires TIMESTAMPTZ := v_now + (p_duration_seconds || ' seconds')::interval;
    v_lock_exists BOOLEAN := FALSE;
    v_current_locked_by UUID;
    v_current_expires TIMESTAMPTZ;
    v_current_token VARCHAR;
BEGIN
    SELECT TRUE, locked_by, expires_at, client_token 
    INTO v_lock_exists, v_current_locked_by, v_current_expires, v_current_token
    FROM assessment_locks 
    WHERE assessment_id = p_assessment_id;

    IF NOT COALESCE(v_lock_exists, FALSE) THEN
        INSERT INTO assessment_locks (assessment_id, locked_by, locked_at, expires_at, client_token)
        VALUES (p_assessment_id, p_guru_id, v_now, v_expires, p_client_token);
        RETURN TRUE;
    ELSIF v_current_locked_by = p_guru_id AND v_current_token = p_client_token THEN
        UPDATE assessment_locks 
        SET expires_at = v_expires, locked_at = v_now
        WHERE assessment_id = p_assessment_id;
        RETURN TRUE;
    ELSIF v_current_expires < v_now THEN
        UPDATE assessment_locks 
        SET locked_by = p_guru_id, locked_at = v_now, expires_at = v_expires, client_token = p_client_token
        WHERE assessment_id = p_assessment_id;
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION release_assessment_lock(
    p_assessment_id UUID,
    p_guru_id UUID,
    p_client_token VARCHAR
) RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM assessment_locks 
    WHERE assessment_id = p_assessment_id 
      AND locked_by = p_guru_id 
      AND client_token = p_client_token;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;
