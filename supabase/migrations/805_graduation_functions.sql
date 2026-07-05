CREATE OR REPLACE FUNCTION execute_siswa_graduation(
    p_job_id UUID,
    p_siswa_id UUID,
    p_tahun_lulus INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    v_siswa RECORD;
BEGIN
    SELECT * INTO v_siswa FROM siswas WHERE id = p_siswa_id;

    UPDATE siswas SET status_aktif = FALSE WHERE id = p_siswa_id;

    INSERT INTO alumni (siswa_id, nisn, nipd, nama, jk, agama, tahun_lulus)
    VALUES (p_siswa_id, v_siswa.nisn, v_siswa.nipd, v_siswa.nama, v_siswa.jk, v_siswa.agama, p_tahun_lulus);

    INSERT INTO graduation_details (graduation_job_id, siswa_id, status, message)
    VALUES (p_job_id, p_siswa_id, 'SUCCESS', 'Graduated and converted to alumni');

    RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
    INSERT INTO graduation_details (graduation_job_id, siswa_id, status, message)
    VALUES (p_job_id, p_siswa_id, 'FAILED', SQLERRM);
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;
