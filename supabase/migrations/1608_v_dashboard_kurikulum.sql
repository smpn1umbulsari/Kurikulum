CREATE OR REPLACE VIEW v_dashboard_kurikulum AS
SELECT 
    (SELECT COUNT(*) FROM assessments WHERE stage = 'DRAFT') AS assessment_draft,
    (SELECT COUNT(*) FROM assessments WHERE stage = 'FINALIZED') AS assessment_final,
    (SELECT COUNT(*) FROM rapor_snapshots) AS rapor_final;
