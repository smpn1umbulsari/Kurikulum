CREATE OR REPLACE FUNCTION queue_analytics_job()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO analytics_jobs (report_type, status, created_at)
    VALUES ('TERM_SUMMARY', 'PENDING', now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
