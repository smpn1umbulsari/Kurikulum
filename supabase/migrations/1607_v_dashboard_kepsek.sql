CREATE OR REPLACE VIEW v_dashboard_kepsek AS
SELECT 
    (SELECT COUNT(*) FROM gurus WHERE status_aktif = TRUE) AS guru_aktif,
    (SELECT COUNT(*) FROM siswas WHERE status_aktif = TRUE) AS siswa_aktif,
    (SELECT COUNT(*) FROM kelas WHERE status_aktif = TRUE) AS kelas_aktif;
