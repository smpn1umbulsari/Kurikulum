CREATE OR REPLACE VIEW v_attendance_summary AS
SELECT 
    siswa_id,
    SUM(CASE WHEN status = 'HADIR' THEN 1 ELSE 0 END) AS hadir,
    SUM(CASE WHEN status = 'IZIN' THEN 1 ELSE 0 END) AS izin,
    SUM(CASE WHEN status = 'SAKIT' THEN 1 ELSE 0 END) AS sakit,
    SUM(CASE WHEN status = 'ALPA' THEN 1 ELSE 0 END) AS alpa,
    CASE 
        WHEN COUNT(*) > 0 THEN (SUM(CASE WHEN status = 'HADIR' THEN 1 ELSE 0 END)::NUMERIC / COUNT(*)::NUMERIC) * 100.00
        ELSE 100.00
    END AS persentase
FROM kehadiran
GROUP BY siswa_id;
