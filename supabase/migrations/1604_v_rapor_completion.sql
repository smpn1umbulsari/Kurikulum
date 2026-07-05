CREATE OR REPLACE VIEW v_rapor_completion AS
SELECT 
    k.id AS kelas_id,
    k.nama_kelas,
    COUNT(r.siswa_id) AS jumlah_siswa,
    COUNT(rs.id) AS rapor_final,
    (COUNT(r.siswa_id) - COUNT(rs.id)) AS rapor_draft,
    CASE 
        WHEN COUNT(r.siswa_id) > 0 THEN (COUNT(rs.id)::NUMERIC / COUNT(r.siswa_id)::NUMERIC) * 100.00
        ELSE 0.00
    END AS completion_percent
FROM kelas k
LEFT JOIN riwayat_kelas r ON k.id = r.kelas_real_id AND r.tanggal_keluar IS NULL
LEFT JOIN rapor_snapshots rs ON r.siswa_id = rs.siswa_id AND k.academic_term_id = rs.academic_term_id
GROUP BY k.id, k.nama_kelas;
