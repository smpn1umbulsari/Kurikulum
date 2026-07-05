CREATE OR REPLACE VIEW v_teacher_workload AS
SELECT 
    g.id AS guru_id,
    g.nama,
    COALESCE(SUM(pm.jp), 0) AS jp_mengajar,
    COALESCE(SUM(COALESCE(tta.jp_override, ttt.default_jp)), 0) AS jp_tambahan,
    (COALESCE(SUM(pm.jp), 0) + COALESCE(SUM(COALESCE(tta.jp_override, ttt.default_jp)), 0)) AS jp_total
FROM gurus g
LEFT JOIN pembagian_mengajar pm ON g.id = pm.guru_id
LEFT JOIN tugas_tambahan_assignments tta ON g.id = tta.guru_id AND tta.status = 'AKTIF'
LEFT JOIN tugas_tambahan_types ttt ON tta.tugas_tambahan_type_id = ttt.id
GROUP BY g.id, g.nama;
