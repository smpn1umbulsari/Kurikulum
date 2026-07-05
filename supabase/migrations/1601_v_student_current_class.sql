CREATE OR REPLACE VIEW v_student_current_class AS
SELECT 
    s.id AS siswa_id,
    s.nisn,
    s.nama,
    k.nama_kelas AS kelas,
    k.tingkat,
    t.tahun_ajaran AS term
FROM siswas s
JOIN riwayat_kelas r ON s.id = r.siswa_id
JOIN kelas k ON r.kelas_real_id = k.id
JOIN academic_terms t ON r.academic_term_id = t.id
WHERE r.tanggal_keluar IS NULL;
