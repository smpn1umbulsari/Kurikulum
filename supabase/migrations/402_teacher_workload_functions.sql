CREATE OR REPLACE FUNCTION get_teacher_total_jp(p_guru_id UUID, p_term_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    v_mengajar_jp NUMERIC := 0;
    v_tambahan_jp NUMERIC := 0;
BEGIN
    SELECT COALESCE(SUM(jp), 0) INTO v_mengajar_jp 
    FROM pembagian_mengajar 
    WHERE guru_id = p_guru_id AND academic_term_id = p_term_id;

    SELECT COALESCE(SUM(COALESCE(a.jp_override, t.default_jp)), 0) INTO v_tambahan_jp
    FROM tugas_tambahan_assignments a
    JOIN tugas_tambahan_types t ON a.tugas_tambahan_type_id = t.id
    WHERE a.guru_id = p_guru_id AND a.academic_term_id = p_term_id AND a.status = 'AKTIF';

    RETURN v_mengajar_jp + v_tambahan_jp;
END;
$$ LANGUAGE plpgsql;
