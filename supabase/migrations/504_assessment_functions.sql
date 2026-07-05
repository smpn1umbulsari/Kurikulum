-- Grade Calculation and Publish helper functions
CREATE OR REPLACE FUNCTION check_assessment_publish_status(p_assessment_id UUID)
RETURNS VARCHAR AS $$
DECLARE
    v_stage assessment_stage;
BEGIN
    SELECT stage INTO v_stage FROM assessments WHERE id = p_assessment_id;
    RETURN v_stage::VARCHAR;
END;
$$ LANGUAGE plpgsql;
