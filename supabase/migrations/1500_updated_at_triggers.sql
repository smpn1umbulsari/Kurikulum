/* =========================================================
   SIKAD v4.0 - TRIGGER CONFIGURATION FOR TIMESTAMPS
   ========================================================= */
CREATE TRIGGER tr_update_guru_timestamp BEFORE UPDATE ON gurus FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER tr_update_siswa_timestamp BEFORE UPDATE ON siswas FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER tr_update_mapel_timestamp BEFORE UPDATE ON mata_pelajarans FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER tr_update_kelas_timestamp BEFORE UPDATE ON kelas FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER tr_update_mengajar_timestamp BEFORE UPDATE ON pembagian_mengajar FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER tr_update_tugas_timestamp BEFORE UPDATE ON tugas_tambahan_assignments FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER tr_update_assessment_timestamp BEFORE UPDATE ON assessments FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER tr_update_assessment_detail_timestamp BEFORE UPDATE ON assessment_details FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER tr_update_kehadiran_timestamp BEFORE UPDATE ON kehadiran FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER tr_update_academic_term_timestamp BEFORE UPDATE ON academic_terms FOR EACH ROW EXECUTE FUNCTION update_timestamp();

