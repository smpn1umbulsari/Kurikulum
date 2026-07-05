-- RLS indexes for performance optimisation
CREATE INDEX IF NOT EXISTS idx_kelas_rls ON kelas(academic_term_id, wali_kelas_id);
CREATE INDEX IF NOT EXISTS idx_pembagian_mengajar_rls ON pembagian_mengajar(guru_id, academic_term_id);
