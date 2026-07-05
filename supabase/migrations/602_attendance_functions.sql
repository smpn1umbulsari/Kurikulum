CREATE OR REPLACE FUNCTION refresh_rekap_kehadiran(p_siswa_id UUID, p_term_id UUID)
RETURNS VOID AS $$
DECLARE
    v_hadir INTEGER := 0;
    v_izin INTEGER := 0;
    v_sakit INTEGER := 0;
    v_alpa INTEGER := 0;
    v_total INTEGER := 0;
    v_persen NUMERIC(5,2) := 100.00;
BEGIN
    SELECT COUNT(*) INTO v_hadir FROM kehadiran WHERE siswa_id = p_siswa_id AND academic_term_id = p_term_id AND status = 'HADIR';
    SELECT COUNT(*) INTO v_izin FROM kehadiran WHERE siswa_id = p_siswa_id AND academic_term_id = p_term_id AND status = 'IZIN';
    SELECT COUNT(*) INTO v_sakit FROM kehadiran WHERE siswa_id = p_siswa_id AND academic_term_id = p_term_id AND status = 'SAKIT';
    SELECT COUNT(*) INTO v_alpa FROM kehadiran WHERE siswa_id = p_siswa_id AND academic_term_id = p_term_id AND status = 'ALPA';

    v_total := v_hadir + v_izin + v_sakit + v_alpa;
    IF v_total > 0 THEN
        v_persen := (v_hadir::NUMERIC / v_total::NUMERIC) * 100.00;
    END IF;

    INSERT INTO rekap_kehadiran (academic_term_id, siswa_id, total_hadir, total_izin, total_sakit, total_alpa, persentase_kehadiran, updated_at)
    VALUES (p_term_id, p_siswa_id, v_hadir, v_izin, v_sakit, v_alpa, v_persen, now())
    ON CONFLICT (academic_term_id, siswa_id) DO UPDATE SET
        total_hadir = EXCLUDED.total_hadir,
        total_izin = EXCLUDED.total_izin,
        total_sakit = EXCLUDED.total_sakit,
        total_alpa = EXCLUDED.total_alpa,
        persentase_kehadiran = EXCLUDED.persentase_kehadiran,
        updated_at = EXCLUDED.updated_at;
END;
$$ LANGUAGE plpgsql;
