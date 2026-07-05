CREATE INDEX IF NOT EXISTS idx_rapor_jsonb ON rapor_snapshots USING gin(data_rapor);
CREATE INDEX IF NOT EXISTS idx_alumni_snapshot_jsonb ON alumni_snapshots USING gin(akademik_snapshot);
