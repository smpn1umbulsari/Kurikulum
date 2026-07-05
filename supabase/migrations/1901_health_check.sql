CREATE OR REPLACE FUNCTION run_system_health_check()
RETURNS TABLE (
    check_name TEXT,
    status TEXT,
    message TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 'Active Academic Term'::TEXT, 
           CASE WHEN COUNT(*) = 1 THEN 'OK' ELSE 'WARNING' END::TEXT,
           (COUNT(*) || ' active terms configured')::TEXT
    FROM academic_terms WHERE academic_terms.status = TRUE;
END;
$$ LANGUAGE plpgsql;
