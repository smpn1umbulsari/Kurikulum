CREATE OR REPLACE FUNCTION execute_siswa_promotion(
    p_job_id UUID,
    p_siswa_id UUID,
    p_kelas_asal_id UUID,
    p_kelas_tujuan_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    -- Core promotion logic
    UPDATE riwayat_kelas 
    SET tanggal_keluar = now()
    WHERE siswa_id = p_siswa_id AND kelas_real_id = p_kelas_asal_id AND tanggal_keluar IS NULL;

    INSERT INTO riwayat_kelas (siswa_id, kelas_real_id, academic_term_id, tanggal_masuk)
    VALUES (p_siswa_id, p_kelas_tujuan_id, (SELECT academic_term_id FROM kelas WHERE id = p_kelas_tujuan_id), now());

    INSERT INTO promotion_details (promotion_job_id, siswa_id, kelas_asal_id, kelas_tujuan_id, status, message)
    VALUES (p_job_id, p_siswa_id, p_kelas_asal_id, p_kelas_tujuan_id, 'SUCCESS', 'Promoted successfully');

    RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
    INSERT INTO promotion_details (promotion_job_id, siswa_id, kelas_asal_id, kelas_tujuan_id, status, message)
    VALUES (p_job_id, p_siswa_id, p_kelas_asal_id, p_kelas_tujuan_id, 'FAILED', SQLERRM);
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;
