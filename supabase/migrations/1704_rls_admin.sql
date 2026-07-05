/* =========================================================
   SIKAD v4.0 - SECTION 1704 - RLS ADMIN, AUDITS, & SYNC
   ========================================================= */

-- Enable Row Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE soft_delete_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE conflict_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE archive_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE archive_records ENABLE ROW LEVEL SECURITY;


-- Audit Logs Policies
DROP POLICY IF EXISTS "Admin and Kurikulum can read audit_logs" ON audit_logs;
CREATE POLICY "Admin and Kurikulum can read audit_logs"
    ON audit_logs FOR SELECT
    USING (auth_is_admin() OR auth_is_kurikulum());

DROP POLICY IF EXISTS "System can insert audit_logs" ON audit_logs;
CREATE POLICY "System can insert audit_logs"
    ON audit_logs FOR INSERT
    WITH CHECK (TRUE); -- System triggers and APIs can write logs


-- Soft Delete Logs Policies
DROP POLICY IF EXISTS "Admin can read soft_delete_logs" ON soft_delete_logs;
CREATE POLICY "Admin can read soft_delete_logs"
    ON soft_delete_logs FOR SELECT
    USING (auth_is_admin());


-- Sync Queue Policies
DROP POLICY IF EXISTS "Users can manage their own sync queue" ON sync_queue;
CREATE POLICY "Users can manage their own sync queue"
    ON sync_queue FOR ALL
    USING (auth_is_admin() OR auth_is_kurikulum())
    WITH CHECK (auth_is_admin() OR auth_is_kurikulum());


-- Conflict Queue Policies
DROP POLICY IF EXISTS "Users can read/update their own conflicts" ON conflict_queue;
CREATE POLICY "Users can read/update their own conflicts"
    ON conflict_queue FOR ALL
    USING (auth_is_admin() OR auth_is_kurikulum())
    WITH CHECK (auth_is_admin() OR auth_is_kurikulum());


-- Device Health Policies
DROP POLICY IF EXISTS "Users can manage their own device health record" ON device_health;
CREATE POLICY "Users can manage their own device health record"
    ON device_health FOR ALL
    USING (user_id = auth.uid() OR auth_is_admin() OR auth_is_kurikulum())
    WITH CHECK (user_id = auth.uid() OR auth_is_admin() OR auth_is_kurikulum());


-- Archive Jobs Policies
DROP POLICY IF EXISTS "Admin and Kurikulum can read archive jobs" ON archive_jobs;
CREATE POLICY "Admin and Kurikulum can read archive jobs"
    ON archive_jobs FOR SELECT
    USING (auth_is_admin() OR auth_is_kurikulum());

DROP POLICY IF EXISTS "Admin can manage archive jobs" ON archive_jobs;
CREATE POLICY "Admin can manage archive jobs"
    ON archive_jobs FOR ALL
    USING (auth_is_admin())
    WITH CHECK (auth_is_admin());


-- Archive Records Policies
DROP POLICY IF EXISTS "Admin and Kurikulum can read archive records" ON archive_records;
CREATE POLICY "Admin and Kurikulum can read archive records"
    ON archive_records FOR SELECT
    USING (auth_is_admin() OR auth_is_kurikulum());

DROP POLICY IF EXISTS "Admin can manage archive records" ON archive_records;
CREATE POLICY "Admin can manage archive records"
    ON archive_records FOR ALL
    USING (auth_is_admin())
    WITH CHECK (auth_is_admin());
