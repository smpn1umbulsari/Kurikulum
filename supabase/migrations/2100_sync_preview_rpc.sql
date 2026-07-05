-- Migration: 2100_sync_preview_rpc.sql
-- Batch count query RPC for SyncValidationModal
-- Reduces 17 API calls to 1

CREATE OR REPLACE FUNCTION get_table_counts()
RETURNS TABLE (
    table_name TEXT,
    record_count BIGINT,
    has_delta_sync BOOLEAN
) AS $$
DECLARE
    v_tables TEXT[] := ARRAY[
        'academic_terms',
        'gurus',
        'siswas',
        'kelas',
        'mata_pelajarans',
        'pembagian_mengajar',
        'assessments',
        'assessment_details',
        'catatan_wali_kelas',
        'rapor_snapshots',
        'tugas_tambahan_assignments',
        'calendar_events',
        'academic_calendar_events',
        'exam_rooms',
        'exam_seats',
        'exam_supervisors',
        'rombel_bayangans'
    ];
    v_has_delta BOOLEAN;
    v_count BIGINT;
    v_table TEXT;
BEGIN
    FOREACH v_table IN ARRAY v_tables LOOP
        -- Check if table has updated_at column for delta sync
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = v_table
            AND column_name = 'updated_at'
        ) INTO v_has_delta;

        -- Get count (using dynamic query)
        EXECUTE format('SELECT COUNT(*) FROM %I', v_table) INTO v_count;

        table_name := v_table;
        record_count := v_count;
        has_delta_sync := v_has_delta;

        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_table_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION get_table_counts() TO anon;
