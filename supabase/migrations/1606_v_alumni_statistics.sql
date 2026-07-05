CREATE OR REPLACE VIEW v_alumni_statistics AS
SELECT 
    tahun_lulus,
    COUNT(*) AS jumlah_alumni,
    SUM(CASE WHEN jk = 'L' THEN 1 ELSE 0 END) AS laki_laki,
    SUM(CASE WHEN jk = 'P' THEN 1 ELSE 0 END) AS perempuan
FROM alumni
GROUP BY tahun_lulus;
