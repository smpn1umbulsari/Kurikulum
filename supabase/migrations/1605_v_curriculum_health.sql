CREATE OR REPLACE VIEW v_curriculum_health AS
SELECT 
    (SELECT COALESCE(AVG(completion_percent), 100.00) FROM v_assessment_progress) AS assessment_completion,
    (SELECT COALESCE(AVG(completion_percent), 100.00) FROM v_rapor_completion) AS rapor_completion;
