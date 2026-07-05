CREATE OR REPLACE VIEW v_assessment_progress AS
SELECT 
    a.id AS assessment_id,
    a.judul,
    COUNT(ad.id) AS jumlah_siswa,
    COUNT(ad.nilai) AS jumlah_nilai,
    CASE 
        WHEN COUNT(ad.id) > 0 THEN (COUNT(ad.nilai)::NUMERIC / COUNT(ad.id)::NUMERIC) * 100.00
        ELSE 0.00
    END AS completion_percent
FROM assessments a
LEFT JOIN assessment_details ad ON a.id = ad.assessment_id
GROUP BY a.id, a.judul;
